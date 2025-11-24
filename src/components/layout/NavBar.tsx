"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useGameStore } from "../../state/gameStore";

export function NavBar() {
  const pathname = usePathname();
  const { hasStarted, endGame } = useGameStore((s) => ({
    hasStarted: s.hasStarted,
    endGame: s.endGame,
  }));

  const siteLinks = useMemo(
    () => [
      { href: "/", label: "Dashboard" },
      { href: "/new-game", label: "New Game" },
    ],
    []
  );

  const gameLinks = useMemo(
    () =>
      hasStarted
        ? [
            { href: "/team", label: "My Team" },
            { href: "/teams", label: "All Teams" },
            { href: "/training", label: "Training" },
            { href: "/staff", label: "Staff" },
            { href: "/sponsors", label: "Sponsors" },
            { href: "/transfers", label: "Transfers" },
            { href: "/scouting", label: "Scouting" },
            { href: "/race-setup", label: "Race Prep" },
            { href: "/calendar", label: "Calendar" },
            { href: "/standings", label: "Standings" },
          ]
        : [],
    [hasStarted]
  );

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c1224]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-900/40" />
            <div>
              <div className="text-sm uppercase tracking-[0.22em] text-blue-200/80">Ski Classics</div>
              <div className="text-lg font-semibold text-slate-50">Manager</div>
            </div>
          </div>
          <nav className="flex items-center gap-2 text-sm font-medium">
            {siteLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 transition ${
                  pathname === link.href ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {hasStarted && (
              <button
                onClick={() => {
                  if (confirm("End current game and reset progress?")) endGame();
                }}
                className="rounded-md bg-white/10 px-3 py-2 text-red-100 transition hover:bg-red-500/20 hover:text-white"
              >
                End Game
              </button>
            )}
          </nav>
        </div>

        {hasStarted && (
          <nav className="flex flex-wrap items-center gap-1 border-t border-white/5 pt-2 text-sm text-slate-200">
            <div className="pr-2 text-xs uppercase tracking-[0.2em] text-blue-200/80">Game</div>
            {gameLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1 transition ${
                  pathname === link.href ? "bg-blue-500 text-white" : "hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
