import type { Metadata, Viewport } from "next";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { appBranding } from "@/config/branding";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: appBranding.name,
  title: appBranding.name,
  description: appBranding.description,
  manifest: appBranding.manifestPath,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appBranding.name
  },
  icons: {
    icon: [
      { url: appBranding.faviconPath, sizes: "32x32", type: "image/x-icon" },
      { url: appBranding.faviconPngPath, sizes: "32x32", type: "image/png" },
      { url: appBranding.icon192Path, sizes: "192x192", type: "image/png" },
      { url: appBranding.icon512Path, sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: appBranding.appleTouchIconPath, sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: appBranding.themeColor
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={appBranding.name} />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
