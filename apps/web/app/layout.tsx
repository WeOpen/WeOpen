import type { Metadata } from "next";
import "@weopen/ui/styles.css";
import "./globals.css";
import { MosaicBackground } from "@/shared/layout/mosaic-background";

export const metadata: Metadata = {
  title: "WeOpen Admin",
  description: "Personal management platform admin console",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }]
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
        {children}
      </body>
    </html>
  );
}
