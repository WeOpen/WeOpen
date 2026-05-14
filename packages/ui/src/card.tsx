import type { HTMLAttributes, ReactNode } from "react";

/** CardProps exposes a shared article wrapper with optional heading and description slots. */
export type CardProps = HTMLAttributes<HTMLElement> & {
  title?: ReactNode;
  description?: ReactNode;
};

/** Card renders shared dashboard/content panels with consistent semantic structure. */
export function Card({
  children,
  className,
  description,
  title,
  ...props
}: CardProps) {
  const classes = ["ui-card", className].filter(Boolean).join(" ");

  return (
    <article className={classes} {...props}>
      {title ? <h2 className="ui-card-title">{title}</h2> : null}
      {description ? <p className="ui-card-description">{description}</p> : null}
      {children}
    </article>
  );
}
