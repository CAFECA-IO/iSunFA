import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import {
  NOTIFICATION_TYPE,
  NOTIFICATION_TYPE_STYLE,
  NotificationType,
} from "@/constants/notification";

/**
 * Info: (20260826 - Julian) 三件只有**原文**答得出來的事（review T4／T6）。
 *
 * 共通點：它們錯的時候，`tsc` 與 `lint` 都不會有任何意見，而執行期也不報錯 ——
 * 只是行為安靜地變了。這正是掃描型測試唯一站得住的用途。
 */

const schemaOf = (): string =>
  readFileSync(join(process.cwd(), "prisma", "schema.prisma"), "utf8");

/** Info: (20260826 - Julian) 取某個 model 的區塊（比照 `hr_pii_id_no_default.test.ts`） */
const modelBlockOf = (schema: string, model: string): string => {
  const header = new RegExp(`^model ${model} \\{$`, "m");
  const start = schema.search(header);
  if (start === -1) throw new Error(`schema 裡找不到 model ${model}`);
  const end = schema.indexOf("\n}", start);
  if (end === -1) throw new Error(`model ${model} 的區塊沒有結尾`);
  return schema.slice(start, end);
};

/**
 * Info: (20260826 - Julian) `dedupeKey` 的唯一約束只有 schema 原文問得到（T4）。
 *
 * `notification_service.test.ts` 的假 repo **自己實作**了唯一性
 *（`rows.some(row => row.dedupeKey === key)`），所以拿掉 schema 的 `@unique`
 * 之後 `npm test` 全綠 —— 而那個約束是整個模組冪等性的地基：
 * worker 重試、腳本重跑、recorder 重掃都靠它。
 *
 * e2e（`notification_repo.e2e.test.ts`）驗得到真的約束，但它不在 `npm test` 裡，
 * 而 schema 漏 push 或欄位被改動時，第一個發現的人會是使用者。
 */
describe("Notification schema 的約束", () => {
  it("dedupeKey 帶 @unique", () => {
    const block = modelBlockOf(schemaOf(), "Notification");
    const line = block.split("\n").find((row) => /^\s+dedupeKey\s/.test(row));

    expect(line).toBeDefined();
    expect(line).toMatch(/@unique\b/);
  });

  /**
   * Info: (20260826 - Julian) 可為 NULL 是刻意的，也要釘住。
   *
   * 不帶 dedupeKey 的通知（未來可能有）必須寫得進去，而 `@unique` 在 Postgres
   * 允許多個 NULL。改成必填的話，`createIfAbsent` 的 `dedupeKey ?? null`
   * 會在執行期炸，而型別層看不出來。
   */
  it("dedupeKey 可為 NULL", () => {
    const block = modelBlockOf(schemaOf(), "Notification");
    expect(block).toMatch(/dedupeKey\s+String\?/);
  });

  // Info: (20260826 - Julian) 兩條查詢索引：未讀計數與清單。掉了不會壞，只會慢到沒人發現
  it.each([["userId, readAt"], ["userId, createdAt"]])(
    "保留索引 @@index([%s])",
    (fields) => {
      const block = modelBlockOf(schemaOf(), "Notification");
      expect(block.replace(/\s+/g, " ")).toContain(`@@index([${fields}])`);
    },
  );
});

/**
 * Info: (20260826 - Julian) 樣式查表用的 class 必須是**真的存在的 token**（T6）。
 *
 * 這是計畫書 D3 的成因：`bg-surface` / `border-border` 是無效 class，
 * 而 Tailwind 對不存在的 class 不會報錯 —— 它只是不產出任何規則，
 * 於是面板變成透明無邊框，`tsc` 與 `lint` 全程沒有意見。
 *
 * `text-success` 是本次為了「完成」圖示加的（`--color-success`），
 * 打成 `text-succes` 一樣不會有人叫。這裡對照 `globals.css` 裡真的定義過的
 * `--color-*` token 檢查每一個 class。
 */
describe("NOTIFICATION_TYPE_STYLE 的 class 都有對應的 token", () => {
  const cssOf = (): string =>
    readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

  /** Info: (20260826 - Julian) `--color-brand: …` → 收集 `brand` */
  const definedColorTokens = (): Set<string> => {
    const css = cssOf();
    const names = new Set<string>();
    for (const match of css.matchAll(/--color-([a-z0-9-]+)\s*:/g)) {
      names.add(match[1]);
    }
    return names;
  };

  // Info: (20260826 - Julian) 前提：真的抓得到 token，否則下面每一條都是空過
  it("globals.css 裡抓得到 --color-* token", () => {
    expect(definedColorTokens().size).toBeGreaterThan(3);
  });

  it.each(Object.values(NOTIFICATION_TYPE))(
    "%s 的圖示 class 對應到已定義的 token",
    (type) => {
      const style = NOTIFICATION_TYPE_STYLE[type as NotificationType];
      expect(style).toBeDefined();

      const token = style.className.replace(/^text-/, "");
      expect(style.className).toMatch(/^text-/);
      expect([...definedColorTokens()]).toContain(token);
    },
  );

  /**
   * Info: (20260826 - Julian) 每一個型別都要有樣式（漏一個就是畫面上一個沒有圖示的列）。
   *
   * 以 `NOTIFICATION_TYPE` 迭代而不是列舉四個：新增型別時忘了補樣式，
   * 這裡會紅而不是等到有人在畫面上看到怪東西。
   */
  it("每一個 NOTIFICATION_TYPE 都有樣式登記", () => {
    expect(Object.keys(NOTIFICATION_TYPE_STYLE).sort()).toEqual(
      Object.values(NOTIFICATION_TYPE).sort(),
    );
  });
});

/**
 * Info: (20260827 - Julian) email 邀請的查詢索引只有原文答得出來（D19 的另一半）。
 *
 * `getPendingInvitationsForRecipient` 一定同時帶 `status` 與 `inviteeEmailKey`，
 * 而那支查詢是小鈴鐺每 60 秒一次的輪詢會走到的。少了複合索引不會有任何人報錯 ——
 * 只是每次輪詢多一次全表掃描，而症狀要等到邀請表長大才看得出來。
 */
describe("TeamInvitation 的查詢索引", () => {
  it("inviteeEmailKey 與 status 有複合索引", () => {
    const block = modelBlockOf(schemaOf(), "TeamInvitation");

    expect(block).toMatch(/@@index\(\[inviteeEmailKey,\s*status\]\)/);
  });
});
