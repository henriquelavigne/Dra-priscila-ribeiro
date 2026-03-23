"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatCurrency } from "@/lib/utils";
import type { CalendarShift } from "@/components/calendar/ShiftBlock";
import type { Workplace } from "@/types";
import { toast } from "sonner";

interface ShiftFormProps {
  date: Date;
  shift?: CalendarShift | null;
  workplaces: Workplace[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function formatBRInput(digits: string): string {
  const num = parseInt(digits || "0", 10);
  const reais = Math.floor(num / 100);
  const centavos = num % 100;
  return `${reais.toLocaleString("pt-BR")},${String(centavos).padStart(2, "0")}`;
}

function parseBRInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, "");
  return parseInt(digits || "0", 10) / 100;
}

function dateToInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ShiftForm({
  date,
  shift,
  workplaces,
  open,
  onClose,
  onSaved,
}: ShiftFormProps) {
  const isEdit = !!shift;

  const [workplaceId, setWorkplaceId] = useState("");
  const [valueDigits, setValueDigits] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [pendingWorkplaceId, setPendingWorkplaceId] = useState<string | null>(null);
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const prevWorkplaceIdRef = useRef<string>("");

  // Reset form when opening
  useEffect(() => {
    if (!open) return;
    if (isEdit && shift) {
      setWorkplaceId(shift.workplaceId);
      const cents = Math.round(Number(shift.expectedValue) * 100);
      setValueDigits(String(cents));
      setNotes(shift.notes ?? "");
      setManuallyEdited(false);
      prevWorkplaceIdRef.current = shift.workplaceId;
    } else {
      setWorkplaceId("");
      setValueDigits("0");
      setNotes("");
      setManuallyEdited(false);
      prevWorkplaceIdRef.current = "";
    }
  }, [open, isEdit, shift]);

  function getWorkplaceAvgCents(id: string): number {
    const wp = workplaces.find((w) => w.id === id);
    if (!wp) return 0;
    return Math.round(Number(wp.averageValue) * 100);
  }

  function handleWorkplaceChange(newId: string) {
    const avgCents = getWorkplaceAvgCents(newId);
    if (manuallyEdited && workplaceId !== "" && avgCents > 0) {
      setPendingWorkplaceId(newId);
      setShowUpdateAlert(true);
    } else {
      setWorkplaceId(newId);
      if (avgCents > 0) setValueDigits(String(avgCents));
      prevWorkplaceIdRef.current = newId;
    }
  }

  function handleConfirmUpdate() {
    if (!pendingWorkplaceId) return;
    const avgCents = getWorkplaceAvgCents(pendingWorkplaceId);
    setWorkplaceId(pendingWorkplaceId);
    setValueDigits(String(avgCents));
    setManuallyEdited(false);
    setPendingWorkplaceId(null);
    setShowUpdateAlert(false);
    prevWorkplaceIdRef.current = pendingWorkplaceId;
  }

  function handleCancelUpdate() {
    if (!pendingWorkplaceId) return;
    setWorkplaceId(pendingWorkplaceId);
    setManuallyEdited(true);
    setPendingWorkplaceId(null);
    setShowUpdateAlert(false);
    prevWorkplaceIdRef.current = pendingWorkplaceId;
  }

  function handleValueInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    setValueDigits(raw || "0");
    setManuallyEdited(true);
  }

  async function handleSave() {
    if (!workplaceId) {
      toast.error("Selecione um local de trabalho");
      return;
    }
    const expectedValue = parseBRInput(valueDigits);
    if (expectedValue <= 0) {
      toast.error("Informe um valor previsto");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        workplaceId,
        date: dateToInputValue(date),
        expectedValue,
        notes: notes.trim() || undefined,
      };

      let res: Response;
      if (isEdit && shift) {
        res = await fetch(`/api/shifts/${shift.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/shifts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar plantão");
      }

      toast.success(isEdit ? "Plantão atualizado" : "Plantão adicionado");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  const pendingWp = workplaces.find((w) => w.id === pendingWorkplaceId);
  const dateLabel = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[92vh] overflow-y-auto"
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="capitalize">
              {isEdit ? "Editar Plantão" : "Novo Plantão"}
            </SheetTitle>
            <p className="text-sm text-gray-500 capitalize">{dateLabel}</p>
          </SheetHeader>

          <div className="space-y-5">
            {/* Workplace select */}
            <div className="space-y-1.5">
              <Label>Local de trabalho</Label>
              <Select value={workplaceId} onValueChange={handleWorkplaceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um local">
                    {workplaceId && (() => {
                      const wp = workplaces.find((w) => w.id === workplaceId);
                      return wp ? (
                        <span className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: wp.color }}
                          />
                          {wp.name}
                        </span>
                      ) : null;
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {workplaces.map((wp) => (
                    <SelectItem key={wp.id} value={wp.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: wp.color }}
                        />
                        {wp.name}
                        <span className="text-gray-400 text-xs">
                          ({formatCurrency(Number(wp.averageValue))})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expected value */}
            <div className="space-y-1.5">
              <Label>Valor previsto</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                  R$
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formatBRInput(valueDigits)}
                  onChange={handleValueInput}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: levar equipamento, turno extra..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Alert to confirm value update when changing workplace */}
      <AlertDialog open={showUpdateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atualizar valor?</AlertDialogTitle>
            <AlertDialogDescription>
              Atualizar valor para a média do novo local (
              {pendingWp ? formatCurrency(Number(pendingWp.averageValue)) : ""}
              )?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelUpdate}>
              Manter valor atual
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate}>
              Atualizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
