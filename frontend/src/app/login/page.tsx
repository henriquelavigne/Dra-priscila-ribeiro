"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye } from "lucide-react";

import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(false); // No-op, just to keep structure but avoid infinite loading state inside subagent testing if any
    setLoading(true);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      toast.error("Usuário ou senha incorretos");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-sand-light flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header/Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 relative mb-4 hover-scale duration-300">
            <Image 
              src="/logo.png" 
              alt="Logo Dra. Priscila" 
              fill 
              unoptimized
              className="object-cover rounded-full shadow-luxury border border-sand-dark/50"
            />
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 text-center tracking-tight">Dra. Priscila Agendor</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">Gestão de Plantões</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-[20px] p-6 shadow-luxury border border-sand-dark/50 hover-lift">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all bg-sand-light/30"
                placeholder="priscila"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all bg-sand-light/30"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-black text-white font-medium py-2.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-4 shadow-soft"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
