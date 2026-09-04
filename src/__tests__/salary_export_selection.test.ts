import { describe, it, expect } from "@jest/globals";
import {
  isPageAllPicked,
  isPagePartiallyPicked,
  setPagePicked,
  togglePick,
} from "@/lib/utils/salary_export_selection";

/**
 * Info: (20260904 - Julian) 薪資紀錄列表的勾選邏輯。
 *
 * 三個判斷會出錯而且**不會有人發現**：跨頁保留、全選只作用於本頁、
 * 以及空頁的表頭勾選框。本專案的測試不 render React，
 * 留在元件裡等於它們永遠只能靠手動點過 —— 而「手動點過」不會涵蓋
 * 「載入中的空頁」這種一閃而過的狀態。
 */

const PAGE_1 = ["a", "b", "c"];
const PAGE_2 = ["d", "e"];

describe("單筆勾選", () => {
  it("勾一筆", () => {
    expect([...togglePick(new Set(), "a")]).toEqual(["a"]);
  });

  it("再按一次取消", () => {
    expect([...togglePick(new Set(["a"]), "a")]).toEqual([]);
  });

  it("不影響其他已勾的", () => {
    expect([...togglePick(new Set(["a", "b"]), "c")].sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  /**
   * Info: (20260904 - Julian) 回傳新的 Set，不改原本那個。
   *
   * React 靠參考比對決定要不要重繪 —— 就地修改的話畫面不會更新，
   * 而狀態其實已經變了。那是最難查的一種：資料對、畫面錯。
   */
  it("回傳新的 Set，不就地修改", () => {
    const before = new Set(["a"]);
    const after = togglePick(before, "b");

    expect(after).not.toBe(before);
    expect([...before]).toEqual(["a"]);
  });
});

describe("整頁勾選", () => {
  it("勾選整頁", () => {
    expect([...setPagePicked(new Set(), PAGE_1, true)].sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  /**
   * Info: (20260904 - Julian) **取消整頁只移除這一頁的 id，不是清空。**
   *
   * 清空的話，「跨頁保留」在使用者取消一次全選之後就悄悄失效了 ——
   * 他在第一頁勾的那些會一起不見，而他人在第二頁，看不到那件事發生。
   */
  it("取消整頁時，其他頁勾的要留著", () => {
    const picked = new Set([...PAGE_1, ...PAGE_2]);

    expect([...setPagePicked(picked, PAGE_2, false)].sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("勾選整頁時，其他頁勾的也要留著", () => {
    const picked = new Set(["d"]);

    expect([...setPagePicked(picked, PAGE_1, true)].sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("重複勾選同一頁不會產生重複", () => {
    const once = setPagePicked(new Set(), PAGE_1, true);
    const twice = setPagePicked(once, PAGE_1, true);

    expect(twice.size).toBe(PAGE_1.length);
  });
});

describe("表頭勾選框的狀態", () => {
  it("整頁都勾了＝已勾選", () => {
    expect(isPageAllPicked(new Set(PAGE_1), PAGE_1)).toBe(true);
  });

  it("少一筆就不是已勾選", () => {
    expect(isPageAllPicked(new Set(["a", "b"]), PAGE_1)).toBe(false);
  });

  /**
   * Info: (20260904 - Julian) **空頁一律 false。**
   *
   * `every` 對空陣列回 true，於是「還在載入」或「這組篩選沒有結果」的畫面上，
   * 表頭那個勾選框會顯示成已勾選 —— 而它代表的是零筆。
   * 按一下取消還會讓它看起來「終於正常了」，沒有人會回頭懷疑那一格。
   */
  it("空頁不算已勾選（every 對空陣列回 true）", () => {
    expect(isPageAllPicked(new Set(), [])).toBe(false);
    expect(isPageAllPicked(new Set(["a"]), [])).toBe(false);
  });

  it("勾了一部分＝半選", () => {
    expect(isPagePartiallyPicked(new Set(["a"]), PAGE_1)).toBe(true);
  });

  /**
   * Info: (20260904 - Julian) 半選與全選互斥 —— 同時為真的話，
   * `indeterminate` 會蓋掉 `checked`，整頁勾滿卻顯示成半選。
   */
  it("全選時不算半選", () => {
    expect(isPagePartiallyPicked(new Set(PAGE_1), PAGE_1)).toBe(false);
  });

  it("一筆都沒勾不算半選", () => {
    expect(isPagePartiallyPicked(new Set(), PAGE_1)).toBe(false);
  });

  it("空頁不算半選", () => {
    expect(isPagePartiallyPicked(new Set(["a"]), [])).toBe(false);
  });

  /**
   * Info: (20260904 - Julian) 只勾了別頁的 id 時，這一頁既不是全選也不是半選 ——
   * 表頭應該是空的。這一條釘住「跨頁保留不會讓別頁的勾選污染本頁的表頭」。
   */
  it("只勾了別頁時，本頁的表頭是空的", () => {
    expect(isPageAllPicked(new Set(PAGE_2), PAGE_1)).toBe(false);
    expect(isPagePartiallyPicked(new Set(PAGE_2), PAGE_1)).toBe(false);
  });
});
