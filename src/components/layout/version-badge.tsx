import { GitBranch } from "lucide-react";
import { appVersion, appVersionLabel } from "@/config/app-version";

export function VersionBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200"
      title={`${appVersionLabel()} · ${appVersion.releaseDate}`}
    >
      <GitBranch className="h-3 w-3 shrink-0 text-primary" />
      <span className="truncate">{compact ? `v${appVersion.version}` : appVersionLabel()}</span>
    </span>
  );
}
