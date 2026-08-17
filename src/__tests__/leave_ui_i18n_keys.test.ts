import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import { hrManagement as en } from "@/i18n/locales/en/hr_management";
import { hrManagement as ja } from "@/i18n/locales/ja/hr_management";
import { hrManagement as ko } from "@/i18n/locales/ko/hr_management";
import { hrManagement as zhCn } from "@/i18n/locales/zh_cn/hr_management";
import { hrManagement as zhTw } from "@/i18n/locales/zh_tw/hr_management";

/**
 * Info: (20260817 - Julian) 假勤畫面引用的每一個 i18n 鍵都必須存在於五個語系。
 *
 * ## 為什麼這種缺漏是無聲的
 *
 * `i18n_context` 的 `getNestedValue` 找不到就**回傳 key 本身** ——
 * 畫面上會出現 `hr_management.leave.preview_shortfall` 這串字，
 * 沒有錯誤訊息、沒有 console 警告，只有使用者看得到。
 * `attendance_i18n_keys.test.ts` 檔頭記著同一個坑，那次壞了一整個開發週期。
 *
 * ## 為什麼掃原始碼而不是列一張清單
 *
 * 手維護的清單會漏 —— 而漏掉的那一個正是沒有人想到要登記的那一個。
 * 直接從 `t("...")` 掃出實際被引用的鍵，新增畫面時不必記得更新這支測試。
 */

const DICTIONARIES: Record<string, Record<string, unknown>> = {
  en,
  ja,
  ko,
  zh_cn: zhCn,
  zh_tw: zhTw,
};

/** Info: (20260817 - Julian) 假勤畫面的原始碼；新增檔案時加進來 */
const SOURCE_FILES = [
  "src/components/hr_management/leave/my_leave_page_body.tsx",
  "src/components/hr_management/leave/leave_approval_page_body.tsx",
  "src/components/hr_management/leave/leave_balance_cards.tsx",
  "src/components/hr_management/leave/leave_request_list.tsx",
  "src/components/hr_management/leave/approval_chain_view.tsx",
  "src/components/hr_management/leave/leave_request_detail_body.tsx",
  "src/app/hr_management/leave/request/[request_id]/page.tsx",
  "src/app/hr_management/leave/page.tsx",
  "src/app/hr_management/leave/approval/page.tsx",
];

/**
 * Info: (20260817 - Julian) 抓 `t("hr_management....")` 與常數表裡的字串字面值。
 *
 * 兩種寫法都要抓：`NODE_KIND_I18N_KEY` 那類對照表不是寫在 `t()` 裡的，
 * 只掃 `t(` 會漏掉整組節點型別的翻譯。
 */
const collectKeys = (source: string): string[] => {
  const pattern = /["'`](hr_management\.[a-z0-9_.]+)["'`]/g;
  const keys = new Set<string>();
  let match = pattern.exec(source);
  while (match !== null) {
    keys.add(match[1]);
    match = pattern.exec(source);
  }
  return [...keys];
};

const resolve = (dictionary: Record<string, unknown>, path: string): unknown =>
  path
    .split(".")
    .slice(1)
    .reduce<unknown>(
      (value, segment) =>
        typeof value === "object" && value !== null
          ? (value as Record<string, unknown>)[segment]
          : undefined,
      dictionary,
    );

const ALL_KEYS = [
  ...new Set(
    SOURCE_FILES.flatMap((file) =>
      collectKeys(readFileSync(join(process.cwd(), file), "utf8")),
    ),
  ),
].sort();

describe("假勤畫面的 i18n 鍵", () => {
  // Info: (20260817 - Julian) 先確認掃得到東西：掃不到會讓下面每一條都「通過」
  it("掃得出被引用的鍵", () => {
    expect(ALL_KEYS.length).toBeGreaterThan(30);
  });

  it.each(ALL_KEYS)("%s 在五個語系都存在且非空", (path) => {
    const missing = Object.entries(DICTIONARIES)
      .filter(([, dictionary]) => {
        const value = resolve(dictionary, path);
        return typeof value !== "string" || value.length === 0;
      })
      .map(([language]) => language);

    expect({ path, missing }).toEqual({ path, missing: [] });
  });
});

/**
 * Info: (20260817 - Julian) 側邊選單的兩個新項目同樣不可漏。
 *
 * 它們不在上面掃到的檔案裡 —— `hr_nav_items.ts` 存的是 `labelKey`，
 * 而那個字串長得跟 `t()` 的參數一樣，會被同一條規則漏掉。
 */
describe("側邊選單的假勤項目", () => {
  it.each(["hr_management.nav.leave", "hr_management.nav.leave_approval"])(
    "%s 在五個語系都存在",
    (path) => {
      const missing = Object.entries(DICTIONARIES)
        .filter(
          ([, dictionary]) => typeof resolve(dictionary, path) !== "string",
        )
        .map(([language]) => language);

      expect({ path, missing }).toEqual({ path, missing: [] });
    },
  );
});
