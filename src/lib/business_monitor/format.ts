/**
 * Info: (20261022 - Luphia) 企業觀測站畫面上的顯示格式。純函數，只改寫法、不改數值：
 * 千分位、民國日期、西元 8 碼日期。對不上格式的值原樣回傳。
 */

const ROC_DATE = /^(\d{3})(\d{2})(\d{2})$/;
const AD_DATE = /^(\d{4})(\d{2})(\d{2})$/;
const INTEGER = /^\d{4,}$/;

// Info: (20261022 - Luphia) 千分位以字串處理：資本額可達千億，不經過 number 避免精度問題
export function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Info: (20261022 - Luphia) 商業司日期是民國 yyyMMdd（例：0360823 → 民國 36 年 8 月 23 日）
export function formatRocDate(value: string): string {
  const match = value.match(ROC_DATE);
  if (!match) return value;
  const [, year, month, day] = match;
  return `民國 ${Number(year)} 年 ${Number(month)} 月 ${Number(day)} 日`;
}

// Info: (20261022 - Luphia) 證交所日期是西元 yyyyMMdd（例：19620209 → 1962-02-09）
export function formatAdDate(value: string | null): string {
  if (!value) return "";
  const match = value.match(AD_DATE);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : value;
}

/**
 * Info: (20261022 - Luphia) 登記欄位：標籤寫明「(民國)」的是日期；寫明「(元)」「(股)」的是金額或股數，加千分位。
 * 其餘一律原樣——統一編號也是純數字，加了千分位就不再是那個號碼。
 */
const AMOUNT_UNITS = ["(元)", "(股)"];

export function formatRegistrationValue(label: string, value: string): string {
  if (label.includes("(民國)")) return formatRocDate(value);
  if (
    AMOUNT_UNITS.some((unit) => label.includes(unit)) &&
    INTEGER.test(value)
  ) {
    return groupThousands(value);
  }
  return value;
}

// Info: (20261022 - Luphia) ISO 時間 → 當地日期（YYYY-MM-DD），用於「更新於」「取得於」
export function formatIsoDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Info: (20261023 - Luphia) 十進位字串加千分位（可含負號與小數，例：-979439 → -979,439；0.38 → 0.38）
export function formatDecimalString(value: string): string {
  const match = value.trim().match(/^(-?)(\d+)(\.\d+)?$/);
  if (!match) return value;
  const [, sign, integer, fraction = ""] = match;
  return `${sign}${groupThousands(integer)}${fraction}`;
}
