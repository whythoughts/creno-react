import { DateTime } from "luxon";

export interface CalendarDay {
  date: DateTime;
  iso: string;
  inCurrentMonth: boolean;
  isPast: boolean;
  isToday: boolean;
}

/** Builds a full 6-row (42-cell) month grid, Sunday-first, including the
 * leading/trailing days from adjacent months needed to fill each week. */
export function buildMonthGrid(monthStart: DateTime, timezone: string): CalendarDay[] {
  const today = DateTime.now().setZone(timezone).startOf("day");
  const firstOfMonth = monthStart.startOf("month");
  const gridStart = firstOfMonth.minus({ days: firstOfMonth.weekday % 7 }); // back up to Sunday

  return Array.from({ length: 42 }, (_, i) => {
    const date = gridStart.plus({ days: i });
    return {
      date,
      iso: date.toISODate()!,
      inCurrentMonth: date.month === firstOfMonth.month,
      isPast: date < today,
      isToday: date.hasSame(today, "day"),
    };
  });
}
