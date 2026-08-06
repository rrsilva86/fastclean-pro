"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { CheckCircle2, Copy, Download, ExternalLink, Monitor, Share2, Smartphone, Tablet, Apple } from "lucide-react";
import { Button, Card, CardContent, CardHeader } from "@/components/design-system";
import { appBranding } from "@/config/branding";

type Platform = "ios" | "ipados" | "android" | "windows" | "macos" | "other";
type InstallState = "unsupported" | "already_installed" | "dismissed" | "ios_manual" | "native_prompt_available";
type LocaleKey = "en" | "pt" | "es";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export type InstallDictionary = {
  app: {
    name: string;
    tagline: string;
  };
  install: Record<string, string>;
};

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
}

function detectPlatform() {
  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;
  const isIpadOS = platform === "MacIntel" && maxTouchPoints > 1;

  if (/iPhone|iPod/i.test(userAgent)) {
    return "ios" as const;
  }

  if (/iPad/i.test(userAgent) || isIpadOS) {
    return "ipados" as const;
  }

  if (/Android/i.test(userAgent)) {
    return "android" as const;
  }

  if (/Win/i.test(platform)) {
    return "windows" as const;
  }

  if (/Mac/i.test(platform)) {
    return "macos" as const;
  }

  return "other" as const;
}

function isSafariOnIOS(platform: Platform) {
  const userAgent = window.navigator.userAgent;
  return (platform === "ios" || platform === "ipados") && /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS/i.test(userAgent);
}

function initialLocale() {
  if (typeof navigator === "undefined") {
    return "pt" as LocaleKey;
  }

  const language = navigator.language.toLowerCase();
  if (language.startsWith("en")) return "en";
  if (language.startsWith("es")) return "es";
  return "pt";
}

function platformIcon(platform: Platform) {
  if (platform === "ios" || platform === "macos") return <Apple className="h-5 w-5" />;
  if (platform === "ipados") return <Tablet className="h-5 w-5" />;
  if (platform === "android") return <Smartphone className="h-5 w-5" />;
  return <Monitor className="h-5 w-5" />;
}

export function InstallPageClient({ dictionaries }: { dictionaries: Record<LocaleKey, InstallDictionary> }) {
  const [locale, setLocale] = useState<LocaleKey>("pt");
  const [platform, setPlatform] = useState<Platform>("other");
  const [installState, setInstallState] = useState<InstallState>("unsupported");
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installUrl, setInstallUrl] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const labels = dictionaries[locale];
  const t = labels.install;
  const platformName = useMemo(() => t[`platform.${platform}`] ?? t["platform.other"], [platform, t]);

  useEffect(() => {
    setLocale(initialLocale());
    const detectedPlatform = detectPlatform();
    const nextUrl = `${window.location.origin}${appBranding.installPath}`;
    setPlatform(detectedPlatform);
    setInstallUrl(nextUrl);
    QRCode.toDataURL(nextUrl, { margin: 1, width: 240, color: { dark: "#0F172A", light: "#FFFFFF" } }).then(setQrCode).catch(() => undefined);

    if (isStandalone()) {
      setInstallState("already_installed");
      return;
    }

    if (detectedPlatform === "ios" || detectedPlatform === "ipados") {
      setInstallState("ios_manual");
      return;
    }

    setInstallState("unsupported");

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallState("native_prompt_available");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  async function copyLink() {
    await navigator.clipboard.writeText(installUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({ title: labels.app.name, text: t.shortDescription, url: installUrl });
      setShared(true);
      setTimeout(() => setShared(false), 2500);
      return;
    }

    await copyLink();
  }

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallState(choice.outcome === "accepted" ? "already_installed" : "dismissed");
  }

  const showNativeInstall = installState === "native_prompt_available";
  const showIOSManual = installState === "ios_manual";
  const showDesktopInstructions = installState === "unsupported" && (platform === "windows" || platform === "macos" || platform === "android");
  const showUnsupported = installState === "unsupported" && platform === "other";

  return (
    <main className="min-h-screen bg-app-background px-5 py-6">
      <div className="mx-auto grid max-w-6xl gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <a className="flex items-center gap-3" href={appBranding.defaultLoginPath}>
            <Image alt="" className="rounded-2xl" height={48} src={appBranding.logoPath} width={48} />
            <span>
              <span className="block text-xl font-black text-slate-900">{labels.app.name}</span>
              <span className="block text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">{labels.app.tagline}</span>
            </span>
          </a>
          <div className="flex gap-2">
            {(["pt", "en", "es"] as LocaleKey[]).map((item) => (
              <button
                className={`rounded-xl border px-3 py-2 text-xs font-black transition ${locale === item ? "border-cyan-200 bg-cyan-50 text-cyan-700" : "border-slate-200 bg-white text-slate-500 hover:border-cyan-200 hover:bg-cyan-50"}`}
                key={item}
                onClick={() => setLocale(item)}
                type="button"
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <Card>
            <CardHeader className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-50 text-primary">{platformIcon(platform)}</span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{platformName}</p>
                <h1 className="text-2xl font-black text-slate-950">{t.title}</h1>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5">
              <p className="max-w-2xl text-base font-semibold leading-relaxed text-slate-600">{t.shortDescription}</p>

              {installState === "already_installed" ? (
                <StatusPanel tone="green" title={t.alreadyInstalled} description={t.alreadyInstalledDescription} />
              ) : null}

              {showNativeInstall ? (
                <div className="grid gap-3">
                  <StatusPanel tone="cyan" title={t.readyToInstall} description={t.nativePromptDescription} />
                  <Button className="h-12 w-full justify-center text-base sm:w-fit" onClick={installApp} type="button">
                    <Download className="h-4 w-4" />
                    {t.installApp}
                  </Button>
                </div>
              ) : null}

              {installState === "dismissed" ? <StatusPanel tone="yellow" title={t.installDismissed} description={t.dismissedDescription} /> : null}

              {showIOSManual ? (
                <div className="grid gap-4">
                  {!isSafariOnIOS(platform) ? <StatusPanel tone="yellow" title={t.openInSafari} description={t.openInSafariDescription} /> : null}
                  <InstructionSteps
                    steps={[
                      t.iosStep1,
                      t.iosStep2,
                      t.iosStep3,
                      t.iosStep4
                    ]}
                  />
                  <p className="text-sm font-semibold text-slate-500">{t.iosHelper}</p>
                </div>
              ) : null}

              {showDesktopInstructions ? (
                <div className="grid gap-4">
                  <StatusPanel tone="cyan" title={t.manualInstallTitle} description={platform === "macos" ? t.desktopMacDescription : t.desktopChromeDescription} />
                  <InstructionSteps steps={[t.desktopStep1, t.desktopStep2, t.desktopStep3]} />
                </div>
              ) : null}

              {showUnsupported ? <StatusPanel tone="yellow" title={t.unsupportedTitle} description={t.unsupportedDescription} /> : null}

              <div className="flex flex-wrap gap-3">
                <Button onClick={copyLink} type="button" variant="outline">
                  <Copy className="h-4 w-4" />
                  {copied ? t.linkCopied : t.copyLink}
                </Button>
                <Button onClick={shareLink} type="button" variant="outline">
                  <Share2 className="h-4 w-4" />
                  {shared ? t.linkShared : t.shareInstallLink}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="hidden lg:block">
            <CardHeader>
              <h2 className="text-base font-black text-slate-950">{t.scanWithPhone}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{t.qrDescription}</p>
            </CardHeader>
            <CardContent>
              <div className="grid place-items-center rounded-2xl border border-slate-100 bg-white p-5">
                {qrCode ? <Image alt={t.qrAlt} height={240} src={qrCode} width={240} /> : <div className="h-60 w-60 rounded-xl bg-slate-100" />}
              </div>
              <p className="mt-4 break-all rounded-xl bg-slate-50 p-3 text-xs font-bold text-slate-500 ring-1 ring-slate-100">{installUrl}</p>
            </CardContent>
          </Card>
        </section>

        <footer className="flex flex-wrap justify-center gap-4 text-xs font-bold text-slate-400">
          <a className="hover:text-primary" href={appBranding.installPath}>{t.installApp}</a>
          <a className="hover:text-primary" href={appBranding.defaultLoginPath}>
            <ExternalLink className="mr-1 inline h-3 w-3" />
            {t.backToLogin}
          </a>
        </footer>
      </div>
    </main>
  );
}

function InstructionSteps({ steps }: { steps: string[] }) {
  return (
    <ol className="grid gap-3">
      {steps.map((step, index) => (
        <li className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 text-sm font-bold text-slate-700 shadow-sm" key={step}>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-50 text-xs font-black text-cyan-700">{index + 1}</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

function StatusPanel({ description, title, tone }: { description: string; title: string; tone: "green" | "yellow" | "cyan" }) {
  const className = tone === "green" ? "border-green-100 bg-green-50 text-green-800" : tone === "yellow" ? "border-yellow-100 bg-yellow-50 text-yellow-800" : "border-cyan-100 bg-cyan-50 text-cyan-800";

  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <h2 className="text-sm font-black">{title}</h2>
          <p className="mt-1 text-sm font-semibold opacity-80">{description}</p>
        </div>
      </div>
    </div>
  );
}
