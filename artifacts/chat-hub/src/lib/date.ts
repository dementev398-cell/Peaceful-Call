/**
 * Parse a timestamp string coming from the API into a `Date`.
 *
 * The API serialises Postgres `timestamp` values, which arrive either as
 * ISO-8601 ("2026-07-10T16:18:03.888Z") or in Postgres' own space-separated
 * UTC form ("2026-07-10 16:18:03.888485"). Safari's `new Date()` rejects the
 * latter, so we normalise everything to ISO — treating a zone-less value as
 * UTC — before constructing the Date. This keeps date rendering correct and
 * consistent across every browser.
 */
export function parseApiDate(
  value: string | number | Date | null | undefined,
): Date {
  if (value instanceof Date) return value;
  if (value === null || value === undefined || value === "") {
    return new Date(NaN);
  }
  if (typeof value === "number") return new Date(value);

  // Normalise Postgres' space separator to the ISO "T".
  let s = value.trim().replace(" ", "T");
  // Trim sub-millisecond precision that some engines reject (".888485" -> ".888").
  s = s.replace(/(\.\d{3})\d+/, "$1");
  // A zone-less value from the API is UTC — append "Z" so it isn't read as local.
  if (!/[zZ]$/.test(s) && !/[+-]\d{2}:?\d{2}$/.test(s)) {
    s += "Z";
  }
  return new Date(s);
}

/**
 * Format an API timestamp for display. Thin wrapper over `toLocaleDateString`
 * that first normalises the value via {@link parseApiDate}.
 */
export function formatApiDate(
  value: string | number | Date | null | undefined,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = parseApiDate(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, options);
}
