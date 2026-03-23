"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { FinanceCard } from "@/components/finance/FinanceCard";
import { PaymentForm } from "@/components/finance/PaymentForm";
import { AutoNoteSection } from "@/components/finance/AutoNoteSection";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import type { ShiftWithPaymentStatus, FinanceSummary, Payment } from "@/types";
import { toast } from "sonner";

const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type FilterType = "all" | "pending" | "paid";

const FILTER_LABELS: Record<FilterType, string> = {
  all: "Todos",
  pending: "Pendentes",
  paid: "Recebidos",
};

const EMPTY_LABELS: Record<FilterType, string> = {
  all: "nenhum plantão realizado",
  pending: "nenhum plantão pendente",
  paid: "nenhum plantão recebido",
};

function SummarySkeleton() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2">
          <Skeleton className="h-3 w-14 rounded" />
          <Skeleton className="h-5 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function FinancesPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [filter, setFilter] = useState<FilterType>("all");

  const [shifts, setShifts] = useState<ShiftWithPaymentStatus[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [activeAutoNotesCount, setActiveAutoNotesCount] = useState(0);
  const [loadingData, setLoadingData] = useState(true);

  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftWithPaymentStatus | null>(null);
  const [existingPayment, setExistingPayment] = useState<Payment | null>(null);
  const [autoNoteOpen, setAutoNoteOpen] = useState(false);

  const fetchData = useCallback(async (m: number, y: number, f: FilterType) => {
    setLoadingData(true);
    try {
      const statusParam = f !== "all" ? `&status=${f}` : "";
      const [, shiftsRes, summaryRes] = await Promise.all([
        fetch("/api/auto-notes/check", { method: "POST" }),
        fetch(`/api/payments?month=${m}&year=${y}${statusParam}`),
        fetch(`/api/payments/summary?month=${m}&year=${y}`),
      ]);

      const [shiftsData, summaryData] = await Promise.all([
        shiftsRes.ok ? shiftsRes.json() : [],
        summaryRes.ok ? summaryRes.json() : null,
      ]);

      setShifts(shiftsData);
      setSummary(summaryData);

      // Get active auto-notes count
      const notesRes = await fetch("/api/auto-notes?status=active");
      if (notesRes.ok) {
        const groups = await notesRes.json();
        const count = groups.reduce(
          (sum: number, g: { overdueCount: number }) => sum + g.overdueCount,
          0
        );
        setActiveAutoNotesCount(count);
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month, year, filter);
  }, [fetchData, month, year, filter]);

  function handlePrevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function handleNextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  function openRegister(shift: ShiftWithPaymentStatus) {
    setSelectedShift(shift);
    setExistingPayment(null);
    setPaymentFormOpen(true);
  }

  function openEdit(shift: ShiftWithPaymentStatus) {
    setSelectedShift(shift);
    setExistingPayment(shift.payment);
    setPaymentFormOpen(true);
  }

  function handleSaved() {
    setPaymentFormOpen(false);
    fetchData(month, year, filter);
  }

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;
  const totalExpected = summary?.totalExpected ?? 0;
  const totalReceived = summary?.totalReceived ?? 0;
  const totalPending = summary?.totalPending ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Financeiro" />

      <div className="px-4 pt-4 pb-28 space-y-4">

        {/* Auto-notes banner */}
        {activeAutoNotesCount > 0 && (
          <button
            className="w-full flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium active:bg-red-100 transition-colors"
            onClick={() => setAutoNoteOpen(true)}
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>{activeAutoNotesCount} pendência(s) de pagamento atrasado</span>
          </button>
        )}

        {/* Summary cards */}
        {loadingData ? <SummarySkeleton /> : (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-xs text-gray-500 font-medium">Previsto</p>
              <p className="text-sm font-bold text-blue-600 mt-1 truncate">{formatCurrency(totalExpected)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-xs text-gray-500 font-medium">Recebido</p>
              <p className="text-sm font-bold text-green-600 mt-1 truncate">{formatCurrency(totalReceived)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <p className="text-xs text-gray-500 font-medium">Pendente</p>
              <p className="text-sm font-bold text-red-600 mt-1 truncate">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        )}

        {/* Overdue/partial counters */}
        {!loadingData && summary && (summary.overdueCount > 0 || summary.partialCount > 0) && (
          <p className="text-xs text-red-500 -mt-2">
            {summary.overdueCount > 0 && `${summary.overdueCount} atrasado(s)`}
            {summary.overdueCount > 0 && summary.partialCount > 0 && " · "}
            {summary.partialCount > 0 && `${summary.partialCount} parcial(is)`}
          </p>
        )}

        {/* Month navigation */}
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2">
          <button
            aria-label="Mês anterior"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg active:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <span className="font-semibold text-gray-900 text-sm">{monthLabel}</span>
          <button
            aria-label="Próximo mês"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg active:bg-gray-100 transition-colors"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2">
          {(Object.keys(FILTER_LABELS) as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-[#0F172A] text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Shift list */}
        {loadingData ? <ListSkeleton /> : shifts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">
            Nenhum plantão {EMPTY_LABELS[filter]} neste período.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {monthLabel} — {shifts.length} plantão(ões)
            </p>
            {shifts.map((shift) => (
              <FinanceCard
                key={shift.id}
                shift={shift}
                onRegisterPayment={openRegister}
                onEditPayment={openEdit}
              />
            ))}
          </div>
        )}
      </div>

      <PaymentForm
        shift={selectedShift}
        existingPayment={existingPayment}
        open={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        onSaved={handleSaved}
      />

      <AutoNoteSection
        open={autoNoteOpen}
        onClose={() => setAutoNoteOpen(false)}
        onRefresh={() => fetchData(month, year, filter)}
      />
    </div>
  );
}
