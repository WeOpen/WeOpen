import type { ReactNode } from "react";
import { Card } from "./card";
import { Chip } from "./chip";
import { cn } from "./utils";

export type MetricCardProps = {
  label: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  trend?: ReactNode;
  trendDirection?: "up" | "down" | "neutral";
  className?: string;
};

export function MetricCard({
  className,
  description,
  icon,
  label,
  trend,
  trendDirection = "neutral",
  value
}: MetricCardProps) {
  return (
    <Card className={cn("weopen-metric-card", className)}>
      <Card.Content>
        <div className="weopen-metric-card-header">
          <span>{label}</span>
          {icon ? <span className="weopen-metric-card-icon">{icon}</span> : null}
        </div>
        <div className="weopen-metric-card-value-row">
          <strong>{value}</strong>
          {trend ? (
            <Chip color={chipColor(trendDirection)} size="sm" variant="outline">
              {trendDirection === "up" ? <span aria-hidden="true">↗</span> : null}
              {trendDirection === "down" ? <span aria-hidden="true">↘</span> : null}
              <Chip.Label>{trend}</Chip.Label>
            </Chip>
          ) : null}
        </div>
        {description ? <p>{description}</p> : null}
      </Card.Content>
    </Card>
  );
}

function chipColor(direction: MetricCardProps["trendDirection"]) {
  if (direction === "up") {
    return "success";
  }
  if (direction === "down") {
    return "danger";
  }
  return "default";
}
