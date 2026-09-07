import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  parseOptionalPositiveInt,
  parsePositiveInt,
} from "@/lib/utils/pagination";

/**
 * Info: (20260815 - Luphia) 分頁參數解析（PR #6652 第二輪 C-8）。
 *
 * 原本的 `Math.max(parseInt(raw ?? "20", 10), 1)` 對 `?limit=abc` 回 `NaN`，
 * 而 `Math.max(NaN, 1)` 仍是 `NaN`——`take: NaN` 交給 Prisma 就是一個 500。
 * 使用者打錯一個字元不該讓端點爆炸。
 */

describe("parsePositiveInt", () => {
  it("takes a valid number within range", () => {
    expect(parsePositiveInt("50", { fallback: 20, max: 100 })).toBe(50);
  });

  // Info: (20260815 - Luphia) 這一條就是 C-8：非數字不得變成 NaN
  it("falls back instead of producing NaN for non-numeric input", () => {
    expect(parsePositiveInt("abc", { fallback: 20, max: 100 })).toBe(20);
    expect(parsePositiveInt("", { fallback: 20, max: 100 })).toBe(20);
    expect(parsePositiveInt(null, { fallback: 20, max: 100 })).toBe(20);
  });

  /**
   * Info: (20260815 - Luphia) `"12abc"` 會被 parseInt 讀成 12，但那多半代表呼叫端
   * 搞錯了格式——悄悄採用一半的值比退回預設值更難查。
   */
  it("rejects partially numeric input rather than silently truncating", () => {
    expect(parsePositiveInt("12abc", { fallback: 20, max: 100 })).toBe(20);
  });

  it("clamps to the allowed range", () => {
    expect(parsePositiveInt("500", { fallback: 20, max: 100 })).toBe(100);
    expect(parsePositiveInt("0", { fallback: 20, min: 1, max: 100 })).toBe(20);
  });

  // Info: (20260815 - Luphia) 負數與小數都不是合法的頁數／筆數
  it("rejects negatives and decimals", () => {
    expect(parsePositiveInt("-5", { fallback: 20, max: 100 })).toBe(20);
    expect(parsePositiveInt("1.5", { fallback: 20, max: 100 })).toBe(20);
  });

  // Info: (20260815 - Luphia) 超過安全整數範圍的輸入不該被當成有效筆數
  it("rejects values beyond the safe integer range", () => {
    expect(
      parsePositiveInt("99999999999999999999", { fallback: 20, max: 100 }),
    ).toBe(20);
  });
});

/**
 * Info: (20260815 - Luphia) 選填版：預設值在下游 service 的端點用這支（第二輪 C-8）。
 * 「沒帶參數」與「帶了但不是數字」都回 undefined，讓下游套用它自己的預設值。
 */
describe("parseOptionalPositiveInt", () => {
  it("returns undefined when the parameter is absent", () => {
    expect(parseOptionalPositiveInt(null)).toBeUndefined();
  });

  // Info: (20260815 - Luphia) 這一條就是 C-8 在選填端點的形狀：NaN 不得流到下游
  it("returns undefined instead of NaN for non-numeric input", () => {
    expect(parseOptionalPositiveInt("abc")).toBeUndefined();
    expect(parseOptionalPositiveInt("10x")).toBeUndefined();
    expect(parseOptionalPositiveInt("-3")).toBeUndefined();
  });

  it("passes a valid value through untouched", () => {
    expect(parseOptionalPositiveInt("25")).toBe(25);
  });

  /**
   * Info: (20260815 - Luphia) 預設不夾上限：這些端點的頁面大小由下游決定，
   * 在這裡夾一個數字會悄悄改變既有呼叫端拿得到的筆數。
   */
  it("does not impose a cap unless one is asked for", () => {
    expect(parseOptionalPositiveInt("100000")).toBe(100000);
    expect(parseOptionalPositiveInt("100000", { max: 500 })).toBe(500);
  });
});

/**
 * Info: (20260815 - Luphia) 後台端點不得再手寫 `parseInt(searchParams.get(...))`
 * 解析分頁（PR #6652 第二輪 C-8）。
 *
 * 這個形狀在 API 目錄裡重複了十七次（後台九、用戶端八），每一次都帶著同一個陷阱：
 * 非數字 → NaN → `take: NaN` → Prisma 500。一支一支修完之後，需要有東西擋住第十八次——
 * 否則下一個複製貼上的人會把它種回來。掃描範圍是整個 `src/app/api`，不只後台。
 */
describe("api endpoints parse pagination through the shared helper", () => {
  const API_ROOT = join(process.cwd(), "src", "app", "api");

  function collectRouteFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return collectRouteFiles(full);
      return entry.name === "route.ts" ? [full] : [];
    });
  }

  it("has no hand-rolled query-string integer parsing left", () => {
    const offenders = collectRouteFiles(API_ROOT)
      .filter((file) =>
        /parseInt\(\s*(searchParams|req|request)/.test(
          readFileSync(file, "utf8"),
        ),
      )
      .map((file) => file.slice(process.cwd().length + 1));

    expect(offenders).toEqual([]);
  });
});
