"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Translate" },
  { href: "/compare", label: "Compare" },
  { href: "/game", label: "Game" },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-4 py-2 text-base font-semibold transition ${
              active ? "bg-orange-600/20 text-orange-400" : "text-neutral-400 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
