/**
 * Today's date as YYYY-MM-DD in the machine's LOCAL time zone.
 * (toISOString() would give the UTC date, which is "yesterday" for part of
 * the day in Bangladesh, UTC+6.)
 */
export function todayLocal(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
