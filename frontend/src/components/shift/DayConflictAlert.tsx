"use client";

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
import type { CalendarShift } from "@/components/calendar/ShiftBlock";

interface DayConflictAlertProps {
  existingShifts: CalendarShift[];
  date: Date;
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DayConflictAlert({
  existingShifts,
  date,
  open,
  onConfirm,
  onCancel,
}: DayConflictAlertProps) {
  const count = existingShifts.length;
  const label = count === 1 ? "plantão" : "plantões";

  const formattedDate = date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dia com plantão</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-2">
                Você já tem {count} {label} em{" "}
                <span className="font-medium capitalize">{formattedDate}</span>:
              </p>
              <ul className="space-y-1">
                {existingShifts.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.workplace.color }}
                    />
                    <span>{s.workplace.name}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3">Deseja adicionar outro plantão neste dia?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Sim, adicionar outro
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
