import { SALARY_PROFILE_FIELDS } from "@/lib/utils/salary_profile_diff";
import { describe, it, expect } from "@jest/globals";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { hrManagement as hrEn } from "@/i18n/locales/en/hr_management";
import { hrManagement as hrJa } from "@/i18n/locales/ja/hr_management";
import { hrManagement as hrKo } from "@/i18n/locales/ko/hr_management";
import { hrManagement as hrZhCn } from "@/i18n/locales/zh_cn/hr_management";
import { hrManagement as hrZhTw } from "@/i18n/locales/zh_tw/hr_management";
import { calculator as calcEn } from "@/i18n/locales/en/calculator";
import { calculator as calcJa } from "@/i18n/locales/ja/calculator";
import { calculator as calcKo } from "@/i18n/locales/ko/calculator";
import { calculator as calcZhCn } from "@/i18n/locales/zh_cn/calculator";
import { calculator as calcZhTw } from "@/i18n/locales/zh_tw/calculator";
import {
  WorkDayType,
  WORK_DAY_TYPE_SHORT_I18N_KEY,
} from "@/constants/attendance";
import { ATTENDANCE_SUMMARY_COLUMNS } from "@/lib/utils/attendance_result_view";
import { PayrollDaysBase } from "@/constants/salary_calculator";
import {
  EmploymentType,
  TaxResidencyStatus,
} from "@/interfaces/salary_calculator";

/**
 * Info: (20260814 - Julian) 常數裡的 i18n 路徑必須真的存在。
 *
 * `i18n_context` 的 `getNestedValue` 找不到就回傳 key 本身，所以缺字典不會報錯，
 * 而是把那串路徑直接畫在畫面上 —— 沒有錯誤訊息、沒有 console 警告，只有使用者看得到。
 * 當年的假別對照表就這樣壞了一整個開發週期
 * （那張表是 `LEAVE_TYPE_I18N_KEY`，已隨 `enum LeaveType` 於 ADR 021 移除）。
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
 *
 * Info: (20260818 - Julian) 掃描前先去掉註解。
 *
 * 上一版沒有去，而它**自己的檔頭註解**裡就引用了一個鍵當例子
 * （`` `hr_management.leave.type_annual` `` —— 反引號包住，`STATIC_KEY_RE` 照抓）。
 * 那個鍵當時剛好存在，所以測試是綠的；`LEAVE_TYPE_I18N_KEY` 隨 ADR 021 被移除之後，
 * 這支測試就開始拿**文件本身**當違規來源，要求五個語系去補一個誰都不會顯示的鍵。
 *
 * 也就是說「掃描根 = 整個 src」這個改動同時把註解拉進了掃描範圍，
 * 而註解裡引用鍵名是說明清楚的正常寫法。下面的 `isFileReference` 是同一個問題的
 * 局部處置（濾掉註解裡提到的檔名），去註解則是從源頭解決。
 * 做法比照 `theme_css_blocks.test.ts` 的 `stripComments`，成因與代價相同。
 *
 * 實測代價：全 `src` 掃出 768 個鍵，去註解後 767 個 —— 少的正是上面那一個。
 *
 * Info: (20260901 - Julian) 命名空間從一個變成一張表（檔名同時從
 * `attendance_i18n_keys.test.ts` 改成 `i18n_keys.test.ts`）。
 *
 * 上一版的 regex 把 `hr_management\.` 寫死在裡面 —— 掃描根是整個 `src` 沒錯，
 * 但**問的問題**只涵蓋一個命名空間。這是 §1.1 在字典側的化身：
 * 涵蓋範圍看起來是「全專案」，實際上是「剛好壞過的那個模組」。
 *
 * 代價實測：把 `calculator` 加進表裡，立刻抓到 9 個既有壞鍵
 * （`resending_pay_slip_modal.tsx` 的 8 個 `calculator.MESSAGE.RESEND_*` ——
 * 那是還沒改成 snake_case 之前的舊鍵，加上 `pay_slip_sent_tab.tsx` 的
 * `payslip_issued_date`（字典裡是 `pay_slip_issued_date`））。
 * 使用者打開「我的薪資單 → 已寄出 → 重寄」時，畫面直接顯示
 * `calculator.MESSAGE.RESEND_PAY_SLIP_TITLE` 這串字，沒有任何 console 警告。
 *
 * 新增命名空間的成本是 `NAMESPACES` 加一列；沒有一列是「以後再說」，
 * 因為加進來會立刻紅並要求把該模組的壞鍵補齊 —— 這正是這支測試的用途。
 */

const SRC_DIR = join(process.cwd(), "src");
const LOCALES_SEGMENT = join("i18n", "locales");

/**
 * Info: (20260901 - Julian) 受守護的命名空間 → 五個語系的字典。
 *
 * 鍵名必須與 i18n 路徑的第一段完全相同（`hr_management.x.y` 的 `hr_management`），
 * 下面的 regex 直接由這張表的鍵組出來，不另外寫一份。
 */
const NAMESPACES: Record<string, Record<string, Record<string, unknown>>> = {
  hr_management: {
    en: hrEn,
    ja: hrJa,
    ko: hrKo,
    zh_cn: hrZhCn,
    zh_tw: hrZhTw,
  },
  calculator: {
    en: calcEn,
    ja: calcJa,
    ko: calcKo,
    zh_cn: calcZhCn,
    zh_tw: calcZhTw,
  },
};

const LANGUAGES = ["en", "ja", "ko", "zh_cn", "zh_tw"] as const;

// Info: (20260901 - Julian) `hr_management|calculator` —— 由上表組出來，不會兩邊不同步
const NAMESPACE_ALTERNATION = Object.keys(NAMESPACES).join("|");

const dictionariesOf = (
  path: string,
): Record<string, Record<string, unknown>> => NAMESPACES[path.split(".")[0]];

/**
 * Info: (20260817 - Luphia) 動態組出來的鍵：掃描器看得到樣板但看不到值域，
 * 因此必須在這裡登記它展開後的**具體**鍵，由下面的測試逐一驗證。
 *
 * 登記表與掃描結果必須完全一致（見「樣板鍵都已登記」那條）——
 * 新增一個動態鍵而不登記就會紅，否則掃描器會靜靜略過它，
 * 而那正是「看起來掃過了」最貴的一種假綠。
 *
 * Info: (20260901 - Julian) 這張表**自己也在掃描根裡**（`src/__tests__` 也是 `src`）。
 * 所以右邊展開用的樣板必須與左邊的鍵**逐字相同**，連 lambda 參數名都要一樣 ——
 * 用 `(value) => ...payroll_option_${value.toLowerCase()}` 去展開
 * `...payroll_option_${option.toLowerCase()}`，掃描器會把它當成第五個未登記的樣板鍵而紅。
 * 也不要改用字串相接：`"calculator.basic_info_form.payroll_option_"` 會被當成一個
 * 靜態鍵掃走，然後抱怨字典裡沒有這個以底線結尾的鍵。
 */
const DYNAMIC_KEY_EXPANSIONS: Record<string, string[]> = {
  "hr_management.attendance_result.col_${column.key}":
    ATTENDANCE_SUMMARY_COLUMNS.map(
      (column) => `hr_management.attendance_result.col_${column.key}`,
    ),

  /**
   * Info: (20260901 - Julian) 計算機的四張單選／下拉，值域全部來自 enum。
   *
   * 注意兩種取法不同、而且都要照著登記：
   * 僱用型態與稅務居民身分用的是 enum 的**鍵**（`FULL_TIME` → `full_time`），
   * 給薪天數基準用的是 enum 的**值**（`PayrollDaysBase.FIXED === "FIXED"` → `fixed`）。
   * 哪天有人把 enum 的鍵值改成不一樣的字，這裡展開出來的鍵就會對不上字典而紅。
   */
  "calculator.basic_info_form.${type.toLowerCase()}": Object.keys(
    EmploymentType,
  ).map((type) => `calculator.basic_info_form.${type.toLowerCase()}`),

  /**
   * Info: (20260902 - Julian) `employmentTypeI18nKey()` 組出來的那一組。
   *
   * 它是僱用型態 i18n 路徑的**唯一**字面來源（`lib/utils/salary_employee_profile.ts`）——
   * 收斂成一支函式之前，三個呼叫端各自組一次、變數名各不相同，
   * 而掃描器認字面，於是同一組值域要登記三筆。
   */
  /**
   * Info: (20260908 - Julian) 調薪歷程的欄位標籤（`employee_history_modal.tsx`）。
   *
   * 值域是 `SALARY_PROFILE_FIELDS` —— 也就是 `ISalaryCalculatorEmployee`
   * 去掉 `id` 的每一個欄位。綁在那個常數上而不是手抄一份：
   * 新增員工檔欄位時，這裡會自動要求對應的文案存在，
   * 而漏掉的那一欄在畫面上會顯示成 i18n 路徑本身。
   */
  "calculator.employee_list.field_labels.${field}": SALARY_PROFILE_FIELDS.map(
    (field) => `calculator.employee_list.field_labels.${field}`,
  ),

  "calculator.basic_info_form.${key.toLowerCase()}": Object.keys(
    EmploymentType,
  ).map((key) => `calculator.basic_info_form.${key.toLowerCase()}`),

  "calculator.basic_info_form.residency_option_${type.toLowerCase()}":
    Object.keys(TaxResidencyStatus).map(
      (type) =>
        `calculator.basic_info_form.residency_option_${type.toLowerCase()}`,
    ),

  "calculator.basic_info_form.payroll_option_${payrollDaysBase.toLowerCase()}":
    Object.values(PayrollDaysBase).map(
      (payrollDaysBase) =>
        `calculator.basic_info_form.payroll_option_${payrollDaysBase.toLowerCase()}`,
    ),

  "calculator.basic_info_form.payroll_option_${option.toLowerCase()}":
    Object.values(PayrollDaysBase).map(
      (option) =>
        `calculator.basic_info_form.payroll_option_${option.toLowerCase()}`,
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

  /**
   * Info: (20260901 - Julian) 「到職日 On 8/15」的那個介係詞。
   *
   * 英文需要 "On"，中日韓的語序把日期直接接在標籤後面，沒有對應的詞 ——
   * 硬填一個字會變成「到職日 於 8/15」這種沒人這樣寫的句子。
   * 四個語系目前是一個半形空白（作為與日期之間的間隔），`trim()` 後為空。
   */
  "calculator.basic_info_form.joined_this_month_2": [
    "ja",
    "ko",
    "zh_cn",
    "zh_tw",
  ],
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
const STATIC_KEY_RE = new RegExp(
  `["'\`]((?:${NAMESPACE_ALTERNATION})\\.[A-Za-z0-9_.]+)["'\`]`,
  "g",
);
// Info: (20260817 - Luphia) 反引號且含 `${`：值域在程式碼裡，只能靠登記表
const DYNAMIC_KEY_RE = new RegExp(
  `\`((?:${NAMESPACE_ALTERNATION})\\.[^\`]*\\$\\{[^\`]*)\``,
  "g",
);

/**
 * Info: (20260817 - Luphia) 排除以 `.ts` / `.tsx` 結尾的比對結果 ——
 * 那是註解裡引用的檔名（例如「見 zh_tw/hr_management.ts」），不是 i18n 路徑。
 */
const isFileReference = (key: string): boolean => /\.tsx?$/.test(key);

/**
 * Info: (20260818 - Julian) 去掉註解。`//` 只在行首（允許前置空白）才算註解 ——
 * 不限位置的雙斜線規則會把 `"https://..."` 之後的整行吞掉，連同同一行的鍵。
 * 這個方向會漏掉行尾註解，但那只會多掃到不該掃的內容（看得見的假性失敗），
 * 不會漏掉真的缺漏（同 `theme_css_blocks.test.ts` 的取捨）。
 */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/[^\n]*/gm, "");

const collectKeys = (): { statics: string[]; dynamics: string[] } => {
  const statics = new Set<string>();
  const dynamics = new Set<string>();

  for (const file of SOURCE_FILES) {
    const source = stripComments(readFileSync(file, "utf8"));
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

  return Object.entries(dictionariesOf(path))
    .filter(([language, dictionary]) => {
      const value = resolve(dictionary, path);
      if (typeof value !== "string") return true;
      if (value.trim().length > 0) return false;
      return !allowedEmpty.includes(language);
    })
    .map(([language]) => language);
};

describe("受守護命名空間的 i18n 路徑（掃描根＝整個 src）", () => {
  // Info: (20260817 - Luphia) 掃描根沒有掃到空氣：檔案數與鍵數都必須不為零
  it("掃到了檔案與鍵", () => {
    expect(SOURCE_FILES.length).toBeGreaterThan(0);
    expect(STATIC_KEYS.length).toBeGreaterThan(0);
  });

  /**
   * Info: (20260901 - Julian) 每一個登記的命名空間都真的掃到東西。
   *
   * 沒有這一條的話，命名空間名字打錯（`calc` 而不是 `calculator`）
   * 只會讓那個命名空間一個鍵都掃不到 —— 而「零個違規」與「全部通過」
   * 在輸出上長得一模一樣。這是登記表版本的「掃描根沒有掃到空氣」。
   */
  it.each(Object.keys(NAMESPACES))("%s 這個命名空間有掃到鍵", (namespace) => {
    expect(
      STATIC_KEYS.filter((key) => key.startsWith(`${namespace}.`)).length,
    ).toBeGreaterThan(0);
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
          const value = resolve(dictionariesOf(path)[language], path);
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
  it.each(LANGUAGES)("%s 的日型別縮寫互不相同", (lang) => {
    const dictionary = NAMESPACES.hr_management[lang];
    const labels = Object.values(WorkDayType).map((dayType) =>
      resolve(dictionary, WORK_DAY_TYPE_SHORT_I18N_KEY[dayType]),
    );

    expect(labels.every((label) => typeof label === "string")).toBe(true);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

/**
 * Info: (20260909 - Julian) **五個語系的鍵齊不齊**（review B3）。
 *
 * ## 為什麼上面那一組守不到這件事
 *
 * 上面那組問的是：「程式碼裡以字面值寫出來的每一個 `t("ns.key")`，
 * 五個語系都查得到嗎」。掃描根是整個 `src`，涵蓋範圍已經夠寬 ——
 * 但它是**從程式碼出發**的。
 *
 * 於是有一整類缺陷落在它外面：**只有 zh_tw 有、其他語系沒有的鍵**，
 * 只要它沒有被字面值引用（用變數組出來的鍵、`Record<X, i18nKey>` 查表、
 * 或剛加進字典還沒接上畫面），上面那組就永遠是綠的。
 *
 * 這正是檢查清單 §1.11 說的「掃描測試只回答有沒有接線」：
 * 接線問到了，**字典本身齊不齊**沒有問到。
 *
 * ## 這一組從另一端問
 *
 * 拿 `zh_tw` 當基準（它是這個專案的母語，新字串一定先寫在那裡），
 * 逐一比對另外四個語系。與上面那組是**兩個方向**，不是同一件事問兩次：
 *
 * | | 從哪裡出發 | 抓得到什麼 |
 * | --- | --- | --- |
 * | 上面那組 | 程式碼的 `t("...")` | 用了但字典沒有 → 畫面顯示鍵名 |
 * | 這一組 | zh_tw 字典 | 字典有但別的語系沒有 → 那個語系顯示鍵名 |
 *
 * ## 為什麼掃全部 76 個命名空間，而不是沿用上面的 `NAMESPACES`
 *
 * 那張表是「受守護的命名空間」，逐一加入是刻意的（加一個就要把該模組的壞鍵補齊）。
 * 但**鍵齊不齊**沒有那個成本 —— 它不要求任何人去改程式碼，只要求翻譯補齊。
 * 所以這一組直接讀 `zh_tw` 目錄，新增一個命名空間檔就自動被守住，
 * 不需要有人記得回來加一列。
 *
 * 20260909 實測：76 個命名空間、zh_tw 共 5,266 鍵，四個語系**零缺口**。
 * 也就是說這條測試建立的當下是綠的 —— 它守的是**日後**別再掉。
 */
describe("五個語系的鍵齊不齊", () => {
  const LOCALES_DIR = join(SRC_DIR, "i18n", "locales");
  const OTHERS = LANGUAGES.filter((lang) => lang !== "zh_tw");

  const namespaces = readdirSync(join(LOCALES_DIR, "zh_tw"))
    .filter((file) => file.endsWith(".ts"))
    .map((file) => file.replace(/\.ts$/, ""));

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-require-imports */
  const dictionaryOf = (lang: string, namespace: string): any => {
    const loaded = require(join(LOCALES_DIR, lang, namespace));
    // Info: (20260909 - Julian) 每個檔案只 export 一個字典物件，名稱與檔名不一定相同
    return loaded[Object.keys(loaded)[0]];
  };

  const flatten = (value: any, prefix = ""): string[] => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return [prefix];
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  };

  it("掃到了命名空間（否則整組空過）", () => {
    expect(namespaces.length).toBeGreaterThan(50);
  });

  /**
   * Info: (20260909 - Julian) 一個語系一條，而不是全部併成一條。
   *
   * 併成一條的話，失敗訊息只說「有 37 個鍵不齊」；分開之後
   * 紅的那一行直接說是哪一個語系，而補翻譯的人多半只負責其中一種。
   */
  it.each(OTHERS)("%s 沒有比 zh_tw 少任何一個鍵", (lang) => {
    const missing: string[] = [];

    namespaces.forEach((namespace) => {
      let theirs: Set<string>;
      try {
        theirs = new Set(flatten(dictionaryOf(lang, namespace)));
      } catch {
        // Info: (20260909 - Julian) 整個檔案不存在 —— 那是「全缺」，不是 0 缺
        missing.push(`${namespace}（整個命名空間缺檔）`);
        return;
      }
      flatten(dictionaryOf("zh_tw", namespace)).forEach((key) => {
        if (!theirs.has(key)) missing.push(`${namespace}.${key}`);
      });
    });

    expect(missing).toEqual([]);
  });

  /**
   * Info: (20260909 - Julian) 反方向：某個語系**多**出來的鍵。**這一條是棘輪，不是門檻。**
   *
   * 多出來的鍵不會讓畫面壞掉，所以它不該擋任何人的 PR。但它是一個訊號：
   * 那一格的中文被刪掉了而翻譯沒跟著刪，或有人直接改了英文字典而沒回頭補中文。
   * 兩者都會讓字典長出沒人在用的死鍵，而下一個人不敢刪 ——
   * 因為看不出它是死的還是漏的。
   *
   * ## 為什麼是數字而不是 `toEqual([])`
   *
   * 20260909 建立這一條時，四個語系合計**已經多出 61 個鍵**，全部在
   * `esg_verify` / `cookie_consent` / `pricing` 三個與當時那個 PR 無關的命名空間。
   * 要求當下清乾淨，等於讓一條護欄的落地綁架三個別人的模組 ——
   * 那通常的結果是這條測試根本不會被寫。
   *
   * 所以記下當下的數字，並且**只能往下**。新長出來的死鍵會立刻紅；
   * 有人順手清掉幾個，這裡的數字也要跟著調小（下面那條測試會逼他調）。
   *
   * 這是 `salary_repo_scope.test.ts` 的 `TENANT_EXEMPT_MAX` 同一個手法：
   * 既有的債看得見、有上限、而且不會再長大。
   */
  const EXTRA_KEY_BUDGET: Record<string, number> = {
    en: 2,
    ja: 16,
    ko: 18,
    zh_cn: 17,
  };

  const extraKeysOf = (lang: string): string[] => {
    const extra: string[] = [];

    namespaces.forEach((namespace) => {
      let theirs: string[];
      try {
        theirs = flatten(dictionaryOf(lang, namespace));
      } catch {
        return;
      }
      const ours = new Set(flatten(dictionaryOf("zh_tw", namespace)));
      theirs.forEach((key) => {
        if (!ours.has(key)) extra.push(`${namespace}.${key}`);
      });
    });

    return extra;
  };

  it.each(OTHERS)("%s 的多餘鍵沒有變多", (lang) => {
    expect(extraKeysOf(lang).length).toBeLessThanOrEqual(
      EXTRA_KEY_BUDGET[lang],
    );
  });

  /**
   * Info: (20260909 - Julian) 棘輪要轉得動，也要**轉不回去**。
   *
   * 少了這一條，上面那個 `<=` 會讓「清掉 10 個死鍵」之後預算仍然停在舊數字，
   * 於是日後再長出 10 個也不會紅 —— 棘輪就變成了一個很寬的門檻。
   * 這一條逼清理的人順手把數字改小。
   */
  it.each(OTHERS)("%s 的預算沒有虛胖（清乾淨了就要調小）", (lang) => {
    expect(extraKeysOf(lang).length).toBe(EXTRA_KEY_BUDGET[lang]);
  });
});
