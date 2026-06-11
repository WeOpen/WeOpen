"use client";

import { useEffect, useState } from "react";

type ClockState = {
  label: string;
  now: Date;
  timeZone?: string;
};

export function LoginCheckedTime() {
  const [clock, setClock] = useState<ClockState | null>(null);

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    const label = timeZone ?? "Local";
    const updateClock = () => setClock({ label, now: new Date(), timeZone });

    updateClock();
    const interval = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(interval);
  }, []);

  if (!clock) {
    return <span>Detecting timezone</span>;
  }

  return (
    <time dateTime={clock.now.toISOString()}>
      {formatUserTime(clock.now, clock.label, clock.timeZone)}
    </time>
  );
}

function formatUserTime(date: Date, label: string, timeZone?: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    ...(timeZone ? { timeZone } : {}),
    year: "numeric"
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year") ?? "0000"}-${values.get("month") ?? "00"}-${values.get("day") ?? "00"} ${values.get("hour") ?? "00"}:${values.get("minute") ?? "00"}:${values.get("second") ?? "00"} ${label}`;
}
