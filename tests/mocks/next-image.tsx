import type { ImageProps } from "next/image";

// Image resizing is tested against the Next.js server. DOM tests only need
// the image's accessible name; JSDOM does not load or lay out image assets.
export default function MockNextImage({ src, preload: _preload, fill: _fill, quality: _quality, loader: _loader, ...props }: ImageProps) {
  const source = typeof src === "string" ? src : "default" in src ? src.default.src : src.src;
  return <img {...props} src={source} />;
}
