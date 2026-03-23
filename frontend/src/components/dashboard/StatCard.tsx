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
    <Card className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        </div>
        <Icon size={20} style={{ color: accentColor }} className="opacity-70 shrink-0 mt-0.5" />
      </div>
    </Card>
  );
}
