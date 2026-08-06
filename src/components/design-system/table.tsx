import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-100">
      <table className="w-full border-collapse bg-white text-left text-xs">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return <th className="border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-500">{children}</th>;
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{children}</td>;
}
