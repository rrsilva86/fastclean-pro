import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-5 text-slate-500">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
