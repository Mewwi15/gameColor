import assert from "node:assert/strict";
import test from "node:test";
import { COLORS, COLOR_ORDER, ISLANDS, createGame, explainColor, gameReducer, isCorrectAnswer, shuffledColors, type ColorId, type IslandId } from "../src/lib/game.ts";

const expected: Record<ColorId, IslandId[]> = {
  blue: ["cool"], sky: ["cool"], green: ["cool"],
  red: ["warm"], orange: ["warm"], pink: ["warm"],
  purple: ["warm", "cool", "both"], yellow: ["warm", "cool", "both"],
};

for (const [color, islands] of Object.entries(expected) as [ColorId, IslandId[]][]) {
  test(`สี${COLORS[color].name}: validates all three destinations`, () => {
    for (const island of ISLANDS) assert.equal(isCorrectAnswer(color, island.id), islands.includes(island.id));
  });
}

test("a wrong answer reveals feedback and must be retried on the same color", () => {
  const initial = createGame(["red", "sky"]);
  const wrong = gameReducer(initial, { type: "answer", island: "cool" });
  assert.equal(wrong.status, "incorrect");
  assert.equal(wrong.index, 0);
  assert.equal(wrong.solved.length, 0);
  assert.equal(wrong.mistakes, 1);
  assert.match(explainColor("red"), /เกาะโทนร้อน/);
  assert.deepEqual(gameReducer(wrong, { type: "continue" }), wrong);
  assert.deepEqual(gameReducer(wrong, { type: "answer", island: "warm" }), wrong);
  const retry = gameReducer(wrong, { type: "retry" });
  assert.equal(retry.status, "playing");
  assert.equal(retry.order[retry.index], "red");
  const correct = gameReducer(retry, { type: "answer", island: "warm" });
  assert.equal(correct.status, "correct");
  assert.equal(correct.solved[0].firstTry, false);
  const next = gameReducer(correct, { type: "continue" });
  assert.equal(next.index, 1);
  assert.equal(next.roundMistakes, 0);
});

test("rapid duplicate answers never score twice or skip a round", () => {
  const correct = gameReducer(createGame(), { type: "answer", island: "warm" });
  assert.equal(correct.solved.length, 1);
  assert.deepEqual(gameReducer(correct, { type: "answer", island: "warm" }), correct);
  const next = gameReducer(correct, { type: "continue" });
  assert.deepEqual(gameReducer(next, { type: "continue" }), next);
  assert.equal(next.index, 1);
});

test("every color must be solved before the mission completes", () => {
  let state = createGame();
  for (let i = 0; i < COLOR_ORDER.length; i++) {
    assert.equal(state.status, "playing");
    assert.equal(state.index, i);
    state = gameReducer(state, { type: "answer", island: COLORS[state.order[i]].group });
    assert.equal(state.status, "correct");
    state = gameReducer(state, { type: "continue" });
  }
  assert.equal(state.status, "complete");
  assert.equal(state.solved.length, 8);
  assert.equal(state.mistakes, 0);
  assert.equal(state.solved.every((entry) => entry.firstTry), true);
  assert.deepEqual(gameReducer(state, { type: "answer", island: "warm" }), state);
});

test("restarting clears progress and shuffling retains all eight distinct colors", () => {
  const wrong = gameReducer(createGame(), { type: "answer", island: "both" });
  const order = shuffledColors();
  assert.equal(new Set(order).size, 8);
  assert.deepEqual([...order].sort(), [...COLOR_ORDER].sort());
  const reset = gameReducer(wrong, { type: "restart", order });
  assert.equal(reset.index, 0);
  assert.equal(reset.mistakes, 0);
  assert.equal(reset.solved.length, 0);
  assert.equal(reset.status, "playing");
});
