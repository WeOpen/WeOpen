import type { ReactNode } from "react";
import { cn } from "./utils";

export type PageHeaderProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ actions, className, description, eyebrow, title }: PageHeaderProps) {
  return (
    <section className={cn("page-header", { "page-header-with-actions": Boolean(actions) }, className)}>
      <div>
        {eyebrow ? <div className="page-kicker">{eyebrow}</div> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </section>
  );
}
