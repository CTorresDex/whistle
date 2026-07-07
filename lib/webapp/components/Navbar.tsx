"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// navbar-items.pug — navbar-item#home "Playlist", navbar-item#explore "Explora"
const NAV_ITEMS = [
  { id: "home", href: "/home", label: "Playlist" },
  { id: "explore", href: "/explore", label: "Explora" },
];

interface Props {
  center?: ReactNode;
  children?: ReactNode;
}

// navbar — nav items on the left, an optional centered slot (e.g. explore's search
// form) and an optional right-aligned actions slot (e.g. home's download button).
export function Navbar({ center, children }: Props) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-4 py-4">
      <div data-testid="navbar-items" className="flex items-center gap-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              data-testid={`nav-${item.id}`}
              className={
                active
                  ? "font-semibold text-emerald-400"
                  : "font-medium text-neutral-400 hover:text-neutral-200"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {center && <div className="flex flex-1 justify-center">{center}</div>}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </nav>
  );
}
