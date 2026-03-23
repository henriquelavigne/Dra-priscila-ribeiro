"use client";

import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Workplace } from "@/types";

interface WorkplaceCardProps {
  workplace: Workplace;
  onEdit: (workplace: Workplace) => void;
  onRefresh: () => void;
}

export function WorkplaceCard({ workplace, onEdit }: WorkplaceCardProps) {
  return (
    <button
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform"
      onClick={() => onEdit(workplace)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: color dot + info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-4 h-4 rounded-full mt-1 shrink-0"
            style={{ backgroundColor: workplace.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-gray-900 truncate">
                {workplace.name}
              </span>
              {workplace.notes && (
                <FileText size={13} className="text-gray-400 shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Média: {formatCurrency(Number(workplace.averageValue))}
            </p>
            <p className="text-sm text-gray-500">
              Prazo pgto: {workplace.paymentDeadlineDays} dias
            </p>
          </div>
        </div>

        {/* Right: badge */}
        <Badge
          className={
            workplace.isActive
              ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-100"
              : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100"
          }
          variant="outline"
        >
          {workplace.isActive ? "Ativo" : "Inativo"}
        </Badge>
      </div>
    </button>
  );
}
