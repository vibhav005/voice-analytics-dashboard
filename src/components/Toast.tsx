import React from "react";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
}

export default function Toast({ message, type }: ToastProps) {
  const base =
    "fixed bottom-4 right-4 z-[200] rounded-xl px-4 py-3 text-sm font-medium shadow-cardGlow border";
  const palette =
    type === "success"
      ? "bg-black/70 text-mint border-mint/40"
      : "bg-black/70 text-red-400 border-red-400/40";

  return <div className={`${base} ${palette}`}>{message}</div>;
}
