"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Calendar,
  Briefcase,
  Building2,
  CheckCircle,
  Wallet,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { UpcomingShifts } from "@/components/dashboard/UpcomingShifts";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { ShiftWithWorkplace } from "@/types";
import { toast } from "sonner";
import { MONTH_NAMES } from "@/lib/constants";



interface ChartPoint {
  month: number;
  year: number;
  monthLabel: string;
  expected: number;
  received: number;
}

interface DashboardData {
  currentMonthRevenue: number;
  nextMonthRevenue: number;
  currentMonthShiftCount: number;
  upcomingShifts: ShiftWithWorkplace[];
  currentMonthConfirmedRevenue: number;
  currentMonthReceived: number;
  totalPending: number;
  activeAutoNotesCount: number;
  revenueChart: ChartPoint[];
}

function DashboardSkeleton() {
  return (
    <div className="px-4 pt-4 pb-28 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[1,2,3,4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-7 w-32 rounded" />
          </div>
        ))}
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <Skeleton className="h-3 w-28 rounded" />
        <Skeleton className="h-7 w-10 rounded" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-36 rounded" />
        {[1,2,3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  function load() {
    setLoading(true);
    setError(false);
    fetch("/api/dashboard")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: DashboardData) => setData(d))
      .catch(() => {
        setError(true);
        toast.error("Erro de conexão. Tente novamente.");
      })
      .finally(() => setLoading(false));
  }

  // Revalidate when user returns to the tab
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") load();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, []);

  async function handleDownload() {
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `agendor-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup exportado com sucesso");
    } catch {
      toast.error("Erro ao exportar backup");
    }
  }

  const now = new Date();
  const currentMonthName = MONTH_NAMES[now.getMonth()];
  const nextMonthName = MONTH_NAMES[(now.getMonth() + 1) % 12];

  const isEmpty =
    !loading && !error && data !== null &&
    data.currentMonthShiftCount === 0 &&
    data.upcomingShifts.length === 0;

  if (loading) return (
    <div className="min-h-screen bg-sand-light">
      <PageHeader
        title="Dra. Priscila Agendor"
        rightAction={
          <button
            aria-label="Exportar backup"
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-gray-400 active:bg-gray-100 transition-colors"
          >
            <Download size={20} />
          </button>
        }
      />
      <DashboardSkeleton />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-sand-light">
      <PageHeader
        title="Dra. Priscila Agendor"
        rightAction={
          <button
            aria-label="Exportar backup"
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-gray-400 active:bg-gray-100 transition-colors"
          >
            <Download size={20} />
          </button>
        }
      />
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <p className="text-gray-500 mb-4">Não foi possível carregar os dados.</p>
        <Button variant="outline" onClick={load}>Tentar novamente</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title="Dra. Priscila Agendor"
        rightAction={
          <button
            aria-label="Exportar backup"
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-gray-400 active:bg-gray-100 transition-colors"
          >
            <Download size={20} />
          </button>
        }
      />

      <div className="px-4 pt-4 pb-28 space-y-4">

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-1">
              Comece adicionando seus locais de trabalho
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Cadastre um local para poder agendar plantões
            </p>
            <Button
              className="bg-[#0F172A] hover:bg-[#1e293b] text-white"
              onClick={() => router.push("/workplaces")}
            >
              Ir para Locais
            </Button>
          </div>
        ) : (
          <>
            {/* Seção 1 — Previsões */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label={`Previsão ${currentMonthName}`}
                value={formatCurrency(Number(data?.currentMonthRevenue ?? 0))}
                icon={TrendingUp}
                accentColor="#3B82F6"
              />
              <StatCard
                label={`Previsão ${nextMonthName}`}
                value={formatCurrency(Number(data?.nextMonthRevenue ?? 0))}
                icon={Calendar}
                accentColor="#14B8A6"
              />
            </div>

            {/* Seção 2 — Confirmado + Recebido */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label={`Confirmado ${currentMonthName}`}
                value={formatCurrency(Number(data?.currentMonthConfirmedRevenue ?? 0))}
                icon={CheckCircle}
                accentColor="#22C55E"
              />
              <StatCard
                label={`Recebido ${currentMonthName}`}
                value={formatCurrency(Number(data?.currentMonthReceived ?? 0))}
                icon={Wallet}
                accentColor="#15803D"
              />
            </div>

            {/* Seção 3 — Pendências */}
            {(data?.totalPending ?? 0) > 0 ? (
              <button
                className="w-full text-left bg-red-50 border border-red-200 rounded-xl p-4 active:bg-red-100 transition-colors"
                onClick={() => router.push("/finances")}
              >
                <p className="font-bold text-red-700">
                  Pendências: {formatCurrency(Number(data?.totalPending ?? 0))}
                </p>
                <p className="text-sm text-red-500 mt-0.5">
                  {data?.activeAutoNotesCount ?? 0} plantão(ões) com pagamento atrasado
                </p>
              </button>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="font-medium text-green-700">Pagamentos em dia ✓</p>
              </div>
            )}

            {/* Seção 4 — Quantidade de plantões */}
            <StatCard
              label="Plantões este mês"
              value={String(data?.currentMonthShiftCount ?? 0)}
              icon={Briefcase}
              accentColor="#A855F7"
            />

            {/* Seção 5 — Gráfico */}
            {data?.revenueChart && data.revenueChart.length > 0 && (
              <RevenueChart data={data.revenueChart} />
            )}

            {/* Seção 6 — Próximos plantões */}
            <UpcomingShifts shifts={data?.upcomingShifts ?? []} />
          </>
        )}
      </div>
    </div>
  );
}
