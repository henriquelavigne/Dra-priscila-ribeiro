"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Calendar, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingShifts } from "@/components/dashboard/UpcomingShifts";
import { formatCurrency } from "@/lib/utils";
import type { ShiftWithWorkplace } from "@/types";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface DashboardData {
  currentMonthRevenue: number;
  nextMonthRevenue: number;
  currentMonthShiftCount: number;
  upcomingShifts: ShiftWithWorkplace[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d: DashboardData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const currentMonthName = MONTH_NAMES[now.getMonth()];
  const nextMonthIdx = (now.getMonth() + 1) % 12;
  const nextMonthName = MONTH_NAMES[nextMonthIdx];

  const currentRevenue = formatCurrency(Number(data?.currentMonthRevenue ?? 0));
  const nextRevenue = formatCurrency(Number(data?.nextMonthRevenue ?? 0));
  const shiftCount = String(data?.currentMonthShiftCount ?? 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Dra. Priscila Agendor" />

      <div className="px-4 pt-4 pb-28 space-y-4">
        {/* Revenue cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={`Previsão ${currentMonthName}`}
            value={loading ? "..." : currentRevenue}
            icon={TrendingUp}
            accentColor="#3B82F6"
          />
          <StatCard
            label={`Previsão ${nextMonthName}`}
            value={loading ? "..." : nextRevenue}
            icon={Calendar}
            accentColor="#14B8A6"
          />
        </div>

        {/* Shift count */}
        <StatCard
          label="Plantões este mês"
          value={loading ? "..." : shiftCount}
          icon={Briefcase}
          accentColor="#A855F7"
        />

        {/* Upcoming shifts */}
        {loading ? (
          <div className="h-32 bg-white rounded-xl border border-gray-100 animate-pulse" />
        ) : (
          <UpcomingShifts shifts={data?.upcomingShifts ?? []} />
        )}
      </div>
    </div>
  );
}
