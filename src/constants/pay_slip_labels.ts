import type { PaySlipInsuredField } from "@/lib/utils/pay_slip_meta";

/**
 * Info: (20260904 - Julian) 薪資單欄位的中文名稱。**伺服端產物共用這一份。**
 *
 * ## 為什麼從 `pay_slip_html.ts` 抽出來
 *
 * 原本這張表寫在列印用的 HTML builder 裡，因為那時只有一個消費者。
 * CSV 匯出是第二個 —— 而它印出來的欄位名必須與 PDF 上的**逐字相同**：
 * 使用者會把兩者並排對帳，一邊寫「本薪（應稅）」另一邊寫「應稅本薪」，
 * 他得先確認那是不是同一欄才敢往下看。
 *
 * 各抄一份再寫一條測試對拍也做得到，但那是在維護兩份會分岔的資料；
 * 共用一份之後，分岔這件事就不存在了。
 *
 * ## 為什麼不 import 前端的 i18n 字典
 *
 * 沿用 `pay_slip_html.ts` 原本的理由：那是前端字典，形狀由 i18n 的需求決定，
 * 而這裡要的是「印在紙上／寫進 CSV 的欄位名」。兩者今天相同，
 * 但沒有理由永遠相同 —— 綁在一起的話，前端為了排版把某個標籤改短，
 * 寄出去的薪資單與匯出的報表會跟著變。
 * 相同性由 `salary_pay_slip_html.test.ts` 對拍，不是靠共用資料結構。
 *
 * ## 為什麼寫死中文
 *
 * 專案沒有伺服器端的 i18n helper。PDF 的收件人是員工（我們不知道他的語言），
 * CSV 的讀者是會計（他有語言，但這一層拿不到 context）——
 * 兩者都只能挑一個明確的語系。值域集中在這裡，日後要多語系時它變成參數。
 */
export const PAY_SLIP_FIELD_LABELS = {
  baseSalaryWithTax: "本薪（應稅）",
  overtimePayWithTax: "加班費（應稅）",
  otherAllowanceWithTax: "其他加給（應稅）",
  totalSalaryWithTax: "總應稅薪資",
  mealAllowanceWithoutTax: "伙食費（免稅）",
  overtimePayWithoutTax: "加班費（免稅）",
  otherAllowanceWithoutTax: "其他津貼（免稅）",
  leaveSalaryWithoutTax: "休假折抵薪資（免稅）",
  totalSalaryWithoutTax: "總免稅薪資",
  totalMonthlySalary: "月薪資合計",

  employeePaidLaborInsurance: "自行負擔勞保費",
  employeePaidHealthInsurance: "自行負擔健保費",
  voluntaryPensionContribution: "自提勞退",
  withheldIncomeTax: "代扣所得稅款",
  withheldSecondGenerationNHIPremium: "代扣二代健保",
  leaveDeductionTaxable: "請假扣薪（應稅）",
  leaveDeductionTaxFree: "請假扣薪（免稅）",
  otherDeductionsOrAdjustments: "其他溢扣/ 補收",
  totalEmployeeBurden: "扣項總計",

  healthInsuranceSalaryBracket: "健保投保級距",
  laborInsuranceSalaryBracket: "勞保投保級距",
  employmentInsuranceSalaryBracket: "就業保險級距",
  occupationalInjuryInsuranceSalaryBracket: "職災保險級距",
  laborPensionSalaryBracket: "勞退級距",
  occupationalInjuryIndustryRate: "職災行業別費率",
  insuredSalary: "投保薪資",

  employerPaidLaborInsurance: "公司負擔勞保費",
  employerPaidHealthInsurance: "公司負擔健保費",
  employerPaidPensionContribution: "公司負擔退休金",
  companyBurdenOccupationalAccidentInsurance: "公司負擔職保費",
  totalSalary: "本月薪資",
  totalEmployerCost: "公司總負擔",

  reported: "扣繳憑單金額",
  paid: "實際發放金額",
} as const;

/**
 * Info: (20260909 - Julian) 表頭那幾格「不是金額」的標籤（到職日與投保狀態）。
 *
 * 與上面那張表分開：那一張的鍵對應 `ISalaryCalculatorUI` 的欄位，
 * 混進來會讓「這張表就是計算結果的每一欄」不再成立 ——
 * 而 CSV 匯出正是靠那件事逐欄走過去的。
 */
export const PAY_SLIP_META_LABELS = {
  hireDate: "到職日",
  insuredYes: "投保",
  insuredNo: "未投保",
} as const;

/**
 * Info: (20260909 - Julian) 三種投保的中文名。**型別綁在共用的欄位清單上。**
 *
 * `Record<PaySlipInsuredField, string>` —— 日後多一種保險，
 * 這裡少一個鍵就編譯失敗。少了它的話，新增的那一種會在畫面上有、
 * 在寄出的薪資單上沒有（或反過來），而兩邊各自看都正常。
 */
export const PAY_SLIP_INSURED_LABELS: Record<PaySlipInsuredField, string> = {
  isLaborInsured: "勞保",
  isHealthInsured: "健保",
  isPensionInsured: "勞退",
};

/**
 * Info: (20260904 - Julian) CSV 專屬的身分欄位 —— PDF 上沒有。
 *
 * 一份 PDF 是一個人的一個月，姓名與期間寫在表頭；CSV 是很多人很多月混在一起，
 * 每一列都必須自己說得出「這是誰的、哪一個月的」，否則排序一次就對不回去了。
 */
export const PAY_SLIP_CSV_IDENTITY_LABELS = {
  period: "期間",
  employeeName: "員工姓名",
  employeeNumber: "員工編號",
  /**
   * Info: (20260908 - Julian) 本薪與它的變動（薪資異動紀錄計劃書 §18）。
   *
   * ## 為什麼是兩組，而不是一組
   *
   * - `baseSalaryPrevPeriod` / `baseSalaryDelta`：**較上一筆紀錄**。一律有
   *   （只要有更早的紀錄），由紀錄本身算出來。
   * - `profileChange*`：**員工檔的異動紀錄**。有的時候才有，能說出誰改的、為什麼。
   *
   * 兩者可以同時存在、也可以只有前者（在計算機上改了本薪、選了「只存這一次」）。
   * 合成一組的話，收到 CSV 的人會把「沒有異動紀錄」讀成「沒有調薪」。
   *
   * ## 標題必須自己說得完
   *
   * CSV 沒有地方放說明文字（加一行前言會讓試算表的表頭解析錯位）。
   * 所以「員工檔本薪異動…」這幾個字要自己交代來源 ——
   * 收到檔案的人手上沒有這個系統，也不會來問。
   */
  baseSalarySetting: "月本薪（設定）",
  baseSalaryPrevPeriod: "本薪較上一筆期間",
  baseSalaryDelta: "本薪較上一筆差額",
  profileChangeBefore: "員工檔本薪異動前",
  profileChangeAfter: "員工檔本薪異動後",
  profileChangeReason: "員工檔本薪異動原因",
  profileChangeBy: "員工檔本薪異動記錄者",
  profileChangeAt: "員工檔本薪異動記錄日",

  calculatorVersion: "計算版本",
  lastSentAt: "薪資單寄出日",
  lastSentTo: "寄送信箱",
} as const;
