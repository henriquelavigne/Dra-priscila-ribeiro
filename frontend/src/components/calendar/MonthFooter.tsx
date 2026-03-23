"use client";

import { formatCurrency } from "@/lib/utils";

interface MonthFooterProps {
  totalRevenue: number;
  monthLabel: string;
}

export function MonthFooter({ totalRevenue, monthLabel }: MonthFooterProps) {
  return (
    <div className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-2.5">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <span className="text-sm font-semibold text-gray-600">
          Previsão {monthLabel}
        </span>
        <span className="text-base font-bold text-[#0F172A]">
          {formatCurrency(totalRevenue)}
        </span>
      </div>
    </div>
  );
}
