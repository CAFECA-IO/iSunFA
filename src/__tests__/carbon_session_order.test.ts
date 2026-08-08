/**
 * Info: (20260806 - Tzuhan) 會話清單排序。
 *
 * 原本沒有排序 —— 清單是 `Object.values(sessionsData)` 的插入順序。
 * 看起來像照日期排是因為 API 回的是 createdAt desc,而新建的會話加在物件最後,
 * 於是**新增對話出現在清單最底部**(實測就是這樣)。
 */

import { describe, it, expect } from "@jest/globals";
import { sortSessionsByRecency } from "@/hooks/use_carbon_chat.helpers";

const session = (id: string, updatedAt?: string) => ({ id, updatedAt });

describe("sortSessionsByRecency", () => {
  it("最近有動作的排在最上面", () => {
    const sorted = sortSessionsByRecency([
      session("old", "2026-08-01T00:00:00.000Z"),
      session("new", "2026-08-06T00:00:00.000Z"),
      session("mid", "2026-08-03T00:00:00.000Z"),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["new", "mid", "old"]);
  });

  /**
   * Info: (20260806 - Tzuhan) 這條就是使用者回報的那件事:
   * 新增對話被加在物件最後,於是出現在清單最底部。
   */
  it("新增的對話(時間最新)置頂,即使它是最後才加進來的", () => {
    const existing = [
      session("a", "2026-08-05T10:00:00.000Z"),
      session("b", "2026-08-04T10:00:00.000Z"),
    ];
    const created = session("brand-new", "2026-08-06T12:00:00.000Z");
    expect(sortSessionsByRecency([...existing, created])[0].id).toBe(
      "brand-new",
    );
  });

  /**
   * Info: (20260806 - Tzuhan) 舊的本機快取沒有 updatedAt —— 不假裝它很新。
   * 若讓缺值排最前,一次重載就會把沒快取過的會話全部推到頂端。
   */
  it("缺 updatedAt 的排在有值者之後", () => {
    const sorted = sortSessionsByRecency([
      session("no-time"),
      session("dated", "2026-08-01T00:00:00.000Z"),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["dated", "no-time"]);
  });

  /**
   * Info: (20260806 - Tzuhan) 穩定排序:同時間(或都沒有時間)維持原順序。
   * 不穩定的話同一份資料每次 render 都可能換順序,而那種跳動查不出原因。
   */
  it("同時間維持原順序(穩定)", () => {
    const same = "2026-08-06T00:00:00.000Z";
    expect(
      sortSessionsByRecency([
        session("first", same),
        session("second", same),
        session("third", same),
      ]).map((s) => s.id),
    ).toEqual(["first", "second", "third"]);

    expect(
      sortSessionsByRecency([session("x"), session("y"), session("z")]).map(
        (s) => s.id,
      ),
    ).toEqual(["x", "y", "z"]);
  });

  it("不修改傳入的陣列", () => {
    const input = [
      session("a", "2026-08-01T00:00:00.000Z"),
      session("b", "2026-08-06T00:00:00.000Z"),
    ];
    sortSessionsByRecency(input);
    expect(input.map((s) => s.id)).toEqual(["a", "b"]);
  });

  /**
   * Info: (20260806 - Tzuhan) ISO 字串可直接比大小(定長、UTC、字典序即時序)。
   * 這條順便釘住「不可改用 toLocaleDateString 的值當排序鍵」——
   * 那種字串在 en-US 是 `8/6/2026`,字典序與時序無關。
   */
  it("跨年月的 ISO 字串比較正確", () => {
    const sorted = sortSessionsByRecency([
      session("2025-12", "2025-12-31T23:59:59.000Z"),
      session("2026-01", "2026-01-01T00:00:00.000Z"),
      session("2026-09", "2026-09-01T00:00:00.000Z"),
    ]);
    expect(sorted.map((s) => s.id)).toEqual(["2026-09", "2026-01", "2025-12"]);
  });
});
