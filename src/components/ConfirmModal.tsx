// src/components/ConfirmModal.tsx
import React from "react";

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  visible,
  title,
  body,
  confirmLabel = "Yes, overwrite",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!visible) return null;

  return (
    <div
      className="
        fixed inset-0 z-[150] flex items-center justify-center p-4
        bg-black/80 animate-fade-in
      "
    >
      <div
        className="
          card-glass w-full max-w-sm p-5 relative
          opacity-80 scale-[0.96] animate-fade-up
          border border-borderDim rounded-xl3 shadow-cardGlow
        "
      >
        {/* close button in corner */}
        <button
          className="absolute top-3 right-3 text-textMuted hover:text-white text-xs transition-colors"
          onClick={onCancel}
        >
          ✕
        </button>

        <div className="text-white font-semibold text-base mb-2 tracking-tight">
          {title}
        </div>

        <p className="text-textDim text-xs leading-relaxed mb-4">{body}</p>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="
              btn-pill
              text-xs md:text-sm
              justify-center flex-1
              whitespace-nowrap
            "
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>

          <button
            className="
              flex-1 rounded-pill border border-borderDim bg-black/40
              text-white/80 hover:text-white hover:border-white/60
              text-[10px] md:text-xs px-3 py-2
              backdrop-blur-md transition-colors whitespace-nowrap
            "
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
