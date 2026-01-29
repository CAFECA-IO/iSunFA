// Info: (20260120 - Luphia) Helper to calculate date range
export const getPeriodDateRange = (pType: string, year: number, pValue: string | number) => {
  if (pType === 'daily') return { start: String(pValue), end: String(pValue) };

  let start = '';
  let end = '';

  if (pType === 'yearly') {
    start = `${year}-01-01`;
    end = `${year}-12-31`;
  } else if (pType === 'seasonly') {
    const sMap: Record<string, [string, string]> = {
      'S1': ['01-01', '03-31'],
      'S2': ['04-01', '06-30'],
      'S3': ['07-01', '09-30'],
      'S4': ['10-01', '12-31'],
    };
    const [s, e] = sMap[String(pValue)] || ['', ''];
    if (s && e) {
      start = `${year}-${s}`;
      end = `${year}-${e}`;
    }
  } else if (pType === 'monthly') {
    const m = Number(pValue);
    if (m) {
      const lastDay = new Date(year, m, 0).getDate();
      const mStr = m.toString().padStart(2, '0');
      start = `${year}-${mStr}-01`;
      end = `${year}-${mStr}-${lastDay}`;
    }
  } else if (pType === 'weekly') {
    const weekNum = Number(String(pValue).substring(1));
    if (weekNum) {
      const simpleDate = new Date(year, 0, 1 + (weekNum - 1) * 7);
      const day = simpleDate.getDay();
      const diff = simpleDate.getDate() - day + (day === 0 ? -6 : 1);
      const weekStart = new Date(simpleDate.setDate(diff));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      start = weekStart.toISOString().split('T')[0];
      end = weekEnd.toISOString().split('T')[0];
    }
  }
  return { start, end };
};
