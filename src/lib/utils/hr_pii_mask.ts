import {
  HR_PII_MASK_CHAR,
  HR_PII_MASK_VISIBLE_TAIL,
} from "@/constants/hr_pii";

/**
 * Info: (20260812 - Julian) Tier 2 個資的顯示遮罩。
 *
 * ADR 018 把電話、生日、住址列為 CONFIDENTIAL：加密入庫、**預設遮罩**。
 * 遮罩參數（保留幾碼、用什麼字元）取自 `@/constants/hr_pii`，
 * 與加解密、稽核共用同一份來源 —— 若哪天決定尾碼從 3 改成 2，
 * 只有那一個常數要改，不會有畫面漏改。
 *
 * ToDo: (20260812 - Julian) 接 API 後遮罩應由 service 完成後才送到前端，
 * 這支只留給 mock 與「已取得完整值後需要再遮一次」的場合。
 * 前端拿得到完整值本身就是一個授權問題，不是顯示問題。
 */
export function maskPiiTail(value: string | null): string {
  if (!value) return "";

  /**
   * Info: (20260812 - Julian) 只數字母與數字，分隔符原樣保留。
   *
   * 電話 `0912-345-678` 直接取後 3 碼會把 `-678` 的破折號算進去，
   * 遮出來變成 `*******678` 少一碼。這裡以「可見字元」計數，
   * 讓 `0912-345-678` 遮成 `****-***-678`，格式仍然看得出是電話。
   */
  const chars = [...value];
  const visibleIndexes = chars
    .map((char, index) => ({ char, index }))
    .filter((item) => /[0-9A-Za-z]/.test(item.char))
    .slice(-HR_PII_MASK_VISIBLE_TAIL)
    .map((item) => item.index);

  return chars
    .map((char, index) => {
      if (!/[0-9A-Za-z]/.test(char)) return char;
      return visibleIndexes.includes(index) ? char : HR_PII_MASK_CHAR;
    })
    .join("");
}
