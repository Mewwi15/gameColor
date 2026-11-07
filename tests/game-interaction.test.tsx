import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import { Game } from "../src/components/game";
import { SoundProvider } from "../src/components/sound-provider";
import { FullscreenButton } from "../src/components/fullscreen-button";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://127.0.0.1:4310" });
for (const key of ["window", "document", "navigator", "Element", "HTMLElement", "HTMLDialogElement", "Node", "MutationObserver", "localStorage"] as const) {
  Object.defineProperty(globalThis, key, { value: key === "window" ? dom.window : dom.window[key], configurable: true });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.assign(globalThis, { self: dom.window });
dom.window.requestAnimationFrame = (callback) => dom.window.setTimeout(() => callback(performance.now()), 16);
dom.window.cancelAnimationFrame = (id) => dom.window.clearTimeout(id);

// JSDOM has no native audio, pointer capture, or modal top layer.
// These shims test component behavior; real layout/touch tests live in tests/e2e.
const playedFrequencies: number[] = [];
const playedFiles: string[] = [];
const mediaPaused = new WeakMap<HTMLMediaElement, boolean>();
let musicPlayCalls = 0;
let blockMusic = false;
Object.defineProperties(dom.window.HTMLMediaElement.prototype, {
  paused: { configurable: true, get() { return mediaPaused.get(this) ?? true; } },
  play: { configurable: true, value() {
    musicPlayCalls++;
    playedFiles.push(this.getAttribute("src"));
    if (blockMusic) return Promise.reject(new DOMException("User interaction required", "NotAllowedError"));
    mediaPaused.set(this, false);
    return Promise.resolve();
  } },
  pause: { configurable: true, value() { mediaPaused.set(this, true); } },
});
class AudioContextStub {
  state = "running";
  currentTime = 0;
  destination = {};
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
  createOscillator() {
    return { type: "sine", frequency: { setValueAtTime: (frequency: number) => playedFrequencies.push(frequency) }, connect() {}, disconnect() {}, start() {}, stop() {}, onended: null };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() {} };
  }
}
Object.assign(globalThis, { AudioContext: AudioContextStub });
Object.defineProperties(dom.window.HTMLDialogElement.prototype, {
  showModal: { value() { this.setAttribute("open", ""); } },
  close: { value() { this.removeAttribute("open"); } },
});

class PointerEventStub extends dom.window.MouseEvent {
  pointerId: number;
  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; }
}
Object.assign(dom.window, { PointerEvent: PointerEventStub });
Object.assign(globalThis, { PointerEvent: PointerEventStub });
Object.defineProperties(dom.window.HTMLElement.prototype, {
  setPointerCapture: { value() {} },
  hasPointerCapture: { value() { return false; } },
});

const { act, cleanup, fireEvent, render, screen } = await import("@testing-library/react");

const restoreFullscreenMocks: (() => void)[] = [];
function mockFullscreenProperty(target: object, name: string, value: unknown) {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  Object.defineProperty(target, name, { configurable: true, value });
  restoreFullscreenMocks.push(() => {
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else Reflect.deleteProperty(target, name);
  });
}

afterEach(() => {
  cleanup(); localStorage.clear(); playedFrequencies.length = 0; playedFiles.length = 0; musicPlayCalls = 0; blockMusic = false;
  for (const restore of restoreFullscreenMocks.splice(0).reverse()) restore();
  delete document.documentElement.dataset.gameDisplay;
});

test("the rendered game shows a wrong-answer alert, retries the same ball, plays feedback, and completes all eight colors", async () => {
  render(<SoundProvider><Game /></SoundProvider>);
  fireEvent.click(screen.getByRole("button", { name: "ส่งไปเกาะโทนเย็น" }));
  assert.ok(screen.getByRole("alertdialog"));
  assert.ok(screen.getByText("สีแดงเป็นสีโทนร้อน ต้องส่งไปที่เกาะโทนร้อนนะ"));
  assert.equal(screen.getByRole("progressbar").getAttribute("aria-valuenow"), "0");
  assert.ok(playedFiles.includes("/audio/mistake.wav"), "wrong answer plays the user-provided mistake clip");
  fireEvent.click(screen.getByRole("button", { name: "ลองสีนี้อีกครั้ง" }));
  assert.equal(screen.queryByRole("alertdialog"), null);
  assert.ok(screen.getByRole("button", { name: /^ลูกบอลสีแดง / }));

  const answers = [
    ["แดง", "โทนร้อน"], ["น้ำเงิน", "โทนเย็น"], ["เหลือง", "สองโทน"], ["ชมพู", "โทนร้อน"],
    ["เขียว", "โทนเย็น"], ["ม่วง", "สองโทน"], ["ส้ม", "โทนร้อน"], ["ฟ้า", "โทนเย็น"],
  ];
  for (const [index, [color, island]] of answers.entries()) {
    assert.ok(screen.getByRole("button", { name: new RegExp(`^ลูกบอลสี${color} `) }));
    fireEvent.click(screen.getByRole("button", { name: `ส่งไปเกาะ${island}` }));
    assert.ok(screen.getByText("ถูกต้อง เก่งมาก!"));
    assert.equal(screen.getByRole("progressbar").getAttribute("aria-valuenow"), String(index + 1));
    // During success feedback, another click cannot award an extra point.
    fireEvent.click(screen.getByRole("button", { name: `ส่งไปเกาะ${island}` }));
    assert.equal(screen.getByRole("progressbar").getAttribute("aria-valuenow"), String(index + 1));
    if (index === answers.length - 1) {
      fireEvent.click(screen.getByRole("button", { name: "วิธีเล่น" }));
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1400)); });
      assert.equal(screen.queryByRole("dialog", { name: "ภารกิจสำเร็จแล้ว!" }), null, "the mission pauses while help is open");
      fireEvent.click(screen.getByRole("button", { name: "เข้าใจแล้ว ไปกันเลย!" }));
    }
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1400)); });
  }
  assert.ok(screen.getByRole("dialog", { name: "ภารกิจสำเร็จแล้ว!" }));
  assert.ok(screen.getByText("ตอบถูกตั้งแต่ครั้งแรก 7 สี · ฝึกเพิ่ม 1 ครั้ง"));
  assert.equal(playedFiles.filter((file) => file === "/audio/correct.wav").length, 8, "each correct answer uses the supplied clip; completion does not overlap it");
  fireEvent.click(screen.getByRole("button", { name: "ผจญภัยอีกครั้ง" }));
  assert.equal(screen.queryByRole("dialog"), null);
  assert.equal(screen.getByRole("progressbar").getAttribute("aria-valuenow"), "0");
});

test("pointer movement submits only after dropping on an island", async () => {
  render(<SoundProvider><Game /></SoundProvider>);
  const ball = screen.getByRole("button", { name: /^ลูกบอลสีแดง/ });
  ball.getBoundingClientRect = () => ({ x: 400, y: 100, top: 100, left: 400, right: 630, bottom: 250, width: 230, height: 150, toJSON() {} });
  const warm = screen.getByRole("button", { name: "ส่งไปเกาะโทนร้อน" });
  warm.getBoundingClientRect = () => ({ x: 100, y: 400, top: 400, left: 100, right: 300, bottom: 600, width: 200, height: 200, toJSON() {} });
  fireEvent.pointerDown(ball, { pointerId: 1, button: 0, clientX: 500, clientY: 200 });
  fireEvent.pointerMove(ball, { pointerId: 1, clientX: 800, clientY: 200 });
  const ghost = document.querySelector<HTMLElement>("[data-ball-motion]")!;
  assert.equal(ghost.style.transform, "translate3d(700px, 100px, 0)", "the ball keeps its grab offset instead of snapping to the cursor");
  fireEvent.pointerUp(ball, { pointerId: 1, clientX: 800, clientY: 200 });
  assert.equal(screen.getByRole("progressbar").getAttribute("aria-valuenow"), "0");
  assert.equal(ghost.dataset.ballMotion, "returning");
  fireEvent.animationEnd(ghost);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 300)); });
  assert.equal(ghost.dataset.ballMotion, "idle");
  fireEvent.pointerDown(ball, { pointerId: 2, button: 0, clientX: 500, clientY: 200 });
  fireEvent.pointerMove(ball, { pointerId: 2, clientX: 200, clientY: 500 });
  assert.ok(warm.classList.contains("is-hovered"));
  fireEvent.pointerUp(ball, { pointerId: 2, clientX: 200, clientY: 500 });
  assert.equal(screen.getByRole("progressbar").getAttribute("aria-valuenow"), "1");
  assert.ok(screen.getByText("ถูกต้อง เก่งมาก!"));
});

test("upcoming balls wait in the queue and the next color becomes draggable after delivery", async () => {
  render(<SoundProvider><Game /></SoundProvider>);
  assert.equal(document.querySelectorAll('[data-queue-position="next"]').length, 2);
  assert.equal(screen.queryByRole("button", { name: /^ลูกบอลสีน้ำเงิน / }), null, "queued previews are not selectable yet");
  fireEvent.click(screen.getByRole("button", { name: "ส่งไปเกาะโทนร้อน" }));
  assert.equal(document.querySelector<HTMLElement>("[data-ball-motion]")?.dataset.ballMotion, "delivering");
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 600)); });
  assert.ok(screen.getByRole("button", { name: /^ลูกบอลสีน้ำเงิน / }));
  assert.equal(screen.queryByRole("button", { name: /^ลูกบอลสีแดง / }), null);
  assert.equal(document.querySelectorAll('[data-queue-position="next"]').length, 2);
});

test("muting sound silences feedback and saves the preference", () => {
  render(<SoundProvider><Game /></SoundProvider>);
  fireEvent.click(screen.getByRole("button", { name: "ปิดเสียง" }));
  assert.equal(localStorage.getItem("color-islands-sound"), "off");
  assert.ok(screen.getByRole("button", { name: "เปิดเสียง" }));
  fireEvent.click(screen.getByRole("button", { name: "ส่งไปเกาะโทนร้อน" }));
  assert.equal(playedFrequencies.length, 0);
  assert.equal(playedFiles.some((file) => file.endsWith(".wav")), false);
  assert.ok(screen.getByText("ถูกต้อง เก่งมาก!"));
});

test("background music starts automatically, resumes after blocked autoplay, and follows the sound toggle", async () => {
  blockMusic = true;
  render(<SoundProvider><Game /></SoundProvider>);
  await act(async () => { await Promise.resolve(); });
  const track = document.querySelector("audio")!;
  assert.ok(musicPlayCalls > 0, "music playback is attempted when the page opens");
  assert.equal(track.getAttribute("src"), "/audio/boba-date.m4a?v=2");
  assert.equal(track.loop, true);
  assert.equal(track.paused, true);
  blockMusic = false;
  fireEvent.pointerDown(document.body);
  await act(async () => { await Promise.resolve(); });
  assert.equal(track.paused, false, "the first gesture retries blocked playback");
  track.currentTime = 42;
  fireEvent.click(screen.getByRole("button", { name: "ปิดเสียง" }));
  assert.equal(track.paused, true);
  fireEvent.click(screen.getByRole("button", { name: "เปิดเสียง" }));
  await act(async () => { await Promise.resolve(); });
  assert.equal(track.paused, false);
  assert.equal(track.currentTime, 42, "unmuting resumes the song without restarting it");
});

test("a saved sound-off preference prevents music autoplay", async () => {
  localStorage.setItem("color-islands-sound", "off");
  render(<SoundProvider><Game /></SoundProvider>);
  await act(async () => { await Promise.resolve(); });
  assert.equal(musicPlayCalls, 0);
  assert.equal(document.querySelector("audio")?.autoplay, false);
  assert.ok(screen.getByRole("button", { name: "เปิดเสียง" }));
});

test("recorded feedback plays above quiet music and the music level returns after each effect", async () => {
  render(<SoundProvider><Game /></SoundProvider>);
  const music = document.querySelector<HTMLAudioElement>('[data-audio="music"]')!;
  const correct = document.querySelector<HTMLAudioElement>('[data-audio="correct"]')!;
  const wrong = document.querySelector<HTMLAudioElement>('[data-audio="wrong"]')!;
  const baseVolume = music.volume;
  assert.ok(baseVolume > 0 && baseVolume < 1);
  fireEvent.click(screen.getByRole("button", { name: "ส่งไปเกาะโทนร้อน" }));
  assert.equal(correct.paused, false);
  assert.ok(music.volume < baseVolume, "music is reduced while feedback plays");
  assert.ok(correct.volume > music.volume * 10, "feedback is clearly above the music");
  fireEvent.ended(correct);
  assert.equal(music.volume, baseVolume);
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 600)); });
  fireEvent.click(screen.getByRole("button", { name: "ส่งไปเกาะโทนร้อน" }));
  assert.equal(wrong.paused, false);
  assert.equal(correct.paused, true, "feedback clips do not overlap each other");
  assert.ok(music.volume < baseVolume);
  fireEvent.ended(wrong);
  assert.equal(music.volume, baseVolume);
});

test("muting also stops a feedback clip already in progress", () => {
  render(<SoundProvider><Game /></SoundProvider>);
  const correct = document.querySelector<HTMLAudioElement>('[data-audio="correct"]')!;
  fireEvent.click(screen.getByRole("button", { name: "ส่งไปเกาะโทนร้อน" }));
  assert.equal(correct.paused, false);
  fireEvent.click(screen.getByRole("button", { name: "ปิดเสียง" }));
  assert.equal(correct.paused, true);
  assert.equal(document.querySelector<HTMLAudioElement>('[data-audio="music"]')?.paused, true);
});

test("fullscreen enters, survives navigation, exits by button, and follows browser Escape", async () => {
  const root = document.documentElement;
  let requests = 0;
  let exits = 0;
  const change = (element: Element | null) => {
    mockFullscreenProperty(document, "fullscreenElement", element);
    document.dispatchEvent(new dom.window.Event("fullscreenchange"));
  };
  mockFullscreenProperty(document, "fullscreenElement", null);
  mockFullscreenProperty(document, "fullscreenEnabled", true);
  mockFullscreenProperty(root, "requestFullscreen", async () => { requests++; change(root); });
  mockFullscreenProperty(document, "exitFullscreen", async () => { exits++; change(null); });
  const firstPage = render(<FullscreenButton />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "ขยายเต็มจอ" })); });
  assert.equal(requests, 1);
  assert.equal(root.dataset.gameDisplay, "fullscreen");
  assert.equal(screen.getByRole("button", { name: "ออกจากเต็มจอ" }).getAttribute("aria-pressed"), "true");

  // Next.js keeps the document while swapping page toolbars.
  firstPage.unmount();
  render(<FullscreenButton />);
  assert.ok(screen.getByRole("button", { name: "ออกจากเต็มจอ" }));
  assert.equal(exits, 0);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "ออกจากเต็มจอ" })); });
  assert.equal(exits, 1);
  assert.equal(root.dataset.gameDisplay, undefined);

  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "ขยายเต็มจอ" })); });
  act(() => { change(null); });
  assert.ok(screen.getByRole("button", { name: "ขยายเต็มจอ" }));
  assert.equal(root.dataset.gameDisplay, undefined);
});

test("devices without a fullscreen API can expand the viewport and return to normal", async () => {
  mockFullscreenProperty(document.documentElement, "requestFullscreen", undefined);
  render(<FullscreenButton />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "ขยายเต็มจอ" })); });
  assert.equal(document.documentElement.dataset.gameDisplay, "expanded");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "กลับขนาดปกติ" })); });
  assert.equal(document.documentElement.dataset.gameDisplay, undefined);
});

test("denied fullscreen falls back safely and Escape respects an open game dialog", async () => {
  mockFullscreenProperty(document.documentElement, "requestFullscreen", async () => { throw new DOMException("Fullscreen denied", "NotAllowedError"); });
  render(<FullscreenButton />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "ขยายเต็มจอ" })); });
  assert.equal(document.documentElement.dataset.gameDisplay, "expanded");
  const modal = document.createElement("dialog");
  modal.setAttribute("open", "");
  document.body.append(modal);
  fireEvent.keyDown(window, { key: "Escape" });
  assert.equal(document.documentElement.dataset.gameDisplay, "expanded");
  modal.remove();
  fireEvent.keyDown(window, { key: "Escape" });
  assert.equal(document.documentElement.dataset.gameDisplay, undefined);
  assert.ok(screen.getByRole("button", { name: "ขยายเต็มจอ" }));
});

test("Safari-prefixed fullscreen methods update the same button and document state", async () => {
  const root = document.documentElement;
  mockFullscreenProperty(root, "requestFullscreen", undefined);
  mockFullscreenProperty(document, "webkitFullscreenElement", null);
  const change = (element: Element | null) => {
    mockFullscreenProperty(document, "webkitFullscreenElement", element);
    document.dispatchEvent(new dom.window.Event("webkitfullscreenchange"));
  };
  mockFullscreenProperty(root, "webkitRequestFullscreen", () => { change(root); });
  mockFullscreenProperty(document, "webkitExitFullscreen", () => { change(null); });
  render(<FullscreenButton />);
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "ขยายเต็มจอ" })); });
  assert.equal(root.dataset.gameDisplay, "fullscreen");
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "ออกจากเต็มจอ" })); });
  assert.equal(root.dataset.gameDisplay, undefined);
});
