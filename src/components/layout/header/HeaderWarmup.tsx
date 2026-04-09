"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { warmActivityUI, warmJobsUI, warmRouteAdjacentUI } from "@/lib/ui-warmup";

function scheduleIdle(task: () => void) {
  if (typeof window === "undefined") return () => undefined;

  const idleWindow = window as typeof window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (idleWindow.requestIdleCallback) {
    const id = idleWindow.requestIdleCallback(task, { timeout: 1200 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const timeoutId = window.setTimeout(task, 300);
  return () => window.clearTimeout(timeoutId);
}

export function HeaderWarmup({ routes }: { routes: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const uniqueRoutes = Array.from(new Set(routes));
    const criticalRoutes = uniqueRoutes.slice(0, 3);
    const earlyWarmTimeout = window.setTimeout(() => {
      criticalRoutes.forEach((route) => {
        router.prefetch(route);
        void warmRouteAdjacentUI(route);
      });
    }, 80);

    const cancelIdle = scheduleIdle(() => {
      uniqueRoutes.forEach((route) => {
        router.prefetch(route);
        void warmRouteAdjacentUI(route);
      });

      void warmJobsUI();
      void warmActivityUI();
    });

    return () => {
      window.clearTimeout(earlyWarmTimeout);
      cancelIdle();
    };
  }, [router, routes]);

  return null;
}
