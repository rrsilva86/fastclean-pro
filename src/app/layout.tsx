import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FastClean Pro",
  description: "FastClean Pro SaaS platform"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
