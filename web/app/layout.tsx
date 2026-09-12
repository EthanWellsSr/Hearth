import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import pkg from "@/package.json";
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
  description: "Your household, in one place.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Hearth", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#15803d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <footer className="px-5 py-6 text-center text-xs text-stone-400 dark:text-stone-600">
          Hearth v{pkg.version}
        </footer>
      </body>
    </html>
  );
}
