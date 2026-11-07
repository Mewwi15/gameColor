import type { Metadata } from "next";
import { Game } from "@/components/game";

export const metadata: Metadata = { title: "เล่นเกม | ภารกิจส่งสีไป 3 เกาะ" };

export default function PlayPage() {
  return <Game />;
}
