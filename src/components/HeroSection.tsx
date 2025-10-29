import React from "react";
import image from "../assets/1.png";
export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 hero-grid-overlay" />
      <div className="absolute inset-0 bg-mint-radial opacity-40 pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <div className="animate-fade-up [animation-delay:0ms] opacity-0">
          <div className="inline-flex items-center gap-2 rounded-pill border border-mint/30 bg-mint/10 text-mint px-3 py-1 text-[10px] md:text-xs font-medium mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_10px_rgba(167,243,208,1)]" />
            <span>Helping Engineering Teams Scale Voice AI</span>
          </div>
          <h1 className="hero-headline text-4xl sm:text-5xl md:text-6xl leading-tight text-white">
            <span className="block">Call Intelligence</span>
            <span className="block">
              for Your <span className="hero-highlight">Voice Agent</span>
            </span>
          </h1>
          <p className="font-display text-lg md:text-xl text-textDim mt-6 leading-relaxed max-w-md">
            Your voice agent is talking to real customers right now. We surface
            what’s breaking, how fast issues get resolved, and how happy callers
            are — automatically.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button className="btn-pill text-sm md:text-base">
              <span>Get Started</span>
            </button>

            <button className="rounded-pill border border-borderDim text-white/80 hover:text-white hover:border-white/60 text-xs md:text-sm px-4 py-2 bg-white/5 backdrop-blur-md">
              Contact Sales
            </button>
          </div>
          <p className="text-[10px] md:text-xs text-textMuted mt-6">
            “Voice agents fail. We make fixing them effortless.”
          </p>
        </div>

        <div className="animate-fade-up [animation-delay:150ms] opacity-0">
          <div className="demo-card p-2 md:p-5 w-full max-w-md shadow-cardGlow border border-borderDim rounded-xl3 bg-black/40 backdrop-blur-md">
            <div className="relative w-full rounded-xl border border-borderDim bg-black/80 shadow-inner overflow-hidden">
              <div className="w-full pt-[56.25%]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  className="max-w-full max-h-full rounded-lg"
                  src={image}
                  alt="Product demo preview"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col items-center text-center">
              <div className="flex items-center gap-2">
                <span className="text-[10px] leading-none text-black bg-mint rounded-pill px-2 py-[2px] font-medium tracking-tight">
                  demo
                </span>
                <span className="text-white text-sm md:text-base font-semibold tracking-tight">
                  Preview
                </span>
              </div>

              <div className="text-textMuted text-[10px] md:text-xs mt-2 leading-relaxed max-w-[90%]">
                Core analytics dashboard view — call volume, failure trends, and
                SLA tracking.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
