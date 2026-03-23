"use client";

import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { Workplace } from "@/types";

interface WorkplaceCardProps {
  workplace: Workplace;
  activeAutoNotesCount?: number;
  onEdit: (workplace: Workplace) => void;
  onRefresh: () => void;
}

export function WorkplaceCard({ workplace, activeAutoNotesCount = 0, onEdit }: WorkplaceCardProps) {
  return (
    <button
      className="w-full text-left bg-white/80 backdrop-blur-sm rounded-[20px] border border-sand-dark/50 shadow-luxury p-5 active:scale-[0.98] transition-all relative"
      onClick={() => onEdit(workplace)}
    >
      {/* Notification dot */}
      {activeAutoNotesCount > 0 && (
        <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-red-500" />
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Left: color dot + info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-4 h-4 rounded-full mt-1 shrink-0"
            style={{ backgroundColor: workplace.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900 truncate tracking-tight">
                {workplace.name}
              </span>
              {workplace.notes && (
                <FileText size={13} className="text-slate-400 shrink-0" />
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Média: <span className="font-medium text-slate-800">{formatCurrency(Number(workplace.averageValue))}</span>
            </p>
            {activeAutoNotesCount > 0 && (
              <p className="text-xs text-red-500 mt-0.5">
                {activeAutoNotesCount} pagamento(s) pendente(s)
              </p>
            )}
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
