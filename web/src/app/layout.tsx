import type { Metadata } from "next";
import { Syne, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "open-u60-pro — ZTE U60 Pro 工具集",
    template: "%s | open-u60-pro",
  },
  description:
    "释放 ZTE U60 Pro 5G 移动路由器的全部潜能。设备端 Agent、原生配套 App，以及基于 Web 的引导部署工具。",
  keywords: [
    "ZTE U60 Pro",
    "MU5250",
    "5G 路由器",
    "频段锁定",
    "信号监控",
    "OpenWrt",
    "REST API",
    "WebUSB",
  ],
  authors: [{ name: "jesther-ai" }],
  openGraph: {
    title: "open-u60-pro — ZTE U60 Pro 工具集",
    description: "释放 ZTE U60 Pro 5G 移动路由器的全部潜能。",
    url: "https://open-u60-pro.vercel.app",
    siteName: "open-u60-pro",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "open-u60-pro — ZTE U60 Pro 工具集",
    description: "释放 ZTE U60 Pro 5G 移动路由器的全部潜能。",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://open-u60-pro.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${syne.variable} ${jakarta.variable} ${jetbrains.variable}`}
    >
      <head>
        <meta name="theme-color" content="#EAEFEF" />
      </head>
      <body className="grain-overlay">
        <Navbar />
        <main className="relative z-0 overflow-x-hidden">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
