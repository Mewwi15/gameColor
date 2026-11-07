import type { Metadata, Viewport } from "next";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/600.css";
import "@fontsource/noto-sans-thai/700.css";
import "@fontsource/noto-sans-thai/800.css";
import { SoundProvider } from "@/components/sound-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ภารกิจส่งสีไป 3 เกาะ",
  description: "เรียนรู้โทนร้อน โทนเย็น และสีสองโทน ผ่านเกมลากลูกบอลสีไปยังเกาะแสนสนุก",
  applicationName: "ภารกิจส่งสีไป 3 เกาะ",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#08b9df" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body><SoundProvider>{children}</SoundProvider></body></html>;
}
