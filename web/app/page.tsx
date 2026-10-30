"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

const Dashboard = dynamic(() => import("./Dashboard"), {
  ssr: false,
  loading: () => (
    <main className="login-screen" suppressHydrationWarning>
      <div className="login-card" suppressHydrationWarning>
        <div className="brand-mark">
          <Sparkles size={20} />
        </div>
        <h1>AI Sales Control</h1>
        <p>Yuklanmoqda...</p>
      </div>
    </main>
  ),
});

export default function Home() {
  return <Dashboard />;
}
