import React, { useState } from "react";

interface EmailGateModalProps {
  visible: boolean;
  onSubmitEmail: (email: string) => void;
  onClose: () => void;
}

export default function EmailGateModal({
  visible,
  onSubmitEmail,
  onClose,
}: EmailGateModalProps) {
  const [email, setEmail] = useState("");

  if (!visible) return null;

  return (
    <div
      className="
        fixed inset-0 z-[100] flex items-center justify-center p-4
        bg-black/80
        animate-fade-in
      "
    >
      <div
        className="
          card-glass w-full max-w-sm p-5 relative
          opacity-80 scale-[0.96]
          animate-fade-up
        "
      >
        {/* close button */}
        <button
          className="absolute top-3 right-3 text-textMuted hover:text-white text-xs transition-colors"
          onClick={onClose}
        >
          ✕
        </button>

        {/* title */}
        <div className="text-white font-semibold text-base mb-2 tracking-tight">
          Before you edit…
        </div>

        {/* body copy */}
        <p className="text-textDim text-xs leading-relaxed mb-4">
          We store your custom call metrics in Supabase so you can come back and
          tweak them later. Please enter your email.
        </p>

        {/* form */}
        <div className="flex flex-col gap-3">
          <input
            required
            type="email"
            className="
              rounded-xl bg-black/40
              border border-borderDim
              text-white text-xs px-3 py-2
              outline-none
              focus:border-mint focus:ring-0
              transition-colors
            "
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            className="btn-pill justify-center text-xs md:text-sm"
            onClick={() => {
              if (!email) return;
              onSubmitEmail(email.trim().toLowerCase());
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
