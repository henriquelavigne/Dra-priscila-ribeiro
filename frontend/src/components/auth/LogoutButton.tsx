"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
      aria-label="Sair"
      title="Sair da conta"
    >
      <LogOut size={20} />
    </button>
  );
}
