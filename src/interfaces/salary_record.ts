import type { ISalaryPeriod } from "@/lib/utils/salary_coverage";
import {
  ISalaryCalculatorOptions,
  ISalaryCalculatorUI,
} from "@/interfaces/salary_calculator";

/**
 * Info: (20260831 - Julian) 薪資計算機的員工名單與薪資紀錄（前端格式）。
 *
 * 與 Prisma model 的兩處差異，沿用 `IVoucher` 的既有慣例：
 * 金額的 `BigInt` 在這裡是 `number`（薪資是整數元，轉換在 repository），
 * 時間戳的 `DateTime` 在這裡是 Unix 秒。
 */

/**
 * Info: (20260902 - Julian) 員工檔上「選了人就自動匯入計算機」的那一組常態屬性。
 *
 * ## 為什麼要單獨一個型別
 *
 * 這一組會同時出現在四條路徑上：載入（員工 → 計算機）、回寫（計算機 → 員工）、
 * 差異偵測（儲存前問一句）、以及新增員工時要帶的初值。
 * 各自列一次欄位的話，新增一欄就有四個地方要記得改，而漏掉的那一邊是靜默的
 * —— 例如「直接新增員工」少帶一欄，那個人的檔上就是預設值，
 * 下個月選他反而把畫面洗掉。抽成一個型別，四邊會一起編譯失敗。
 *
 * ## 這裡放什麼、不放什麼
 *
 * 只放「這個人一直都是這樣」的東西。**當月變動一律不進來** ——
 * 加班時數、請假時數、健保補收、二代健保、其他溢扣共 16 欄留在薪資紀錄的快照裡。
 * 完整分類表在 `documents/architecture/salary_employee_profile_plan.md` §1，
 * 而 `salary_employee_profile.test.ts` 拿那張表與這個型別對拍。
 */
export interface ISalaryEmployeeProfile {
  baseSalary: number;
  mealAllowance: number;

  // Info: (20260902 - Julian) 固定職務加給（產品決策 20260902）；當月獎金不走這裡
  otherAllowanceTaxable: number;
  otherAllowanceTaxFree: number;

  // Info: (20260902 - Julian) 引擎的 `job`
  industryCode: number;
  // Info: (20260902 - Julian) 引擎的 `foreignWorker`；UI 那一側是 TaxResidencyStatus 列舉
  isForeignWorker: boolean;
  // Info: (20260902 - Julian) `EmploymentType` 的**鍵**（"FULL_TIME" / "PART_TIME"），不是顯示字串
  employmentType: string;
  // Info: (20260902 - Julian) 引擎的 `baseSalary30Days`；UI 那一側是「固定 30 天／實際天數」
  baseSalary30Days: boolean;

  isLaborInsured: boolean;
  isHealthInsured: boolean;
  isPensionInsured: boolean;
  dependentsCount: number;

  /**
   * Info: (20260902 - Julian) 自提勞退**費率的百分點**（0–6），不是金額也不是 0.06 那個小數。
   * 轉換一律走 `lib/utils/salary_pension_rate.ts`，理由見該檔與 schema 註解。
   */
  voluntaryPensionRate: number;

  /**
   * Info: (20260902 - Julian) 到職／離職日，Unix 秒，**完整日期**不是「當月第幾號」。
   * 計算機那兩個欄位（`isJoined` + `dayOfJoining`）由 `deriveJoinLeave` 依選定年月推導。
   */
  hireDate: number | null;
  resignDate: number | null;
}

/**
 * Info: (20260905 - Luphia) 留職停薪的起訖，Unix 秒（#6774）。
 *
 * ## 為什麼不併進 `ISalaryEmployeeProfile`
 *
 * 那個介面有一條明確的界線：「選了員工就自動匯入計算機」的那 15 欄，
 * 而 `salary_employee_profile.test.ts` 拿它與 `ISalaryCalculatorFormState`
 * 的鍵對拍 —— 計算機沒有留職停薪這兩格，併進去會直接紅。
 *
 * 界線本身也對：留職停薪不是「這個月薪水怎麼算」的輸入，
 * 它回答的是**這個月該不該有薪資單**。同一份事實的另一種用途。
 *
 * ## 為什麼是日期區間而不是一個「留停中」的狀態欄
 *
 * 狀態欄答得出「他現在在留停嗎」，答不出「他八月在留停嗎」——
 * 而完整度警示問的正是後者。復職之後狀態欄會被改回在職，
 * 那幾個月就會重新變成缺漏。
 *
 * **已知限制**：一個人只存得下一段留停。二度留停會覆蓋前一段，
 * 而被覆蓋的那幾個月會重新被算成缺漏（誤報，但不是靜默的錯）。
 * 要支援多段就得另開一張表，等真的有人二度留停再說。
 */
export interface ISalaryEmployeeLeave {
  leaveStartDate: number | null;
  // Info: (20260905 - Luphia) null = 還沒復職（不是「沒有留停」——那是 start 為 null）
  leaveEndDate: number | null;
}

// Info: (20260831 - Julian) 輕量員工。id 是 uuid
export interface ISalaryCalculatorEmployee
  extends ISalaryEmployeeProfile, ISalaryEmployeeLeave {
  id: string;
  name: string;
  number: string;
  email: string;
  /**
   * Info: (20260905 - Luphia) 缺少薪資紀錄的月份，由舊到新（#6774）。
   *
   * **由伺服器算**，不是前端拿名單與紀錄自己對 —— 那需要前端先把整本帳的
   * 薪資紀錄全部撈下來，而它今天只拿得到當前分頁的那一批。
   *
   * 空陣列有兩種意思：真的完整，或**算不出來**（沒有到職日、超過掃描上限）。
   * 兩者對畫面的處置相同（不標示），所以不分開 —— 而「算不出來」時
   * 不標示是刻意的：不知道就不要說。
   */
  missingPeriods: ISalaryPeriod[];
}

/**
 * Info: (20260831 - Julian) 新增／編輯員工的輸入。
 *
 * `number` 是身分（帳本內唯一），因此必填；`email` 只在寄薪資單時才需要，可省略。
 *
 * Info: (20260902 - Julian) 常態屬性整組必填 —— 少一欄就會落到 schema 的 `@default`，
 * 而那是靜默的：使用者在計算機設好 14 個欄位、按「直接新增員工」，
 * 建出來的檔卻是預設值，下個月選他就把設定洗掉。要「不改這一欄」的呼叫端
 * 應該把讀到的現值原樣帶回來，而不是省略它。
 */
export interface ISalaryCalculatorEmployeeWriteInput
  extends ISalaryEmployeeProfile, ISalaryEmployeeLeave {
  name: string;
  number: string;
  email?: string;
}

/**
 * Info: (20260831 - Julian) 薪資紀錄的列表項目，**不含快照**。
 *
 * 快照兩個加起來近 70 個欄位，一頁 20 筆就是 1400 個數字。
 * 列表只需要看得出「哪個人、哪個月、領多少」，明細另有單筆端點。
 */
export interface ISalaryRecordSummary {
  id: string;
  year: number;
  month: number;
  employee: {
    id: string;
    name: string;
    number: string;
  };
  totalPayment: number;
  totalSalaryTaxable: number;
  totalEmployerCost: number;
  calculatorVersion: string;
  createdAt: number;
  updatedAt: number;
  /**
   * Info: (20260904 - Julian) 最近一次**成功**寄出的時間（Unix 秒）。`null` = 從未成功寄出。
   *
   * ## 為什麼由伺服器算，不由前端對照
   *
   * 薪資紀錄列表要在每一列顯示「已寄出／未寄出」。看似可以拿整本帳的寄送清單
   * （`GET salary_calculator/delivery`）在前端 index 起來比對 —— 但那一支有
   * 200 筆上限且是全帳本新的在前，於是一本累積久了的帳，**舊紀錄會靜靜地
   * 顯示成「未寄出」**。使用者看到那個字會再寄一次，而對方已經收過了。
   *
   * 錯的答案長得跟對的一樣，所以只能在有完整資料的那一側算。
   *
   * ## 為什麼是「成功」寄出
   *
   * 失敗的列存在是為了稽核（計畫書 §2.1），但對方什麼都沒收到 ——
   * 那一列不該讓畫面顯示「已寄出」。
   */
  lastSentAt: number | null;
  /**
   * Info: (20260904 - Julian) 最近一次成功寄出的收件信箱（當初的快照）。
   * 與 `lastSentAt` 同進同出：有時間就有信箱。
   */
  lastSentTo: string | null;
}

// Info: (20260831 - Julian) 單筆詳細，含快照，供「載回計算機」與檢視薪資單
export interface ISalaryRecordDetail extends ISalaryRecordSummary {
  input: ISalaryCalculatorOptions;
  result: ISalaryCalculatorUI;
}

// Info: (20260831 - Julian) 儲存薪資紀錄的輸入
export interface ISalaryRecordWriteInput {
  employeeId: string;
  year: number;
  month: number;
  input: ISalaryCalculatorOptions;
  result: ISalaryCalculatorUI;
  calculatorVersion: string;
}

// Info: (20260831 - Julian) 薪資紀錄的查詢條件
export interface ISalaryRecordQueryOptions {
  accountBookId: string;
  employeeId?: string;
  year?: number;
  month?: number;
  // Info: (20260901 - Julian) 比對員工姓名或編號，空字串視同沒有這個條件
  keyword?: string;
  page: number;
  pageSize: number;
}

/**
 * Info: (20260831 - Julian) 分頁回應。
 *
 * 形狀對齊 `ILedgerPageResult`（`src/interfaces/ledger.ts:46`）——
 * 專案沒有全站統一的分頁型別，而那一套是最近新寫、且明說「與 route 回應結構一致」的。
 */
export interface ISalaryRecordPageResult {
  data: ISalaryRecordSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  /**
   * Info: (20260901 - Julian) 這本帳實際存在紀錄的年月，新到舊。
   *
   * 給期間篩選的下拉用。不從當前這一頁推導，也不用「現在往前推 N 個月」硬湊 ——
   * 兩者都會讓「紀錄在第 3 頁」或「三年前的那一筆」變成選不到、因此篩不到的資料。
   * 這份清單只看 `accountBookId`，不套其他篩選條件，所以選了一個期間之後
   * 其他期間仍然留在選單裡（否則選完就只剩自己，換不回去）。
   */
  periods: ISalaryRecordPeriod[];
}

// Info: (20260901 - Julian) 一個給付期間（年 + 月），供期間篩選使用
export interface ISalaryRecordPeriod {
  year: number;
  month: number;
}
