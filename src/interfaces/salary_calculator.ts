type ISalaryCalculatorOptions = {
  year: number; // Info: (20250727 - Luphia) 計薪年度
  month: number; // Info: (20250727 - Luphia) 計薪月份
  job?: number; // Info: (20250727 - Luphia) 行業別代碼，預設 41 電腦程式設計、諮詢及相關服務業、資訊服務業
  employeeStartDate?: number; // Info: (20250727 - Luphia) 員工入職日期
  employeeEndDate?: number; // Info: (20250727 - Luphia) 員工離職日期
  baseSalaryTaxable: number; // Info: (20250727 - Luphia) 當月應稅基本工資（本薪）
  baseSalaryTaxFree: number; // Info: (20250727 - Luphia) 當月免稅基本工資（伙食津貼）
  otherAllowancesTaxable?: number; // Info: (20250727 - Luphia) 當月應稅其他津貼
  otherAllowancesTaxFree?: number; // Info: (20250727 - Luphia) 當月免稅其他津貼
  overTimeHoursTaxable100?: number; // Info: (20250727 - Luphia) 當月 100% 加班費（應稅）
  overTimeHoursTaxable133?: number; // Info: (20250727 - Luphia) 當月 133% 加班費（應稅）
  overTimeHoursTaxable166?: number; // Info: (20250727 - Luphia) 當月 166% 加班費（應稅）
  overTimeHoursTaxable200?: number; // Info: (20250727 - Luphia) 當月 200% 加班費（應稅）
  overTimeHoursTaxable233?: number; // Info: (20250727 - Luphia) 當月 233% 加班費（應稅）
  overTimeHoursTaxable266?: number; // Info: (20250727 - Luphia) 當月 266% 加班費（應稅）
  overTimeHoursTaxFree100?: number; // Info: (20250727 - Luphia) 當月 100% 加班費（免稅）
  overTimeHoursTaxFree133?: number; // Info: (20250727 - Luphia) 當月 133% 加班費（免稅）
  overTimeHoursTaxFree166?: number; // Info: (20250727 - Luphia) 當月 166% 加班費（免稅）
  overTimeHoursTaxFree200?: number; // Info: (20250727 - Luphia) 當月 200% 加班費（免稅）
  overTimeHoursTaxFree233?: number; // Info: (20250727 - Luphia) 當月 233% 加班費（免稅）
  overTimeHoursTaxFree266?: number; // Info: (20250727 - Luphia) 當月 266% 加班費（免稅）
  vacationToPayHours?: number; // Info: (20250814 - Luphia) 休假換算成薪資的時數
  sickLeaveHours?: number; // Info: (20250727 - Luphia) 當月病假時數
  personalLeaveHours?: number; // Info: (20250727 - Luphia) 當月事假時數
  isLaborInsuranceEnrolled?: boolean; // Info: (20250814) 投保勞保
  isHealthInsuranceEnrolled?: boolean; // Info: (20250814) 投保健保
  isPensionInsuranceEnrolled?: boolean; // Info: (20250814) 投保退休金
  employeeBurdenHealthInsurancePremiums?: number; // Info: (20250727 - Luphia) 健保加保費用
  employeeBurdenSecondGenerationHealthInsurancePremiums?: number; // Info: (20250727 - Luphia) 代扣所得稅／二代健保費
  employeeBurdenOtherOverflowDeductions?: number; // Info: (20250727 - Luphia) 其他溢扣／補收
  employeeBurdenPensionInsurance?: number; // Info: (20250727 - Luphia) 個人自願提繳退休金
  dependentsCount?: number; // Info: (20250814 - Luphia) 扶養人數
  baseSalary30Days?: boolean; // Info: (20250814 - Luphia) 薪資基準日數以30日計算
};

type ISalaryCalculatorResult = {
  totalPayment: number; // Info: (20250727 - Luphia) 實際給付金額
  baseSalaryTaxable: number; // Info: (20250727 - Luphia) 本薪（應稅）
  overTimePayTaxable: number; // Info: (20250727 - Luphia) 加班費（應稅）
  otherAllowancesTaxable: number; // Info: (20250727 - Luphia) 其他加給（應稅）
  totalSalaryTaxable: number; // Info: (20250814 - Luphia) 總應稅薪資／扣繳憑單金額
  baseSalaryTaxFree: number; // Info: (20250727 - Luphia) 伙食費（免稅）
  overTimePayTaxFree: number; // Info: (20250727 - Luphia) 加班費（免稅）
  otherAllowancesTaxFree: number; // Info: (20250727 - Luphia) 其他津貼（免稅）
  vacationToPay: number; // Info: (20250825 - Luphia) 休假折抵薪資（免稅）
  totalSalaryTaxFree: number; // Info: (20250727 - Luphia) 總免稅薪資
  totalSalary: number; // Info: (20250727 - Luphia) 月薪資合計
  healthInsuranceLevel: number; // Info: (20250727 - Luphia) 健保投保級距
  laborInsuranceLevel: number; // Info: (20250727 - Luphia) 勞保投保級距
  employmentInsuranceLevel: number; // Info: (20250727 - Luphia) 就業保險級距
  occupationalDisasterInsuranceLevel: number; // Info: (20250727 - Luphia) 職災保險級距
  pensionInsuranceLevel: number; // Info: (20250727 - Luphia) 勞退級距
  occupationalDisasterIndustryRate: number; // Info: (20250727 - Luphia) 職災行業別費率
  insuredSalary: number; // Info: (20250727 - Luphia) 投保薪資
  employeeBurdenLaborInsurance: number; // Info: (20250727 - Luphia) 員工負擔勞保費
  employeeBurdenHealthInsurance: number; // Info: (20250727 - Luphia) 員工負擔健保費
  employeeBurdenPensionInsurance: number; // Info: (20250727 - Luphia) 員工自願提繳退休金
  employeeBurdenIncomeTax: number; // Info: (20250727 - Luphia) 代扣所得稅款
  employeeBurdenSecondGenerationHealthInsurancePremiums: number; // Info: (20250727 - Luphia) 代扣二代健保費
  leaveDeduction: number; // Info: (20250727 - Luphia) 請假扣薪
  employeeBurdenOtherOverflowDeductions: number; // Info: (20250727 - Luphia) 其他溢扣／補收
  totalEmployeeBurden: number; // Info: (20250814 - Luphia) 扣項總計
  companyBurdenLaborInsurance: number; // Info: (20270727 - Luphia) 公司負擔勞保費
  companyBurdenHealthInsurance: number; // Info: (20270727 - Luphia) 公司負擔健保費
  companyBurdenPensionInsurance: number; // Info: (20270727 - Luphia) 公司負擔退休金
  companyBurdenOccupationalAccidentInsurance: number; // Info: (20270727 - Luphia) 公司負擔職災保險
  totalCompanyBurden: number; // Info: (20270727 - Luphia) 公司負擔勞健退
};

type IGetSalaryLevelOptions = {
  year: number; // Info: (20250727 - Luphia) 計薪年度
  salary: number; // Info: (20250727 - Luphia) 薪資金額
};

export type { ISalaryCalculatorOptions, ISalaryCalculatorResult, IGetSalaryLevelOptions };
