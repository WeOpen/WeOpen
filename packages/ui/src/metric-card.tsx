import type { ReactNode } from "react";
import { Card } from "./card";
import { Chip } from "./chip";
import { PixelIcon } from "./pixel-icon";
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
              {trendDirection === "up" ? <PixelIcon name="trend-up" variant="bare" /> : null}
              {trendDirection === "down" ? <PixelIcon name="trend-down" variant="bare" /> : null}
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
