"use client";

import Link from "next/link";
import { useState } from "react";
import { HelpDialog } from "./help-dialog";
import { Icon } from "./icon";
import { useSound } from "./sound-provider";

export function Toolbar({ home = false, onRestart, onHelpChange }: { home?: boolean; onRestart?: () => void; onHelpChange?: (open: boolean) => void }) {
  const { enabled, toggle } = useSound();
  const [help, setHelp] = useState(false);
  return <>
    <nav className="toolbar" aria-label="เมนูเกม">
      {home && <Link href="/" className="tool-button" aria-label="กลับหน้าแรก" title="กลับหน้าแรก"><Icon name="home" /></Link>}
      {onRestart && <button className="tool-button" onClick={onRestart} aria-label="เริ่มเกมใหม่" title="เริ่มเกมใหม่"><Icon name="restart" /></button>}
      <button className="tool-button" data-sound-toggle onClick={toggle} aria-label={enabled ? "ปิดเสียง" : "เปิดเสียง"} aria-pressed={enabled} title={enabled ? "ปิดเสียง" : "เปิดเสียง"}><Icon name={enabled ? "sound" : "muted"} /></button>
      <button className="tool-button" onClick={() => { setHelp(true); onHelpChange?.(true); }} aria-label="วิธีเล่น" title="วิธีเล่น"><Icon name="help" /></button>
    </nav>
    {help && <HelpDialog onClose={() => { setHelp(false); onHelpChange?.(false); }} />}
  </>;
}
