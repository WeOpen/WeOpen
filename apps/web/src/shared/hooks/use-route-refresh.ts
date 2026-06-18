"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

type RefreshCleanup = () => void;

type UseRouteRefreshOptions = {
  enabled?: boolean;
  pathname?: string;
  pathnames?: readonly string[];
  pathnamePrefix?: string;
  pathnamePrefixes?: readonly string[];
  refresh: () => void | RefreshCleanup;
  retryDelayMs?: number;
  retryWhen?: boolean;
  serverRefresh?: boolean;
};

export function useRouteRefresh({
  enabled = true,
  pathname,
  pathnames,
  pathnamePrefix,
  pathnamePrefixes,
  refresh,
  retryDelayMs = 2000,
  retryWhen = false,
  serverRefresh = false
}: UseRouteRefreshOptions) {
  const currentPathname = usePathname();
  const router = useRouter();

  const isRouteMatch = useCallback((nextPathname: string) => {
    if (!enabled) {
      return false;
    }
    const exactPathnames = [pathname, ...(pathnames ?? [])].filter((value): value is string => Boolean(value));
    const prefixPathnames = [pathnamePrefix, ...(pathnamePrefixes ?? [])].filter((value): value is string => Boolean(value));
    if (!exactPathnames.length && !prefixPathnames.length) {
      return true;
    }
    return exactPathnames.includes(nextPathname) || prefixPathnames.some((prefix) => nextPathname === prefix || nextPathname.startsWith(`${prefix}/`));
  }, [enabled, pathname, pathnamePrefix, pathnamePrefixes, pathnames]);

  const runRefresh = useCallback((includeServerRefresh = false) => {
    if (typeof window === "undefined" || !isRouteMatch(window.location.pathname)) {
      return undefined;
    }
    if (serverRefresh && includeServerRefresh) {
      router.refresh();
    }
    return refresh();
  }, [isRouteMatch, refresh, router, serverRefresh]);

  useEffect(() => {
    let cancelRefresh: RefreshCleanup | undefined;

    function run(includeServerRefresh = false) {
      cancelRefresh?.();
      const cleanup = runRefresh(includeServerRefresh);
      cancelRefresh = typeof cleanup === "function" ? cleanup : undefined;
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        run();
      }
    }

    function refreshAfterHistoryRestore() {
      run(true);
    }

    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("pageshow", refreshAfterHistoryRestore);
    window.addEventListener("popstate", refreshAfterHistoryRestore);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelRefresh?.();
      window.removeEventListener("focus", refreshWhenVisible);
      window.removeEventListener("pageshow", refreshAfterHistoryRestore);
      window.removeEventListener("popstate", refreshAfterHistoryRestore);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [runRefresh]);

  useEffect(() => {
    if (!isRouteMatch(currentPathname)) {
      return undefined;
    }
    let isActive = true;
    let cancelRefresh: RefreshCleanup | undefined;
    queueMicrotask(() => {
      if (!isActive) {
        return;
      }
      const cleanup = runRefresh(true);
      cancelRefresh = typeof cleanup === "function" ? cleanup : undefined;
    });
    return () => {
      isActive = false;
      cancelRefresh?.();
    };
  }, [currentPathname, isRouteMatch, runRefresh]);

  useEffect(() => {
    if (!retryWhen || !isRouteMatch(currentPathname)) {
      return undefined;
    }
    const retryTimer = window.setTimeout(() => {
      runRefresh();
    }, retryDelayMs);
    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [currentPathname, isRouteMatch, retryDelayMs, retryWhen, runRefresh]);
}
