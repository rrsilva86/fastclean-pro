"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-3 backdrop-blur-sm" onClick={onClose}>
      <section className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-premium" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-base font-black text-slate-950">{title}</h2>
          <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[calc(92vh-57px)] overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}
