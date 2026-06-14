"use client";

import type { CSSProperties, FocusEvent, HTMLAttributes, MouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PixelIcon } from "./pixel-icon";
import { cn } from "./utils";

export type SegmentedControlOption = {
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

export type SegmentedControlProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  "aria-label": string;
  onValueChange?: (value: string) => void;
  options: SegmentedControlOption[];
  value: string;
};

export function SegmentedControl({
  "aria-label": ariaLabel,
  className,
  onValueChange,
  options,
  style,
  value,
  ...props
}: SegmentedControlProps) {
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  return (
    <div
      aria-label={ariaLabel}
      className={cn("weopen-segmented-control", className)}
      role="tablist"
      style={{
        ...style,
        "--weopen-segment-count": options.length,
        "--weopen-segment-index": selectedIndex
      } as CSSProperties}
      {...props}
    >
      <span aria-hidden="true" className="weopen-segmented-control__indicator" />
      {options.map((option) => (
        <button
          aria-selected={value === option.value}
          disabled={option.disabled}
          key={option.value}
          onClick={() => onValueChange?.(option.value)}
          role="tab"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type ProgressRailItem = {
  label: ReactNode;
  value: number;
};

export type ProgressRailProps = HTMLAttributes<HTMLDivElement> & {
  items: ProgressRailItem[];
};

export function ProgressRail({ className, items, ...props }: ProgressRailProps) {
  return (
    <div className={cn("weopen-progress-rail", className)} {...props}>
      {items.map((item, index) => (
        <div key={index}>
          <span>{item.label}</span>
          <i style={{ "--weopen-progress-value": `${clampPercent(item.value)}%` } as CSSProperties} />
        </div>
      ))}
    </div>
  );
}

export type KeyboardShortcutProps = HTMLAttributes<HTMLDivElement> & {
  keys: string[];
  label: ReactNode;
};

export function KeyboardShortcut({ className, keys, label, ...props }: KeyboardShortcutProps) {
  return (
    <div className={cn("weopen-keyboard-shortcut", className)} {...props}>
      <span>{label}</span>
      <div>
        {keys.map((key) => (
          <kbd key={key}>{key}</kbd>
        ))}
      </div>
    </div>
  );
}

export type CommandSurfaceTone = "accent" | "danger" | "neutral" | "success" | "warning";

export type CommandSurfaceItem = {
  description: ReactNode;
  name: ReactNode;
  status: ReactNode;
  tone?: CommandSurfaceTone;
};

export type CommandSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  items: CommandSurfaceItem[];
  searchLabel?: ReactNode;
  shortcut?: ReactNode;
};

export function CommandSurface({
  className,
  items,
  searchLabel = "Search components",
  shortcut = "⌘K",
  ...props
}: CommandSurfaceProps) {
  return (
    <div className={cn("weopen-command-surface", className)} {...props}>
      <div className="weopen-command-surface-search">
        <PixelIcon name="command" variant="bare" />
        <strong>{searchLabel}</strong>
        <kbd>{shortcut}</kbd>
      </div>
      {items.map((item, index) => (
        <button key={index} type="button">
          <span>{item.name}</span>
          <small>{item.description}</small>
          <em data-tone={item.tone ?? "neutral"}>{item.status}</em>
        </button>
      ))}
    </div>
  );
}

export type MarqueeRailProps = HTMLAttributes<HTMLDivElement> & {
  durationSeconds?: number;
  items: string[];
};

export function MarqueeRail({ className, durationSeconds = 16, items, ...props }: MarqueeRailProps) {
  const loopedItems = [...items, ...items];

  return (
    <div
      className={cn("weopen-marquee-rail", className)}
      style={{ "--weopen-marquee-duration": `${durationSeconds}s` } as CSSProperties}
      {...props}
    >
      <div>
        {loopedItems.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    </div>
  );
}

export type BorderBeamProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function BorderBeam({ children, className, ...props }: BorderBeamProps) {
  return (
    <div className={cn("weopen-border-beam", className)} {...props}>
      {children}
    </div>
  );
}

export type AvatarStackItem = {
  initials: string;
  label?: string;
};

export type AvatarStackProps = HTMLAttributes<HTMLDivElement> & {
  items: AvatarStackItem[];
  statusLabel?: ReactNode;
};

export function AvatarStack({ className, items, statusLabel, ...props }: AvatarStackProps) {
  return (
    <div className={cn("weopen-avatar-stack", className)} {...props}>
      {items.map((item) => (
        <span aria-label={item.label} key={item.initials} title={item.label}>
          {item.initials}
        </span>
      ))}
      {statusLabel ? <strong>{statusLabel}</strong> : null}
    </div>
  );
}

export type TooltipProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  content: ReactNode;
  placement?: "bottom" | "top";
};

export function Tooltip({
  children,
  className,
  content,
  onBlur,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  placement = "top",
  ...props
}: TooltipProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const y = placement === "top" ? rect.top : rect.bottom;

    setPosition({
      x: rect.left + rect.width / 2,
      y
    });
  }, [placement]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  function openTooltip(event: MouseEvent<HTMLSpanElement>) {
    onMouseEnter?.(event);
    updatePosition();
    setIsOpen(true);
  }

  function closeTooltip(event: MouseEvent<HTMLSpanElement>) {
    onMouseLeave?.(event);
    setIsOpen(false);
  }

  function focusTooltip(event: FocusEvent<HTMLSpanElement>) {
    onFocus?.(event);
    updatePosition();
    setIsOpen(true);
  }

  function blurTooltip(event: FocusEvent<HTMLSpanElement>) {
    onBlur?.(event);
    setIsOpen(false);
  }

  return (
    <span
      aria-describedby={isOpen ? tooltipId : undefined}
      className={cn("weopen-tooltip", className)}
      onBlur={blurTooltip}
      onFocus={focusTooltip}
      onMouseEnter={openTooltip}
      onMouseLeave={closeTooltip}
      ref={triggerRef}
      {...props}
    >
      {children}
      {isMounted && isOpen
        ? createPortal(
            <span
              className={cn("weopen-tooltip-portal", `weopen-tooltip-portal--${placement}`)}
              id={tooltipId}
              role="tooltip"
              style={{
                "--weopen-tooltip-x": `${position.x}px`,
                "--weopen-tooltip-y": `${position.y}px`
              } as CSSProperties}
            >
              {content}
            </span>,
            document.body
          )
        : null}
    </span>
  );
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}
