export type IslandId = "warm" | "cool" | "both";
export type ColorId = "blue" | "sky" | "green" | "red" | "orange" | "pink" | "purple" | "yellow";

export const ISLANDS = [
  { id: "warm", name: "เกาะโทนร้อน", image: "/assets/island-warm.png", description: "อบอุ่น สดใส มีพลัง", colors: "แดง · ส้ม · ชมพู" },
  { id: "cool", name: "เกาะโทนเย็น", image: "/assets/island-cool.png", description: "เย็นสบาย ผ่อนคลาย", colors: "น้ำเงิน · ฟ้า · เขียว" },
  { id: "both", name: "เกาะสองโทน", image: "/assets/island-both.png", description: "เป็นได้ทั้งโทนร้อนและโทนเย็น", colors: "ม่วง · เหลือง" },
] as const;

export const COLORS: Record<ColorId, { name: string; hex: string; group: IslandId; image: string }> = {
  blue: { name: "น้ำเงิน", hex: "#194bff", group: "cool", image: "/assets/ball-blue.png" },
  sky: { name: "ฟ้า", hex: "#00c8f4", group: "cool", image: "/assets/ball-sky.png" },
  green: { name: "เขียว", hex: "#21c434", group: "cool", image: "/assets/ball-green.png" },
  red: { name: "แดง", hex: "#ff354d", group: "warm", image: "/assets/ball-red.png" },
  orange: { name: "ส้ม", hex: "#ff8b16", group: "warm", image: "/assets/ball-orange.png" },
  pink: { name: "ชมพู", hex: "#fc4cab", group: "warm", image: "/assets/ball-pink.png" },
  purple: { name: "ม่วง", hex: "#a634ee", group: "both", image: "/assets/ball-purple.png" },
  yellow: { name: "เหลือง", hex: "#ffcf2b", group: "both", image: "/assets/ball-yellow.png" },
};

export const COLOR_ORDER: ColorId[] = ["red", "blue", "yellow", "pink", "green", "purple", "orange", "sky"];

// Dual-tone colors are valid on the warm, cool, and dedicated dual-tone islands.
export function isCorrectAnswer(color: ColorId, island: IslandId): boolean {
  return COLORS[color].group === "both" || COLORS[color].group === island;
}

export function explainColor(color: ColorId): string {
  const { name, group } = COLORS[color];
  if (group === "both") return `สี${name}อยู่ได้ทั้งโทนร้อนและโทนเย็น จึงไปได้ทั้ง 3 เกาะเลย!`;
  return `สี${name}เป็นสีโทน${group === "warm" ? "ร้อน" : "เย็น"} ต้องส่งไปที่เกาะโทน${group === "warm" ? "ร้อน" : "เย็น"}นะ`;
}

export function shuffledColors(): ColorId[] {
  const order = [...COLOR_ORDER];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export type GameState = {
  order: ColorId[];
  index: number;
  status: "playing" | "correct" | "incorrect" | "complete";
  solved: { color: ColorId; island: IslandId; firstTry: boolean }[];
  mistakes: number;
  roundMistakes: number;
  selectedIsland: IslandId | null;
};

export function createGame(order: ColorId[] = COLOR_ORDER): GameState {
  return { order: [...order], index: 0, status: "playing", solved: [], mistakes: 0, roundMistakes: 0, selectedIsland: null };
}

export type GameAction =
  | { type: "answer"; island: IslandId }
  | { type: "continue" }
  | { type: "retry" }
  | { type: "restart"; order: ColorId[] };

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "restart") return createGame(action.order);
  if (action.type === "retry") return state.status === "incorrect" ? { ...state, status: "playing", selectedIsland: null } : state;
  if (action.type === "continue") {
    if (state.status !== "correct") return state;
    if (state.index === state.order.length - 1) return { ...state, status: "complete" };
    return { ...state, index: state.index + 1, status: "playing", roundMistakes: 0, selectedIsland: null };
  }
  if (state.status !== "playing") return state;
  const color = state.order[state.index];
  if (!isCorrectAnswer(color, action.island)) {
    return { ...state, status: "incorrect", selectedIsland: action.island, mistakes: state.mistakes + 1, roundMistakes: state.roundMistakes + 1 };
  }
  return {
    ...state,
    status: "correct",
    selectedIsland: action.island,
    solved: [...state.solved, { color, island: action.island, firstTry: state.roundMistakes === 0 }],
  };
}
