import { describe, it, expect } from "@jest/globals";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

/**
 * Info: (20260813 - Luphia) 動態路由參數名稱的契約測試。
 *
 * 起因是一個**靜默**的缺陷：`[team_id]/invitations` 的 handler 把參數宣告成 `teamId`，
 * 取到的是 `undefined`——而 Prisma 會**忽略** where 裡的 undefined 欄位。
 * 於是那支端點回的是「全系統所有待接受邀請」，權限檢查也退化成
 * 「屬於任一團隊即通過」。畫面上的症狀只是「別人的邀請顯示成我的團隊在邀請我」，
 * 底下卻是跨團隊的資料外洩。
 *
 * TypeScript 擋不住這個錯：handler 自己宣告 `params` 的型別，宣告什麼就是什麼，
 * 與資料夾名稱無關。因此改以測試把「宣告的鍵必須存在於路徑」變成硬性契約——
 * 同類錯誤下次會在 CI 就紅，而不是等到有人回報畫面怪怪的。
 */

const API_ROOT = join(process.cwd(), "src", "app", "api");

function collectRouteFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectRouteFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

describe("dynamic route params", () => {
  const routeFiles = collectRouteFiles(API_ROOT);

  it("finds the API routes to check", () => {
    expect(routeFiles.length).toBeGreaterThan(50);
  });

  it("declares only param keys that exist in the route path", () => {
    const offenders: string[] = [];

    for (const file of routeFiles) {
      const relative = file.slice(process.cwd().length + 1);
      const segments = [...relative.matchAll(/\[([^\]]+)\]/g)].map(
        (match) => match[1],
      );
      if (segments.length === 0) continue;

      const source = readFileSync(file, "utf8");
      const declarations = [
        ...source.matchAll(/params: Promise<\{([^}]*)\}>/g),
      ].map((match) => match[1]);

      for (const declaration of declarations) {
        const keys = [...declaration.matchAll(/(\w+)\s*:/g)].map(
          (match) => match[1],
        );
        for (const key of keys) {
          if (!segments.includes(key)) {
            offenders.push(
              `${relative}: declares "${key}", route provides ${segments.join(", ")}`,
            );
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
