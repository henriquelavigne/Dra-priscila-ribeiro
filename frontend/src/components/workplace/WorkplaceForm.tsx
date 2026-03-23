"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { COLOR_PALETTE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Shift, Workplace } from "@/types";

interface WorkplaceFormProps {
  workplace?: Workplace;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function parseBRCurrency(value: string): number {
  const clean = value.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function formatBRInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function WorkplaceForm({
  workplace,
  open,
  onClose,
  onSaved,
}: WorkplaceFormProps) {
  const { toast } = useToast();
  const isEdit = !!workplace;

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [averageValueDisplay, setAverageValueDisplay] = useState("");
  const [paymentDeadlineDays, setPaymentDeadlineDays] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [usedColors, setUsedColors] = useState<
    { color: string; name: string }[]
  >([]);
  const [affectedShifts, setAffectedShifts] = useState<Shift[]>([]);
  const [showDeactivateAlert, setShowDeactivateAlert] = useState(false);

  const loadUsedColors = useCallback(async () => {
    try {
      const res = await fetch("/api/workplaces?activeOnly=true");
      const data: Workplace[] = await res.json();
      setUsedColors(
        data
          .filter((w) => !workplace || w.id !== workplace.id)
          .map((w) => ({ color: w.color, name: w.name }))
      );
    } catch {
      // silent
    }
  }, [workplace]);

  useEffect(() => {
    if (!open) return;
    loadUsedColors();
    if (workplace) {
      setName(workplace.name);
      setColor(workplace.color);
      const val = Number(workplace.averageValue);
      setAverageValueDisplay(
        val.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
      setPaymentDeadlineDays(String(workplace.paymentDeadlineDays));
      setNotes(workplace.notes ?? "");
      setIsActive(workplace.isActive);
    } else {
      setName("");
      setColor(COLOR_PALETTE[0]);
      setAverageValueDisplay("");
      setPaymentDeadlineDays("");
      setNotes("");
      setIsActive(true);
    }
  }, [open, workplace, loadUsedColors]);

  async function handleSave() {
    if (!name.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const averageValue = parseBRCurrency(averageValueDisplay);
    if (!averageValue || averageValue <= 0) {
      toast({ title: "Informe um valor médio válido", variant: "destructive" });
      return;
    }
    const deadline = parseInt(paymentDeadlineDays, 10);
    if (!deadline || deadline < 1) {
      toast({ title: "Informe um prazo válido (mínimo 1 dia)", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Deactivating an existing active workplace
      if (isEdit && workplace!.isActive && !isActive) {
        const res = await fetch(`/api/workplaces/${workplace!.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao desativar");

        // Save other field changes via PUT
        await fetch(`/api/workplaces/${workplace!.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color, averageValue, paymentDeadlineDays: deadline, notes }),
        });

        if (data.affectedShifts?.length > 0) {
          setAffectedShifts(data.affectedShifts);
          setShowDeactivateAlert(true);
        } else {
          toast({ title: "Local desativado com sucesso" });
          onSaved();
          onClose();
        }
        return;
      }

      const body = { name, color, averageValue, paymentDeadlineDays: deadline, notes: notes || undefined };
      const url = isEdit ? `/api/workplaces/${workplace!.id}` : "/api/workplaces";
      const method = isEdit ? "PUT" : "POST";

      // Reactivating
      if (isEdit && !workplace!.isActive && isActive) {
        await fetch(`/api/workplaces/${workplace!.id}/reactivate`, { method: "POST" });
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...body, isActive } : body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast({ title: data.error, variant: "destructive" });
        } else if (res.status === 400) {
          toast({ title: "Dados inválidos", description: data.details?.[0]?.message, variant: "destructive" });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast({ title: isEdit ? "Local atualizado!" : "Local criado!" });
      onSaved();
      onClose();
    } catch (err) {
      toast({
        title: "Erro inesperado",
        description: err instanceof Error ? err.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const colorUsedBy = (hex: string) =>
    usedColors.find((u) => u.color === hex)?.name ?? null;

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="h-[92vh] rounded-t-2xl overflow-y-auto pb-safe"
        >
          <SheetHeader className="mb-6">
            <SheetTitle>
              {isEdit ? "Editar local" : "Novo local de trabalho"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label htmlFor="wp-name">Nome do local</Label>
              <Input
                id="wp-name"
                placeholder="Ex: Hospital São Lucas"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Cor */}
            <div className="space-y-2">
              <Label>Cor identificadora</Label>
              <div className="grid grid-cols-8 gap-2">
                {COLOR_PALETTE.map((hex) => {
                  const usedBy = colorUsedBy(hex);
                  const isSelected = color === hex;
                  const isDisabled = !!usedBy;

                  return (
                    <button
                      key={hex}
                      type="button"
                      disabled={isDisabled}
                      title={usedBy ? `Usada por: ${usedBy}` : hex}
                      onClick={() => !isDisabled && setColor(hex)}
                      className={cn(
                        "relative w-8 h-8 rounded-full transition-all",
                        isSelected && "ring-2 ring-offset-2 ring-gray-900",
                        isDisabled && "opacity-40 cursor-not-allowed"
                      )}
                      style={{ backgroundColor: hex }}
                    >
                      {isSelected && (
                        <Check
                          size={14}
                          className="absolute inset-0 m-auto text-white drop-shadow"
                        />
                      )}
                      {isDisabled && (
                        <X
                          size={12}
                          className="absolute inset-0 m-auto text-white drop-shadow"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {usedColors.length > 0 && (
                <p className="text-xs text-gray-400">
                  Cores com ✕ já estão em uso por outros locais ativos
                </p>
              )}
            </div>

            {/* Valor médio */}
            <div className="space-y-1.5">
              <Label htmlFor="wp-value">Valor médio por plantão</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  R$
                </span>
                <Input
                  id="wp-value"
                  inputMode="numeric"
                  className="pl-9"
                  placeholder="0,00"
                  value={averageValueDisplay}
                  onChange={(e) => {
                    setAverageValueDisplay(formatBRInput(e.target.value));
                  }}
                />
              </div>
            </div>

            {/* Prazo */}
            <div className="space-y-1.5">
              <Label htmlFor="wp-deadline">Prazo de pagamento</Label>
              <div className="relative">
                <Input
                  id="wp-deadline"
                  inputMode="numeric"
                  className="pr-12"
                  placeholder="30"
                  value={paymentDeadlineDays}
                  onChange={(e) =>
                    setPaymentDeadlineDays(e.target.value.replace(/\D/g, ""))
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  dias
                </span>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1.5">
              <Label htmlFor="wp-notes">Observações</Label>
              <Textarea
                id="wp-notes"
                placeholder="Observações (opcional)"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Toggle Ativo/Inativo — somente edição */}
            {isEdit && (
              <div className="flex items-center justify-between py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Status do local
                  </p>
                  <p className="text-xs text-gray-500">
                    {isActive
                      ? "Local ativo — aparece na agenda"
                      : "Local inativo — oculto na agenda"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive((v) => !v)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    isActive ? "bg-[#0F172A]" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                      isActive ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            )}

            {/* Botão salvar */}
            <Button
              className="w-full bg-[#0F172A] hover:bg-[#1e293b] text-white h-12 text-base mt-2"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Alert deativation */}
      <AlertDialog open={showDeactivateAlert} onOpenChange={setShowDeactivateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Local desativado</AlertDialogTitle>
            <AlertDialogDescription>
              O local foi desativado.{" "}
              {affectedShifts.length > 0 && (
                <>
                  <strong>{affectedShifts.length} plantão(ões) agendado(s)</strong>{" "}
                  nos próximos dias foram afetados e precisam ser revisados.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => {
                setShowDeactivateAlert(false);
                toast({ title: "Local desativado com sucesso" });
                onSaved();
                onClose();
              }}
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
