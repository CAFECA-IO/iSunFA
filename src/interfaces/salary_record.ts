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
 * Info: (20260908 - Julian) 一次員工檔寫入的「誰、何時生效、為什麼」。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md`
 *
 * ## 為什麼與 `ISalaryCalculatorEmployeeWriteInput` 分開
 *
 * 那個型別是**員工現在是什麼樣子**，這一個是**這次修改這件事**。
 * 混成一個的話，「生效月份」會變成員工檔的一個屬性 —— 而它不是：
 * 同一位員工會有很多次異動，每一次有自己的生效月與原因。
 *
 * 分開的另一個好處是 `changedByUserId` 不會出現在前端送上來的那個型別裡。
 * 它由伺服器從 DeWT 取（`sessionUser.id`），**不收前端傳入** ——
 * 收的話，異動紀錄的「誰」就是可以偽造的，而那是這張表唯一不能妥協的欄位。
 */
/**
 * Info: (20260908 - Julian) 前端隨員工檔一起送上來的異動資訊。
 *
 * 與 `ISalaryProfileChangeContext` 的差別只有一個：**沒有 `changedByUserId`。**
 * 那一欄由伺服器從 DeWT 取，前端送什麼都不算 —— 分成兩個型別，
 * 是讓「前端不可能指定是誰改的」這件事在型別上就成立，
 * 而不是靠 route 記得不要從 body 讀它。
 */
export interface ISalaryProfileChangeRequest {
  effectiveYear: number;
  effectiveMonth: number;
  reason?: string;
}

export interface ISalaryProfileChangeContext {
  /** Info: (20260908 - Julian) 伺服器從 DeWT 取，不從 request body 取 */
  changedByUserId: string;

  /**
   * Info: (20260908 - Julian) 從哪一個給付期間開始生效。**不等於「什麼時候輸入的」。**
   *
   * 輸入的時刻由 `recordedAt` 記（伺服器時鐘）。兩者必須分開，
   * 否則補登（4/20 才輸入 4 月起生效）與預先輸入（3/28 輸入 5 月起生效）
   * 都會答錯，而且錯得看不出來 —— 計劃書 §4。
   */
  effectiveYear: number;
  effectiveMonth: number;

  // Info: (20260908 - Julian) 使用者填的原因（調薪、升遷、投保級距調整⋯⋯），可省略
  reason?: string;
}

/**
 * Info: (20260831 - Julian) 薪資紀錄的列表項目，**不含快照**。
 *
 * 快照兩個加起來近 70 個欄位，一頁 20 筆就是 1400 個數字。
 * 列表只需要看得出「哪個人、哪個月、領多少」，明細另有單筆端點。
 */
/**
 * Info: (20260908 - Julian) 本薪較**上一筆紀錄**的差額。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §16
 *
 * ## 為什麼需要它，而 `ISalaryBaseSalaryChange` 不夠
 *
 * `baseSalaryChange` 的來源是員工檔的異動表，而那要求使用者在
 * 「順便更新員工資料嗎？」那個彈窗按下「更新」。實測發現的問題是：
 * **在計算機上改了本薪、選「只存這一次」的話，什麼都不會被記錄** ——
 * 而畫面上兩個月的本薪明明差一萬。
 *
 * 使用者的心智模型是「這兩個月的數字不一樣」，不是「有人明確編輯了員工檔」。
 * 把功能建立在後者，等於建立在一個**看不出被違反的紀律**上：
 * 忘記按那顆按鈕不會有任何症狀，只是三個月後歷程上少一筆。
 *
 * 所以差額一律由紀錄本身算（永遠有），而異動表變成**解釋層**
 * （有的時候才有，能說出誰改的、為什麼）。
 *
 * ## `previousYear` / `previousMonth` 為什麼一定要帶
 *
 * 「上一筆」不保證是上一個月 —— 八月沒存紀錄的話，九月的上一筆是七月。
 * 一個光禿禿的 `−10,000` 那時候就是一句沒說清楚的話，而使用者會
 * 默認它是跟上個月比。畫面必須寫出「較 7 月」。
 */
export interface ISalaryBaseSalaryDelta {
  previousYear: number;
  previousMonth: number;
  previous: number;
  /** Info: (20260908 - Julian) `本月本薪 − 上一筆本薪`，可能是負的 */
  delta: number;
}

/**
 * Info: (20260908 - Julian) 這個月生效的**本薪**異動，掛在薪資紀錄上。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §15
 *
 * ## 為什麼掛在薪資紀錄上，而不是只留在調薪歷程裡
 *
 * 20260908 第一版把異動做成一個獨立的稽核視圖，藏在員工列表的按鈕後面 ——
 * 那要求使用者「先想到要去查」。而真實情境是他在看九月的薪資紀錄，
 * 那個 `+1,000` 應該自己送上來。
 *
 * ## 為什麼來源是異動表，而不是「跟上一筆紀錄相減」
 *
 * 相減看起來更省（不需要異動表），但有三個問題：
 *
 * 1. **「上一筆」可能不是上一個月。** 八月沒存紀錄的話，九月的上一筆是七月，
 *    而 `+1,000` 沒說清楚是跟誰比。
 * 2. **數字會被別人改動。** 薪資紀錄同年同月唯一、重存即覆寫 ——
 *    有人重存八月，九月的差額會**靜靜地變成別的數字**。異動表只增不改。
 * 3. **說不出為什麼。** 相減只有數字，沒有「誰改的、原因、從哪個月起生效」。
 *
 * 而 `effectiveYear` / `effectiveMonth` 的語意正好就是「從九月起」——
 * 所以這裡問的是「有沒有一筆異動是這個月生效的」，不是去比對相鄰紀錄。
 */
export interface ISalaryBaseSalaryChange {
  before: number;
  after: number;
  /** Info: (20260908 - Julian) `after - before`，可能是負的（減薪） */
  delta: number;

  /**
   * Info: (20260908 - Julian) 同一個月生效的本薪異動筆數。
   *
   * 通常是 1。大於 1 時 `before` / `after` 是**淨變動**（最早那筆的前值 →
   * 最晚那筆的後值），而 `reason` / `changedBy` 取最後一筆 ——
   * 畫面必須把筆數說出來，否則「29,000 → 30,000」會被讀成一次調整，
   * 而實際上中間可能經過 31,000 又改回來。
   */
  count: number;

  reason: string | null;
  changedBy: { id: string; name: string | null };
  recordedAt: number;
}

export interface ISalaryRecordSummary {
  id: string;
  year: number;
  month: number;
  employee: {
    id: string;
    name: string;
    number: string;
  };
  /**
   * Info: (20260908 - Julian) 這個月**試算時用的**本薪。
   *
   * 取自紀錄自己（`SalaryRecord.baseSalary`，`inputSnapshot.baseSalaryTaxable`
   * 的純量投影）而不是員工檔的現值：員工檔會被之後的調薪改掉，
   * 而這一欄要回答的是「這個月的薪水是用多少本薪算出來的」——
   * 那是一個歷史事實。
   */
  baseSalary: number;

  /**
   * Info: (20260908 - Julian) 較上一筆紀錄的本薪差額；`null` = 這是這個人最早的一筆。
   *
   * **這是畫面上那個 `−10,000` 的來源**，一律有（只要有更早的紀錄），
   * 不需要使用者做任何額外動作。
   */
  baseSalaryDelta: ISalaryBaseSalaryDelta | null;

  /**
   * Info: (20260908 - Julian) 這個月生效的員工檔本薪異動；`null` = 沒有對應的異動紀錄。
   *
   * 它是 `baseSalaryDelta` 的**解釋層**，不是它的來源：有的時候畫面可以說出
   * 「誰改的、原因、從哪個月起生效」，沒有的時候差額照樣顯示，
   * 而畫面明說「沒有對應的員工資料異動紀錄」——那句話本身就是答案
   * （多半是在計算機上選了「只存這一次」）。
   *
   * **建檔（`CREATE`）不算調薪**，所以不會出現在這裡 —— 否則新員工的第一筆
   * 紀錄會顯示 `+29,000`，而那讀起來像一次巨額調薪。
   */
  baseSalaryChange: ISalaryBaseSalaryChange | null;

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

/**
 * Info: (20260908 - Julian) 一次薪資條件異動，前端格式。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §6.2
 *
 * `changes` 由**伺服器**從兩份快照算出來，不把 Json 原封不動丟給前端 ——
 * 「哪些欄位算變動、金額怎麼正規化」的規則只能有一份實作，
 * 而它必須在有測試的那一側（`salary_profile_diff.ts`）。
 */
export interface ISalaryProfileChange {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE";

  /**
   * Info: (20260908 - Julian) 生效期間與寫下這一列的時刻，**兩個都給前端**。
   *
   * 畫面要同時顯示它們：兩者不同（補登、預先輸入）本身就是稽核要看的資訊。
   * 只給一個的話，「4 月的調薪是 4/20 才補登的」這件事在畫面上消失。
   */
  effectiveYear: number;
  effectiveMonth: number;
  recordedAt: number;

  reason: string | null;
  changedBy: { id: string; name: string | null };
  changes: {
    field: string;
    before: string | number | boolean | null;
    after: string | number | boolean | null;
  }[];
}

/**
 * Info: (20260908 - Julian) repository 回傳的**原始**異動列。
 *
 * 前後快照仍是 `unknown`（資料庫裡是 Json），diff 由服務層算。
 * 分成兩個型別而不是讓 repository 直接回 `ISalaryProfileChange`，
 * 是因為 diff 需要 `salary_profile_diff.ts` 的欄位清單 ——
 * 而那是業務規則，不是資料存取。
 */
export interface ISalaryProfileChangeRow {
  id: string;
  action: string;
  beforeSnapshot: unknown;
  afterSnapshot: unknown;
  changedFields: string[];
  effectiveYear: number;
  effectiveMonth: number;
  reason: string | null;
  recordedAt: Date;
  changedBy: { id: string; name: string | null };
}

export interface ISalaryProfileChangeQueryOptions {
  accountBookId: string;
  employeeId: string;
  /**
   * Info: (20260908 - Julian) 只看這幾個欄位的變動。空陣列／未給＝全部。
   *
   * **`DELETE` 的列一律保留**，不受這個條件影響 —— 移除不是某個欄位的變動，
   * 而使用者篩「本薪」時若連「這個人被移除了」都消失，
   * 歷程的最後一列不見比錯還糟。
   */
  fields?: string[];
  page: number;
  pageSize: number;
}

export interface ISalaryProfileChangePageResult {
  data: ISalaryProfileChange[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;

  /**
   * Info: (20260908 - Julian) 這位員工**最早一列**的時間（Unix 秒），null = 一列都沒有。
   *
   * 畫面必須把它說出來（「本紀錄自 YYYY-MM-DD 起」）。
   * 這張表從功能上線那天才開始有資料，而**一張沒說明起點的異動表，
   * 讀者會把空白讀成「沒有變動」** —— 對稽核而言那比沒有這張表更糟。
   *
   * 用「這位員工的最早一列」而不是一個全域的上線日常數：常數會過時、
   * 會被搬動、也回答不了「這個人是什麼時候開始被記錄的」。
   */
  recordedSince: number | null;
}

// Info: (20260901 - Julian) 一個給付期間（年 + 月），供期間篩選使用
export interface ISalaryRecordPeriod {
  year: number;
  month: number;
}
