"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MonthView } from "@/components/calendar/MonthView";
import { MonthFooter } from "@/components/calendar/MonthFooter";
import { ShiftDetail } from "@/components/shift/ShiftDetail";
import { ShiftForm } from "@/components/shift/ShiftForm";
import { DayConflictAlert } from "@/components/shift/DayConflictAlert";
import type { CalendarShift } from "@/components/calendar/ShiftBlock";
import type { Workplace } from "@/types";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MONTH_NAMES_SHORT } from "@/lib/constants";



export default function SchedulePage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-indexed

  const [shifts, setShifts] = useState<CalendarShift[]>([]);
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(true);

  // Selected day state
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  // Sheet / dialog state
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formShift, setFormShift] = useState<CalendarShift | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [conflictShifts, setConflictShifts] = useState<CalendarShift[]>([]);
  const [pendingCreateDate, setPendingCreateDate] = useState<Date | null>(null);

  // Fetch shifts for the current month
  const fetchShifts = useCallback(async () => {
    setLoadingShifts(true);
    try {
      const res = await fetch(`/api/shifts?month=${month}&year=${year}`);
      if (!res.ok) throw new Error();
      const data: CalendarShift[] = await res.json();
      setShifts(data);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
      setShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  }, [month, year]);

  // Fetch active workplaces (once)
  useEffect(() => {
    fetch("/api/workplaces?activeOnly=true")
      .then((r) => r.json())
      .then((data: Workplace[]) => setWorkplaces(data))
      .catch(() => setWorkplaces([]));
  }, []);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  function handlePrevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function getShiftsForDate(date: Date): CalendarShift[] {
    return shifts.filter((s) => {
      const d = new Date(s.date);
      return (
        d.getUTCFullYear() === date.getFullYear() &&
        d.getUTCMonth() === date.getMonth() &&
        d.getUTCDate() === date.getDate()
      );
    });
  }

  function handleDayClick(date: Date) {
    setSelectedDate(date);
    setDetailOpen(true);
  }

  // Called when user taps "+ Adicionar plantão" in ShiftDetail
  async function handleCreate(date: Date) {
    setDetailOpen(false);

    // Check for conflicts via API
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/shifts/by-date/${iso}`);
      const existing: CalendarShift[] = res.ok ? await res.json() : [];
      if (existing.length > 0) {
        setConflictShifts(existing);
        setPendingCreateDate(date);
        setConflictOpen(true);
      } else {
        openForm(date, null);
      }
    } catch {
      openForm(date, null);
    }
  }

  function handleConflictConfirm() {
    setConflictOpen(false);
    if (pendingCreateDate) openForm(pendingCreateDate, null);
  }

  function handleConflictCancel() {
    setConflictOpen(false);
    setPendingCreateDate(null);
    // Re-open detail sheet for the same date
    setDetailOpen(true);
  }

  function openForm(date: Date, shift: CalendarShift | null) {
    setSelectedDate(date);
    setFormShift(shift);
    setFormOpen(true);
  }

  function handleEdit(shift: CalendarShift) {
    setDetailOpen(false);
    openForm(selectedDate, shift);
  }

  function handleFormSaved() {
    fetchShifts();
    setFormOpen(false);
    setDetailOpen(false);
  }

  function handleRefresh() {
    fetchShifts();
  }

  // Compute total revenue for non-cancelled shifts
  const totalRevenue = shifts
    .filter((s) => s.status !== "cancelled")
    .reduce((sum, s) => sum + Number(s.expectedValue), 0);

  const monthLabel = `${MONTH_NAMES_SHORT[month - 1]}/${year}`;
  const selectedDayShifts = getShiftsForDate(selectedDate);

  return (
    <div className="min-h-screen bg-sand-light pb-8">
      <PageHeader title="Agenda" />

      <div className="pb-32">
        {loadingShifts ? (
          <div className="bg-white/80 backdrop-blur-sm border-b border-sand-dark/50">
            {/* Header skeleton */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-sand-dark/50">
              <Skeleton className="w-8 h-8 rounded-lg" />
              <Skeleton className="w-32 h-5 rounded" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            {/* Week days skeleton */}
            <div className="grid grid-cols-7 border-b border-sand-dark/50 py-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="mx-auto w-6 h-3 rounded" />
              ))}
            </div>
            {/* Grid skeleton */}
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="min-h-[72px] border-b border-r border-sand-dark/50 p-1.5">
                  <Skeleton className="w-5 h-5 rounded-full mb-1.5" />
                  {i % 5 === 0 && <Skeleton className="w-full h-3 rounded-sm" />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <MonthView
            year={year}
            month={month}
            shifts={shifts}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      <MonthFooter totalRevenue={totalRevenue} monthLabel={monthLabel} />

      <ShiftDetail
        date={selectedDate}
        shifts={selectedDayShifts}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={handleEdit}
        onCreate={handleCreate}
        onRefresh={handleRefresh}
      />

      <ShiftForm
        date={selectedDate}
        shift={formShift}
        workplaces={workplaces}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          // Re-open detail if coming from edit
          if (formShift) setDetailOpen(true);
        }}
        onSaved={handleFormSaved}
      />

      <DayConflictAlert
        existingShifts={conflictShifts}
        date={pendingCreateDate ?? selectedDate}
        open={conflictOpen}
        onConfirm={handleConflictConfirm}
        onCancel={handleConflictCancel}
      />
    </div>
  );
}
