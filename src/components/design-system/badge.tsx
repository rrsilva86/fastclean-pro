import type { ReactNode } from "react";

type BadgeTone = "blue" | "teal" | "green" | "yellow" | "orange" | "purple" | "red" | "gray";

const toneClasses: Record<BadgeTone, string> = {
  blue: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  yellow: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  purple: "bg-purple-50 text-purple-700 ring-purple-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  gray: "bg-slate-50 text-slate-700 ring-slate-200"
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black ring-1 ${toneClasses[tone]}`}>{children}</span>;
}
