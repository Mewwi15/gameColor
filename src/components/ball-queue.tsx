"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
import { COLORS, ISLANDS, type ColorId, type GameState, type IslandId } from "@/lib/game";

type Point = { x: number; y: number; width: number; height: number };
type Drag = Point & { pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; active: boolean };
type Motion = "idle" | "dragging" | "returning" | "delivering";
type IslandRefs = RefObject<Partial<Record<IslandId, HTMLButtonElement | null>>>;

export function BallQueue({ order, index, status, selectedIsland, busy, ballRef, islandRefs, onAnswer, onHover, onSelect }: {
  order: ColorId[];
  index: number;
  status: GameState["status"];
  selectedIsland: IslandId | null;
  busy: boolean;
  ballRef: RefObject<HTMLButtonElement | null>;
  islandRefs: IslandRefs;
  onAnswer: (island: IslandId) => void;
  onHover: (island: IslandId | null) => void;
  onSelect: () => void;
}) {
  const [motion, setMotion] = useState<Motion>("idle");
  const drag = useRef<Drag | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const hover = useRef<IslandId | null>(null);
  const deliveryStart = useRef<Point | null>(null);
  const suppressClick = useRef(false);
  const color = COLORS[order[index]];

  function centerOfBall(): Point {
    const rect = ballRef.current?.getBoundingClientRect();
    return { x: (rect?.left ?? 0) + (rect?.width ?? 0) / 2, y: (rect?.top ?? 0) + (rect?.height ?? 0) / 2, width: rect?.width || 230, height: rect?.height || 230 * 2 / 3 };
  }

  function positionGhost(point: Point) {
    if (!ghost.current) return;
    ghost.current.style.width = `${point.width}px`;
    ghost.current.style.transform = `translate3d(${point.x - point.width / 2}px, ${point.y - point.height / 2}px, 0)`;
  }

  function animateGhost(from: Point, to: Point, nextMotion: Motion) {
    const element = ghost.current;
    if (!element) return;
    positionGhost(from);
    element.style.setProperty("--from-x", `${from.x - from.width / 2}px`);
    element.style.setProperty("--from-y", `${from.y - from.height / 2}px`);
    element.style.setProperty("--to-x", `${to.x - from.width / 2}px`);
    element.style.setProperty("--to-y", `${to.y - from.height / 2}px`);
    setMotion(nextMotion);
  }

  function cancelFrame() {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = null;
  }

  useEffect(() => () => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
  }, []);

  useEffect(() => {
    if (motion !== "returning") return;
    const duration = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 280;
    const timer = window.setTimeout(() => setMotion("idle"), duration);
    return () => window.clearTimeout(timer);
  }, [motion]);

  useEffect(() => {
    if (status === "correct" && selectedIsland) {
      const target = islandRefs.current[selectedIsland];
      const rect = (target?.querySelector(".island-image") ?? target)?.getBoundingClientRect();
      const from = deliveryStart.current ?? centerOfBall();
      if (rect) animateGhost(from, { ...from, x: rect.left + rect.width / 2, y: rect.top + rect.height * 0.43 }, "delivering");
    } else {
      setMotion("idle");
    }
    deliveryStart.current = null;
    // Each new round resets the previous delivery. Pointer positions stay in refs.
  }, [status, index, order, selectedIsland]);

  function updateHover(next: IslandId | null) {
    if (hover.current === next) return;
    hover.current = next;
    onHover(next);
  }

  function findIsland(x: number, y: number): IslandId | null {
    for (const island of ISLANDS) {
      const rect = islandRefs.current[island.id]?.getBoundingClientRect();
      if (rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return island.id;
    }
    return null;
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (busy || motion !== "idle" || drag.current || event.button !== 0 || event.isPrimary === false) return;
    const point = centerOfBall();
    suppressClick.current = false;
    drag.current = { ...point, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, offsetX: event.clientX - point.x, offsetY: event.clientY - point.y, active: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.x = event.clientX - current.offsetX;
    current.y = event.clientY - current.offsetY;
    if (!current.active && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) <= 5) return;
    if (!current.active) {
      current.active = true;
      suppressClick.current = true;
      positionGhost(current);
      setMotion("dragging");
    }
    if (frame.current === null) frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      if (drag.current?.active) positionGhost(drag.current);
    });
    updateHover(findIsland(event.clientX, event.clientY));
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    current.x = event.clientX - current.offsetX;
    current.y = event.clientY - current.offsetY;
    const target = current.active ? findIsland(event.clientX, event.clientY) : null;
    drag.current = null;
    cancelFrame();
    updateHover(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!current.active) return;
    if (target) {
      deliveryStart.current = current;
      positionGhost(current);
      onAnswer(target);
    } else {
      animateGhost(current, centerOfBall(), "returning");
    }
  }

  function cancelDrag() {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    cancelFrame();
    updateHover(null);
    if (current.active) animateGhost(current, centerOfBall(), "returning");
  }

  useEffect(() => {
    // A rotation or browser-toolbar resize invalidates the current drag geometry.
    const cancel = () => cancelDrag();
    window.addEventListener("resize", cancel);
    window.addEventListener("orientationchange", cancel);
    return () => {
      window.removeEventListener("resize", cancel);
      window.removeEventListener("orientationchange", cancel);
    };
  }, [ballRef, onHover]);

  return <>
    <div className={`ball-platform ${status === "correct" ? "is-correct" : ""}`}>
      <span className="ball-orbit orbit-one" aria-hidden="true" /><span className="ball-orbit orbit-two" aria-hidden="true" />
      <div className="ball-track">
        {order.map((id, position) => {
          const offset = position - index;
          const current = offset === 0;
          const preview = offset === 1 || offset === 2;
          const ball = COLORS[id];
          const style = {
            "--queue-x": current ? "0%" : offset === 1 ? "45%" : offset === 2 ? "72%" : offset < 0 ? "-35%" : "95%",
            "--queue-y": current ? "0%" : "5%",
            "--queue-scale": current ? 1 : offset === 1 ? 0.48 : 0.3,
            "--queue-opacity": current ? 1 : offset === 1 ? 0.72 : offset === 2 ? 0.45 : 0,
          } as CSSProperties;
          return <div key={id} className={`ball-slot ${current ? "is-current" : ""} ${preview ? "is-upcoming" : ""}`} style={style}
            aria-hidden={!current} data-queue-position={current ? "current" : preview ? "next" : "hidden"}>
            <button ref={current ? ballRef : undefined} className={`ball-draggable ${current && (motion !== "idle" || status === "correct") ? "is-lifted" : ""}`} disabled={!current || busy} tabIndex={current ? 0 : -1}
              aria-label={`ลูกบอลสี${ball.name} ลากไปยังเกาะ หรือกดแล้วเลือกเกาะ`} aria-describedby={current ? "game-instruction" : undefined}
              onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={cancelDrag}
              onClick={() => { if (current && !busy && !suppressClick.current) onSelect(); }} onKeyDown={(event) => {
                if (current && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onSelect(); islandRefs.current.warm?.focus(); }
              }}>
              <Image src={ball.image} width={1536} height={1024} sizes="(max-width: 599px) 52vw, (min-width: 1800px) 720px, 420px" alt={current ? `ลูกบอลสี${ball.name}` : ""} className="ball-image" draggable={false} loading="eager" fetchPriority={current ? "high" : "low"} />
            </button>
          </div>;
        })}
      </div>
      {status === "correct" && <div className="correct-burst" aria-hidden="true"><span>✦</span><span>✧</span><span>✦</span><span>✧</span></div>}
    </div>
    <div ref={ghost} className={`drag-ghost is-${motion}`} aria-hidden="true" data-ball-motion={motion}
      onAnimationEnd={(event) => { if (event.target === event.currentTarget && motion === "returning") setMotion("idle"); }}>
      <Image src={color.image} width={1536} height={1024} sizes="(max-width: 599px) 52vw, (min-width: 1800px) 720px, 420px" alt="" draggable={false} loading="eager" />
    </div>
  </>;
}
