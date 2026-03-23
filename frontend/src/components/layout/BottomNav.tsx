"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Calendar, DollarSign, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: Home, label: "Início" },
  { href: "/workplaces", icon: Building2, label: "Locais" },
  { href: "/schedule", icon: Calendar, label: "Agenda" },
  { href: "/finances", icon: DollarSign, label: "Financeiro" },
  { href: "/settings", icon: Settings, label: "Config" },
];

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-sand-dark"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-2 transition-all",
                isActive ? "text-gold" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <Icon size={20} />
              <span
                className={cn(
                  "text-xs",
                  isActive ? "font-semibold" : "font-normal"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
