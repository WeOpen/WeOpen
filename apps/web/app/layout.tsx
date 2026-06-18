import type { Metadata } from "next";
import Script from "next/script";
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

const adminHistoryRefreshScript = `
(function () {
  var adminPathPattern = /^\\/(api|blog|dashboard|domains|plugins|settings|storage|tools)(\\/|$)/;
  var navEntry = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  var hasReloadedKey = "weopen:admin-history-refresh:" + location.pathname;
  function readReloadGuard() {
    try {
      return sessionStorage.getItem(hasReloadedKey);
    } catch {
      return null;
    }
  }
  function writeReloadGuard() {
    try {
      sessionStorage.setItem(hasReloadedKey, "1");
    } catch {}
  }
  function clearReloadGuard() {
    try {
      sessionStorage.removeItem(hasReloadedKey);
    } catch {}
  }
  function refreshIfNeeded() {
    if (!adminPathPattern.test(location.pathname)) return;
    if (readReloadGuard() === "1") {
      clearReloadGuard();
      return;
    }
    writeReloadGuard();
    location.reload();
  }
  if (navEntry && navEntry.type === "back_forward") refreshIfNeeded();
  if (!navEntry || navEntry.type !== "back_forward") clearReloadGuard();
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) refreshIfNeeded();
  });
})();`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark" data-theme="dark" lang="zh-CN" suppressHydrationWarning>
      <body>
        <Script id="weopen-admin-history-refresh" strategy="beforeInteractive">
          {adminHistoryRefreshScript}
        </Script>
        <MosaicBackground />
        <AppToastBridge />
        {children}
      </body>
    </html>
  );
}
