export const appVersion = {
  version: "0.3.0",
  releaseName: "Raisa clean start",
  releaseDate: "2026-06-01",
  build: "2026.06.01.01"
} as const;

export function appVersionLabel() {
  return `v${appVersion.version} · ${appVersion.releaseName} · build ${appVersion.build}`;
}
