"use client";

import { useEffect, useId, useRef } from "react";

export function Dialog({ title, children, onDismiss, alert = false, className = "" }: {
  title: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  alert?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return (
    <dialog ref={ref} className={`game-dialog ${className}`} role={alert ? "alertdialog" : "dialog"} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onDismiss?.(); }}>
      <div className="dialog-inner">
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </dialog>
  );
}
