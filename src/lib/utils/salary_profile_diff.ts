import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";

/**
 * Info: (20260908 - Julian) 員工檔的完整快照 —— 異動紀錄前後值的形狀。
 *
 * 從 `ISalaryCalculatorEmployee` 減出來，而不是自己列一遍欄位：
 * 新增一個員工檔欄位時，快照會**自動**包含它，而 §1 的分類表
 * （`SALARY_PROFILE_FIELD_VISIBILITY`）會因為少一個 key 而編譯失敗。
 * 自己列一遍的話，新欄位會靜靜地不被記錄 —— 而那是拿不回來的資料。
 *
 * ## 減掉的兩個，理由不同
 *
 * - `id`：快照是「這個人當時是什麼樣子」，不是「這是誰」。
 *   員工是誰由異動列自己的 `employeeId` 說。
 * - `missingPeriods`（20260909 併入 #6774 時加的）：**它不是員工檔上的資料，
 *   是每次查詢當場算出來的**（見 `ISalaryCalculatorEmployee` 的註解）。
 *   記進快照會有兩個後果：一是它會被算成一次「異動」——
 *   而使用者從頭到尾沒改任何東西，只是有人補了一張薪資單；
 *   二是這一組欄位不再全部是純量，`diffProfileSnapshot` 的 `!==`
 *   對陣列永遠成立，於是**每一次寫入都會產生一列假的異動紀錄**。
 *   （Prisma 那一側也擋：Json 欄位的輸入型別吃不下 `ISalaryPeriod[]`。）
 *
 * 判準因此是：**存在資料庫那一列上的欄位才進快照，衍生出來的不進。**
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md`
 */
export type ISalaryEmployeeProfileSnapshot = Omit<
  ISalaryCalculatorEmployee,
  "id" | "missingPeriods"
>;

export type SalaryProfileField = keyof ISalaryEmployeeProfileSnapshot;

export type SalaryProfileValue = string | number | boolean | null;

export interface ISalaryProfileFieldChange {
  field: SalaryProfileField;
  before: SalaryProfileValue;
  after: SalaryProfileValue;
}

/**
 * Info: (20260908 - Julian) 每一個欄位在「調薪歷程」畫面上預設看不看得到。
 *
 * ## 為什麼是「全部記錄，只在顯示時篩選」
 *
 * 反過來（寫入時就篩掉不算薪資的欄位）省下來的是位元組，
 * 賠掉的是**拿不回來的資料** —— 日後有人問「這個人的到職日被誰改過」，
 * 沒記就是沒有。所以差異一律算全部欄位、一律寫進快照，
 * 這張表只決定**預設**顯示哪些。
 *
 * ## 分類的判準
 *
 * `true`＝直接影響應領或應扣金額，或勞檢會問的東西（投保與否是勞檢重點）。
 * `false`＝更正性質、或不影響金額的設定。**不是「不重要」，是「預設不吵」**——
 * 使用者仍然可以在畫面上把它們打開。
 *
 * ## 這張表為什麼不能有遺漏
 *
 * 型別是 `Record<SalaryProfileField, boolean>` —— 少一個 key 就編譯失敗。
 * 這是刻意的：新增一個員工檔欄位時，「它算不算薪資異動」必須是一個
 * **被迫回答**的問題，而不是一個可以忘記的問題。
 * `salary_profile_diff.test.ts` 另外釘住「兩類都不是空的」。
 */
export const SALARY_PROFILE_FIELD_VISIBILITY: Record<
  SalaryProfileField,
  boolean
> = {
  // Info: (20260908 - Julian) 薪資本體
  baseSalary: true,
  mealAllowance: true,
  otherAllowanceTaxable: true,
  otherAllowanceTaxFree: true,

  // Info: (20260908 - Julian) 影響應領／應扣的參數
  isLaborInsured: true,
  isHealthInsured: true,
  isPensionInsured: true,
  dependentsCount: true,
  voluntaryPensionRate: true,
  employmentType: true,
  // Info: (20260908 - Julian) 稅務居住狀況決定扣繳率，是金額的一部分
  isForeignWorker: true,

  // Info: (20260908 - Julian) 期間：決定當月比例計算，也是勞檢的第一個問題
  hireDate: true,
  resignDate: true,

  /**
   * Info: (20260909 - Julian) 留職停薪的起訖（#6774 併入時分類）。**預設顯示。**
   *
   * 它與到職／離職日同一類：決定這幾個月**該不該有薪資單**，
   * 而那正是勞檢會問的第二個問題（「這幾個月為什麼沒有投保紀錄」）。
   * 它也是唯一會讓「缺薪資單」變成合理狀態的欄位 ——
   * 一段被悄悄改掉的留停區間，會讓已經解釋過的缺漏重新變成問題，
   * 或反過來把真的缺漏藏起來。
   */
  leaveStartDate: true,
  leaveEndDate: true,

  /**
   * Info: (20260908 - Julian) 以下預設隱藏 —— 記錄但不吵。
   *
   * `name` / `number` 的變動絕大多數是打錯字的更正；`email` 是薪資單的收件地址
   * （寄送本身另有 `SalaryPaySlipDelivery` 記錄實際收件人）；
   * `industryCode` 與 `baseSalary30Days` 是計算設定，改動頻率極低。
   */
  name: false,
  number: false,
  email: false,
  industryCode: false,
  baseSalary30Days: false,
};

export const SALARY_PROFILE_FIELDS = Object.keys(
  SALARY_PROFILE_FIELD_VISIBILITY,
) as SalaryProfileField[];

export const isDefaultVisibleProfileField = (
  field: SalaryProfileField,
): boolean => SALARY_PROFILE_FIELD_VISIBILITY[field];

/**
 * Info: (20260908 - Julian) 兩份快照的逐欄差異。**這是異動紀錄的唯一判準。**
 *
 * ## 為什麼走 `SALARY_PROFILE_FIELDS` 而不是 `Object.keys(before)`
 *
 * 從資料裡取 key，會讓「快照少了一欄」變成「那一欄沒有變動」——
 * 而快照是 Json，型別檢查不到它。走常數清單的話，
 * 少的那一欄會被讀成 `undefined`，與實際值不同，於是**顯示成一筆變動**。
 * 兩種錯法都不理想，但「多報一筆」看得見，「少報一筆」看不見。
 *
 * ## 為什麼用 `!==` 而不是深比較
 *
 * 這一組欄位全部是純量（number / boolean / string / null）——
 * `ISalaryEmployeeProfileSnapshot` 的型別保證了這件事，而它之所以保證得了，
 * 是因為衍生欄位（如 `missingPeriods` 那個陣列）已經在型別那一層被減掉。
 * 引入深比較只會讓「哪天有人塞了一個物件進來」從編譯錯誤變成執行期行為。
 *
 * `null` 與 `0` 在這裡必須分得開：`resignDate: null`（還在職）
 * 與 `resignDate: 0`（1970-01-01 離職）是不同的事實。`!==` 分得開，
 * 而任何形式的 falsy 比較都分不開。
 */
export function diffProfileSnapshot(
  before: ISalaryEmployeeProfileSnapshot,
  after: ISalaryEmployeeProfileSnapshot,
): ISalaryProfileFieldChange[] {
  return SALARY_PROFILE_FIELDS.filter(
    (field) => before[field] !== after[field],
  ).map((field) => ({
    field,
    before: before[field] as SalaryProfileValue,
    after: after[field] as SalaryProfileValue,
  }));
}

/**
 * Info: (20260908 - Julian) 只要欄位名，給 `changedFields` 用。
 *
 * `changedFields` 是**衍生資料**（Json 快照才是真相），存它只為了讓
 * 「只看本薪的變動、翻三年」不必全表掃描。因此它必須由這一支算出來，
 * 不得由呼叫端自己組 —— 兩份實作就是兩種答案。
 * 一致性由 `salary_profile_diff.test.ts` 釘住。
 */
export function changedFieldsOf(
  before: ISalaryEmployeeProfileSnapshot,
  after: ISalaryEmployeeProfileSnapshot,
): string[] {
  return diffProfileSnapshot(before, after).map((change) => change.field);
}

/**
 * Info: (20260908 - Julian) 一列異動紀錄 → 逐欄的前後值（讀取端用）。
 *
 * 三種動作的形狀不同，而**差別不是「有沒有 diff」而是「diff 的意義」**：
 *
 * - `CREATE`：每一欄都是從無到有。列出全部欄位、`before` 為 null ——
 *   那是這個人的起點，而稽核要看得到起點的值。
 * - `UPDATE`：兩份快照的差異。
 * - `DELETE`：空陣列。移除不是某個欄位的變動，它由 `action` 表達；
 *   硬要列出「每一欄都變成 null」會讓畫面顯示 18 筆假的變動。
 *
 * `action` 收字串而不是 Prisma 的 enum：這個模組是純函式、不該依賴生成的
 * client（測試在 node 環境跑，多一個依賴就多一個要 mock 的東西）。
 */
export function profileChangesFor(
  action: string,
  before: ISalaryEmployeeProfileSnapshot | null,
  after: ISalaryEmployeeProfileSnapshot | null,
): ISalaryProfileFieldChange[] {
  if (action === "DELETE" || after === null) return [];

  if (before === null) {
    return SALARY_PROFILE_FIELDS.map((field) => ({
      field,
      before: null,
      after: after[field] as SalaryProfileValue,
    }));
  }

  return diffProfileSnapshot(before, after);
}
