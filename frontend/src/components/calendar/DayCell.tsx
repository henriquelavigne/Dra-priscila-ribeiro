"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { ShiftBlock, type CalendarShift } from "./ShiftBlock";

interface DayCellProps {
  date: Date;
  shifts: CalendarShift[];
  isCurrentMonth: boolean;
  isToday: boolean;
  onClick: (date: Date) => void;
}

export const DayCell = memo(function DayCell({
  date,
  shifts,
  isCurrentMonth,
  isToday,
  onClick,
}: DayCellProps) {
  const visible = shifts.slice(0, 3);
  const overflow = shifts.length - 3;

  const dateLabel = date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <button
      aria-label={`${dateLabel}${shifts.length > 0 ? `, ${shifts.length} plantão(ões)` : ""}`}
      className={cn(
        "min-h-[64px] w-full text-left p-1 border-b border-r border-gray-100 flex flex-col gap-0.5 active:bg-gray-50 transition-colors overflow-hidden",
        !isCurrentMonth && "opacity-30"
      )}
      onClick={() => onClick(date)}
    >
      {/* Day number */}
      <div className="flex items-center justify-center w-6 h-6 mb-0.5">
        {isToday ? (
          <span className="w-6 h-6 rounded-full bg-[#0F172A] text-white text-xs flex items-center justify-center font-semibold">
            {date.getDate()}
          </span>
        ) : (
          <span className="text-xs text-gray-700">{date.getDate()}</span>
        )}
      </div>

      {/* Shift blocks */}
      <div className="flex flex-col gap-0.5 w-full">
        {visible.map((s) => (
          <ShiftBlock key={s.id} shift={s} />
        ))}
        {overflow > 0 && (
          <span className="text-[10px] text-gray-400 pl-1">+{overflow}</span>
        )}
      </div>
    </button>
  );
});
