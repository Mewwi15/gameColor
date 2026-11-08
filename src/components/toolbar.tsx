"use client";

import Link from "next/link";
import { useState } from "react";
import { HelpDialog } from "./help-dialog";
import { Icon } from "./icon";
import { useSound } from "./sound-provider";
import { FullscreenButton } from "./fullscreen-button";

export function Toolbar({ home = false, onRestart, onHelpChange }: { home?: boolean; onRestart?: () => void; onHelpChange?: (open: boolean) => void }) {
  const { enabled, toggle } = useSound();
  const [help, setHelp] = useState(false);
  return <>
    <nav className="toolbar" aria-label="เมนูเกม" onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)"));
      const current = controls.indexOf(event.target as HTMLElement);
      if (current < 0 || controls.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const next = event.key === "Home" ? 0 : event.key === "End" ? controls.length - 1
        : (current + (event.key === "ArrowRight" ? 1 : -1) + controls.length) % controls.length;
      controls[next]?.focus();
    }}>
      {home && <Link href="/" className="tool-button" aria-label="กลับหน้าแรก" title="กลับหน้าแรก"><Icon name="home" /></Link>}
      {onRestart && <button className="tool-button" onClick={onRestart} aria-label="เริ่มเกมใหม่" title="เริ่มเกมใหม่"><Icon name="restart" /></button>}
      <FullscreenButton />
      <button className="tool-button" data-sound-toggle onClick={toggle} aria-label={enabled ? "ปิดเสียง" : "เปิดเสียง"} aria-pressed={enabled} title={enabled ? "ปิดเสียง" : "เปิดเสียง"}><Icon name={enabled ? "sound" : "muted"} /></button>
      <button className="tool-button" onClick={() => { setHelp(true); onHelpChange?.(true); }} aria-label="วิธีเล่น" title="วิธีเล่น"><Icon name="help" /></button>
    </nav>
    {help && <HelpDialog onClose={() => { setHelp(false); onHelpChange?.(false); }} />}
  </>;
}
