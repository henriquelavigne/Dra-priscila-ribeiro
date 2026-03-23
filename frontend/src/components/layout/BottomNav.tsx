"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/dashboard",
    icon: Home,
    label: "Início",
  },
  {
    href: "/workplaces",
    icon: Building2,
    label: "Locais",
  },
  {
    href: "/schedule",
    icon: Calendar,
    label: "Agenda",
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-2 transition-colors",
                isActive ? "text-[#0F172A]" : "text-gray-400"
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

        {/* Financeiro — em breve */}
        <div className="flex flex-col items-center gap-1 flex-1 py-2 opacity-40 cursor-not-allowed">
          <DollarSign size={20} className="text-gray-400" />
          <span className="text-xs text-gray-400">Em breve</span>
        </div>
      </div>
    </nav>
  );
}
