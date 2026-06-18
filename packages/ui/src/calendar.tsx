"use client";

import type { HTMLAttributes } from "react";
import { useMemo, useState } from "react";
import { Button } from "./button";
import { PixelIcon } from "./pixel-icon";
import { cn } from "./utils";

type CalendarDay = {
  date: Date;
  inCurrentMonth: boolean;
};

type CalendarView = "days" | "months" | "years";

export type CalendarDateMatcher = Date | Date[] | ((date: Date) => boolean);

export type CalendarProps = Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> & {
  defaultMonth?: Date;
  defaultSelectedDate?: Date;
  disabledDates?: CalendarDateMatcher;
  locale?: string;
  maxDate?: Date;
  minDate?: Date;
  month?: Date;
  onMonthChange?: (month: Date) => void;
  onSelect?: (date: Date) => void;
  selectedDate?: Date;
  showOutsideDays?: boolean;
  weekStartsOn?: 0 | 1;
};

const weekdayFallback = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Calendar({
  className,
  defaultMonth,
  defaultSelectedDate,
  disabledDates,
  locale = "en-US",
  maxDate,
  minDate,
  month,
  onMonthChange,
  onSelect,
  selectedDate,
  showOutsideDays = true,
  weekStartsOn = 0,
  ...props
}: CalendarProps) {
  const [uncontrolledMonth, setUncontrolledMonth] = useState(() =>
    startOfMonth(defaultMonth ?? selectedDate ?? defaultSelectedDate ?? new Date())
  );
  const [uncontrolledSelectedDate, setUncontrolledSelectedDate] = useState(defaultSelectedDate);
  const [view, setView] = useState<CalendarView>("days");
  const visibleMonth = startOfMonth(month ?? uncontrolledMonth);
  const selected = selectedDate ?? uncontrolledSelectedDate;
  const visibleYear = visibleMonth.getFullYear();
  const weeks = useMemo(
    () => buildCalendarWeeks(visibleMonth, weekStartsOn),
    [visibleMonth, weekStartsOn]
  );
  const weekdays = useMemo(
    () => weekdayLabels(locale, weekStartsOn),
    [locale, weekStartsOn]
  );
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long" }),
    [locale]
  );
  const shortMonthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "short" }),
    [locale]
  );
  const dayLabelFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "full" }),
    [locale]
  );
  const monthLabel = monthFormatter.format(visibleMonth);
  const calendarLabel = `${monthLabel} ${visibleYear}`;
  const yearGridStart = Math.floor(visibleYear / 12) * 12;
  const yearGridEnd = yearGridStart + 11;
  const previousMonth = addMonths(visibleMonth, -1);
  const nextMonth = addMonths(visibleMonth, 1);
  const { canGoNext, canGoPrevious, nextLabel, previousLabel } = navigationState({
    maxDate,
    minDate,
    nextMonth,
    previousMonth,
    view,
    visibleMonth,
    yearGridEnd,
    yearGridStart
  });

  function changeMonth(nextVisibleMonth: Date) {
    const normalizedMonth = clampVisibleMonth(startOfMonth(nextVisibleMonth), minDate, maxDate);
    if (!month) {
      setUncontrolledMonth(normalizedMonth);
    }
    onMonthChange?.(normalizedMonth);
  }

  function navigatePrevious() {
    if (view === "months") {
      changeMonth(addYears(visibleMonth, -1));
      return;
    }
    if (view === "years") {
      changeMonth(new Date(yearGridStart - 12, visibleMonth.getMonth(), 1));
      return;
    }
    changeMonth(previousMonth);
  }

  function navigateNext() {
    if (view === "months") {
      changeMonth(addYears(visibleMonth, 1));
      return;
    }
    if (view === "years") {
      changeMonth(new Date(yearGridStart + 12, visibleMonth.getMonth(), 1));
      return;
    }
    changeMonth(nextMonth);
  }

  function selectMonth(monthIndex: number) {
    changeMonth(new Date(visibleYear, monthIndex, 1));
    setView("days");
  }

  function selectYear(year: number) {
    changeMonth(new Date(year, visibleMonth.getMonth(), 1));
    setView("days");
  }

  function selectDate(date: Date) {
    const normalizedDate = startOfDay(date);
    if (isDateDisabled(normalizedDate, { disabledDates, maxDate, minDate })) {
      return;
    }
    if (selectedDate === undefined) {
      setUncontrolledSelectedDate(normalizedDate);
    }
    onSelect?.(normalizedDate);
  }

  return (
    <div className={cn("weopen-calendar", className)} {...props}>
      <div className="weopen-calendar__header">
        <Button
          aria-label={previousLabel}
          disabled={!canGoPrevious}
          isIconOnly
          onPress={navigatePrevious}
          size="icon-sm"
          variant="ghost"
        >
          <PixelIcon name="chevron-left" variant="bare" />
        </Button>
        <div className="weopen-calendar__title">
          <PixelIcon name="calendar" variant="bare" />
          <button
            aria-label="Select month"
            aria-pressed={view === "months"}
            className="weopen-calendar__title-button"
            onClick={() => setView((current) => current === "months" ? "days" : "months")}
            type="button"
          >
            {monthLabel}
          </button>
          <button
            aria-label="Select year"
            aria-pressed={view === "years"}
            className="weopen-calendar__title-button"
            onClick={() => setView((current) => current === "years" ? "days" : "years")}
            type="button"
          >
            {visibleYear}
          </button>
        </div>
        <Button
          aria-label={nextLabel}
          disabled={!canGoNext}
          isIconOnly
          onPress={navigateNext}
          size="icon-sm"
          variant="ghost"
        >
          <PixelIcon name="chevron-right" variant="bare" />
        </Button>
      </div>
      {view === "months" ? (
        <div className="weopen-calendar__picker-grid" aria-label={`Select month in ${visibleYear}`}>
          {Array.from({ length: 12 }, (_, monthIndex) => {
            const pickerMonth = new Date(visibleYear, monthIndex, 1);
            const disabled = isMonthDisabled(pickerMonth, minDate, maxDate);
            return (
              <button
                aria-pressed={monthIndex === visibleMonth.getMonth()}
                className={cn("weopen-calendar__picker-option", {
                  "weopen-calendar__picker-option--selected": monthIndex === visibleMonth.getMonth()
                })}
                disabled={disabled}
                key={monthIndex}
                onClick={() => selectMonth(monthIndex)}
                type="button"
              >
                {shortMonthFormatter.format(pickerMonth)}
              </button>
            );
          })}
        </div>
      ) : null}
      {view === "years" ? (
        <div className="weopen-calendar__picker-grid weopen-calendar__picker-grid--years" aria-label={`Select year from ${yearGridStart} to ${yearGridEnd}`}>
          {Array.from({ length: 12 }, (_, index) => {
            const year = yearGridStart + index;
            const disabled = isYearDisabled(year, minDate, maxDate);
            return (
              <button
                aria-pressed={year === visibleYear}
                className={cn("weopen-calendar__picker-option", {
                  "weopen-calendar__picker-option--selected": year === visibleYear
                })}
                disabled={disabled}
                key={year}
                onClick={() => selectYear(year)}
                type="button"
              >
                {year}
              </button>
            );
          })}
        </div>
      ) : null}
      {view === "days" ? (
        <div className="weopen-calendar__grid" aria-label={calendarLabel}>
          {weekdays.map((weekday) => (
            <span className="weopen-calendar__weekday" key={weekday}>
              {weekday}
            </span>
          ))}
          {weeks.flat().map((day) => {
            const disabled = isDateDisabled(day.date, { disabledDates, maxDate, minDate });
            const isOutside = !day.inCurrentMonth;
            const isSelected = selected ? isSameDay(day.date, selected) : false;
            const isToday = isSameDay(day.date, new Date());
            const key = dayKey(day.date);

            if (isOutside && !showOutsideDays) {
              return <span aria-hidden="true" className="weopen-calendar__day-placeholder" key={key} />;
            }

            return (
              <button
                aria-current={isToday ? "date" : undefined}
                aria-label={dayLabelFormatter.format(day.date)}
                aria-pressed={isSelected}
                className={cn("weopen-calendar__day", {
                  "weopen-calendar__day--outside": isOutside,
                  "weopen-calendar__day--selected": isSelected,
                  "weopen-calendar__day--today": isToday
                })}
                disabled={disabled}
                key={key}
                onClick={() => selectDate(day.date)}
                type="button"
              >
                {day.date.getDate()}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function navigationState({
  maxDate,
  minDate,
  nextMonth,
  previousMonth,
  view,
  visibleMonth,
  yearGridEnd,
  yearGridStart
}: {
  maxDate?: Date;
  minDate?: Date;
  nextMonth: Date;
  previousMonth: Date;
  view: CalendarView;
  visibleMonth: Date;
  yearGridEnd: number;
  yearGridStart: number;
}) {
  if (view === "months") {
    const previousYear = addYears(visibleMonth, -1);
    const nextYear = addYears(visibleMonth, 1);
    return {
      canGoNext: rangeIntersectsBounds(startOfYear(nextYear), endOfYear(nextYear), minDate, maxDate),
      canGoPrevious: rangeIntersectsBounds(startOfYear(previousYear), endOfYear(previousYear), minDate, maxDate),
      nextLabel: "Next year",
      previousLabel: "Previous year"
    };
  }
  if (view === "years") {
    const previousRangeStart = startOfYear(new Date(yearGridStart - 12, 0, 1));
    const previousRangeEnd = endOfYear(new Date(yearGridStart - 1, 0, 1));
    const nextRangeStart = startOfYear(new Date(yearGridEnd + 1, 0, 1));
    const nextRangeEnd = endOfYear(new Date(yearGridEnd + 12, 0, 1));
    return {
      canGoNext: rangeIntersectsBounds(nextRangeStart, nextRangeEnd, minDate, maxDate),
      canGoPrevious: rangeIntersectsBounds(previousRangeStart, previousRangeEnd, minDate, maxDate),
      nextLabel: "Next year range",
      previousLabel: "Previous year range"
    };
  }
  return {
    canGoNext: !maxDate || nextMonth.getTime() <= startOfMonth(maxDate).getTime(),
    canGoPrevious: !minDate || endOfMonth(previousMonth).getTime() >= startOfDay(minDate).getTime(),
    nextLabel: "Next month",
    previousLabel: "Previous month"
  };
}

function buildCalendarWeeks(month: Date, weekStartsOn: 0 | 1): CalendarDay[][] {
  const firstDay = startOfMonth(month);
  const firstGridDate = addDays(firstDay, -positiveModulo(firstDay.getDay() - weekStartsOn, 7));
  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addDays(firstGridDate, weekIndex * 7 + dayIndex);
      return {
        date,
        inCurrentMonth: date.getMonth() === month.getMonth() && date.getFullYear() === month.getFullYear()
      };
    })
  );
}

function weekdayLabels(locale: string, weekStartsOn: 0 | 1): string[] {
  try {
    const baseSunday = new Date(2026, 5, 14);
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(baseSunday, weekStartsOn + index);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day);
    });
  } catch {
    return [...weekdayFallback.slice(weekStartsOn), ...weekdayFallback.slice(0, weekStartsOn)];
  }
}

function isDateDisabled(
  date: Date,
  {
    disabledDates,
    maxDate,
    minDate
  }: Pick<CalendarProps, "disabledDates" | "maxDate" | "minDate">
): boolean {
  const normalizedDate = startOfDay(date).getTime();
  if (minDate && normalizedDate < startOfDay(minDate).getTime()) {
    return true;
  }
  if (maxDate && normalizedDate > startOfDay(maxDate).getTime()) {
    return true;
  }
  if (!disabledDates) {
    return false;
  }
  if (disabledDates instanceof Date) {
    return isSameDay(date, disabledDates);
  }
  if (Array.isArray(disabledDates)) {
    return disabledDates.some((disabledDate) => isSameDay(date, disabledDate));
  }
  return disabledDates(date);
}

function isMonthDisabled(month: Date, minDate?: Date, maxDate?: Date): boolean {
  return !rangeIntersectsBounds(startOfMonth(month), endOfMonth(month), minDate, maxDate);
}

function isYearDisabled(year: number, minDate?: Date, maxDate?: Date): boolean {
  const yearDate = new Date(year, 0, 1);
  return !rangeIntersectsBounds(startOfYear(yearDate), endOfYear(yearDate), minDate, maxDate);
}

function rangeIntersectsBounds(start: Date, end: Date, minDate?: Date, maxDate?: Date): boolean {
  if (minDate && end.getTime() < startOfDay(minDate).getTime()) {
    return false;
  }
  if (maxDate && start.getTime() > startOfDay(maxDate).getTime()) {
    return false;
  }
  return true;
}

function clampVisibleMonth(month: Date, minDate?: Date, maxDate?: Date): Date {
  const normalizedMonth = startOfMonth(month);
  if (minDate && normalizedMonth.getTime() < startOfMonth(minDate).getTime()) {
    return startOfMonth(minDate);
  }
  if (maxDate && normalizedMonth.getTime() > startOfMonth(maxDate).getTime()) {
    return startOfMonth(maxDate);
  }
  return normalizedMonth;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function addYears(date: Date, amount: number): Date {
  return new Date(date.getFullYear() + amount, date.getMonth(), 1);
}

function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function isSameDay(left: Date, right: Date): boolean {
  return dayKey(left) === dayKey(right);
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
