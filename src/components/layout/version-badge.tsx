import { appVersion, appVersionLabel } from "@/config/app-version";

export function VersionBadge() {
  return (
    <span
      className="text-[11px] font-semibold text-slate-300"
      title={`${appVersionLabel()} · ${appVersion.releaseDate}`}
    >
      FastClean Pro v{appVersion.version} · build {appVersion.build}
    </span>
  );
}
