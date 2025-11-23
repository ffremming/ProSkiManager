 "use client";

import Link from "next/link";
import { useGameStore } from "../../state/gameStore";

export function NavBar() {
  const hasStarted = useGameStore((s) => s.hasStarted);
  const links = hasStarted
    ? [
        { href: "/", label: "Dashboard" },
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
    : [
        { href: "/", label: "Dashboard" },
        { href: "/new-game", label: "New Game" },
      ];
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c1224]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-900/40" />
          <div>
            <div className="text-sm uppercase tracking-[0.22em] text-blue-200/80">Ski Classics</div>
            <div className="text-lg font-semibold text-slate-50">Manager</div>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm font-medium">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-slate-200 transition hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
