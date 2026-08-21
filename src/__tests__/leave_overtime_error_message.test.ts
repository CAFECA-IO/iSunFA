import { describe, it, expect } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";
import ts from "typescript";
import { ApiError } from "@/lib/utils/request";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import {
  errorI18nKeyOf,
  SHARED_ATTENDANCE_ERROR_I18N_KEY,
} from "@/lib/utils/attendance_error_message";
import { LEAVE_ERROR_I18N_KEY } from "@/lib/utils/leave_error_message";
import { OVERTIME_ERROR_I18N_KEY } from "@/lib/utils/overtime_error_message";
import { hrManagement as en } from "@/i18n/locales/en/hr_management";
import { hrManagement as ja } from "@/i18n/locales/ja/hr_management";
import { hrManagement as ko } from "@/i18n/locales/ko/hr_management";
import { hrManagement as zhCn } from "@/i18n/locales/zh_cn/hr_management";
import { hrManagement as zhTw } from "@/i18n/locales/zh_tw/hr_management";

/**
 * Info: (20260819 - Julian) 假勤錯誤文案的對照 —— **這兩張表先前零測試**（review B9）。
 *
 * ## 為什麼 i18n 掃描抓不到這個缺口
 *
 * `attendance_i18n_keys.test.ts` 掃的是「`src` 裡出現的 key 字面量在五個語系
 * 都有值」。它抓不到**把對照整筆刪掉**：key 不再出現在 `src` 裡，
 * 掃描器就不再掃它，一切照綠。`attendance_error_message.test.ts:14-20`
 * 已經把這個失效模式寫下來，並實測確認過（拿掉限流那一筆，全套測試沒有反應）——
 * 但那支只守出勤那張表，假單與加班這兩張沒有人守。
 *
 * 症狀是使用者被擋下時看到的是通用的「操作失敗」而不是
 * 「這一季超過 138 小時」——**而那正是他唯一能據以行動的那句話**。
 *
 * ## 為什麼用「碼集合相等」而不是逐筆檢查
 *
 * 逐筆檢查只保證「登記的這幾筆是對的」，不保證「該登記的都登記了」。
 * 集合相等的話，刪掉一筆或多加一筆都會紅；多加一筆時 i18n 掃描接手驗它的字典。
 */

const DICTIONARIES: Record<string, Record<string, unknown>> = {
  en,
  ja,
  ko,
  zh_cn: zhCn,
  zh_tw: zhTw,
};

/** Info: (20260819 - Julian) `hr_management.leave.error_x` → 在該語系字典裡取值 */
const lookup = (
  dictionary: Record<string, unknown>,
  key: string,
): unknown => {
  const path = key.replace(/^hr_management\./, "").split(".");
  let cursor: unknown = dictionary;
  for (const segment of path) {
    if (typeof cursor !== "object" || cursor === null) return undefined;
    cursor = (cursor as Record<string, unknown>)[segment];
  }
  return cursor;
};

/**
 * Info: (20260819 - Julian) 這兩張表**必須**登記的碼。
 *
 * 寫死一份名單而不是從對照表自己算 —— 從被測物推導期望值，等於問它
 * 「你等於你自己嗎」（checklist §1.9）。刪掉任何一筆，下面的集合相等就會紅。
 *
 * Info: (20260820 - Julian) 但這份名單當初是**照著對照表抄下來的**（review 第 4 輪第 5 條）。
 *
 * 抄下來的期望值只換了一個放置地點，沒有換來源 —— 它擋得住「日後有人刪掉
 * 某一筆」，擋不住「當初就漏登記」，而後者正是這張表最可能出錯的方向。
 * 症狀完全一樣：使用者被擋下時看到的是通用的「操作失敗」，
 * 而不是「這一季超過 138 小時」。
 *
 * 因此下面多了一組 `describe`：**從 service 實際會丟的碼推導**期望的覆蓋，
 * 用 TypeScript AST 掃 `API_ERRORS.X`。那一組的來源是**產品程式碼**，
 * 與這份名單完全獨立 —— 兩者都在，才同時擋得住「刪一筆」與「漏一筆」。
 */
const EXPECTED_LEAVE_CODES: readonly string[] = [
  API_ERRORS.VA_LEAVE_INSUFFICIENT_BALANCE.code,
  API_ERRORS.VA_LEAVE_UNIT_NOT_ALIGNED.code,
  API_ERRORS.VA_LEAVE_ON_NON_WORKING_DAY.code,
  API_ERRORS.CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED.code,
  API_ERRORS.CF_LEAVE_DAY_ALREADY_ACTIVE.code,
  API_ERRORS.CF_LEAVE_CONCURRENCY_EXCEEDED.code,
  API_ERRORS.VA_LEAVE_CONCURRENCY_RULE_INVALID.code,
  API_ERRORS.NF_LEAVE_POLICY.code,
  API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
  API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code,
  API_ERRORS.VA_LEAVE_ALREADY_REVIEWED.code,
  API_ERRORS.CF_LEAVE_BALANCE_RACE.code,
  API_ERRORS.FO_LEAVE_REQUEST_SCOPE.code,
  API_ERRORS.NF_LEAVE_REQUEST.code,
];

const EXPECTED_OVERTIME_CODES: readonly string[] = [
  API_ERRORS.VA_OVERTIME_FILING_TYPE_MISMATCH.code,
  API_ERRORS.FO_OVERTIME_ON_REGULAR_OFF.code,
  API_ERRORS.VA_OVERTIME_DAY_NOT_SCHEDULED.code,
  API_ERRORS.VA_OVERTIME_PREMIUM_UNDEFINED.code,
  API_ERRORS.VA_OVERTIME_EXCEEDS_DAILY_LIMIT.code,
  API_ERRORS.VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT.code,
  API_ERRORS.VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT.code,
  API_ERRORS.VA_OVERTIME_ALREADY_REVIEWED.code,
  API_ERRORS.VA_OVERTIME_RECLASSIFIED_MIDWAY.code,
  API_ERRORS.VA_OVERTIME_EMERGENCY_REVOKED_MIDWAY.code,
  API_ERRORS.VA_OVERTIME_DAY_LENGTH_UNKNOWN.code,
  API_ERRORS.VA_OVERTIME_OVERLAPS_EXISTING.code,
  API_ERRORS.VA_OVERTIME_EARLIER_THAN_APPROVED.code,
  API_ERRORS.VA_OVERTIME_NOT_APPROVED.code,
  API_ERRORS.VA_OVERTIME_APPROVAL_NOT_REVERSIBLE.code,
  API_ERRORS.VA_OVERTIME_AGREEMENT_RECORD_REQUIRED.code,
  API_ERRORS.VA_OVERTIME_EMERGENCY_ALREADY_DECLARED.code,
  API_ERRORS.VA_OVERTIME_EMERGENCY_NOT_DECLARED.code,
  API_ERRORS.VA_OVERTIME_REPORTED_AT_OUT_OF_RANGE.code,
  /**
   * Info: (20260820 - Julian) 這三個碼由加班的 service 丟出，因此**兩張表都要有**
   * （review 第 10 輪第 2 條）。同一個碼在兩個模組說的是不同的話。
   */
  API_ERRORS.FO_SELF_APPROVAL_FORBIDDEN.code,
  API_ERRORS.FO_NOT_AUTHORIZED_REVIEWER.code,
  API_ERRORS.NF_LEAVE_POLICY.code,
  API_ERRORS.VA_OVERTIME_COMP_EXPIRY_UNSET.code,
  API_ERRORS.FO_OVERTIME_NOT_APPLICANT.code,
  API_ERRORS.VA_OVERTIME_WITHDRAW_REASON_REQUIRED.code,
  API_ERRORS.NF_OVERTIME_REQUEST.code,
];

const TABLES: readonly [string, Readonly<Record<string, string>>, readonly string[]][] = [
  ["假單", LEAVE_ERROR_I18N_KEY, EXPECTED_LEAVE_CODES],
  ["加班", OVERTIME_ERROR_I18N_KEY, EXPECTED_OVERTIME_CODES],
];

describe.each(TABLES)("%s 錯誤對照表", (_label, table, expected) => {
  it("登記的碼與名單完全相同（刪一筆或多一筆都會紅）", () => {
    expect(Object.keys(table).sort()).toEqual([...expected].sort());
  });

  it("每一個碼都真的存在於錯誤字典裡", () => {
    const known = new Set(
      Object.values(API_ERRORS).map((entry) => entry.code),
    );
    for (const code of Object.keys(table)) expect(known.has(code)).toBe(true);
  });

  it("每一個 i18n key 在五個語系都有字串", () => {
    for (const [code, key] of Object.entries(table)) {
      for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
        const value = lookup(dictionary, key);
        expect(
          typeof value === "string" && value.trim().length > 0,
        ).toBe(true);
        if (typeof value !== "string") {
          throw new Error(`${locale} 缺 ${key}（碼 ${code}）`);
        }
      }
    }
  });

  /**
   * Info: (20260819 - Julian) 兩個碼不得對到同一句話。
   *
   * 「這一季超過 138 小時」與「今天超過 12 小時」的下一步不同：前者要等下一季、
   * 後者只要縮短今天的時數。指到同一個 key 等於把診斷資訊丟掉，
   * 而畫面上看起來完全正常。
   */
  it("沒有兩個碼共用同一個 key", () => {
    const keys = Object.values(table);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

/**
 * Info: (20260819 - Julian) 對照表要**真的被 `errorI18nKeyOf` 用到**。
 *
 * 上面三條驗的是表的內容；這一條驗的是它有沒有被接上去 —— 同 review B9
 * 對限流的觀察：「改的是那支函式，不是它有沒有被接上去」。
 */
describe("errorI18nKeyOf 真的會查這兩張表", () => {
  const apiErrorWith = (code: string): ApiError =>
    new ApiError("developer-facing", 400, { errorCode: code });

  it.each(TABLES)("%s：查得到就回登記的 key", (_label, table) => {
    const [code, key] = Object.entries(table)[0];
    expect(errorI18nKeyOf(apiErrorWith(code), "fallback.key", table)).toBe(key);
  });

  it("查不到的碼落到 fallback，而不是回空字串或碼本身", () => {
    expect(
      errorI18nKeyOf(
        apiErrorWith("ZZ999999"),
        "hr_management.overtime.error_decide",
        OVERTIME_ERROR_I18N_KEY,
      ),
    ).toBe("hr_management.overtime.error_decide");
  });

  /**
   * Info: (20260819 - Julian) 限流（429）與主管閘（403）由共用表接住，
   * 兩張模組表刻意不重複登記。這一條把那個分工寫下來 ——
   * 有人日後在這裡補一筆限流，共用表那一筆就會變成死碼。
   */
  it("限流不在模組表裡（由共用表接住）", () => {
    expect(LEAVE_ERROR_I18N_KEY[API_ERRORS.IS_RATE_LIMITED.code]).toBeUndefined();
    expect(
      OVERTIME_ERROR_I18N_KEY[API_ERRORS.IS_RATE_LIMITED.code],
    ).toBeUndefined();
    expect(
      errorI18nKeyOf(
        apiErrorWith(API_ERRORS.IS_RATE_LIMITED.code),
        "fallback.key",
        OVERTIME_ERROR_I18N_KEY,
      ),
    ).not.toBe("fallback.key");
  });
});

/**
 * Info: (20260820 - Julian) **覆蓋**：service 丟得出來的碼，畫面都要說得出話（review 第 4 輪第 5 條）。
 *
 * ## 為什麼上面那組不夠
 *
 * 上面驗的是「對照表 == 一份手抄名單」。名單是照著表抄的，於是任何**當初
 * 就沒登記**的碼在兩邊同時缺席 —— 缺口被凍結成「正確」。
 * 那是 checklist §1.9 的同一個形狀，只是多繞了一層。
 *
 * ## 判準的來源改成產品程式碼
 *
 * 掃 leave / overtime 的 service 檔，把出現過的 `API_ERRORS.X` 全部撈出來，
 * 要求每一個都落在三張表之一（假單、加班、全模組共用），
 * 否則必須列進下面的豁免名單並寫明理由。
 *
 * 豁免必須**逐筆具名**而不是用前綴略過：`VA_INVALID_INPUT_DATA` 該豁免、
 * `VA_LEAVE_ON_NON_WORKING_DAY` 不該，而它們的前綴一樣。
 */
/**
 * Info: (20260820 - Julian) **問題要問對**（review 第 10 輪第 2 條）。
 *
 * 第一版把三張表取**聯集**再問「這個碼在裡面嗎」。那個觀測量答的是
 * 「系統的某個角落有沒有這句話」，而使用者的問題是
 * **「丟它的那支 service 所在的畫面查得到嗎」** —— 兩者不是同一件事，
 * 於是它放過了三個碼：`FO_SELF_APPROVAL_FORBIDDEN`、
 * `FO_NOT_AUTHORIZED_REVIEWER`、`NF_LEAVE_POLICY` 由**加班的** service 丟出，
 * 卻只登記在**假單**那張表。
 *
 * 最清楚的症狀：人資對自己的加班單按下「登記天災事變」，
 * 落到 fallback「請確認你具備人資管理員職能且此單仍待簽核」——
 * 而他確實有職能、單子也確實待簽核。checklist §1.9：
 * 觀測量與要回答的問題必須是同一個。
 *
 * 因此改成**逐模組**：每一支 service 檔綁定它的畫面所用的那一張表。
 */
const SERVICE_TABLES: readonly {
  label: string;
  files: readonly string[];
  table: Readonly<Record<string, string>>;
}[] = [
  {
    label: "假單",
    files: [
      "src/services/leave_request.service.ts",
      "src/services/leave_balance.service.ts",
      "src/services/leave.service.ts",
      "src/services/leave_visibility.ts",
      "src/services/leave_policy.service.ts",
      "src/services/leave_approval_rule.service.ts",
    ],
    table: LEAVE_ERROR_I18N_KEY,
  },
  {
    label: "加班",
    files: [
      "src/services/overtime_request.service.ts",
      "src/services/overtime_policy.service.ts",
      "src/services/overtime_visibility.ts",
      "src/services/overtime_report.service.ts",
    ],
    table: OVERTIME_ERROR_I18N_KEY,
  },
];

const LEAVE_OVERTIME_SERVICES: readonly string[] = SERVICE_TABLES.flatMap(
  (group) => group.files,
);

/**
 * Info: (20260820 - Julian) 刻意不登記在假勤對照表裡的碼，逐筆說明。
 *
 * 這份名單存在的意義是**逼出理由**：把一個碼加進來要寫一句話說服自己，
 * 而「因為它現在沒有文案」不是一句說得過去的話。
 */
const EXEMPT: Readonly<Record<string, string>> = {
  // Info: (20260820 - Julian) 通用的輸入格式錯誤。畫面上的下一步就是「重打一次」，不需要專屬文案
  VA_INVALID_INPUT_DATA: "格式錯誤，通用文案已足夠",
  // Info: (20260820 - Julian) 500。使用者做不了任何事，且訊息不該洩漏底層原因
  IS_DB_FAILED: "伺服器端故障，不是使用者能處置的事",
  // Info: (20260820 - Julian) 限流、主管閘、職能閘、可見範圍閘、身分解析都在全模組共用表
  IS_RATE_LIMITED: "全模組共用表已登記",
  FO_ATTENDANCE_SUPERVISOR_ONLY: "全模組共用表已登記",
  /**
   * Info: (20260820 - Julian) 這三個在 2026-08-20 之前被錯誤地歸成
   * 「屬人事設定畫面」而略過（review 第 5 輪第 3 條）。
   *
   * 推論錯在哪：`FO_HR_FUNCTION_REQUIRED` 的觸發按鈕就在**已經存在**的
   * 加班待簽清單上（§32 IV 認定），而不是在還沒做的人事設定畫面。
   * 沒有 HR 職能的人按下去會落到 fallback「認定失敗」——
   * 他需要知道的是「這個動作要人事職能」。
   *
   * 現在三個都登記在 `SHARED_ATTENDANCE_ERROR_I18N_KEY`，
   * 因此下面的覆蓋檢查會直接通過，不再需要豁免 —— 留在這裡的是
   * 為什麼它們不在假單／加班那兩張表裡。
   */
  FO_HR_FUNCTION_REQUIRED: "全模組共用表已登記（跨四個模組的職能閘）",
  FO_NO_PERMISSION_TO_VIEW_THIS: "全模組共用表已登記（跨模組的可見範圍閘）",
  NF_EMPLOYEE_FOR_USER: "全模組共用表已登記（每一支端點的第一道門）",
  /**
   * Info: (20260820 - Julian) 以下這幾個的呼叫端是**簽到模組**的畫面。
   *
   * 誠實一點：那些畫面目前**沒有**自己的錯誤對照表
   * （`schedule_page_body.tsx` 呼叫 `errorI18nKeyOf` 時不帶 overrides），
   * 所以它們今天同樣落到通用訊息。那是簽到模組的缺口，不是假勤的 ——
   * 列在這裡是為了不把它假裝成「已經有人管」。
   * ToDo: (20260820 - Julian) 簽到模組補一張 `ATTENDANCE_ERROR_I18N_KEY`。
   */
  NF_EMPLOYEE: "簽到／人事設定畫面的錯誤；該模組尚無對照表（見上方 ToDo）",
  NF_SHIFT_PATTERN: "排班設定畫面的錯誤；同上",
  CF_SCHEDULE_DAY_CONFLICT: "排班設定畫面的錯誤；同上",
  /**
   * Info: (20260820 - Julian) 這一個已經移出上面那組（review 第 7 輪 M26）。
   *
   * 上面那段「簽到模組的缺口，不是假勤的」對它**不成立**：加班的
   * `listUnapproved` 也會丟它，而那是本模組的畫面
   * （簽核頁的「未核准時段」日期選擇器）。它現在登記在
   * `SHARED_ATTENDANCE_ERROR_I18N_KEY` —— 與 `NF_EMPLOYEE_FOR_USER`
   * 同一張表、同一個理由：跨模組、同一個判準在三個地方各擋一次。
   */
  VA_ATTENDANCE_RANGE_TOO_LARGE: "全模組共用表已登記（三個模組共用同一個區間上限）",
};

/**
 * Info: (20260820 - Julian) **端點還沒有畫面**的碼（review 第 4 輪第 5 條）。
 *
 * 這 17 個碼是新的覆蓋檢查第一次跑出來的東西 —— 它們先前同時缺席於
 * 對照表與那份手抄名單，於是缺口被凍結成「正確」。
 *
 * 為什麼不現在就補文案：它們的端點**全部沒有畫面**（假別設定、簽核規則設定、
 * 額度調整、銷假四組都只有 API）。替一個還沒設計出來的畫面寫五個語系的
 * 使用者文案，寫出來的東西沒有人驗得了對不對 —— 那正是這個 review 系列
 * 反覆在抓的「看起來像有記載」。
 *
 * ## 這個豁免怎麼自己失效
 *
 * 每一筆對應一個**還不存在的** API 常數名。`src/constants/leave_api.ts` 的
 * 註解自己立了規矩：「帶路徑參數的端點寫成函式，避免呼叫端自己接字串」——
 * 因此畫面一旦要呼叫那個端點，那個常數就會出現，而下面的
 * 「畫面出現時豁免要失效」那一條會當場變紅，並指名是哪幾個碼該補文案。
 *
 * 這道機制**擋不住**「有人不照規矩、在畫面裡直接接字串」。那時它會靜默失效，
 * 而這句話就是它的說明書 —— 一個沒有寫下限制的守衛，讀的人會以為它守得更多。
 *
 * ToDo: (20260820 - Julian) 四組畫面各自落地時，把對應的碼從這裡搬到
 * `LEAVE_ERROR_I18N_KEY` 並補五個語系。
 */
const PENDING_SCREEN: Readonly<Record<string, string>> = {
  // Info: (20260820 - Julian) 假別設定（L2–L6）
  CF_LEAVE_POLICY_CODE_TAKEN: "leavePolicyApi",
  VA_LEAVE_POLICY_LOCKED_FIELD: "leavePolicyApi",
  VA_LEAVE_POLICY_MERGE_CYCLE: "leavePolicyApi",
  VA_LEAVE_TIER_TABLE_INVALID: "leavePolicyApi",
  VA_LEAVE_TIER_NOT_APPLICABLE: "leavePolicyApi",
  // Info: (20260820 - Julian) 簽核規則設定
  VA_LEAVE_APPROVAL_RULE_INVALID: "leaveApprovalRuleApi",
  VA_LEAVE_GENERAL_RULE_REQUIRED: "leaveApprovalRuleApi",
  // Info: (20260820 - Julian) 額度調整與授予（L9 / L33）
  NF_LEAVE_GRANT: "leaveBalanceAdjustApi",
  VA_LEAVE_NO_SHIFT_FOR_ACCRUAL: "leaveBalanceAccrueApi",
  // Info: (20260820 - Julian) 銷假（畫面目前只顯示 recalledAt，沒有發起銷假的動作）
  CF_LEAVE_RECALL_ANSWERED: "leaveRecallApi",
  CF_LEAVE_RECALL_PENDING: "leaveRecallApi",
  FO_LEAVE_RECALL_NOT_OWNER: "leaveRecallApi",
  FO_LEAVE_RECALL_SCOPE: "leaveRecallApi",
  NF_LEAVE_RECALL: "leaveRecallApi",
  NF_LEAVE_DAY: "leaveRecallApi",
  VA_LEAVE_NOT_RECALLABLE: "leaveRecallApi",
  VA_LEAVE_RECALL_PAST: "leaveRecallApi",
};

describe("覆蓋：service 丟得出來的碼都要有文案", () => {
  const thrownCodes = (
    files: readonly string[] = LEAVE_OVERTIME_SERVICES,
  ): Set<string> => {
    const found = new Set<string>();
    for (const relative of files) {
      const full = join(process.cwd(), relative);
      const source = ts.createSourceFile(
        full,
        readFileSync(full, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node): void => {
        if (
          ts.isPropertyAccessExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "API_ERRORS"
        ) {
          found.add(node.name.text);
        }
        ts.forEachChild(node, visit);
      };
      ts.forEachChild(source, visit);
    }
    return found;
  };

  /**
   * Info: (20260820 - Julian) 掃描根確實掃到東西 —— 一支掃到零個碼的測試
   * 永遠是綠的，而它綠的時候看起來與真的覆蓋了一模一樣
   * （同 `leave_policy_no_code_branching.test.ts` 的那一條）。
   */
  it("掃描根確實掃到 service 丟出來的碼", () => {
    const codes = thrownCodes();
    expect(codes.size).toBeGreaterThan(30);
    expect(codes.has("VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT")).toBe(true);
    expect(codes.has("VA_LEAVE_INSUFFICIENT_BALANCE")).toBe(true);
  });

  /**
   * Info: (20260820 - Julian) 逐模組問：**那一支 service 的畫面**查得到嗎。
   *
   * 全模組共用表（限流、職能閘、可見範圍閘）算數 —— 它是每一頁都會查的
   * 第二順位。假單那張表**不算**加班的覆蓋，反之亦然。
   */
  it.each(SERVICE_TABLES.map((group) => [group.label, group] as const))(
    "%s：service 丟得出來的碼，該模組的畫面都查得到",
    (_label, group) => {
      const registered = new Set<string>([
        ...Object.keys(group.table),
        ...Object.keys(SHARED_ATTENDANCE_ERROR_I18N_KEY),
      ]);

      const uncovered = [...thrownCodes(group.files)]
        .filter((name) => !(name in EXEMPT) && !(name in PENDING_SCREEN))
        .filter((name) => {
          const def = (
            API_ERRORS as Record<string, { code: string } | undefined>
          )[name];
          return def !== undefined && !registered.has(def.code);
        })
        .sort();

      expect(uncovered).toEqual([]);
    },
  );

  /**
   * Info: (20260820 - Julian) 豁免名單不得腐爛：列了一個 service 根本不丟的碼，
   * 代表它被刪掉了或改名了，而豁免會安靜地留著替下一個同名的碼開門。
   */
  it("豁免名單裡的每一個碼都真的還在被丟", () => {
    const thrown = thrownCodes();
    const stale = [...Object.keys(EXEMPT), ...Object.keys(PENDING_SCREEN)]
      .filter((name) => name !== "IS_RATE_LIMITED")
      .filter((name) => !thrown.has(name))
      .sort();
    expect(stale).toEqual([]);
  });

  /**
   * Info: (20260820 - Julian) 畫面出現時，豁免要**當場失效**。
   *
   * 判準是那個端點的 API 常數有沒有出現在 `src/constants/leave_api.ts` ——
   * 那個檔案自己立了「端點寫成常數／函式，不讓呼叫端接字串」的規矩，
   * 因此畫面要呼叫它就得先加常數。加了，這條就紅，並指名該補哪幾個碼。
   *
   * 訊息裡帶上碼與常數名，是因為紅的時候看到的人多半不是寫下這份豁免的人。
   */
  it("豁免所依賴的「端點還沒有畫面」仍然成立", () => {
    const apiConstants = readFileSync(
      join(process.cwd(), "src", "constants", "leave_api.ts"),
      "utf8",
    );
    const nowReachable = Object.entries(PENDING_SCREEN)
      .filter(([, apiName]) => apiConstants.includes(apiName))
      .map(([code, apiName]) => `${code}（${apiName} 已存在，請補文案）`)
      .sort();
    expect(nowReachable).toEqual([]);
  });
});
