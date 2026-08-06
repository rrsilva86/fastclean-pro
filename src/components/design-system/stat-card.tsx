import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "./card";

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "cyan"
}: {
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  tone?: "cyan" | "teal" | "green" | "orange" | "red";
}) {
  const toneClass = {
    cyan: "bg-cyan-50 text-cyan-600 ring-cyan-100",
    teal: "bg-teal-50 text-teal-600 ring-teal-100",
    green: "bg-green-50 text-green-600 ring-green-100",
    orange: "bg-orange-50 text-orange-600 ring-orange-100",
    red: "bg-red-50 text-red-600 ring-red-100"
  }[tone];

  return (
    <Card>
      <CardContent className="flex min-h-[118px] items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-slate-500">{label}</p>
          <p className="mt-5 text-2xl font-black tracking-tight text-slate-950">{value}</p>
          {detail ? <p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p> : null}
        </div>
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
