import { describe, expect, it } from "@jest/globals";
import * as coefficientModule from "@/constants/true_esg_coefficients";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";

/**
 * Info: (20260801 - Luphia) 係數彙總的完整性測試。
 *
 * 實測發現的事故:ESG 係數 API 在自己的檔案裡手列了 12 個分段,而
 * TRUE_COEFFICIENT_DATA_MOENV_PART_6 被漏掉 —— 該分段的 6 筆環境部碳足跡
 * 排放係數資料庫項目(電力、自來水、天然氣、廢棄物焚化與掩埋)因此完全不會
 * 出現在係數清單中,使用者查不到也選不到,而且沒有任何錯誤跡象。
 *
 * 該 API 已改為引用 ALL_COEFFICIENTS。本測試守的是下一次:
 * 新增一個分段卻忘記加進 ALL_COEFFICIENTS 時,測試會失敗而非靜默遺漏。
 */
describe("ALL_COEFFICIENTS 的完整性", () => {
  /**
   * Info: (20260801 - Luphia) 以模組匯出反推應納入的分段,而非在此再抄一份清單 ——
   * 抄清單正是本測試要防的那個錯誤。
   */
  const partEntries = Object.entries(coefficientModule).filter(
    ([name, value]) =>
      name.startsWith("TRUE_COEFFICIENT_DATA") && Array.isArray(value),
  ) as [string, { id: string }[]][];

  it("找得到分段匯出(測試本身沒有失效)", () => {
    expect(partEntries.length).toBeGreaterThanOrEqual(12);
  });

  const aggregatedIds = new Set(
    (ALL_COEFFICIENTS as { id: string }[]).map((item) => item.id),
  );

  it.each(partEntries)("%s 的每一筆都在 ALL_COEFFICIENTS 內", (_name, part) => {
    const missing = part.filter((item) => !aggregatedIds.has(item.id));
    expect(missing.map((item) => item.id)).toEqual([]);
  });

  it("彙總筆數等於各分段之和", () => {
    const sum = partEntries.reduce((total, [, part]) => total + part.length, 0);
    expect((ALL_COEFFICIENTS as unknown[]).length).toBe(sum);
  });

  /**
   * Info: (20260801 - Luphia) id 重複會讓依 id 查表的地方取到不確定的那一筆。
   * 係數是申報數值的來源,不可有這種不確定性。
   */
  it("彙總後沒有重複的 id", () => {
    const ids = (ALL_COEFFICIENTS as { id: string }[]).map((item) => item.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect([...new Set(duplicates)]).toEqual([]);
  });
});
