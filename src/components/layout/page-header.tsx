import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
