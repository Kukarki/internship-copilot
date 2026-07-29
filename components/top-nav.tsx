"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Moon, Sun, Compass } from "lucide-react";

export function TopNav({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
        <Link href={signedIn ? "/dashboard" : "/"} className="flex items-center gap-2 font-semibold">
          <span className="grid place-items-center h-7 w-7 rounded-lg bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" />
          </span>
          <span>Internship Copilot</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {signedIn && (
            <>
              <Link href="/dashboard" className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">Dashboard</Link>
              <Link href="/jobs" className="px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors">Jobs</Link>
            </>
          )}
          <button onClick={toggle} className="grid place-items-center h-8 w-8 rounded-md hover:bg-accent transition-colors" aria-label="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {children}
        </nav>
      </div>
    </header>
  );
}