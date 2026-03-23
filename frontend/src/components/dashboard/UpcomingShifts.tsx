"use client";

import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { ShiftWithWorkplace } from "@/types";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function formatShiftDate(dateStr: string): string {
  const d = new Date(dateStr);
  const weekday = WEEKDAY_SHORT[d.getUTCDay()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${weekday}, ${day}/${month}`;
}

interface UpcomingShiftsProps {
  shifts: ShiftWithWorkplace[];
}

export function UpcomingShifts({ shifts }: UpcomingShiftsProps) {
  const router = useRouter();

  return (
    <div>
      <h2 className="text-xl font-serif font-bold text-slate-900 mb-4 tracking-tight">
        Próximos plantões
      </h2>

      {shifts.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum plantão agendado</p>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-[20px] border border-sand-dark/50 shadow-luxury overflow-hidden">
          {shifts.map((shift, idx) => (
            <div key={shift.id}>
              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-sand-light/50 active:bg-sand-light transition-colors"
                onClick={() => router.push("/schedule")}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: shift.workplace.color }}
                />
                <span className="font-medium text-sm text-slate-900 flex-1 truncate">
                  {shift.workplace.name}
                </span>
                <span className="text-sm text-slate-500 shrink-0">
                  {formatShiftDate(shift.date as unknown as string)}
                </span>
                <span className="text-sm font-semibold text-slate-900 shrink-0">
                  {formatCurrency(Number(shift.expectedValue))}
                </span>
              </button>
              {idx < shifts.length - 1 && (
                <div className="h-px bg-sand-dark/50 mx-5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
