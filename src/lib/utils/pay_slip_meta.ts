/**
 * Info: (20260909 - Julian) 薪資單表頭那幾格「不是金額」的資訊：到職日與投保狀態。
 *
 * ## 為什麼要有這一支
 *
 * 同一份資訊要出現在兩個**不共用任何程式碼**的地方：畫面上的 `PaySlip`
 * （React，走 i18n）與寄出去的 `pay_slip_html`（伺服端字串，寫死繁中）。
 * 兩邊各判斷一次的話，日後多一種保險、或把某個欄位的來源換掉，
 * 極容易只改到一邊 —— 而症狀是「員工收到的信與畫面上看到的不一樣」，
 * 那是最難被發現的一種不一致（兩個人各自看一邊，都覺得沒問題）。
 *
 * 所以這裡放的是**結構**（有哪幾格、值是什麼），文字留給各自的那一層。
 * `PAY_SLIP_INSURED_FIELDS` 是兩邊共用的順序來源 ——
 * 兩邊都 map 它，新增一種保險就不可能只落在一邊。
 *
 * ## 兩個欄位的來源刻意不同
 *
 * | 欄位     | 來源                     | 為什麼                                   |
 * | -------- | ------------------------ | ---------------------------------------- |
 * | 投保狀態 | **這筆紀錄的 input 快照** | 它是**月別**事實：八月有保、九月退保是正常的 |
 * | 到職日   | **員工檔的現值**         | 它是**人**的事實，只有一個正確答案       |
 *
 * **這個不對稱看起來像不一致，但統一到任何一邊都會錯 —— 不要「順手統一」。**
 *
 * 統一讀員工檔現值：去年十月的薪資單會跟著今天的投保狀態變 ——
 * 而那張單子上的勞保費是照當時的狀態算出來的，兩者會在同一張紙上互相矛盾。
 *
 * 統一讀紀錄快照：**到職日在快照裡多數時候根本不存在。**
 * `toCalculatorOptions` 寫的是
 *
 *     employeeStartDate: form.isJoined ? toTimestamp(year, month, form.dayOfJoining) : undefined
 *
 * —— 引擎只關心「這個月裡有沒有中途到職」，所以那一格只有**到職當月**那一筆
 * 才有值。八月十號到職的人，他九月、十月、十一月每一筆紀錄的快照裡
 * 都沒有到職日。改讀快照的症狀是「到職那個月印得出來，之後每一張都是 `-`」。
 *
 * 到職日讀現值的代價是「它被改掉，舊薪資單會跟著變」。接受它，理由兩層：
 * 它若被更正過（打錯字、補登），舊薪資單上該顯示的是**更正後**那個值，
 * 因為錯的那個從來就不是事實；而「誰在什麼時候改了到職日」另有去處 ——
 * 它是調薪歷程裡預設顯示的欄位之一
 * （`SALARY_PROFILE_FIELD_VISIBILITY.hireDate === true`），不會沒有痕跡。
 *
 * 三個呼叫端各自的來源由 `salary_pay_slip_meta.test.ts` 釘住 ——
 * 把任一端「統一」掉會有測試轉紅，而紅的訊息會指回這一段。
 *
 * ToDo: (20260909 - Julian) **雇主名稱尚未加入。**
 *
 * 勞基法施行細則 §14-1 的工資明細六項必載是：雇主名稱、勞工姓名、
 * 工資給付期間、工資各項目給付金額、依法扣除項目金額、實際發給金額。
 * 目前薪資單上有後五項，**缺的是第一項**。
 *
 * 沒有一起做的原因是取不到：這一層拿不到「雇主名稱」該用哪一個值 ——
 * 帳本名稱不一定等於公司登記名稱，而工資明細上要的是後者。
 * 待確認資料來源（帳本是否另有公司抬頭欄位）後補上，
 * 補的位置就是本檔的 `IPaySlipMeta` 與兩個消費端的表頭。
 *
 * 註：到職日與投保狀態**不在**那六項裡，它們是客戶自己的需求
 * （勞檢實務上會問，但不是明細的法定必載）。也就是說：
 * 這次補的兩格是加分，缺的那一格才是必要條件。
 */

/**
 * Info: (20260909 - Julian) 三種投保的顯示順序。**兩個消費端都 map 這一份。**
 *
 * 各自寫一份陣列的話，新增一種保險時只改到一邊 ——
 * 而畫面與信件各少一格、各多一格，兩邊都「看起來正常」。
 * 順序沿用員工檔與計算機的既有順序（勞保、健保、勞退）。
 */
export const PAY_SLIP_INSURED_FIELDS = [
  "isLaborInsured",
  "isHealthInsured",
  "isPensionInsured",
] as const;

export type PaySlipInsuredField = (typeof PAY_SLIP_INSURED_FIELDS)[number];

export interface IPaySlipMeta {
  /** Info: (20260909 - Julian) 到職日，Unix 秒；`null` = 員工檔上沒填 */
  hireDate: number | null;
  isLaborInsured: boolean;
  isHealthInsured: boolean;
  isPensionInsured: boolean;
}

/**
 * Info: (20260909 - Julian) 引擎輸入裡與投保有關的那三格。
 *
 * 型別窄成 `Pick` 而不是收整個 `ISalaryCalculatorOptions`：
 * 這支函式只讀三個布林，收整包會讓「它是不是也看了別的欄位」變成
 * 每次都要回去讀實作才知道的事。
 */
export interface IPaySlipInsuredInput {
  isLaborInsuranceEnrolled?: boolean;
  isHealthInsuranceEnrolled?: boolean;
  isPensionInsuranceEnrolled?: boolean;
}

/**
 * Info: (20260909 - Julian) 組出薪資單表頭要用的那幾格。
 *
 * 三個布林用 `=== true` 而不是 `?? false`：引擎輸入的型別上它們是可選的
 * （`toCalculatorOptions` 一律會寫，但更早的紀錄不保證）。
 * `undefined` 讀成「未投保」是**唯一安全的方向** ——
 * 反過來預設「有投保」，會在一張其實沒有勞保費的單子上寫著「勞保：投保」。
 */
export const paySlipMetaOf = (
  hireDate: number | null,
  input: IPaySlipInsuredInput,
): IPaySlipMeta => ({
  hireDate,
  isLaborInsured: input.isLaborInsuranceEnrolled === true,
  isHealthInsured: input.isHealthInsuranceEnrolled === true,
  isPensionInsured: input.isPensionInsuranceEnrolled === true,
});

/**
 * Info: (20260909 - Julian) 一個日期 → `YYYY-MM-DD`，**一律以 UTC 讀**。
 *
 * 那個值在資料庫裡是「某一天的午夜 UTC」（見 `SalaryCalculatorEmployee.hireDate`
 * 的註解），也就是日期而不是時刻。用 `getMonth()` 這類本地方法讀的話，
 * UTC 以西的時區會把 2026-08-10 顯示成 2026-08-09 ——
 * 而這是要交給勞檢看的到職日，差一天就是差一天的年資。
 * 本模組有一整組 `*.tz.test.ts` 在守這一類缺陷。
 *
 * ## 為什麼是 ISO 而不是 `2026/08/10`
 *
 * 同一個日期會出現在薪資單（給人看）與 CSV（進試算表）兩個地方，
 * 而 CSV 那一側已經有一個日期欄（`lastSentAt`）用的是 `YYYY-MM-DD`。
 * 一份檔案裡兩種日期格式，除了難看之外還有實害：其中一種可能被
 * 試算表當成文字匯入，於是那一欄排不了序。
 *
 * 反過來讓 CSV 遷就薪資單也不行 —— 那要改一個既有欄位的輸出格式，
 * 而已經有人在用那份檔案。**新的欄位遷就舊的**，這是便宜的那一邊。
 */
export const formatIsoDateUtc = (seconds: number): string => {
  const date = new Date(seconds * 1000);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Info: (20260909 - Julian) 薪資單上的到職日 —— 沒有的時候印「-」。
 *
 * **CSV 不能用這一支**：`-` 是試算表的公式起始字元之一，
 * 會被 `escapeField` 補成 `'-`；而且一欄裡混著日期與 `-`
 * 會讓那一欄變成排不了序的混合型別（`salary_record_csv.ts` 的
 * `sentDate` 為了同一個理由回空字串）。
 *
 * 空值的處置是**兩個消費端各自的決定**，日期本身的算法才是共用的 ——
 * 所以拆成兩支，而不是加一個 `blank` 參數。
 */
export const formatPaySlipDate = (seconds: number | null): string =>
  seconds === null ? "-" : formatIsoDateUtc(seconds);
