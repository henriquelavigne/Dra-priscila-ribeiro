"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { ShiftWithPaymentStatus } from "@/types";

interface FinanceCardProps {
  shift: ShiftWithPaymentStatus;
  onRegisterPayment: (shift: ShiftWithPaymentStatus) => void;
  onEditPayment: (shift: ShiftWithPaymentStatus) => void;
}

const STATUS_BADGE: Record<
  ShiftWithPaymentStatus["paymentStatus"],
  { label: string; className: string }
> = {
  paid: { label: "Pago", className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100" },
  partial: { label: "Parcial", className: "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100" },
  overdue: { label: "Atrasado", className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100" },
  on_schedule: { label: "No prazo", className: "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100" },
  not_due: { label: "Não vencido", className: "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-100" },
};

export function FinanceCard({ shift, onRegisterPayment, onEditPayment }: FinanceCardProps) {
  const badge = STATUS_BADGE[shift.paymentStatus];
  const referenceValue = Number(shift.actualValue ?? shift.expectedValue);
  const receivedValue = shift.payment ? Number(shift.payment.amountReceived) : null;
  const pendingValue = receivedValue !== null ? referenceValue - receivedValue : null;

  const dateLabel = new Date(shift.date as unknown as string).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-[20px] border border-sand-dark/50 shadow-luxury p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: shift.workplace.color }}
          />
          <span className="font-medium text-sm text-slate-900 truncate">
            {shift.workplace.name}
          </span>
        </div>
        <Badge variant="outline" className={badge.className}>
          {badge.label}
        </Badge>
      </div>

      {/* Date + values */}
      <div className="text-sm text-slate-500 space-y-1 pl-5">
        <p>{dateLabel}</p>
        <p>
          Valor:{" "}
          <span className="font-medium text-slate-800">
            {formatCurrency(referenceValue)}
          </span>
        </p>
        {receivedValue !== null && (
          <p className="text-green-600">
            Recebido: <span className="font-medium">{formatCurrency(receivedValue)}</span>
          </p>
        )}
        {pendingValue !== null && pendingValue > 0 && (
          <p className="text-red-500">
            Pendente: <span className="font-medium">{formatCurrency(pendingValue)}</span>
          </p>
        )}
      </div>

      {/* Action button */}
      {(shift.paymentStatus === "overdue" || shift.paymentStatus === "on_schedule") && (
        <Button
          variant="ghost"
          size="sm"
          className="text-gold-dark font-semibold pl-5 h-auto py-1 hover:bg-transparent hover:text-gold hover:underline"
          onClick={() => onRegisterPayment(shift)}
        >
          Registrar Recebimento
        </Button>
      )}
      {shift.paymentStatus === "partial" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-gold-dark font-semibold pl-5 h-auto py-1 hover:bg-transparent hover:text-gold hover:underline"
          onClick={() => onEditPayment(shift)}
        >
          Editar Pagamento
        </Button>
      )}
    </div>
  );
}
