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
 * 各欄位的來源由 `salary_pay_slip_meta.test.ts` 釘住 ——
 * 把任一個「統一」掉會有測試轉紅，而紅的訊息會指回這一段。
 *
 * Info: (20260914 - Julian) **第三種來源：公司抬頭是「期間」事實。**
 *
 * | 欄位 | 來源 | 為什麼 |
 * | --- | --- | --- |
 * | 投保狀態 | 這筆紀錄的 `input` 快照 | **月別**事實：八月有保、九月退保是正常的 |
 * | 到職日 | 員工檔**現值** | **人**的事實，只有一個正確答案 |
 * | 公司抬頭 | 這筆紀錄的快照，取不到才用現值 | **期間**事實（見 `resolveEntityName`） |
 *
 * 抬頭與投保狀態同一類（都讀快照），但多了一層回退 ——
 * 因為它的快照欄位是 20260914 才有的，舊紀錄一律沒有。
 *
 * Info: (20260914 - Julian) 這裡原本掛著一則「雇主名稱尚未加入」的 ToDo，
 * 說它是施行細則 §14-1 六項必載的第一項。**核對條文之後那句話是錯的，已刪除。**
 *
 * §14-1 實際上是**四款，全部是金額**：
 *
 * > 本法第二十三條所定工資各項目計算方式明細，應包括下列事項：
 * > 一、勞雇雙方議定之工資總額。
 * > 二、工資各項目之給付金額。
 * > 三、依法令規定或勞雇雙方約定，得扣除項目之金額。
 * > 四、實際發給之金額。
 *
 * 雇主名稱、勞工姓名、工資給付期間**都不在裡面**；而薪資單四款都有
 * （工資總額＝`totalMonthlySalary`，實際發給＝`totalPayment`）。
 *
 * 工資清冊那一邊也查了：本法 §23 II 是「發放工資、工資各項目計算方式明細、
 * 工資總額等事項」，同樣全是金額，同樣沒有要求雇主名稱。
 *
 * **所以薪資單在 §14-1 上沒有缺口，#6795 以案由不成立關閉。**
 * 那則錯誤的敘述另外還有兩份（`salary_record_module_plan.md`、
 * `salary_pay_slip_delivery_plan.md`），20260914 一併刪除 ——
 * 三份互相一致，所以彼此看起來像佐證，而它們是同一段文字複製三次。
 *
 * 留這一段而不是直接刪乾淨，是因為它已經生出過一輪工作
 * （`salary_company_profile_plan.md` 就是它的產物）。沒有這段說明，
 * 下一個人查 §14-1 只會看到「我們沒印雇主名稱」，然後再做一次。
 *
 * 到職日與投保狀態同樣不是法定必載 —— 它們是客戶自己的需求
 * （勞檢實務上會問）。這句話原本就對，只是接在錯的前提後面。
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
  /**
   * Info: (20260914 - Julian) 公司抬頭，**已經解析過的**（見 `resolveEntityName`）。
   *
   * `null` = 這筆紀錄沒有快照、而公司設定也還沒填。那時候整行不印 ——
   * 印一個「—」會看起來像那就是答案，而缺了抬頭該看得出來缺了東西。
   */
  entityName: string | null;
  isLaborInsured: boolean;
  isHealthInsured: boolean;
  isPensionInsured: boolean;
}

/**
 * Info: (20260914 - Julian) 抬頭的解析規則：**快照優先，取不到才用現值**。
 *
 * 規則只有一行，值錢的是為什麼：
 *
 * ## 為什麼快照優先
 *
 * 公司在 2027 年改名，2026 年 8 月那張薪資單重印出來該印**當時的名字** ——
 * 同一份明細上四個金額都是 8 月的，抬頭卻是今天的，讀起來自相矛盾。
 *
 * ## 為什麼取不到時回退現值，而不是留白
 *
 * `entityNameSnapshot` 是 20260914 才有的欄位，在那之前存的紀錄一律是
 * `null` —— 那不是「漏填」，是**當時系統根本不知道公司抬頭**，
 * 而那個事實沒有任何回填腳本補得出來。
 *
 * 現值是唯一拿得到的答案。它可能與當時不同（公司改過名），
 * 但「今天這家公司的名字」仍然比一片空白接近事實。
 *
 * ## 為什麼不在這裡補一個「（現值）」之類的標記
 *
 * 想過。但薪資單是要交給員工與勞檢看的文件，不是除錯畫面 ——
 * 在抬頭旁邊加一個括號註記會讓收到的人以為那份文件有問題。
 * 「這一筆是回退來的」屬於系統的知識，它的去處是這段註解與測試，
 * 不是列印出來的那張紙。
 */
export const resolveEntityName = (
  snapshot: string | null,
  current: string | null,
): string | null => snapshot ?? current;

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
  entityName: string | null,
): IPaySlipMeta => ({
  hireDate,
  entityName,
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
