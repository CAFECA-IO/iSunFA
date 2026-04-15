/**
 * Info: (20260410 - Luphia) Simple replacement for date-fns format function.
 * Matches specific format tokens to output date string.
 * @param dateObj The date to format
 * @param formatStr Format string (e.g., 'yyyy-MM-dd HH:mm', 'yyyy/MM')
 */
export function formatDate(
  dateObj: Date | number | string,
  formatStr: string,
): string {
  const d = new Date(dateObj);

  if (isNaN(d.getTime())) {
    return "-";
  }

  const map: Record<string, string> = {
    yyyy: d.getFullYear().toString(),
    MM: (d.getMonth() + 1).toString().padStart(2, "0"),
    dd: d.getDate().toString().padStart(2, "0"),
    HH: d.getHours().toString().padStart(2, "0"),
    mm: d.getMinutes().toString().padStart(2, "0"),
    ss: d.getSeconds().toString().padStart(2, "0"),
  };

  return formatStr.replace(/yyyy|MM|dd|HH|mm|ss/g, (matched) => map[matched]);
}
