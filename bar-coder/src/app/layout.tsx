import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Bar Coder | 홈바 칵테일 관리",
  description: "나만의 홈바 재고를 관리하고 완벽한 칵테일 레시피를 찾아보세요.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1a1a1a",
};

import BottomNav from "@/components/layout/BottomNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased selection:bg-[#d4a843]/20 selection:text-[#e8c06a]`}
        style={{ background: "var(--bg-primary)" }}
      >
        <main className="min-h-screen has-bottom-nav">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
