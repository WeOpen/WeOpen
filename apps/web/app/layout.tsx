import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@weopen/ui/admin.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans"
});

const themeBootstrapScript = `
(() => {
  try {
    const stored = window.localStorage.getItem("weopen-theme");
    const theme = stored === "light" || stored === "dark" ? stored : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.dataset.theme = theme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export const metadata: Metadata = {
  title: "WeOpen Admin",
  description: "Personal management platform admin console"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
