"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type Sound = "correct" | "wrong" | "complete" | "tap";
const SoundContext = createContext({ enabled: true, toggle: () => {}, play: (_sound: Sound) => {} });

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const music = useRef<HTMLAudioElement | null>(null);
  const soundEnabled = useRef(true);
  const musicPending = useRef(false);

  const startMusic = useCallback(() => {
    const track = music.current;
    if (!soundEnabled.current || !track || !track.paused || musicPending.current) return;
    track.volume = 0.22;
    musicPending.current = true;
    try {
      void track.play().catch(() => {
        // Browsers may require the first click/tap before audible playback.
      }).finally(() => { musicPending.current = false; });
    } catch {
      musicPending.current = false;
    }
  }, []);

  useEffect(() => {
    let initialEnabled = true;
    try { initialEnabled = localStorage.getItem("color-islands-sound") !== "off"; } catch { /* Sound still works when storage is unavailable. */ }
    soundEnabled.current = initialEnabled;
    setEnabled(initialEnabled);
    setPreferencesReady(true);
    startMusic();
    const resumeMusic = (event: Event) => {
      // A click on the sound toggle must be handled by that button first.
      if (event.target instanceof Element && event.target.closest("[data-sound-toggle]")) return;
      startMusic();
    };
    const track = music.current;
    window.addEventListener("pointerdown", resumeMusic);
    window.addEventListener("click", resumeMusic);
    window.addEventListener("keydown", resumeMusic);
    return () => {
      window.removeEventListener("pointerdown", resumeMusic);
      window.removeEventListener("click", resumeMusic);
      window.removeEventListener("keydown", resumeMusic);
      track?.pause();
      void audio.current?.close();
    };
  }, [startMusic]);

  useEffect(() => {
    if (!preferencesReady) return;
    soundEnabled.current = enabled;
    if (enabled) startMusic();
    else music.current?.pause();
  }, [enabled, preferencesReady, startMusic]);

  const play = useCallback((sound: Sound) => {
    if (!enabled) return;
    try {
      audio.current ??= new AudioContext();
      const context = audio.current;
      const notes: [number, number, number][] = sound === "correct"
        ? [[523.25, 0, 0.15], [659.25, 0.1, 0.15], [783.99, 0.2, 0.35]]
        : sound === "wrong"
          ? [[220, 0, 0.18], [164.81, 0.16, 0.3]]
          : sound === "complete"
            ? [[523.25, 0, 0.15], [659.25, 0.14, 0.15], [783.99, 0.28, 0.15], [1046.5, 0.42, 0.6]]
            : [[660, 0, 0.08]];
      const schedule = () => {
        for (const [frequency, delay, duration] of notes) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const start = context.currentTime + delay;
          oscillator.type = sound === "wrong" ? "triangle" : "sine";
          oscillator.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.13, start + 0.015);
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
  }, [enabled]);

  function toggle() {
    const next = !soundEnabled.current;
    soundEnabled.current = next;
    setEnabled(next);
    try { localStorage.setItem("color-islands-sound", next ? "on" : "off"); } catch { /* Optional preference. */ }
    if (next) startMusic();
    else music.current?.pause();
  }

  return <SoundContext.Provider value={{ enabled, toggle, play }}>
    <audio ref={music} src="/audio/boba-date.m4a" autoPlay={preferencesReady && enabled} loop preload="auto" aria-hidden="true" />
    {children}
  </SoundContext.Provider>;
}

export const useSound = () => useContext(SoundContext);
