"use client";

import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  accentColor: string;
}

export function StatCard({ label, value, icon: Icon, accentColor }: StatCardProps) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-[20px] shadow-luxury p-5 border border-sand-dark/50 flex items-center justify-between hover-lift">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-serif font-bold text-slate-900 mt-1 truncate tracking-tight">{value}</p>
      </div>
      <div className="p-2 bg-sand rounded-xl">
        <Icon size={20} style={{ color: accentColor }} className="opacity-90 shrink-0" />
      </div>
    </div>
  );
}
