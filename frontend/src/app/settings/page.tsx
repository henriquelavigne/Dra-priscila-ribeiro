"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Save,
  Phone,
  Info,
  Wifi,
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type ConnectionStatus = "online" | "unstable" | "offline" | "unknown";

function getBotConnectionStatus(lastSeen: string): ConnectionStatus {
  if (!lastSeen) return "unknown";
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMin = diffMs / 60_000;
  if (diffMin < 3) return "online";
  if (diffMin < 10) return "unstable";
  return "offline";
}

function formatTimeAgo(iso: string): string {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin === 1) return "há 1 min";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return "há 1 hora";
  return `há ${diffH} horas`;
}

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string; dot: string; Icon: typeof Wifi }
> = {
  online: {
    label: "Conectado",
    color: "text-emerald-700",
    dot: "bg-emerald-500",
    Icon: Wifi,
  },
  unstable: {
    label: "Instável",
    color: "text-amber-700",
    dot: "bg-amber-400",
    Icon: AlertTriangle,
  },
  offline: {
    label: "Offline",
    color: "text-red-700",
    dot: "bg-red-500",
    Icon: WifiOff,
  },
  unknown: {
    label: "Sem dados",
    color: "text-slate-500",
    dot: "bg-slate-300",
    Icon: WifiOff,
  },
};

function SkeletonField() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 bg-sand-dark rounded w-1/3" />
      <div className="h-11 bg-sand rounded-xl" />
    </div>
  );
}

export default function SettingsPage() {
  // Campos editáveis — controlados pelo usuário; nunca sobrescritos pelo polling
  const [form, setForm] = useState({ botPhoneNumber: "", botName: "Agendor" });
  // Campos de status — atualizados pelo polling sem interferir no que o usuário digita
  const [status, setStatus] = useState({ botLastSeen: "", botStatus: "", botQrCode: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadSettings = useCallback(async (isInitialLoad = false) => {
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("api_error");
      const data = await res.json();
      // Na carga inicial, preenche também os campos editáveis
      if (isInitialLoad) {
        setForm({
          botPhoneNumber: data.botPhoneNumber ?? "",
          botName: data.botName ?? "Agendor",
        });
      }
      // Polling sempre atualiza apenas status (não apaga o que o usuário está digitando)
      setStatus({
        botLastSeen: data.botLastSeen ?? "",
        botStatus: data.botStatus ?? "",
        botQrCode: data.botQrCode ?? "",
      });
    } catch {
      if (isInitialLoad) toast.error("Erro ao carregar configurações. Recarregue a página.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings(true);
    const interval = setInterval(() => loadSettings(false), 10_000);
    return () => clearInterval(interval);
  }, [loadSettings]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botPhoneNumber: form.botPhoneNumber,
          botName: form.botName,
        }),
      });
      let data: Record<string, string>;
      try {
        data = await res.json();
      } catch {
        toast.error("Sessão expirada. Recarregue a página e tente novamente.");
        return;
      }
      if (!res.ok) {
        toast.error(data.error ?? "Erro ao salvar.");
        return;
      }
      // Atualiza status com a resposta; campos editáveis já estão corretos no form
      setStatus((s) => ({
        botLastSeen: data.botLastSeen ?? s.botLastSeen,
        botStatus: data.botStatus ?? s.botStatus,
        botQrCode: data.botQrCode ?? s.botQrCode,
      }));
      toast.success("Configurações salvas com sucesso.");
    } catch {
      toast.error("Sem conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const connStatus = getBotConnectionStatus(status.botLastSeen);
  const { label, color, dot, Icon } = STATUS_CONFIG[connStatus];

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Configurações" />

      <main className="flex-1 px-4 py-6 space-y-4 max-w-lg mx-auto w-full">

        {/* Status do bot */}
        <section className="bg-white/80 rounded-[20px] border border-sand-dark/50 shadow-luxury p-5 hover-lift">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-sand-dark/40">
            <div className="w-9 h-9 rounded-xl bg-sand flex items-center justify-center">
              <MessageCircle size={18} className="text-gold-dark" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-sm">Bot Agendor</p>
              <p className="text-xs text-slate-500">Assistente de plantões via WhatsApp</p>
            </div>
          </div>

          {/* Indicador de status */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${dot} ${connStatus === "online" ? "animate-pulse" : ""}`} />
              <span className={`text-sm font-medium ${color}`}>{label}</span>
              {status.botLastSeen && (
                <span className="text-xs text-slate-400">
                  · {formatTimeAgo(status.botLastSeen)}
                </span>
              )}
            </div>
            <Icon size={16} className={color} />
          </div>

          {/* QR Code para scan */}
          {!loading && status.botQrCode && connStatus !== "online" && (
            <div className="mb-4 flex flex-col items-center gap-2 bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-600 mb-1">
                Escaneie com o WhatsApp da Dra. Priscila
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={status.botQrCode}
                alt="QR Code WhatsApp"
                className="w-48 h-48 rounded-lg"
              />
              <p className="text-xs text-slate-400 text-center">
                Abra o WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho
              </p>
            </div>
          )}

          {loading ? (
            <SkeletonField />
          ) : (
            <div className="space-y-2">
              <Label
                htmlFor="botPhoneNumber"
                className="text-sm font-medium text-slate-700 flex items-center gap-1.5"
              >
                <Phone size={14} className="text-slate-400" />
                Número conectado ao bot
              </Label>
              <Input
                id="botPhoneNumber"
                type="tel"
                inputMode="numeric"
                placeholder="Ex: 5575999999999"
                value={form.botPhoneNumber}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    botPhoneNumber: e.target.value.replace(/\D/g, ""),
                  }))
                }
                className="rounded-xl border-sand-dark focus-within:ring-gold"
              />
              <p className="text-xs text-slate-400">
                DDI + DDD + número, somente dígitos. Ex:{" "}
                <span className="font-mono">5575999999999</span>
              </p>
            </div>
          )}
        </section>

        {/* Instruções de deploy */}
        <section className="bg-white/80 rounded-[20px] border border-sand-dark/50 shadow-luxury p-5 hover-lift">
          <div className="flex items-center gap-2 mb-3">
            <Info size={15} className="text-gold-dark flex-shrink-0" />
            <p className="text-sm font-semibold text-slate-800">Como ativar o bot</p>
          </div>
          <ol className="space-y-2 text-sm text-slate-600 list-none">
            {[
              "Configure o número acima e salve",
              "Faça o deploy do bot no Railway (ou reinicie o serviço)",
              "O QR Code aparecerá aqui em até 30 segundos",
              "Escaneie com o WhatsApp → Configurações → Aparelhos conectados",
              "O indicador ficará verde e o QR sumirá automaticamente",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sand-dark text-slate-700 text-xs flex items-center justify-center font-semibold mt-0.5">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <Button
          disabled={loading || saving}
          onClick={handleSave}
          className="w-full bg-slate-900 hover:bg-black text-white rounded-xl py-5 shadow-soft hover-scale"
        >
          <Save size={16} className="mr-2" />
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </main>
    </div>
  );
}
