import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { UmamiAnalytics } from "@/components/analytics/umami";
import { Toaster } from "@/components/ui/toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TQ-HELP — Gestión interna",
  description: "Sistema de incidencias y peticiones",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-slate-50 antialiased`}>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
          <Toaster />
        </ThemeProvider>
        <UmamiAnalytics />
      </body>
    </html>
  );
}
