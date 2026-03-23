import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/LogoutButton";

interface PageHeaderProps {
  title: string;
  rightAction?: ReactNode;
}

export function PageHeader({ title, rightAction }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-sand-dark px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif font-bold text-slate-900 tracking-tight">{title}</h1>
        <div className="flex items-center gap-2">
          {rightAction}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
