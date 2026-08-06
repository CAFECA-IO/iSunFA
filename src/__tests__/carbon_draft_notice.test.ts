/**
 * Info: (20260806 - Tzuhan) 逐會話提示(issue_drafts/inventory_table_import/06)。
 *
 * 這一組測的是一條**測不到就會回歸**的不變式:寫 B 房不得動到 A 房。
 * 原本的 bug 正是這一條 —— 提示只有一格,匯入跑在 A 房、切到 B 房隨手做任何
 * 會設提示的動作,A 房的進度就被覆蓋;切回 A 房畫面一片乾淨而匯入其實還在跑,
 * 於是使用者重新上傳一次(而兩份匯入同時跑會互相搶限流、後者覆蓋前者)。
 *
 * 症狀是「畫面看起來沒事」,所以人工測很容易漏 —— 這種才更需要測試釘住。
 */

import { describe, it, expect } from "@jest/globals";
import { reduceDraftNotice } from "@/hooks/use_carbon_chat.helpers";

interface IFakeNotice {
  type: "loading" | "info" | "error";
  text: string;
}

const loading = (text: string): IFakeNotice => ({ type: "loading", text });

describe("reduceDraftNotice", () => {
  it("寫入指定會話", () => {
    const next = reduceDraftNotice<IFakeNotice>(
      {},
      "a",
      loading("解析中 3/11"),
    );
    expect(next).toEqual({ a: loading("解析中 3/11") });
  });

  /**
   * Info: (20260806 - Tzuhan) 這條就是那個 bug 的反向測試。
   * 「A 房匯入中,切到 B 房綁帳本」—— B 房的提示不得把 A 房的進度吃掉。
   */
  it("寫 B 房不得動到 A 房", () => {
    const withA = reduceDraftNotice<IFakeNotice>(
      {},
      "a",
      loading("解析中 3/11"),
    );
    const withB = reduceDraftNotice(withA, "b", {
      type: "info",
      text: "帳本綁定完成",
    });
    expect(withB.a).toEqual(loading("解析中 3/11"));
    expect(withB.b).toEqual({ type: "info", text: "帳本綁定完成" });
  });

  it("清除只清那一房", () => {
    const both = reduceDraftNotice(
      reduceDraftNotice<IFakeNotice>({}, "a", loading("A 進度")),
      "b",
      loading("B 進度"),
    );
    const cleared = reduceDraftNotice(both, "b", null);
    expect(cleared).toEqual({ a: loading("A 進度") });
  });

  /**
   * Info: (20260806 - Tzuhan) 清除是移除鍵而不是留 null:
   * 留著空鍵會讓「有沒有提示」多一種等價表示,而兩種表示遲早會有一邊沒被判斷到。
   */
  it("清除是移除鍵,不留 null", () => {
    const cleared = reduceDraftNotice(
      reduceDraftNotice<IFakeNotice>({}, "a", loading("A 進度")),
      "a",
      null,
    );
    expect("a" in cleared).toBe(false);
    expect(cleared).toEqual({});
  });

  // Info: (20260806 - Tzuhan) 無變化即回原參考:避免每次進度回報都讓無關的房間重繪
  it("沒有變化時回傳同一個參考", () => {
    const empty: Readonly<Record<string, IFakeNotice>> = {};
    expect(reduceDraftNotice(empty, "a", null)).toBe(empty);

    const notice = loading("解析中");
    const withA = reduceDraftNotice(empty, "a", notice);
    expect(reduceDraftNotice(withA, "a", notice)).toBe(withA);
  });

  it("同一房後到的提示覆蓋先到的(同房本來就只該有一則)", () => {
    const first = reduceDraftNotice<IFakeNotice>(
      {},
      "a",
      loading("解析中 3/11"),
    );
    const second = reduceDraftNotice(first, "a", loading("解析中 7/11"));
    expect(second).toEqual({ a: loading("解析中 7/11") });
  });
});
