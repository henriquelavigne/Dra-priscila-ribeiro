"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayCell } from "./DayCell";
import type { CalendarShift } from "./ShiftBlock";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function buildCalendarDays(year: number, month: number) {
  const firstDow = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevDaysInMonth = new Date(year, month - 1, 0).getDate();

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Prev month fill
  for (let i = firstDow - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 2, prevDaysInMonth - i),
      isCurrentMonth: false,
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ date: new Date(year, month - 1, d), isCurrentMonth: true });
  }

  // Next month fill to complete grid
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: false });
  }

  return days;
}

function shiftBelongsToDay(shift: CalendarShift, date: Date): boolean {
  const d = new Date(shift.date);
  return (
    d.getUTCFullYear() === date.getFullYear() &&
    d.getUTCMonth() === date.getMonth() &&
    d.getUTCDate() === date.getDate()
  );
}

interface MonthViewProps {
  year: number;
  month: number;
  shifts: CalendarShift[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onDayClick: (date: Date) => void;
}

export function MonthView({
  year,
  month,
  shifts,
  onPrevMonth,
  onNextMonth,
  onDayClick,
}: MonthViewProps) {
  const today = new Date();
  const days = buildCalendarDays(year, month);

  return (
    <div className="bg-white">
      {/* Month nav header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={onPrevMonth}
          className="p-1.5 rounded-lg active:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={20} className="text-gray-600" />
        </button>
        <span className="font-semibold text-gray-900 text-base">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          onClick={onNextMonth}
          className="p-1.5 rounded-lg active:bg-gray-100 transition-colors"
        >
          <ChevronRight size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEK_DAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs text-gray-400 font-medium py-2"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-t border-gray-100">
        {days.map((cell, i) => {
          const dayShifts = shifts.filter((s) =>
            shiftBelongsToDay(s, cell.date)
          );
          const isToday =
            cell.date.getDate() === today.getDate() &&
            cell.date.getMonth() === today.getMonth() &&
            cell.date.getFullYear() === today.getFullYear();

          return (
            <DayCell
              key={i}
              date={cell.date}
              shifts={dayShifts}
              isCurrentMonth={cell.isCurrentMonth}
              isToday={isToday}
              onClick={onDayClick}
            />
          );
        })}
      </div>
    </div>
  );
}
