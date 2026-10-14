import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ERA_LABEL, ERA_YEAR } from "@/lib/world";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `당신의 ${ERA_LABEL} 시대 직업은?`,
  description: `사진 한 장으로 알아보는 ${ERA_YEAR}년의 내 직업과 최후 — 그림판 초상화 포함`,
  openGraph: {
    title: `당신의 ${ERA_LABEL} 시대 직업은?`,
    description: `사진 한 장으로 알아보는 ${ERA_YEAR}년의 내 직업과 최후`,
    type: "website",
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#008080" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Gaegu:wght@400;700&family=Noto+Sans+KR:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
