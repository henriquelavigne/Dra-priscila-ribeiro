"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface AutoNoteShift {
  id: string;
  date: string;
  workplace: { id: string; name: string; color: string };
}

interface AutoNote {
  id: string;
  type: string;
  message: string;
  amountPending: number;
  dueDate: string;
  status: string;
  shift: AutoNoteShift;
}

interface AutoNoteGroup {
  workplace: { id: string; name: string; color: string };
  totalPending: number;
  overdueCount: number;
  oldestDueDate: string;
  notes: AutoNote[];
}

interface AutoNoteSectionProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

function daysDiff(dateStr: string): number {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

function WorkplaceGroup({
  group,
  onResolve,
  onRegisterPayment,
}: {
  group: AutoNoteGroup;
  onResolve: (id: string) => void;
  onRegisterPayment: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const oldestDays = daysDiff(group.oldestDueDate);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Group header */}
      <button
        className="w-full flex items-start justify-between gap-2 p-4 bg-white active:bg-gray-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span
            className="w-3 h-3 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: group.workplace.color }}
          />
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm text-gray-900 truncate">
                {group.workplace.name}
              </span>
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-xs">
                {group.overdueCount} pendência(s)
              </Badge>
            </div>
            <p className="text-sm font-semibold text-red-600 mt-0.5">
              Total pendente: {formatCurrency(group.totalPending)}
            </p>
            {oldestDays > 0 && (
              <p className="text-xs text-gray-400">
                Atraso mais antigo: {oldestDays} dia(s)
              </p>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-400 shrink-0 mt-1" /> : <ChevronDown size={16} className="text-gray-400 shrink-0 mt-1" />}
      </button>

      {/* Individual notes */}
      {expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {group.notes.map((note) => {
            const days = daysDiff(note.dueDate);
            const shiftDate = new Date(note.shift.date).toLocaleDateString("pt-BR", {
              timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric",
            });
            return (
              <div key={note.id} className="px-4 py-3 bg-gray-50 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-gray-700">Plantão: {shiftDate}</p>
                  <span className="text-xs text-gray-400">
                    {note.type === "payment_overdue" ? "Não pago" : "Pagto. parcial"}
                  </span>
                </div>
                <p className="text-sm font-medium text-red-600">
                  Pendente: {formatCurrency(Number(note.amountPending))}
                </p>
                {days > 0 && (
                  <p className="text-xs text-red-400">{days} dia(s) de atraso</p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => onRegisterPayment()}
                  >
                    Registrar pagamento
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-gray-400"
                    onClick={() => onResolve(note.id)}
                  >
                    Resolver
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AutoNoteSection({ open, onClose, onRefresh }: AutoNoteSectionProps) {
  const [groups, setGroups] = useState<AutoNoteGroup[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadNotes() {
    setLoading(true);
    try {
      const res = await fetch("/api/auto-notes?status=active");
      if (!res.ok) throw new Error();
      setGroups(await res.json());
    } catch {
      toast.error("Erro ao carregar pendências");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadNotes();
  }, [open]);

  async function handleResolve(id: string) {
    try {
      const res = await fetch(`/api/auto-notes/${id}/resolve`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      toast.success("Pendência resolvida");
      loadNotes();
      onRefresh();
    } catch {
      toast.error("Erro ao resolver pendência");
    }
  }

  // Close sheet so user can tap the shift card on the finances page to register payment
  function handleRegisterPayment() {
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl h-[80vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Pendências de Pagamento</SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle size={48} className="text-green-400 mb-3" />
            <p className="text-gray-500 font-medium">Nenhuma pendência de pagamento.</p>
            <p className="text-gray-400 text-sm">Tudo em dia!</p>
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {groups.map((group) => (
              <WorkplaceGroup
                key={group.workplace.id}
                group={group}
                onResolve={handleResolve}
                onRegisterPayment={handleRegisterPayment}
              />
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
