import type { Metadata, Viewport } from "next";
import "./globals.css";
import VersionWatcher from "@/components/VersionWatcher";

export const metadata: Metadata = {
  title: "Gestionale clienti",
  description: "Gestione privata di clienti, credenziali, scadenze e pagamenti",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Gestionale",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <VersionWatcher />
        {children}
      </body>
    </html>
  );
}
