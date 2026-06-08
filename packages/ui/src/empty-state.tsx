import type { ReactNode } from "react";
import { Card } from "./card";
import { cn } from "./utils";

export type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function EmptyState({ actions, className, description, icon, title }: EmptyStateProps) {
  return (
    <Card className={cn("weopen-empty-state", className)} variant="transparent">
      <Card.Content>
        <span className="weopen-empty-state-icon">{icon ?? "···"}</span>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
        {actions ? <div className="weopen-empty-state-actions">{actions}</div> : null}
      </Card.Content>
    </Card>
  );
}
