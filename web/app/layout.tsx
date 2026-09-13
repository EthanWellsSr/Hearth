import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import pkg from "@/package.json";
import { MeadowBackdrop } from "@/components/MeadowBackdrop";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hearth",
  description: "A softer way to care for home, together.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Hearth", statusBarStyle: "default" },
  icons: { icon: "/logo-meadow.png", apple: "/logo-meadow.png" },
};

export const viewport: Viewport = {
  themeColor: "#f8f5ed",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <MeadowBackdrop />
        {children}
        <footer className="flex h-16 items-center justify-center gap-2 px-5 text-center text-xs text-stone-400">
          <span className="h-px w-8 bg-emerald-200" />
          Hearth · v{pkg.version}
          <span className="h-px w-8 bg-emerald-200" />
        </footer>
      </body>
    </html>
  );
}
