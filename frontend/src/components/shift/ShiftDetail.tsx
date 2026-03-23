"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { CalendarShift } from "@/components/calendar/ShiftBlock";
import { toast } from "sonner";

interface ShiftDetailProps {
  date: Date;
  shifts: CalendarShift[];
  open: boolean;
  onClose: () => void;
  onEdit: (shift: CalendarShift) => void;
  onCreate: (date: Date) => void;
  onRefresh: () => void;
}

type CompleteState =
  | { type: "idle" }
  | { type: "confirm"; shift: CalendarShift }
  | { type: "input"; shift: CalendarShift; value: string };

type CancelState = { type: "idle" } | { type: "confirm"; shift: CalendarShift };

function formatBRInput(digits: string): string {
  const num = parseInt(digits || "0", 10);
  const reais = Math.floor(num / 100);
  const centavos = num % 100;
  return `${reais.toLocaleString("pt-BR")},${String(centavos).padStart(2, "0")}`;
}

function statusLabel(status: string) {
  if (status === "completed") return { text: "Realizado", className: "bg-green-100 text-green-700 border-green-200" };
  if (status === "cancelled") return { text: "Cancelado", className: "bg-gray-100 text-gray-500 border-gray-200" };
  return { text: "Agendado", className: "bg-blue-100 text-blue-700 border-blue-200" };
}

export function ShiftDetail({
  date,
  shifts,
  open,
  onClose,
  onEdit,
  onCreate,
  onRefresh,
}: ShiftDetailProps) {
  const [completeState, setCompleteState] = useState<CompleteState>({ type: "idle" });
  const [cancelState, setCancelState] = useState<CancelState>({ type: "idle" });
  const [actionLoading, setActionLoading] = useState(false);

  const dateLabel = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  async function handleComplete(shift: CalendarShift, actualValue?: number) {
    setActionLoading(true);
    try {
      const body: Record<string, unknown> = { action: "complete" };
      if (actualValue !== undefined) body.actualValue = actualValue;

      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Erro ao atualizar plantão");
      toast.success("Plantão marcado como realizado");
      setCompleteState({ type: "idle" });
      onRefresh();
    } catch {
      toast.error("Erro ao atualizar plantão");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel(shift: CalendarShift) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error("Erro ao cancelar plantão");
      toast.success("Plantão cancelado");
      setCancelState({ type: "idle" });
      onRefresh();
    } catch {
      toast.error("Erro ao cancelar plantão");
    } finally {
      setActionLoading(false);
    }
  }

  function resetDialogs() {
    setCompleteState({ type: "idle" });
    setCancelState({ type: "idle" });
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            resetDialogs();
            onClose();
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[92vh] overflow-y-auto"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="capitalize">{dateLabel}</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 pb-4">
            {shifts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">
                Nenhum plantão neste dia
              </p>
            ) : (
              shifts.map((shift) => {
                const badge = statusLabel(shift.status);
                return (
                  <div
                    key={shift.id}
                    className="border border-gray-100 rounded-xl p-4 space-y-3"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: shift.workplace.color }}
                        />
                        <span className="font-semibold text-gray-900 truncate">
                          {shift.workplace.name}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${badge.className} hover:${badge.className} shrink-0`}
                      >
                        {badge.text}
                      </Badge>
                    </div>

                    {/* Values */}
                    <div className="text-sm text-gray-600 space-y-0.5">
                      <p>
                        Valor previsto:{" "}
                        <span className="font-medium text-gray-900">
                          {formatCurrency(Number(shift.expectedValue))}
                        </span>
                      </p>
                      {shift.actualValue !== null && (
                        <p>
                          Valor real:{" "}
                          <span className="font-medium text-green-700">
                            {formatCurrency(Number(shift.actualValue))}
                          </span>
                        </p>
                      )}
                      {shift.notes && (
                        <p className="text-gray-400 italic">{shift.notes}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(shift)}
                      >
                        Editar
                      </Button>
                      {shift.status === "scheduled" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-700 border-green-200"
                            onClick={() =>
                              setCompleteState({ type: "confirm", shift })
                            }
                          >
                            Marcar como realizado
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200"
                            onClick={() =>
                              setCancelState({ type: "confirm", shift })
                            }
                          >
                            Cancelar plantão
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add shift button */}
          <Button
            className="w-full"
            variant="outline"
            onClick={() => onCreate(date)}
          >
            <Plus size={16} className="mr-1.5" />
            Adicionar plantão
          </Button>
        </SheetContent>
      </Sheet>

      {/* Complete confirm dialog */}
      <AlertDialog
        open={completeState.type === "confirm"}
        onOpenChange={(o) => !o && setCompleteState({ type: "idle" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como realizado?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor recebido foi{" "}
              {completeState.type === "confirm"
                ? formatCurrency(Number(completeState.shift.expectedValue))
                : ""}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => {
                if (completeState.type !== "confirm") return;
                const cents = Math.round(
                  Number(completeState.shift.expectedValue) * 100
                );
                setCompleteState({
                  type: "input",
                  shift: completeState.shift,
                  value: String(cents),
                });
              }}
            >
              Não, alterar valor
            </Button>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={() => {
                if (completeState.type !== "confirm") return;
                handleComplete(completeState.shift);
              }}
            >
              Sim, confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete with custom value */}
      <AlertDialog
        open={completeState.type === "input"}
        onOpenChange={(o) => !o && setCompleteState({ type: "idle" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Valor recebido</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o valor real recebido neste plantão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="relative my-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
              R$
            </span>
            <input
              type="tel"
              inputMode="numeric"
              className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={
                completeState.type === "input"
                  ? formatBRInput(completeState.value)
                  : ""
              }
              onChange={(e) => {
                if (completeState.type !== "input") return;
                const raw = e.target.value.replace(/\D/g, "");
                setCompleteState({
                  ...completeState,
                  value: raw || "0",
                });
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompleteState({ type: "idle" })}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={() => {
                if (completeState.type !== "input") return;
                const actualValue =
                  parseInt(completeState.value || "0", 10) / 100;
                handleComplete(completeState.shift, actualValue);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirm dialog */}
      <AlertDialog
        open={cancelState.type === "confirm"}
        onOpenChange={(o) => !o && setCancelState({ type: "idle" })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar plantão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este plantão em{" "}
              {cancelState.type === "confirm"
                ? cancelState.shift.workplace.name
                : ""}
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading}
              onClick={() => {
                if (cancelState.type !== "confirm") return;
                handleCancel(cancelState.shift);
              }}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
