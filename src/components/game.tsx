"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useReducer, useRef, useState, type CSSProperties } from "react";
import { COLORS, ISLANDS, createGame, explainColor, gameReducer, isCorrectAnswer, shuffledColors, type IslandId } from "@/lib/game";
import { Dialog } from "./dialog";
import { Icon } from "./icon";
import { useSound } from "./sound-provider";
import { Toolbar } from "./toolbar";
import { BallQueue } from "./ball-queue";

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createGame());
  const [hovered, setHovered] = useState<IslandId | null>(null);
  const [restartOpen, setRestartOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [ballSelected, setBallSelected] = useState(false);
  const answerLock = useRef(false);
  const ballRef = useRef<HTMLButtonElement>(null);
  const islandRefs = useRef<Partial<Record<IslandId, HTMLButtonElement | null>>>({});
  const { play } = useSound();
  const colorId = state.order[state.index];
  const color = COLORS[colorId];
  const busy = state.status !== "playing" || restartOpen || helpOpen;
  const firstTry = state.solved.filter((entry) => entry.firstTry).length;

  useEffect(() => {
    if (state.status !== "correct" || restartOpen || helpOpen) return;
    const timer = window.setTimeout(() => dispatch({ type: "continue" }), 520);
    return () => window.clearTimeout(timer);
  }, [state.status, state.index, restartOpen, helpOpen]);

  useEffect(() => {
    answerLock.current = state.status !== "playing";
  }, [state.status]);

  useEffect(() => {
    if (state.status === "complete") play("complete");
  }, [state.status, play]);

  function submit(island: IslandId) {
    if (busy || answerLock.current) return;
    answerLock.current = true;
    setBallSelected(false);
    play(isCorrectAnswer(colorId, island) ? "correct" : "wrong");
    dispatch({ type: "answer", island });
  }

  function retry() {
    dispatch({ type: "retry" });
    window.setTimeout(() => ballRef.current?.focus(), 0);
  }

  function restart() {
    setHovered(null);
    setBallSelected(false);
    setRestartOpen(false);
    dispatch({ type: "restart", order: shuffledColors() });
    play("tap");
    window.setTimeout(() => ballRef.current?.focus(), 0);
  }

  return (
    <main className="world play-world" onKeyDown={(event) => {
      if (event.altKey || event.metaKey || event.ctrlKey || event.repeat || (event.target as HTMLElement).closest("dialog")) return;
      const island = ISLANDS[Number(event.key) - 1];
      if (island) { event.preventDefault(); submit(island.id); }
    }}>
      <div className="ambient-sparkles" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span><span>✦</span></div>
      <header className="game-header">
        <Link href="/" className="game-wordmark" aria-label="ภารกิจส่งสีไป 3 เกาะ กลับหน้าแรก"><Icon name="sparkle" /><span>ภารกิจส่งสีไป <b>3 เกาะ</b></span></Link>
        <div className="mission-progress" aria-label={`ส่งลูกบอลสำเร็จ ${state.solved.length} จาก ${state.order.length} สี`}>
          <span className="progress-star"><Icon name="star" /></span>
          <div className="progress-copy"><span>ภารกิจของเรา <strong>{state.solved.length}<i> / {state.order.length}</i></strong></span><div className="progress-track" role="progressbar" aria-label="ความคืบหน้าภารกิจ" aria-valuemin={0} aria-valuemax={state.order.length} aria-valuenow={state.solved.length}><span style={{ width: `${state.solved.length / state.order.length * 100}%` }} /></div></div>
        </div>
        <Toolbar home onRestart={() => setRestartOpen(true)} onHelpChange={setHelpOpen} />
      </header>

      <section className="game-arena" aria-label="พื้นที่เล่นเกม">
        <div className="ball-section">
          <div className="round-caption"><span className="round-dot" /> ลูกบอลที่ {state.index + 1} จาก {state.order.length}</div>
          <h1 className="game-question">สีนี้… ไปเกาะไหนดีนะ?</h1>
          <BallQueue order={state.order} index={state.index} status={state.status} selectedIsland={state.selectedIsland} busy={busy}
            ballRef={ballRef} islandRefs={islandRefs} onAnswer={submit} onHover={setHovered} onSelect={() => setBallSelected(true)} />
          <div className={`feedback-line ${state.status === "correct" ? "success" : ""}`} role="status" aria-live="polite">
            {state.status === "correct" ? <><Icon name="check" /><strong>ถูกต้อง เก่งมาก!</strong><span>ส่งสี{color.name}สำเร็จแล้ว</span></> : <><Icon name="hand" /><span>{ballSelected ? "เลือกเกาะด้านล่างเพื่อส่งลูกบอลได้เลย" : "ลากลูกบอล หรือกดเลือกเกาะด้านล่าง"}</span></>}
          </div>
        </div>

        <div className="islands" aria-label="เลือกเกาะปลายทาง">
          {ISLANDS.map((island, index) => {
            const delivered = state.solved.filter((entry) => entry.island === island.id);
            const accepted = state.status === "correct" && state.selectedIsland === island.id;
            return (
              <button key={island.id} ref={(element) => { islandRefs.current[island.id] = element; }}
                className={`island island-${island.id} ${hovered === island.id ? "is-hovered" : ""} ${accepted ? "is-accepted" : ""}`}
                onClick={() => submit(island.id)} disabled={busy} aria-label={`ส่งไป${island.name}`} aria-keyshortcuts={String(index + 1)} data-island={island.id}>
                <span className="island-halo" aria-hidden="true" />
                <Image src={island.image} width={1402} height={1254} sizes="(max-width: 800px) 33vw, 400px" className="island-image" alt={island.name} draggable={false} loading="eager" />
                <span className="island-drop-ring" aria-hidden="true"><Icon name={accepted ? "check" : "arrow"} /></span>
                <span className="island-meta"><span className="island-description">{island.description}</span></span>
                {delivered.length > 0 && <span className="delivered-colors" aria-label={`ส่งสำเร็จแล้ว ${delivered.length} สี`}>{delivered.map((entry) => <span key={entry.color} title={`สี${COLORS[entry.color].name}`} style={{ backgroundColor: COLORS[entry.color].hex }}><Icon name="check" /></span>)}</span>}
              </button>
            );
          })}
        </div>
      </section>

      <p id="game-instruction" className="sr-only">ลากลูกบอลไปยังเกาะ หรือกดเลือกเกาะ กดปุ่ม 1, 2, 3 เพื่อเลือกเกาะจากซ้ายไปขวา</p>

      {state.status === "incorrect" && <Dialog title="ยังไม่ถูกนะ ลองอีกครั้ง!" alert onDismiss={retry} className="wrong-dialog">
        <div className="result-icon wrong"><Icon name="close" /></div>
        <p className="dialog-lead">เกาะนี้ยังไม่ใช่บ้านของสี{color.name}</p>
        <div className="answer-explanation"><span className="answer-swatch" style={{ background: color.hex }} /><p>{explainColor(colorId)}</p></div>
        <p className="retry-note">ไม่เป็นไร เรามาส่งลูกบอลสี{color.name}กันใหม่</p>
        <button className="primary-button" onClick={retry} autoFocus>ลองสีนี้อีกครั้ง <Icon name="restart" /></button>
      </Dialog>}

      {restartOpen && <Dialog title="เริ่มการผจญภัยใหม่ไหม?" onDismiss={() => setRestartOpen(false)}>
        <div className="result-icon restart"><Icon name="restart" /></div>
        <p className="dialog-lead">จะเริ่มเก็บลูกบอลทั้ง 8 สีใหม่อีกครั้ง</p>
        <button className="primary-button" onClick={restart}>เริ่มเกมใหม่ <Icon name="restart" /></button>
        <button className="text-button" onClick={() => setRestartOpen(false)}>เล่นต่อจากเดิม</button>
      </Dialog>}

      {state.status === "complete" && <Dialog title="ภารกิจสำเร็จแล้ว!" className="complete-dialog">
        <div className="confetti" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <span key={i} style={{ "--i": i, "--confetti-color": ["#ffd24a", "#ff69a3", "#64def1", "#a57bff"][i % 4] } as CSSProperties} />)}</div>
        <div className="completion-stars" aria-hidden="true"><Icon name="star" /><Icon name="star" /><Icon name="star" /></div>
        <p className="dialog-lead">ขอบคุณที่พาเพื่อนลูกบอลกลับบ้านครบทุกสี</p>
        <div className="completion-count"><strong>8 <span>/ 8</span></strong><span>ส่งลูกบอลสำเร็จ</span></div>
        <p className="completion-message">{state.mistakes === 0 ? "ยอดเยี่ยม! ถูกตั้งแต่ครั้งแรกครบทุกสีเลย" : `ตอบถูกตั้งแต่ครั้งแรก ${firstTry} สี · ฝึกเพิ่ม ${state.mistakes} ครั้ง`}</p>
        <div className="completion-palette">{state.order.map((id) => <span key={id} style={{ background: COLORS[id].hex }} title={`สี${COLORS[id].name}`}><Icon name="check" /></span>)}</div>
        <button className="primary-button" onClick={restart}>ผจญภัยอีกครั้ง <Icon name="restart" /></button>
        <Link href="/" className="text-button">กลับหน้าแรก</Link>
      </Dialog>}
    </main>
  );
}
