// src/App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";

export default function App() {
  return (
    <main className="relative min-h-screen flex flex-col text-white bg-bgDark">
      <Navbar />

      {/* Routes */}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>

      <footer className="px-6 md:px-10 pb-10 text-[10px] md:text-xs text-textMuted max-w-7xl mx-auto w-full">
        <div>
          © {new Date().getFullYear()} VoiceOps IQ. All rights reserved.
        </div>
        <div className="mt-2">
          Built with React + TS + Supabase. Data shown is demo data only.
        </div>
      </footer>
    </main>
  );
}
