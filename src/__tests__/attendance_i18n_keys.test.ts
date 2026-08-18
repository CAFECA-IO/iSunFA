import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { hrManagement as en } from "@/i18n/locales/en/hr_management";
import { hrManagement as ja } from "@/i18n/locales/ja/hr_management";
import { hrManagement as ko } from "@/i18n/locales/ko/hr_management";
import { hrManagement as zhCn } from "@/i18n/locales/zh_cn/hr_management";
import { hrManagement as zhTw } from "@/i18n/locales/zh_tw/hr_management";
import {
  WorkDayType,
  WORK_DAY_TYPE_SHORT_I18N_KEY,
} from "@/constants/attendance";
import { ATTENDANCE_SUMMARY_COLUMNS } from "@/lib/utils/attendance_result_view";

/**
 * Info: (20260814 - Julian) 常數裡的 i18n 路徑必須真的存在。
 *
 * `i18n_context` 的 `getNestedValue` 找不到就回傳 key 本身，所以缺字典不會報錯，
 * 而是把 `hr_management.leave.type_annual` 這串字直接畫在畫面上 —— 沒有錯誤訊息、
 * 沒有 console 警告，只有使用者看得到。`LEAVE_TYPE_I18N_KEY` 就這樣壞了一整個開發週期。
 *
 * Info: (20260817 - Luphia) 掃描根改為**整個 `src`**（檢查清單 §一.1）。
 *
 * 上一版只掃 `LEAVE_TYPE_I18N_KEY` 與 `WORK_DAY_TYPE_SHORT_I18N_KEY` —— 也就是
 * 剛好壞過的那兩個 map。而同一個模組裡另有六個 i18n map（tone、exception、day type、
 * phase、presence status、weekday），加上元件裡直接寫的 `t("...")`、
 * 每一頁自己的錯誤碼對照表，全部沒有被任何東西守住。
 *
 * **掃描型測試的價值等於它的掃描根。** 現在掃全 `src` 的字串常值，
 * 因此不管新的鍵寫在 constants、util、還是元件裡，漏掉字典都會紅。
 */

const SRC_DIR = join(process.cwd(), "src");
const LOCALES_SEGMENT = join("i18n", "locales");

const DICTIONARIES: Record<string, Record<string, unknown>> = {
  en,
  ja,
  ko,
  zh_cn: zhCn,
  zh_tw: zhTw,
};

/**
 * Info: (20260817 - Luphia) 動態組出來的鍵：掃描器看得到樣板但看不到值域，
 * 因此必須在這裡登記它展開後的**具體**鍵，由下面的測試逐一驗證。
 *
 * 登記表與掃描結果必須完全一致（見「樣板鍵都已登記」那條）——
 * 新增一個動態鍵而不登記就會紅，否則掃描器會靜靜略過它，
 * 而那正是「看起來掃過了」最貴的一種假綠。
 */
const DYNAMIC_KEY_EXPANSIONS: Record<string, string[]> = {
  "hr_management.attendance_result.col_${column.key}":
    ATTENDANCE_SUMMARY_COLUMNS.map(
      (column) => `hr_management.attendance_result.col_${column.key}`,
    ),
};

/**
 * Info: (20260817 - Luphia) 空字串是刻意的那幾個。**清單只能變短。**
 *
 * 中日韓的量詞（個 / 件 / 개 / 个）在英文裡不存在 —— "3 departments" 沒有對應的量詞，
 * 所以 `en` 那一格是空字串而不是漏翻。把它當成缺漏會逼下一個人隨便填一個字。
 *
 * 反過來也守住：下面有一條測試要求這裡登記的每一格**確實仍是空的**。
 * 哪天英文真的填了值，那條會紅並要你把這一行刪掉 —— 例外清單不會靜靜地長期留著。
 */
const INTENTIONALLY_EMPTY: Record<string, string[]> = {
  "hr_management.organization.unit_department": ["en"],
};

const listSourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const nested = join(dir, entry.name);
    if (entry.isDirectory()) {
      // Info: (20260817 - Luphia) 字典本身不掃：它是被比對的一方，不是引用方
      return nested.includes(LOCALES_SEGMENT) ? [] : listSourceFiles(nested);
    }
    return /\.tsx?$/.test(entry.name) ? [nested] : [];
  });

const SOURCE_FILES = listSourceFiles(SRC_DIR);

// Info: (20260817 - Luphia) 引號或反引號包住、且不含 `${` 的完整鍵
const STATIC_KEY_RE = /["'`](hr_management\.[A-Za-z0-9_.]+)["'`]/g;
// Info: (20260817 - Luphia) 反引號且含 `${`：值域在程式碼裡，只能靠登記表
const DYNAMIC_KEY_RE = /`(hr_management\.[^`]*\$\{[^`]*)`/g;

/**
 * Info: (20260817 - Luphia) 排除以 `.ts` / `.tsx` 結尾的比對結果 ——
 * 那是註解裡引用的檔名（例如「見 zh_tw/hr_management.ts」），不是 i18n 路徑。
 */
const isFileReference = (key: string): boolean => /\.tsx?$/.test(key);

const collectKeys = (): { statics: string[]; dynamics: string[] } => {
  const statics = new Set<string>();
  const dynamics = new Set<string>();

  for (const file of SOURCE_FILES) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(STATIC_KEY_RE)) {
      if (!isFileReference(match[1])) statics.add(match[1]);
    }
    for (const match of source.matchAll(DYNAMIC_KEY_RE)) {
      dynamics.add(match[1]);
    }
  }

  return { statics: [...statics].sort(), dynamics: [...dynamics].sort() };
};

const { statics: STATIC_KEYS, dynamics: DYNAMIC_KEYS } = collectKeys();

// Info: (20260814 - Julian) 比照 `i18n_context` 的查法：逐段往下鑽，中途缺了就是 undefined
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

/**
 * Info: (20260817 - Luphia) 缺哪些語系。**空字串也算缺** —— 畫面上與缺字典一樣是空白，
 * 而空白比印出 key 更難發現（印出 key 至少看得出來壞了）。
 * 例外走 `INTENTIONALLY_EMPTY`，不放寬這條規則本身。
 */
const missingLocalesOf = (path: string): string[] => {
  const allowedEmpty = INTENTIONALLY_EMPTY[path] ?? [];

  return Object.entries(DICTIONARIES)
    .filter(([language, dictionary]) => {
      const value = resolve(dictionary, path);
      if (typeof value !== "string") return true;
      if (value.trim().length > 0) return false;
      return !allowedEmpty.includes(language);
    })
    .map(([language]) => language);
};

describe("hr_management 的 i18n 路徑（掃描根＝整個 src）", () => {
  // Info: (20260817 - Luphia) 掃描根沒有掃到空氣：檔案數與鍵數都必須不為零
  it("掃到了檔案與鍵", () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(0);
    expect(STATIC_KEYS.length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260817 - Luphia) 一次列出所有缺漏，不用 `it.each` 逐鍵一條。
   * 鍵有數百個，逐條會讓輸出難讀；一次列完則是「缺哪些、在哪個語系」一目了然。
   */
  it("每一個鍵在五個語系都有非空字串", () => {
    const missing = STATIC_KEYS.map((path) => ({
      path,
      missing: missingLocalesOf(path),
    })).filter((entry) => entry.missing.length > 0);

    expect(missing).toEqual([]);
  });

  /**
   * Info: (20260817 - Luphia) 例外清單只能變短：登記為「刻意留空」的那一格若被填上值，
   * 這條會紅並要求把它從清單裡刪掉。沒有這條，清單會變成一份沒人敢動的免死金牌。
   */
  it("刻意留空的例外，每一格都確實還是空的", () => {
    const noLongerEmpty = Object.entries(INTENTIONALLY_EMPTY).flatMap(
      ([path, languages]) =>
        languages.flatMap((language) => {
          const value = resolve(DICTIONARIES[language], path);
          return typeof value === "string" && value.trim().length === 0
            ? []
            : [`${path} 的 ${language} 已不是空字串，請把它從例外清單移除`];
        }),
    );

    expect(noLongerEmpty).toEqual([]);
  });

  // Info: (20260817 - Luphia) 例外清單裡的鍵必須真的還被引用，否則它是死條目
  it("例外清單裡的鍵都還在掃描結果中", () => {
    const stale = Object.keys(INTENTIONALLY_EMPTY).filter(
      (path) => !STATIC_KEYS.includes(path),
    );

    expect(stale).toEqual([]);
  });

  it("樣板鍵都已登記在展開表裡", () => {
    expect(DYNAMIC_KEYS).toEqual(Object.keys(DYNAMIC_KEY_EXPANSIONS).sort());
  });

  it("樣板鍵展開後的每一個具體鍵也都存在", () => {
    const expanded = Object.values(DYNAMIC_KEY_EXPANSIONS).flat();
    const missing = expanded
      .map((path) => ({ path, missing: missingLocalesOf(path) }))
      .filter((entry) => entry.missing.length > 0);

    // Info: (20260817 - Luphia) 展開表本身不得為空，否則這條在測「沒有東西」
    expect(expanded.length).toBeGreaterThan(0);
    expect(missing).toEqual([]);
  });
});

/**
 * Info: (20260814 - Julian) 月曆格子的一字縮寫在每個語系內必須互不相同。
 *
 * 原本是 `t(完整名稱).slice(0, 1)` —— 韓文的「휴무일」（休息日）與「휴가」（請假）
 * 首字都是「휴」，兩種日型別在格子上長得一模一樣，而畫面看起來完全正常。
 * 與班別簡稱是同一種錯：**能從全名推導**與**推導得出唯一值**是兩件事。
 *
 * Info: (20260817 - Julian) 加入 `SUSPENDED` 時這條立刻抓到英文撞號：
 * regular off 與 suspended 都想用 "S"。日型別從五種變六種，這條不需要改。
 */
describe("排班月曆的日型別縮寫", () => {
  it.each(Object.keys(DICTIONARIES))("%s 的日型別縮寫互不相同", (lang) => {
    const dictionary = DICTIONARIES[lang];
    const labels = Object.values(WorkDayType).map((dayType) =>
      resolve(dictionary, WORK_DAY_TYPE_SHORT_I18N_KEY[dayType]),
    );

    expect(labels.every((label) => typeof label === "string")).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
