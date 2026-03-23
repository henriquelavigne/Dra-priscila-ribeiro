"use client";

import { memo } from "react";
import { formatCompactCurrency } from "@/lib/utils";

export type CalendarShift = {
  id: string;
  date: string;
  expectedValue: string | number;
  actualValue: string | number | null;
  status: string;
  notes: string | null;
  workplaceId: string;
  workplace: { id: string; name: string; color: string };
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface ShiftBlockProps {
  shift: CalendarShift;
}

export const ShiftBlock = memo(function ShiftBlock({ shift }: ShiftBlockProps) {
  const { workplace, expectedValue, status } = shift;
  const abbr = workplace.name.slice(0, 3).toUpperCase();
  const value = formatCompactCurrency(Number(expectedValue));
  const cancelled = status === "cancelled";

  return (
    <div
      className="rounded-sm px-1 py-0.5 text-[10px] leading-tight truncate"
      style={{
        backgroundColor: hexToRgba(workplace.color, 0.15),
        borderLeft: `3px solid ${workplace.color}`,
        opacity: cancelled ? 0.5 : 1,
        textDecoration: cancelled ? "line-through" : "none",
        color: "#1e293b",
      }}
    >
      {abbr} {value}
    </div>
  );
});
