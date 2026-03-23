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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-4 h-4 rounded-full bg-gray-200 mt-1" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="h-5 w-12 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

export default function WorkplacesPage() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
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
            className="bg-[#0F172A] hover:bg-[#1e293b] text-white rounded-full w-9 h-9"
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
            <Building2 size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium mb-1">
              Nenhum local cadastrado
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Adicione seus locais de trabalho para começar
            </p>
            <Button
              className="bg-[#0F172A] hover:bg-[#1e293b] text-white"
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
