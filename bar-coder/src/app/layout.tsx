import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Serif, Manrope } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif({
  variable: "--font-headline",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "700"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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

import BottomNav from "@/components/ui/BottomNav";
import TopAppBar from "@/components/ui/TopAppBar";
import MainContent from "@/components/ui/MainContent";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSerif.variable} ${manrope.variable} antialiased selection:bg-primary/30`}
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="mobile-container">
          <TopAppBar />
          <MainContent>{children}</MainContent>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
