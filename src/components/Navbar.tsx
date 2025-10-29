// src/components/Navbar.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="relative z-20">
      {/* glow line on top */}
      <div className="top-glow-bar" />

      <nav className="flex flex-col bg-[rgba(0,0,0,0.4)] backdrop-blur-md border-b border-borderDim">
        <div className="flex items-center justify-between px-6 md:px-10 py-4">
          {/* LEFT brand */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-black/60 border border-borderDim flex items-center justify-center text-mint font-bold text-[10px] shadow-[0_10px_30px_rgba(167,243,208,0.4)]">
              VA
            </div>

            <span className="flex items-baseline gap-1 font-display font-semibold tracking-tight">
              <span className="text-white text-sm md:text-base leading-none italic">
                VoiceOps
              </span>
              <span className="text-mint text-sm md:text-base leading-none">
                IQ
              </span>
            </span>
          </div>

          {/* RIGHT nav links */}
          <div className="flex items-center gap-6">
            <Link
              className="nav-link underline underline-offset-4 decoration-mint text-xs md:text-sm"
              to="/"
            >
              Home
            </Link>

            <Link className="nav-link text-xs md:text-sm" to="/dashboard">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
