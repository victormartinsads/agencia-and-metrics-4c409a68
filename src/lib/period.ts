/**
 * Helper para calcular período atual e período anterior equivalente
 * a partir de um datePreset.
 */
export interface PeriodRange {
  start: Date;
  end: Date;
  days: number;
}

export interface PeriodPair {
  current: PeriodRange;
  previous: PeriodRange;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function getPeriodPair(preset: string): PeriodPair {
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);

  let start: Date;
  let end: Date;

  const customMatch = /^custom:(\d{4}-\d{2}-\d{2}):(\d{4}-\d{2}-\d{2})$/.exec(preset);
  if (customMatch) {
    start = startOfDay(new Date(customMatch[1] + "T00:00:00"));
    end = endOfDay(new Date(customMatch[2] + "T00:00:00"));
  } else {
  switch (preset) {
    case "today":
      start = today;
      end = endOfDay(today);
      break;
    case "yesterday":
      start = yesterday;
      end = endOfDay(yesterday);
      break;
    case "last_3d":
      start = addDays(today, -2);
      end = endOfDay(today);
      break;
    case "last_14d":
      start = addDays(today, -13);
      end = endOfDay(today);
      break;
    case "last_30d":
      start = addDays(today, -29);
      end = endOfDay(today);
      break;
    case "this_month": {
      const d = new Date();
      start = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
      end = endOfDay(today);
      break;
    }
    case "last_month": {
      const d = new Date();
      start = startOfDay(new Date(d.getFullYear(), d.getMonth() - 1, 1));
      end = endOfDay(new Date(d.getFullYear(), d.getMonth(), 0));
      break;
    }
    case "last_7d":
    default:
      start = addDays(today, -6);
      end = endOfDay(today);
  }
  }

  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const prevEnd = endOfDay(addDays(start, -1));
  const prevStart = startOfDay(addDays(prevEnd, -(days - 1)));

  return {
    current: { start, end, days },
    previous: { start: prevStart, end: prevEnd, days },
  };
}

export function pctDelta(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}