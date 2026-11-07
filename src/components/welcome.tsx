"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { HelpDialog } from "./help-dialog";
import { Icon } from "./icon";
import { useSound } from "./sound-provider";
import { Toolbar } from "./toolbar";

export function Welcome() {
  const [help, setHelp] = useState(false);
  const { play } = useSound();
  return (
    <main className="world welcome-world">
      <div className="ambient-sparkles" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span></div>
      <header className="welcome-header"><Toolbar /></header>
      <div className="welcome-content">
        <div className="welcome-character" aria-hidden="true"><Image src="/assets/teacher.png" width={1024} height={1536} sizes="(max-width: 520px) 260px, 32vw" alt="" className="teacher-art" loading="eager" /></div>
        <section className="welcome-board" aria-labelledby="game-name">
          <Image className="board-frame" src="/assets/welcome-frame.png" width={1672} height={941} sizes="(max-width: 520px) 100vw, 75vw" alt="" loading="eager" />
          <div className="welcome-board-content">
            <h1 id="game-name"><span className="sr-only">ภารกิจส่งสีไป 3 เกาะ</span><Image className="title-art" src="/assets/game-title.png" width={1862} height={845} sizes="(max-width: 520px) 65vw, 50vw" alt="" loading="eager" fetchPriority="high" /></h1>
            <Link href="/play" className="start-button" onClick={() => play("tap")} aria-label="เริ่มเกม"><Image src="/assets/start-button.png" width={1672} height={941} sizes="(max-width: 520px) 65vw, 45vw" alt="เริ่มเกม" loading="eager" /></Link>
            <button className="how-to-link" onClick={() => setHelp(true)}><Icon name="help" /> เล่นยังไงนะ?</button>
          </div>
        </section>
      </div>
      {help && <HelpDialog onClose={() => setHelp(false)} />}
    </main>
  );
}
