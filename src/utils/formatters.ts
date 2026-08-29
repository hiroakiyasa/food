export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}

export function formatCalories(kcal: number): string {
  return `${Math.round(kcal)} kcal`;
}

export function formatGrams(grams: number): string {
  if (grams < 1) return `${formatNumber(grams * 1000, 0)} mg`;
  return `${formatNumber(grams)} g`;
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return `${date.getMonth() + 1}月${date.getDate()}日(${weekdays[date.getDay()]})`;
}

// Day bucketing must use the device's local calendar day, never UTC —
// toISOString() would shift 00:00-08:59 JST into the previous day.
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getToday(): string {
  return toLocalDateString(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  return toLocalDateString(date);
}

// Timestamp for a meal recorded against a chosen calendar day: the chosen
// day with the current wall-clock time (local-naive, matching how day
// buckets are queried).
export function eatenAtForDate(dateStr: string): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${dateStr}T${hh}:${mm}:${ss}`;
}

export function getWeekStart(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(year, month - 1, day + diff);
  return toLocalDateString(monday);
}
