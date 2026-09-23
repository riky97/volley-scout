/**
 * True when timestamp `a` is later than `b`. Stored timestamps carry their UTC offset
 * (`+02:00` in summer, `+01:00` in winter, `Z` from another device), so comparing the strings
 * would put 13:00+02:00 after 12:30Z even though it is earlier.
 */
export function isNewer(a: string, b: string): boolean {
  const timeA = Date.parse(a);
  const timeB = Date.parse(b);
  // A timestamp that does not parse cannot prove it is newer.
  if (Number.isNaN(timeA) || Number.isNaN(timeB)) return false;
  return timeA > timeB;
}
