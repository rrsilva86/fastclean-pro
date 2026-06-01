"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" onClick={onClose}>
      <section className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-premium" onClick={(event) => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">{title}</h2>
          <button className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="max-h-[calc(90vh-73px)] overflow-y-auto p-5">{children}</div>
      </section>
    </div>
  );
}
