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
        <Route path="/voice-analytics-dashboard" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </main>
  );
}
