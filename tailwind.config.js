/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bgDark: "#0d0f0f", // slightly softer than pure black
        surfaceDark: "#1a1d1a",
        borderDim: "rgba(255,255,255,0.08)",
        textDim: "rgba(255,255,255,0.6)",
        textMuted: "rgba(255,255,255,0.4)",
        mint: "#a7f3d0", // mint highlight (like 'Scale' in screenshot)
      },
      fontFamily: {
        // we'll use this for the big hero headline
        display: ['"Times New Roman"', "Georgia", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        // grid pattern like the screenshot hero background
        "hero-grid":
          "linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px)",
        // subtle green glow we can overlay
        "mint-radial":
          "radial-gradient(circle at 20% 20%, rgba(167,243,208,0.12) 0%, rgba(13,15,15,0) 70%)",
      },
      backgroundSize: {
        "grid-40": "40px 40px",
      },
      boxShadow: {
        cardGlow:
          "0 20px 60px rgba(0,0,0,0.9), 0 0 30px rgba(167,243,208,0.12)",
      },
      borderRadius: {
        pill: "9999px",
        xl3: "1.5rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in": "fade-in 0.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};
