import type { Metadata } from "next";
import "@weopen/ui/styles.css";
import "./globals.css";
import { AppToastBridge } from "@/shared/layout/app-toast-bridge";
import { MosaicBackground } from "@/shared/layout/mosaic-background";

export const metadata: Metadata = {
  title: "WeOpen Admin",
  description: "Personal management platform admin console",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" data-theme="dark" lang="zh-CN" suppressHydrationWarning>
      <body>
        <MosaicBackground />
        <AppToastBridge />
        {children}
      </body>
    </html>
  );
}
