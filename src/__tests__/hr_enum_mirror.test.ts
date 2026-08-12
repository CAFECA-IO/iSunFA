import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import * as HrConstants from "@/constants/hr_management";

/**
 * Info: (20260811 - Julian) 把「前端 enum 鏡像與 Prisma schema 同步」這件事機械化。
 *
 * ## 為什麼需要
 *
 * `src/constants/hr_management.ts` 刻意不從 `@/generated` 匯入 enum ——
 * 那份 client 會把 Node 端相依拉進 client component 的 bundle，而前端只需要
 * 「字串長什麼樣」。代價是兩邊各寫一份，靠 `// 對齊 Prisma enum X` 這句註解維持同步。
 *
 * 註解不會在 schema 改動時提醒任何人。這支測試會。
 *
 * ## 為什麼比對 schema.prisma，而不是 `@/generated`
 *
 * 第一版拿 `@/generated/enums` 當對照組，錯了。那是**衍生產物**：它被 gitignore，
 * 只有在有人跑過 `prisma generate` 之後才存在，而且沒有任何機制保證它與 schema 同代。
 * 實際踩到的情況是客戶端停在三個月前 —— 五個 enum 全都是 `undefined`，
 * 而 jest 走轉譯不做型別檢查，所以編譯期無人攔截，執行期只剩下一個
 * 「鏡像有值、對照組是空物件」的 diff，指向完全錯誤的方向。
 *
 * `prisma/schema.prisma` 才是真正的來源：它在 git 裡、永遠與分支同代、
 * 不需要任何前置指令。改成讀它之後，這支測試在乾淨的 clone 上就能跑，
 * 而且 schema 一改動就立刻反映，不必等有人想起來重新產生客戶端。
 *
 * 代價是要自己解析 enum 區塊，但那是十幾行決定性的字串處理 ——
 * 比「依賴一個沒人保證會更新的檔案」便宜得多。
 */

// Info: (20260811 - Julian) 以 cwd 組路徑，與 `theme_css_blocks.test.ts` 讀 globals.css 的既有寫法一致
const SCHEMA_PATH = join(process.cwd(), "prisma/schema.prisma");

/**
 * Info: (20260811 - Julian) 先去掉註解再解析。
 *
 * schema 裡的 enum 成員後面常跟著 `// Info: ...` 說明，而區塊註解裡也可能出現
 * 形似宣告的文字（例如 ADR 說明中引用已移除的 enum）。不先剝掉，
 * 解析結果會混進註解內容 —— 那種錯誤只會在某次改註解時才爆，最難查。
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/**
 * Info: (20260811 - Julian) 從 schema 取出所有 `enum X { ... }` 的成員名稱。
 *
 * 成員可能帶 `@map("...")`，因此每行只取第一個 token。
 */
const parseSchemaEnums = (source: string): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  const blockPattern = /\benum\s+(\w+)\s*\{([^}]*)\}/g;

  let match = blockPattern.exec(source);
  while (match !== null) {
    result[match[1]] = match[2]
      .split("\n")
      .map((line) => line.trim().split(/\s+/)[0])
      .filter((token) => token.length > 0);
    match = blockPattern.exec(source);
  }
  return result;
};

const SCHEMA_ENUMS = parseSchemaEnums(
  stripComments(readFileSync(SCHEMA_PATH, "utf8")),
);

// Info: (20260811 - Julian) 需與 Prisma schema 保持一致的鏡像。新增鏡像時必須在此登記
const MIRRORED: Record<string, Record<string, string>> = {
  EmployeeStatus: HrConstants.EmployeeStatus,
  Gender: HrConstants.Gender,
  ProcessTaskStatus: HrConstants.ProcessTaskStatus,
  DocumentCategory: HrConstants.DocumentCategory,
  ProbationResult: HrConstants.ProbationResult,
};

/**
 * Info: (20260811 - Julian) 只存在於前端、schema 沒有對應 enum 的，登記在這裡。
 *
 * `ProcessTaskType` 是最需要說明的一個：schema 那邊原本有，但 `ProcessTask`
 * 依 ADR 019 拆成兩張表之後已移除 —— 現在它是 service 依來源表填入的 DTO 衍生值。
 * 若不明列，下面的覆蓋率檢查會把它報成「漏了鏡像」。
 */
const UI_ONLY = [
  "ProcessTaskType",
  "HrDashboardRole",
  "OrganizationTab",
  "OrganizationViewMode",
  "StructureDimension",

  /**
   * Info: (20260812 - Julian) 純畫面控制項：分頁、檢視模式、快速篩選。
   * 它們決定「現在顯示哪一區」，不會被寫進任何一張表。
   */
  "MovementTab",
  "MovementViewMode",
  "OffboardingListMode",
  "OffboardingModalTab",
  "OnboardingQuickFilter",

  /**
   * Info: (20260812 - Julian) 由任務狀態推導出來的顯示狀態，不是被儲存的欄位。
   *
   * 例如 `MovementStage` 是看板欄位（由關鍵日期推得）、`MovementAlertLevel`
   * 是紅黃綠三色（由「離職日剩幾天 + 帳號停權做了沒」推得）。
   * 把推導結果存回 DB，就會出現「存的燈號與任務現況不一致」的第三種真相 ——
   * 與 ADR 019 移除 `ProcessTaskType` 是同一個理由。
   */
  "ChecklistState",
  "MovementStage",
  "MovementAlertLevel",
  "MovementAlertReason",
  "HandoverItemState",
  "CertificateState",

  /**
   * Info: (20260812 - Julian) schema 目前沒有對應欄位，但**應該要有** ——
   * 這四個各自在 `hr_management.ts` 有一條 ToDo 列管。
   *
   * 補進 schema 的那一天，它們必須從這裡搬到 `MIRRORED`；
   * 忘了搬的話，下面「should register every enum that exists on both sides」
   * 會在名稱兩邊同時存在時直接擋下來，不需要有人記得這件事。
   */
  "HandoverCategory",
  "ProbationMilestone",
  "ProbationScoreItem",
  "ResignationReason",
];

/**
 * Info: (20260811 - Julian) 判斷一個 export 是不是 TS 字串 enum：每個值都等於它的鍵。
 *
 * 用這個而不是「值都是字串」，因為 `HR_MANAGEMENT_ROUTE`、`EMPLOYEE_STATUS_STYLE`
 * 這些 `Record<..., string>` 也符合後者。Prisma 的 enum 成員名即是值，
 * 所以任何忠實的鏡像必然滿足 key === value —— 不滿足的鏡像本身就已經是錯的。
 */
const isStringEnum = (value: unknown): value is Record<string, string> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  return (
    entries.length > 0 &&
    entries.every(([key, item]) => typeof item === "string" && key === item)
  );
};

describe("HR enum mirrors", () => {
  /**
   * Info: (20260811 - Julian) 先確認解析器真的讀到東西。
   *
   * 若 schema 路徑錯了或格式改變導致解析全空，下面每一條比對都會變成
   * 「鏡像有、schema 沒有」，看起來像 enum 被刪光 —— 一個與成因無關的結論。
   * 這條先擋住那種誤導。
   */
  it("should parse enums out of prisma/schema.prisma", () => {
    expect(Object.keys(SCHEMA_ENUMS).length).toBeGreaterThan(0);
    // Info: (20260811 - Julian) 抽一個與 HR 無關的既有 enum，確認解析的是整份 schema
    expect(SCHEMA_ENUMS.TeamRole).toEqual([
      "OWNER",
      "ADMIN",
      "EDITOR",
      "VIEWER",
    ]);
  });

  describe.each(Object.keys(MIRRORED))("%s", (name) => {
    const mirror = MIRRORED[name];

    it("should exist in prisma/schema.prisma", () => {
      expect(SCHEMA_ENUMS[name]).toBeDefined();
    });

    // Info: (20260811 - Julian) `?? []` 只是讓缺漏時顯示成「少了這些成員」，不是讓它通過
    it("should expose exactly the same members as the schema enum", () => {
      expect(Object.keys(mirror).sort()).toEqual(
        [...(SCHEMA_ENUMS[name] ?? [])].sort(),
      );
    });

    // Info: (20260811 - Julian) 值也要一致：鍵對了但值打錯，等於在 DB 寫入一個不存在的列舉值
    it("should map every member to its own name", () => {
      expect(isStringEnum(mirror)).toBe(true);
    });
  });

  /**
   * Info: (20260811 - Julian) 覆蓋率方向一：hr_management.ts 新增了 enum 卻沒登記。
   * 沒有這條，「忘了同步」就只是從「忘了改鏡像」變成「忘了寫測試」。
   */
  it("should account for every string enum exported by hr_management.ts", () => {
    const exported = Object.entries(HrConstants)
      .filter(([, value]) => isStringEnum(value))
      .map(([name]) => name)
      .sort();

    expect(exported).toEqual([...Object.keys(MIRRORED), ...UI_ONLY].sort());
  });

  /**
   * Info: (20260811 - Julian) 覆蓋率方向二：schema 與前端有同名 enum，卻沒被登記成鏡像。
   *
   * 方向一用 key === value 判斷，抓不到「值故意寫成別的東西」的壞鏡像；
   * 這條改用名稱比對，不管值長什麼樣都會抓到。兩條合起來才沒有縫。
   */
  it("should register every enum that exists on both sides", () => {
    const unregistered = Object.keys(SCHEMA_ENUMS)
      .filter((name) => name in HrConstants)
      .filter((name) => !(name in MIRRORED) && !UI_ONLY.includes(name))
      .sort();

    expect(unregistered).toEqual([]);
  });
});
