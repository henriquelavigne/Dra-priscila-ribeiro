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
      <h2 className="text-base font-semibold text-gray-900 mb-3">
        Próximos plantões
      </h2>

      {shifts.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum plantão agendado</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {shifts.map((shift, idx) => (
            <div key={shift.id}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-gray-50 transition-colors"
                onClick={() => router.push("/schedule")}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: shift.workplace.color }}
                />
                <span className="font-medium text-sm text-gray-900 flex-1 truncate">
                  {shift.workplace.name}
                </span>
                <span className="text-sm text-gray-500 shrink-0">
                  {formatShiftDate(shift.date as unknown as string)}
                </span>
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  {formatCurrency(Number(shift.expectedValue))}
                </span>
              </button>
              {idx < shifts.length - 1 && (
                <div className="h-px bg-gray-100 mx-4" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
