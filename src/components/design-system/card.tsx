import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-xl border border-slate-200/80 bg-app-card shadow-soft transition duration-200 hover:border-cyan-100 hover:shadow-premium ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-b border-slate-100 px-5 py-4 sm:px-6 ${className}`}>{children}</div>;
}

export function CardContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}
