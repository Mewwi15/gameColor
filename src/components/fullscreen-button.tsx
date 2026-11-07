"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

type DisplayMode = "normal" | "fullscreen" | "expanded";
type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fullscreenElement() {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function FullscreenButton() {
  const [mode, setMode] = useState<DisplayMode>("normal");
  const [pending, setPending] = useState(false);
  const changing = useRef(false);

  const syncDisplay = useCallback(() => {
    const root = document.documentElement;
    const next = fullscreenElement() ? "fullscreen" : root.dataset.gameDisplay === "expanded" ? "expanded" : "normal";
    if (next === "normal") delete root.dataset.gameDisplay;
    else root.dataset.gameDisplay = next;
    setMode(next);
  }, []);

  useEffect(() => {
    syncDisplay();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || fullscreenElement() || document.querySelector("dialog[open]")) return;
      delete document.documentElement.dataset.gameDisplay;
      syncDisplay();
    };
    document.addEventListener("fullscreenchange", syncDisplay);
    document.addEventListener("webkitfullscreenchange", syncDisplay);
    window.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("fullscreenchange", syncDisplay);
      document.removeEventListener("webkitfullscreenchange", syncDisplay);
      window.removeEventListener("keydown", onEscape);
      // Fullscreen belongs to the document, so it survives navigation to /play.
    };
  }, [syncDisplay]);

  async function toggleFullscreen() {
    if (changing.current) return;
    changing.current = true;
    setPending(true);
    const doc = document as FullscreenDocument;
    const root = document.documentElement as FullscreenRoot;
    const expandViewport = () => {
      root.dataset.gameDisplay = "expanded";
      syncDisplay();
    };

    try {
      if (fullscreenElement()) {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else await doc.webkitExitFullscreen?.();
        syncDisplay();
      } else if (root.dataset.gameDisplay === "expanded") {
        delete root.dataset.gameDisplay;
        syncDisplay();
      } else {
        try {
          if (root.requestFullscreen && doc.fullscreenEnabled !== false) {
            await root.requestFullscreen({ navigationUI: "hide" });
          } else if (root.webkitRequestFullscreen) {
            await root.webkitRequestFullscreen();
          } else {
            expandViewport();
            return;
          }
          if (fullscreenElement()) syncDisplay();
          else expandViewport();
        } catch {
          // Keep the game usable when a device or embedded browser denies fullscreen.
          expandViewport();
        }
      }
    } catch {
      syncDisplay();
    } finally {
      changing.current = false;
      setPending(false);
    }
  }

  const expanded = mode !== "normal";
  const label = mode === "fullscreen" ? "ออกจากเต็มจอ" : mode === "expanded" ? "กลับขนาดปกติ" : "ขยายเต็มจอ";

  return <button type="button" className="tool-button" data-fullscreen-toggle onClick={() => { void toggleFullscreen(); }} disabled={pending}
    aria-label={label} title={label} aria-pressed={expanded} aria-busy={pending}>
    <Icon name={expanded ? "collapse" : "expand"} />
  </button>;
}
