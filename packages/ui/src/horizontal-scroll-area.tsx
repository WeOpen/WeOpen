"use client";

import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "./utils";

export type HorizontalScrollAreaProps = {
  "aria-label"?: string;
  children: ReactNode;
  className?: string;
  role?: string;
  viewportClassName?: string;
};

const minThumbPercent = 12;

export function HorizontalScrollArea({
  "aria-label": ariaLabel,
  children,
  className,
  role,
  viewportClassName
}: HorizontalScrollAreaProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const smoothProgress = useSpring(progress, {
    damping: 28,
    mass: 0.2,
    stiffness: 140
  });
  const [metrics, setMetrics] = useState({ canScroll: false, thumbPercent: 100 });

  const updateMetrics = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const canScroll = maxScrollLeft > 1;
    const thumbPercent = canScroll
      ? Math.max(minThumbPercent, Math.min(100, (viewport.clientWidth / viewport.scrollWidth) * 100))
      : 100;

    progress.set(canScroll ? viewport.scrollLeft / maxScrollLeft : 0);
    setMetrics((current) => {
      if (
        current.canScroll === canScroll &&
        Math.abs(current.thumbPercent - thumbPercent) < 0.1
      ) {
        return current;
      }

      return { canScroll, thumbPercent };
    });
  }, [progress]);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    updateMetrics();
    viewport.addEventListener("scroll", updateMetrics, { passive: true });
    window.addEventListener("resize", updateMetrics);

    const resizeObserver = new ResizeObserver(updateMetrics);
    resizeObserver.observe(viewport);
    if (viewport.firstElementChild) {
      resizeObserver.observe(viewport.firstElementChild);
    }

    return () => {
      viewport.removeEventListener("scroll", updateMetrics);
      window.removeEventListener("resize", updateMetrics);
      resizeObserver.disconnect();
    };
  }, [updateMetrics]);

  const thumbLeft = useTransform(smoothProgress, (value) => `${value * (100 - metrics.thumbPercent)}%`);

  const handleRailPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;

    if (!viewport || !metrics.canScroll) {
      return;
    }

    const railRect = event.currentTarget.getBoundingClientRect();
    const pointerRatio = (event.clientX - railRect.left) / railRect.width;
    const targetLeft = Math.max(
      0,
      Math.min(
        viewport.scrollWidth - viewport.clientWidth,
        pointerRatio * viewport.scrollWidth - viewport.clientWidth / 2
      )
    );

    viewport.scrollTo({ behavior: "smooth", left: targetLeft });
  };

  return (
    <div className={cn("weopen-horizontal-scroll-area", className)}>
      <div
        aria-label={ariaLabel}
        className={cn("weopen-horizontal-scroll-viewport", viewportClassName)}
        ref={viewportRef}
        role={role}
      >
        {children}
      </div>

      {metrics.canScroll ? (
        <div
          aria-hidden="true"
          className="weopen-horizontal-scroll-rail"
          onPointerDown={handleRailPointerDown}
        >
          <motion.div
            className="weopen-horizontal-scroll-thumb"
            style={{
              left: thumbLeft,
              width: `${metrics.thumbPercent}%`
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
