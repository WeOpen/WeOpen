"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { cn } from "./utils";

export type ScrollRailProps = {
  className?: string;
  containerRef: RefObject<HTMLElement | null>;
  minProgress?: number;
  orientation?: "horizontal" | "vertical";
  visibility?: "always" | "scrollable";
};

type ScrollState = {
  canScroll: boolean;
  thumbPercent: number;
};

export function ScrollRail({
  className,
  containerRef,
  minProgress = 0.08,
  orientation = "vertical",
  visibility = "always"
}: ScrollRailProps) {
  const { scrollXProgress, scrollYProgress } = useScroll({ container: containerRef });
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScroll: visibility === "always",
    thumbPercent: 100
  });
  const sourceProgress = orientation === "horizontal" ? scrollXProgress : scrollYProgress;
  const smoothPosition = useSpring(sourceProgress, {
    damping: 28,
    mass: 0.2,
    stiffness: 120
  });
  const progress = useSpring(useTransform(sourceProgress, [0, 1], [minProgress, 1]), {
    damping: 28,
    mass: 0.2,
    stiffness: 120
  });
  const thumbOffset = useTransform(smoothPosition, (value) => `${value * (100 - scrollState.thumbPercent)}%`);
  const progressSize = useTransform(progress, (value) => `${value * 100}%`);
  const updateScrollState = useCallback(() => {
    const container = containerRef.current;

    if (!container || visibility === "always") {
      setScrollState({ canScroll: visibility === "always", thumbPercent: 100 });
      return;
    }

    const scrollDistance = orientation === "horizontal"
      ? container.scrollWidth - container.clientWidth
      : container.scrollHeight - container.clientHeight;
    const canScroll = scrollDistance > 1;
    const thumbPercent = orientation === "horizontal" && canScroll
      ? Math.max(minProgress * 100, Math.min(100, (container.clientWidth / container.scrollWidth) * 100))
      : 100;

    setScrollState((current) => {
      if (
        current.canScroll === canScroll &&
        Math.abs(current.thumbPercent - thumbPercent) < 0.1
      ) {
        return current;
      }

      return { canScroll, thumbPercent };
    });
  }, [containerRef, minProgress, orientation, visibility]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    updateScrollState();
    container.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(container);
    if (container.firstElementChild) {
      resizeObserver.observe(container.firstElementChild);
    }

    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [containerRef, updateScrollState]);

  if (!scrollState.canScroll) {
    return null;
  }

  return (
    <div className={cn("weopen-scroll-rail", { "weopen-scroll-rail-horizontal": orientation === "horizontal" }, className)} aria-hidden="true">
      <div className="weopen-scroll-rail-track">
        <motion.div
          className="weopen-scroll-rail-progress"
          style={orientation === "horizontal"
            ? { left: thumbOffset, width: `${scrollState.thumbPercent}%` }
            : { height: progressSize }}
        />
      </div>
    </div>
  );
}
