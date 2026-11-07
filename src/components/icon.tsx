type IconName = "home" | "sound" | "muted" | "help" | "restart" | "arrow" | "star" | "check" | "close" | "hand" | "sparkle";

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  sound: <><path d="m11 4-6 5H2v6h3l6 5Z" /><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
  muted: <><path d="m11 4-6 5H2v6h3l6 5Z" /><path d="m17 9 5 6m0-6-5 6" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .5c0 1.5-2.5 2-2.5 3.5m0 3h.01" /></>,
  restart: <><path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" /></>,
  arrow: <><path d="M4 12h16m-6-6 6 6-6 6" /></>,
  star: <><path d="m12 2 3 6.2 6.8 1-4.9 4.8 1.2 6.8-6.1-3.2-6.1 3.2 1.2-6.8L2.2 9.2l6.8-1Z" /></>,
  check: <><path d="m5 12 4 4L19 6" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  hand: <><path d="M9 12V4a2 2 0 0 1 4 0v6l2-1 5 3v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-4-2l-5-7a2 2 0 0 1 3-2l2 2" /></>,
  sparkle: <><path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6ZM20 2v4m-2-2h4" /></>,
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
