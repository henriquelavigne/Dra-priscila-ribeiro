"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Building2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkplaceCard } from "@/components/workplace/WorkplaceCard";
import { WorkplaceForm } from "@/components/workplace/WorkplaceForm";
import { Button } from "@/components/ui/button";
import type { Workplace } from "@/types";
import { toast } from "sonner";

function SkeletonCard() {
  return (
    <div className="bg-white/80 rounded-[20px] border border-sand-dark/50 shadow-luxury p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-4 h-4 rounded-full bg-sand-dark mt-1" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-sand-dark rounded w-2/3" />
          <div className="h-3 bg-sand-light rounded w-1/2" />
          <div className="h-3 bg-sand-light rounded w-1/3" />
        </div>
        <div className="h-5 w-12 bg-sand-light rounded-full" />
      </div>
    </div>
  );
}

export default function WorkplacesPage() {
  type WorkplaceWithCount = Workplace & { _count: { autoNotes: number } };
  const [workplaces, setWorkplaces] = useState<WorkplaceWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorkplace, setEditingWorkplace] = useState<Workplace | undefined>();

  const loadWorkplaces = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workplaces");
      const data = await res.json();
      setWorkplaces(data);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkplaces();
  }, [loadWorkplaces]);

  // Revalidate auto-note counts when user returns to tab
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") loadWorkplaces();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadWorkplaces]);

  function handleCreate() {
    setEditingWorkplace(undefined);
    setFormOpen(true);
  }

  function handleEdit(workplace: Workplace) {
    setEditingWorkplace(workplace);
    setFormOpen(true);
  }

  function handleClose() {
    setFormOpen(false);
    setEditingWorkplace(undefined);
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Locais de Trabalho"
        rightAction={
          <Button
            size="icon"
            aria-label="Adicionar local de trabalho"
            className="bg-slate-900 hover:bg-black text-white rounded-full w-9 h-9 shadow-soft"
            onClick={handleCreate}
          >
            <Plus size={18} />
          </Button>
        }
      />

      <main className="flex-1 px-4 py-4 space-y-3 max-w-lg mx-auto w-full">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : workplaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-sand rounded-[20px] flex flex-col items-center justify-center mb-6 shadow-luxury">
              <Building2 size={32} className="text-gold-dark" />
            </div>
            <p className="text-slate-600 font-serif font-bold text-xl mb-2 tracking-tight">
              Nenhum local cadastrado
            </p>
            <p className="text-slate-500 text-sm mb-8">
              Adicione seus locais de trabalho para começar
            </p>
            <Button
              className="bg-slate-900 hover:bg-black text-white rounded-xl px-6 py-5 shadow-soft"
              onClick={handleCreate}
            >
              <Plus size={16} className="mr-2" />
              Adicionar primeiro local
            </Button>
          </div>
        ) : (
          workplaces.map((wp) => (
            <WorkplaceCard
              key={wp.id}
              workplace={wp}
              activeAutoNotesCount={wp._count.autoNotes}
              onEdit={handleEdit}
              onRefresh={loadWorkplaces}
            />
          ))
        )}
      </main>

      <WorkplaceForm
        workplace={editingWorkplace}
        open={formOpen}
        onClose={handleClose}
        onSaved={loadWorkplaces}
      />
    </div>
  );
}
