"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import type { ShiftWithPaymentStatus, Payment } from "@/types";
import { toast } from "sonner";

interface PaymentFormProps {
  shift: ShiftWithPaymentStatus | null;
  existingPayment?: Payment | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function formatBRInput(digits: string): string {
  const num = parseInt(digits || "0", 10);
  return `${Math.floor(num / 100).toLocaleString("pt-BR")},${String(num % 100).padStart(2, "0")}`;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PaymentForm({ shift, existingPayment, open, onClose, onSaved }: PaymentFormProps) {
  const isEdit = !!existingPayment;

  const [valueDigits, setValueDigits] = useState("0");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPartialAlert, setShowPartialAlert] = useState(false);

  const referenceValue = shift ? Number(shift.actualValue ?? shift.expectedValue) : 0;
  const amountReceived = parseInt(valueDigits || "0", 10) / 100;
  const isPartial = amountReceived > 0 && amountReceived < referenceValue;
  const difference = referenceValue - amountReceived;

  useEffect(() => {
    if (!open || !shift) return;
    if (isEdit && existingPayment) {
      const cents = Math.round(Number(existingPayment.amountReceived) * 100);
      setValueDigits(String(cents));
      const d = new Date(existingPayment.paymentDate as unknown as string);
      setPaymentDate(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
      setNotes(existingPayment.notes ?? "");
    } else {
      const refCents = Math.round(referenceValue * 100);
      setValueDigits(String(refCents));
      setPaymentDate(todayISO());
      setNotes("");
    }
  }, [open, isEdit, existingPayment, shift, referenceValue]);

  async function doSave() {
    if (!shift) return;
    setLoading(true);
    try {
      let res: Response;
      if (isEdit && existingPayment) {
        res = await fetch(`/api/payments/${existingPayment.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountReceived, paymentDate, notes: notes.trim() || undefined }),
        });
      } else {
        res = await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shiftId: shift.id, amountReceived, paymentDate, notes: notes.trim() || undefined }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao salvar");
      }
      toast.success(isEdit ? "Pagamento atualizado" : "Recebimento registrado");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (amountReceived <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    if (isPartial) {
      setShowPartialAlert(true);
    } else {
      doSave();
    }
  }

  if (!shift) return null;

  const shiftDateLabel = new Date(shift.date as unknown as string).toLocaleDateString("pt-BR", {
    timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric",
  });

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[92vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle>{isEdit ? "Editar Pagamento" : "Registrar Recebimento"}</SheetTitle>
          </SheetHeader>

          {/* Info row (non-editable) */}
          <div className="bg-gray-50 rounded-lg p-3 mb-5 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: shift.workplace.color }} />
              <span className="font-medium text-gray-900">{shift.workplace.name}</span>
            </div>
            <p className="text-gray-500 pl-4">Data do plantão: {shiftDateLabel}</p>
            <p className="text-gray-500 pl-4">Valor de referência: <span className="font-medium text-gray-800">{formatCurrency(referenceValue)}</span></p>
          </div>

          <div className="space-y-5">
            {/* Amount received */}
            <div className="space-y-1.5">
              <Label>Valor recebido</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">R$</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="w-full pl-9 pr-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formatBRInput(valueDigits)}
                  onChange={(e) => setValueDigits(e.target.value.replace(/\D/g, "") || "0")}
                />
              </div>
              {isPartial && (
                <p className="text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                  Valor menor que o esperado. Diferença de {formatCurrency(difference)} ficará como pendência.
                </p>
              )}
            </div>

            {/* Payment date */}
            <div className="space-y-1.5">
              <Label htmlFor="payment-date">Data do recebimento</Label>
              <input
                id="payment-date"
                type="date"
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Ex: transferência recebida, cheque..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button className="w-full" onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : isEdit ? "Salvar Alteração" : "Confirmar Recebimento"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showPartialAlert} onOpenChange={setShowPartialAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar pagamento parcial?</AlertDialogTitle>
            <AlertDialogDescription>
              Diferença de {formatCurrency(difference)} ficará como pendência e gerará um aviso automático.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowPartialAlert(false); doSave(); }}>
              Confirmar parcial
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
