"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Sound = "correct" | "wrong" | "complete" | "tap";
const SoundContext = createContext({ enabled: true, toggle: () => {}, play: (_sound: Sound) => {} });

// Assets also carry attenuation for devices that ignore media volume.
const MUSIC_VOLUME = 0.5;
const DUCKED_MUSIC_VOLUME = 0.025;
const EFFECT_VOLUME = 0.95;

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const correct = useRef<HTMLAudioElement | null>(null);
  const mistake = useRef<HTMLAudioElement | null>(null);
  const soundEnabled = useRef(true);
  const musicPending = useRef(false);
  const ducked = useRef(false);
  const restoreTimer = useRef<number | null>(null);
  const generation = useRef(0);

  const restoreMusic = useCallback(() => {
    if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
    restoreTimer.current = null;
    ducked.current = false;
    if (music.current) music.current.volume = MUSIC_VOLUME;
  }, []);

  const duckMusic = useCallback((duration: number) => {
    if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
    ducked.current = true;
    if (music.current) music.current.volume = DUCKED_MUSIC_VOLUME;
    restoreTimer.current = window.setTimeout(restoreMusic, duration);
  }, [restoreMusic]);

  const startMusic = useCallback(() => {
    const track = music.current;
    if (!soundEnabled.current || !track || !track.paused || musicPending.current) return;
    track.volume = ducked.current ? DUCKED_MUSIC_VOLUME : MUSIC_VOLUME;
    musicPending.current = true;
    try {
      void track.play().catch(() => {
        // Audible autoplay may require the first user gesture.
      }).finally(() => { musicPending.current = false; });
    } catch {
      musicPending.current = false;
    }
  }, []);

  useEffect(() => {
    let initialEnabled = true;
    try { initialEnabled = localStorage.getItem("color-islands-sound") !== "off"; } catch { /* Optional preference. */ }
    soundEnabled.current = initialEnabled;
    setEnabled(initialEnabled);
    setPreferencesReady(true);
    startMusic();
    const resumeMusic = (event: Event) => {
      if (event.target instanceof Element && event.target.closest("[data-sound-toggle]")) return;
      startMusic();
    };
    const tracks = [music.current, correct.current, mistake.current];
    window.addEventListener("pointerdown", resumeMusic);
    window.addEventListener("click", resumeMusic);
    window.addEventListener("keydown", resumeMusic);
    return () => {
      window.removeEventListener("pointerdown", resumeMusic);
      window.removeEventListener("click", resumeMusic);
      window.removeEventListener("keydown", resumeMusic);
      if (restoreTimer.current !== null) window.clearTimeout(restoreTimer.current);
      generation.current++;
      for (const track of tracks) track?.pause();
      void audio.current?.close();
    };
  }, [startMusic]);

  useEffect(() => {
    if (!preferencesReady) return;
    soundEnabled.current = enabled;
    if (enabled) startMusic();
    else {
      music.current?.pause();
      correct.current?.pause();
      mistake.current?.pause();
    }
  }, [enabled, preferencesReady, startMusic]);

  // UI tap, plus a fallback if a feedback file cannot be played.
  const playTone = useCallback((sound: Sound) => {
    if (!soundEnabled.current) return;
    try {
      audio.current ??= new AudioContext();
      const context = audio.current;
      const notes: [number, number, number][] = sound === "tap" ? [[660, 0, 0.08]]
        : sound === "wrong" ? [[220, 0, 0.18], [164.81, 0.16, 0.3]]
          : [[523.25, 0, 0.15], [659.25, 0.1, 0.15], [783.99, 0.2, 0.35]];
      const schedule = () => {
        if (!soundEnabled.current) return;
        for (const [frequency, delay, duration] of notes) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const start = context.currentTime + delay;
          oscillator.type = sound === "wrong" ? "triangle" : "sine";
          oscillator.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(sound === "tap" ? 0.08 : 0.13, start + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start(start);
          oscillator.stop(start + duration + 0.02);
          oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        }
      };
      if (context.state === "suspended") void context.resume().then(schedule).catch(() => {});
      else schedule();
    } catch { /* Visual feedback remains available if audio is unsupported. */ }
  }, []);

  const play = useCallback((sound: Sound) => {
    if (!soundEnabled.current) return;
    if (sound === "tap") { playTone(sound); return; }
    const track = sound === "wrong" ? mistake.current : correct.current;
    // Let the final correct-answer clip finish instead of overlapping a victory sound.
    if (sound === "complete" && track && !track.paused) return;
    const currentGeneration = ++generation.current;
    const fallback = () => {
      if (currentGeneration === generation.current) playTone(sound);
    };
    duckMusic((sound === "wrong" ? 800 : 1000) + 200);
    if (!track) { fallback(); return; }
    correct.current?.pause();
    mistake.current?.pause();
    try {
      track.currentTime = 0;
      track.volume = EFFECT_VOLUME;
      track.onended = () => { if (currentGeneration === generation.current) restoreMusic(); };
      track.onerror = fallback;
      void track.play().catch(fallback);
    } catch { fallback(); }
  }, [duckMusic, restoreMusic, playTone]);

  function toggle() {
    const next = !soundEnabled.current;
    soundEnabled.current = next;
    setEnabled(next);
    try { localStorage.setItem("color-islands-sound", next ? "on" : "off"); } catch { /* Optional preference. */ }
    if (next) startMusic();
    else {
      generation.current++;
      music.current?.pause();
      correct.current?.pause();
      mistake.current?.pause();
      restoreMusic();
    }
  }

  return <SoundContext.Provider value={{ enabled, toggle, play }}>
    <audio ref={music} data-audio="music" src="/audio/boba-date.m4a?v=2" autoPlay={preferencesReady && enabled} loop preload="auto" aria-hidden="true" />
    <audio ref={correct} data-audio="correct" src="/audio/correct.wav?v=2" preload="auto" aria-hidden="true" />
    <audio ref={mistake} data-audio="wrong" src="/audio/mistake.wav?v=2" preload="auto" aria-hidden="true" />
    {children}
  </SoundContext.Provider>;
}

export const useSound = () => useContext(SoundContext);
