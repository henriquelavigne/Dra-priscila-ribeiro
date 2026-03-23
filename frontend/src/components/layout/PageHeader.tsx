import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  rightAction?: ReactNode;
}

export function PageHeader({ title, rightAction }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
      <div className={rightAction ? "flex items-center justify-between" : undefined}>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {rightAction && <div>{rightAction}</div>}
      </div>
    </header>
  );
}
