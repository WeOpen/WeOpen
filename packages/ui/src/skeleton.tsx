import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type SkeletonElement = "div" | "span";

export type SkeletonProps = HTMLAttributes<HTMLElement> & {
  animated?: boolean;
  as?: SkeletonElement;
  height?: CSSProperties["height"];
  radius?: "sm" | "md" | "lg" | "pill" | "circle";
  variant?: "block" | "text" | "circle";
  width?: CSSProperties["width"];
};

export type SkeletonStackProps = HTMLAttributes<HTMLDivElement> & {
  rowHeight?: CSSProperties["height"];
  rows?: number;
  widths?: Array<CSSProperties["width"]>;
};

export type PageSkeletonProps = HTMLAttributes<HTMLElement> & {
  cardCount?: number;
  metricCount?: number;
  rowCount?: number;
  title?: ReactNode;
  variant?: "admin" | "auth" | "design-system" | "public";
};

export function Skeleton({
  animated = true,
  as = "span",
  className,
  height,
  radius = "md",
  style,
  variant = "block",
  width,
  ...props
}: SkeletonProps) {
  const classes = cn(
    "weopen-skeleton",
    `weopen-skeleton--${variant}`,
    `weopen-skeleton--radius-${variant === "circle" ? "circle" : radius}`,
    { "weopen-skeleton--animated": animated },
    className
  );
  const skeletonStyle = { height, width, ...style };

  if (as === "div") {
    return <div aria-hidden="true" className={classes} style={skeletonStyle} {...props} />;
  }

  return <span aria-hidden="true" className={classes} style={skeletonStyle} {...props} />;
}

export function SkeletonStack({
  className,
  rowHeight = 14,
  rows = 3,
  widths = ["100%", "86%", "64%"],
  ...props
}: SkeletonStackProps) {
  return (
    <div className={cn("weopen-skeleton-stack", className)} {...props}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          height={rowHeight}
          key={index}
          radius="pill"
          width={widths[index % widths.length]}
        />
      ))}
    </div>
  );
}

export function PageSkeleton({
  cardCount = 2,
  className,
  metricCount = 4,
  rowCount = 5,
  title = "Loading page",
  variant = "admin",
  ...props
}: PageSkeletonProps) {
  return (
    <section
      aria-busy="true"
      aria-label={typeof title === "string" ? title : "Loading page"}
      className={cn("weopen-page-skeleton", `weopen-page-skeleton--${variant}`, className)}
      role="status"
      {...props}
    >
      {variant === "auth" ? <AuthSkeleton /> : null}
      {variant === "public" ? <PublicSkeleton /> : null}
      {variant === "design-system" ? <DesignSystemSkeleton /> : null}
      {variant === "admin" ? (
        <AdminSkeleton cardCount={cardCount} metricCount={metricCount} rowCount={rowCount} />
      ) : null}
      <span className="weopen-page-skeleton__sr">{title}</span>
    </section>
  );
}

function AdminSkeleton({
  cardCount,
  metricCount,
  rowCount
}: {
  cardCount: number;
  metricCount: number;
  rowCount: number;
}) {
  return (
    <>
      <div className="weopen-page-skeleton__header">
        <Skeleton height={12} radius="pill" width={82} />
        <Skeleton height={44} radius="sm" width="min(420px, 76%)" />
        <Skeleton height={16} radius="pill" width="min(620px, 92%)" />
      </div>
      <div className="weopen-page-skeleton__metrics">
        {Array.from({ length: metricCount }, (_, index) => (
          <div className="weopen-page-skeleton__card weopen-page-skeleton__metric" key={index}>
            <Skeleton height={12} radius="pill" width="45%" />
            <Skeleton height={34} radius="sm" width="62%" />
            <Skeleton height={10} radius="pill" width="82%" />
          </div>
        ))}
      </div>
      <div className="weopen-page-skeleton__content">
        {Array.from({ length: cardCount }, (_, index) => (
          <div className="weopen-page-skeleton__card" key={index}>
            <Skeleton height={22} radius="sm" width="38%" />
            <SkeletonStack rowHeight={12} rows={rowCount} widths={["100%", "94%", "88%", "72%"]} />
          </div>
        ))}
      </div>
    </>
  );
}

function AuthSkeleton() {
  return (
    <div className="weopen-page-skeleton__split">
      <div className="weopen-page-skeleton__hero">
        <Skeleton height={76} radius="sm" width="62%" />
        <Skeleton height={14} radius="pill" width="48%" />
        <SkeletonStack rowHeight={18} rows={6} widths={["92%", "74%", "84%"]} />
      </div>
      <div className="weopen-page-skeleton__card weopen-page-skeleton__form">
        <Skeleton height={24} radius="sm" width="48%" />
        <SkeletonStack rowHeight={44} rows={3} widths={["100%"]} />
        <Skeleton height={44} radius="pill" width="42%" />
      </div>
    </div>
  );
}

function PublicSkeleton() {
  return (
    <>
      <div className="weopen-page-skeleton__nav">
        <Skeleton height={18} radius="pill" width={96} />
        <Skeleton height={32} radius="pill" width={190} />
      </div>
      <div className="weopen-page-skeleton__hero">
        <Skeleton height={18} radius="pill" width={140} />
        <Skeleton height={82} radius="sm" width="min(520px, 84%)" />
        <SkeletonStack rowHeight={16} rows={3} widths={["72%", "86%", "58%"]} />
      </div>
      <div className="weopen-page-skeleton__metrics">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="weopen-page-skeleton__card weopen-page-skeleton__metric" key={index}>
            <Skeleton height={12} radius="pill" width="40%" />
            <Skeleton height={22} radius="sm" width="64%" />
          </div>
        ))}
      </div>
    </>
  );
}

function DesignSystemSkeleton() {
  return (
    <>
      <div className="weopen-page-skeleton__nav">
        <Skeleton height={18} radius="pill" width={96} />
        <Skeleton height={32} radius="pill" width={210} />
      </div>
      <div className="weopen-page-skeleton__header">
        <Skeleton height={14} radius="pill" width={150} />
        <Skeleton height={56} radius="sm" width="min(460px, 82%)" />
        <SkeletonStack rowHeight={14} rows={2} widths={["78%", "60%"]} />
      </div>
      <div className="weopen-page-skeleton__design-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="weopen-page-skeleton__card" key={index}>
            <Skeleton height={18} radius="sm" width="42%" />
            <SkeletonStack rowHeight={12} rows={4} widths={["100%", "78%", "92%"]} />
          </div>
        ))}
      </div>
    </>
  );
}
