import { iSalaryLevel, SALARY_LEVELS } from '@/constants/salary_levels';
import {
  iGetSalaryLevelOptions,
  iSalaryCalculatorOptions,
  iSalaryCalculatorResult,
} from '@/interfaces/salary_calculator';

const getSalaryLevelsByYear = (year: number): iSalaryLevel[] => {
  const salaryLevels = SALARY_LEVELS.find((level) => level.year <= year);
  if (!salaryLevels) {
    // ToDo: (20250727 - Luphia) 定義 ErrorCode 與 ErrorMessage
    throw new Error(`No salary levels found for year ${year}`);
  }
  return salaryLevels.data;
};

const getSalaryLevel = (options: iGetSalaryLevelOptions) => {
  const { year, salary } = options;
  const salaryLevels = getSalaryLevelsByYear(year);
  const salaryLevel = salaryLevels.find((level) => level.salary >= salary);
  if (!salaryLevel) {
    // ToDo: (20250727 - Luphia) 定義 ErrorCode 與 ErrorMessage
    throw new Error(`No salary level found for year ${year} and salary ${salary}`);
  }
  return salaryLevel;
};

const salaryCalculator = (options: iSalaryCalculatorOptions): iSalaryCalculatorResult => {
  const {
    year,
    month,
    workedDays,
    baseSalaryTaxable,
    baseSalaryTaxFree,
    otherAllowancesTaxable,
    otherAllowancesTaxFree,
    overTimeHoursTaxable100,
    overTimeHoursTaxable133,
    overTimeHoursTaxable166,
    overTimeHoursTaxable200,
    overTimeHoursTaxable233,
    overTimeHoursTaxable266,
    overTimeHoursTaxFree100,
    overTimeHoursTaxFree133,
    overTimeHoursTaxFree166,
    overTimeHoursTaxFree200,
    overTimeHoursTaxFree233,
    overTimeHoursTaxFree266,
    sickLeaveHours,
    personalLeaveHours,
    employeeBurdenHealthInsurancePremiums,
    employeeBurdenSecondGenerationHealthInsurancePremiums,
    employeeBurdenOtherOverflowDeductions,
    employeeBurdenPensionInsurance,
  } = options;

  // Info: (20250727 - Luphia) 計算勞保、健保、勞退費用
  const salaryLevel = getSalaryLevel({ year, salary: baseSalaryTaxable });
  const healthInsuranceLevel = salaryLevel.salary;
  const laborInsuranceLevel = salaryLevel.salary;
  const employmentInsuranceLevel = salaryLevel.salary;
  const occupationalDisasterInsuranceLevel = salaryLevel.salary;
  const pensionInsuranceLevel = salaryLevel.salary;
  const insuredSalary = salaryLevel.salary;

  // ToDo: (20250727 - Luphia) 計算代扣所得稅款
  const employeeBurdenIncomeTax = 0;

  // ToDo: (20250727 - Luphia) 定義職災行業別費率
  const occupationalDisasterIndustryRate = 0;

  // Info: (20250727 - Luphia) 計算當月總日數
  const daysInMonth = new Date(year, month, 0).getDate();
  const hoursInMonth = daysInMonth * 8;
  const resultBaseSalaryTaxable = Math.ceil((baseSalaryTaxable / daysInMonth) * workedDays);
  const baseSalaryPerHourTaxable = baseSalaryTaxable / (daysInMonth * 8);

  // Info: (20250727 - Luphia) 計算在職小時數
  const workedHours = workedDays * 8;

  // Info: (20250727 - Luphia) 計算加班費，無條件進入整數位
  const overTimePayTaxable = Math.ceil(
    (overTimeHoursTaxable100 +
      overTimeHoursTaxable133 * 1.33 +
      overTimeHoursTaxable166 * 1.66 +
      overTimeHoursTaxable200 * 2 +
      overTimeHoursTaxable233 * 2.33 +
      overTimeHoursTaxable266 * 2.66) *
      baseSalaryPerHourTaxable
  );
  const overTimePayTaxFree = Math.ceil(
    (overTimeHoursTaxFree100 +
      overTimeHoursTaxFree133 * 1.33 +
      overTimeHoursTaxFree166 * 1.66 +
      overTimeHoursTaxFree200 * 2 +
      overTimeHoursTaxFree233 * 2.33 +
      overTimeHoursTaxFree266 * 2.66) *
      baseSalaryPerHourTaxable
  );

  // Info: (20250727 - Luphia) 計算請假扣薪，無條件捨棄小數位
  const leaveDeduction = Math.floor(
    (sickLeaveHours / 2 + personalLeaveHours) * baseSalaryPerHourTaxable
  );

  // Info: (20250727 - Luphia) 計算伙食費，無條件進入整數位
  const resultBaseSalaryTaxFree = Math.ceil((baseSalaryTaxFree / hoursInMonth) * workedHours);

  // Info: (20250727 - Luphia) 計算薪資加項
  const totalSalaryTaxable = resultBaseSalaryTaxable + overTimePayTaxable + otherAllowancesTaxable;
  const totalSalaryTaxFree = resultBaseSalaryTaxFree + overTimePayTaxFree + otherAllowancesTaxFree;
  const totalSalary = totalSalaryTaxable + totalSalaryTaxFree;

  // Info: (20250727 - Luphia) 計算員工負擔與扣項
  const employeeBurdenLaborInsurance = salaryLevel.laborInsurance.employee;
  const employeeBurdenHealthInsurance =
    salaryLevel.healthInsurance.employee + employeeBurdenHealthInsurancePremiums;
  const totalEmployeeBurden =
    employeeBurdenLaborInsurance +
    employeeBurdenHealthInsurance +
    employeeBurdenPensionInsurance +
    employeeBurdenIncomeTax +
    employeeBurdenSecondGenerationHealthInsurancePremiums +
    employeeBurdenOtherOverflowDeductions +
    leaveDeduction;

  // Info: (20250727 - Luphia) 計算公司負擔
  const companyBurdenHealthInsurance = salaryLevel.healthInsurance.company;
  const companyBurdenLaborInsurance = salaryLevel.laborInsurance.company;
  const companyBurdenPensionInsurance = salaryLevel.pensionInsurance.company;
  const totalCompanyBurden =
    companyBurdenHealthInsurance + companyBurdenLaborInsurance + companyBurdenPensionInsurance;

  // Info: (20250727 - Luphia) 計算給付總額
  const totalPayment = totalSalary - totalEmployeeBurden;

  const result: iSalaryCalculatorResult = {
    totalPayment, // Info: (20250727 - Luphia) 實際給付金額
    baseSalaryTaxable: resultBaseSalaryTaxable, // Info: (20250727 - Luphia) 本薪（應稅）
    overTimePayTaxable, // Info: (20250727 - Luphia) 加班費（應稅）
    otherAllowancesTaxable, // Info: (20250727 - Luphia) 其他加給（應稅）
    totalSalaryTaxable, // Info: (20250727 - Luphia) 總應稅薪資
    baseSalaryTaxFree: resultBaseSalaryTaxFree, // Info: (20250727 - Luphia) 伙食費（免稅）
    overTimePayTaxFree, // Info: (20250727 - Luphia) 加班費（免稅）
    otherAllowancesTaxFree, // Info: (20250727 - Luphia) 其他津貼（免稅）
    totalSalaryTaxFree, // Info: (20250727 - Luphia) 總免稅薪資
    totalSalary, // Info: (20250727 - Luphia) 月薪資合計
    healthInsuranceLevel, // Info: (20250727 - Luphia) 健保投保級距
    laborInsuranceLevel, // Info: (20250727 - Luphia) 勞保投保級距
    employmentInsuranceLevel, // Info: (20250727 - Luphia) 就業保險級距
    occupationalDisasterInsuranceLevel, // Info: (20250727 - Luphia) 職災保險級距
    pensionInsuranceLevel, // Info: (20250727 - Luphia) 勞退級距
    occupationalDisasterIndustryRate, // Info: (20250727 - Luphia) 職災行業別費率
    insuredSalary, // Info: (20250727 - Luphia) 投保薪資
    employeeBurdenLaborInsurance, // Info: (20250727 - Luphia) 員工負擔勞保費
    employeeBurdenHealthInsurance, // Info: (20250727 - Luphia) 員工負擔健保費
    employeeBurdenPensionInsurance, // Info: (20250727 - Luphia) 員工自願提繳退休金
    employeeBurdenIncomeTax, // Info: (20250727 - Luphia) 代扣所得稅款
    employeeBurdenSecondGenerationHealthInsurancePremiums, // Info: (20250727 - Luphia) 代扣二代健保費
    employeeBurdenOtherOverflowDeductions, // Info: (20250727 - Luphia) 其他溢扣／補收
    leaveDeduction, // Info: (20250727 - Luphia) 請假扣薪
    totalEmployeeBurden, // Info: (20250727 - Luphia) 員工負擔總計
    companyBurdenLaborInsurance, // Info: (20270727 - Luphia) 公司負擔勞保費
    companyBurdenHealthInsurance, // Info: (20270727 - Luphia) 公司負擔健保費
    companyBurdenPensionInsurance, // Info: (20270727 - Luphia) 公司負擔退休金
    totalCompanyBurden, // Info: (20270727 - Luphia) 公司負擔勞健退
  };
  return result;
};

export { salaryCalculator };
