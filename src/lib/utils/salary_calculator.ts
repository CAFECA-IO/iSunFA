import {
  ISalaryLevel,
  SALARY_LEVELS,
  ISalaryDeduction,
  SALARY_DEDUCTIONS,
} from '@/constants/salary_levels';
import {
  IGetSalaryLevelOptions,
  ISalaryCalculatorOptions,
  ISalaryCalculatorResult,
} from '@/interfaces/salary_calculator';

const getSalaryLevelsByYear = (year: number): ISalaryLevel[] => {
  const salaryLevels = SALARY_LEVELS.find((level) => level.year <= year);
  if (!salaryLevels) {
    // ToDo: (20250727 - Luphia) 定義 ErrorCode 與 ErrorMessage
    throw new Error(`No salary levels found for year ${year}`);
  }
  return salaryLevels.data;
};

const getSalaryLevel = (options: IGetSalaryLevelOptions) => {
  const { year, salary } = options;
  const salaryLevels = getSalaryLevelsByYear(year);
  let salaryLevel = salaryLevels.find((level) => level.salary >= salary);
  // Info: (20250727 - Luphia) 如果薪資超過最大級距，則使用最大級距
  if (salary > salaryLevels[salaryLevels.length - 1].salary) {
    salaryLevel = salaryLevels[salaryLevels.length - 1];
  }
  if (!salaryLevel) {
    // ToDo: (20250727 - Luphia) 定義 ErrorCode 與 ErrorMessage
    throw new Error(`No salary level found for year ${year} and salary ${salary}`);
  }
  return salaryLevel;
};

const getMinimumWage = (year: number): number => {
  // Info: (20250825 - Luphia) 1 元健保級距即為最低薪資
  const salaryLevels = getSalaryLevel({ year, salary: 1 });
  return salaryLevels.healthInsurance.salary;
};

const getSalaryDeductionsByYear = (year: number): ISalaryDeduction[] => {
  const salaryDeduction = SALARY_DEDUCTIONS.find((deduction) => deduction.year === year);
  if (!salaryDeduction) {
    // ToDo: (20250727 - Luphia) 定義 ErrorCode 與 ErrorMessage
    throw new Error(`No salary deduction found for year ${year}`);
  }
  return salaryDeduction.data;
};

const getForeignEmployeeBurdenIncomeTax = (year: number, salary: number): number => {
  /* Info: (20250825 - Luphia) 外籍員工代扣所得稅
   * 1. 外籍人士薪資小於 1.5 倍最低薪資，預扣 6%
   * 2. 外籍人士薪資大於等於 1.5 倍最低薪資，預扣 18%
   * 3. 採四捨五入計算
   */
  const minimumWage = getMinimumWage(year);
  const employeeBurdenIncomeTax =
    salary < minimumWage * 1.5 ? Math.round(salary * 0.06) : Math.round(salary * 0.18);
  return employeeBurdenIncomeTax;
};

const getEmployeeBurdenIncomeTax = (
  year: number,
  salary: number,
  dependentsCount: number
): number => {
  // Info: (20250825 - Luphia) 員工預扣所得稅，用查表法
  const salaryDeduction = getSalaryDeductionsByYear(year);
  let deductionLevel = salaryDeduction.find((deduction) => deduction[0] >= salary);
  // Info: (20250727 - Luphia) 如果薪資超過最大級距，則使用最大級距
  if (salary > salaryDeduction[salaryDeduction.length - 1][0]) {
    deductionLevel = salaryDeduction[salaryDeduction.length - 1];
  }
  if (!deductionLevel) {
    // ToDo: (20250727 - Luphia) 定義 ErrorCode 與 ErrorMessage
    throw new Error(`No salary deduction found for year ${year} and salary ${salary}`);
  }
  const deductionAmount = deductionLevel[dependentsCount + 1];
  return deductionAmount;
};

const salaryCalculator = (options: ISalaryCalculatorOptions): ISalaryCalculatorResult => {
  const { year, month } = options;
  // Info: (20250815 - Luphia) 取得是否保勞健退
  const isLaborInsuranceEnrolled = options.isLaborInsuranceEnrolled ?? false;
  const isHealthInsuranceEnrolled = options.isHealthInsuranceEnrolled ?? false;
  const isPensionInsuranceEnrolled = options.isPensionInsuranceEnrolled ?? false;

  // Info: (20250825 - Luphia) 取得有效扶養人數
  const dependentsCount = (options.dependentsCount ?? 0) > 0 ? (options.dependentsCount ?? 0) : 0;

  // Info: (20250814 - Luphia) 取得有效薪資數字
  const baseSalaryTaxable =
    (options.baseSalaryTaxable ?? 0) > 0 ? (options.baseSalaryTaxable ?? 0) : 0;
  const baseSalaryTaxFree =
    (options.baseSalaryTaxFree ?? 0) > 0 ? (options.baseSalaryTaxFree ?? 0) : 0;
  const otherAllowancesTaxable =
    (options.otherAllowancesTaxable ?? 0) > 0 ? (options.otherAllowancesTaxable ?? 0) : 0;
  const otherAllowancesTaxFree =
    (options.otherAllowancesTaxFree ?? 0) > 0 ? (options.otherAllowancesTaxFree ?? 0) : 0;

  // Info: (20250814 - Luphia) 取得有效加班時數
  const overTimeHoursTaxable100 =
    (options.overTimeHoursTaxable100 ?? 0) > 0 ? (options.overTimeHoursTaxable100 ?? 0) : 0;
  const overTimeHoursTaxable133 =
    (options.overTimeHoursTaxable133 ?? 0) > 0 ? (options.overTimeHoursTaxable133 ?? 0) : 0;
  const overTimeHoursTaxable166 =
    (options.overTimeHoursTaxable166 ?? 0) > 0 ? (options.overTimeHoursTaxable166 ?? 0) : 0;
  const overTimeHoursTaxable200 =
    (options.overTimeHoursTaxable200 ?? 0) > 0 ? (options.overTimeHoursTaxable200 ?? 0) : 0;
  const overTimeHoursTaxable233 =
    (options.overTimeHoursTaxable233 ?? 0) > 0 ? (options.overTimeHoursTaxable233 ?? 0) : 0;
  const overTimeHoursTaxable266 =
    (options.overTimeHoursTaxable266 ?? 0) > 0 ? (options.overTimeHoursTaxable266 ?? 0) : 0;
  const overTimeHoursTaxFree100 =
    (options.overTimeHoursTaxFree100 ?? 0) > 0 ? (options.overTimeHoursTaxFree100 ?? 0) : 0;
  const overTimeHoursTaxFree133 =
    (options.overTimeHoursTaxFree133 ?? 0) > 0 ? (options.overTimeHoursTaxFree133 ?? 0) : 0;
  const overTimeHoursTaxFree166 =
    (options.overTimeHoursTaxFree166 ?? 0) > 0 ? (options.overTimeHoursTaxFree166 ?? 0) : 0;
  const overTimeHoursTaxFree200 =
    (options.overTimeHoursTaxFree200 ?? 0) > 0 ? (options.overTimeHoursTaxFree200 ?? 0) : 0;
  const overTimeHoursTaxFree233 =
    (options.overTimeHoursTaxFree233 ?? 0) > 0 ? (options.overTimeHoursTaxFree233 ?? 0) : 0;
  const overTimeHoursTaxFree266 =
    (options.overTimeHoursTaxFree266 ?? 0) > 0 ? (options.overTimeHoursTaxFree266 ?? 0) : 0;

  // Info: (20250815 - Luphia) 取得有效加保金額
  const employeeBurdenHealthInsurancePremiums =
    typeof options.employeeBurdenHealthInsurancePremiums === 'number'
      ? options.employeeBurdenHealthInsurancePremiums
      : 0;
  const employeeBurdenOtherOverflowDeductions =
    typeof options.employeeBurdenOtherOverflowDeductions === 'number'
      ? options.employeeBurdenOtherOverflowDeductions
      : 0;
  let employeeBurdenPensionInsurance = 0;
  if (
    typeof options.employeeBurdenPensionInsurance === 'number' &&
    options.employeeBurdenPensionInsurance > 0
  ) {
    employeeBurdenPensionInsurance = options.employeeBurdenPensionInsurance;
    // Info: (20250815 - Luphia) 員工自負勞退只有 1%, 2%, 3%, 4%, 5%, 6%
    if (![0.01, 0.02, 0.03, 0.04, 0.05, 0.06].includes(employeeBurdenPensionInsurance)) {
      employeeBurdenPensionInsurance = 0;
    }
  }

  // Info: (20250814 - Luphia) 取得有效請假時數
  const sickLeaveHours =
    typeof options.sickLeaveHours === 'number' && options.sickLeaveHours > 0
      ? options.sickLeaveHours
      : 0;
  const personalLeaveHours =
    typeof options.personalLeaveHours === 'number' && options.personalLeaveHours > 0
      ? options.personalLeaveHours
      : 0;

  // Info: (20250814 - Luphia) 是否使用 30 日制計算薪資
  const isUsing30DaysSystem = options.baseSalary30Days ?? false;

  // Info: (20250814 - Luphia) 取得記錄月份總日數
  const realDaysInMonth = new Date(year, month, 0).getDate();
  // Info: (20250814 - Luphia) 取得員工記薪起始日
  const employeeStartDate = options.employeeStartDate
    ? new Date(options.employeeStartDate * 1000).getDate()
    : 1;
  // Info: (20250814 - Luphia) 取得員工記薪結束日
  const employeeEndDateRaw = options.employeeEndDate
    ? new Date(options.employeeEndDate * 1000).getDate()
    : realDaysInMonth;
  const employeeEndDate =
    employeeEndDateRaw > realDaysInMonth || employeeEndDateRaw < employeeStartDate
      ? realDaysInMonth
      : employeeEndDateRaw;
  // Info: (20250814 - Luphia) 計算基礎薪資比例 1. 完整一個月 2. 工作不滿一個月但等於 30 日 3. 該月不到 30 日且工作不滿一個月
  const baseSalaryRatio = isUsing30DaysSystem
    ? // Info: (20250814 - Luphia) 30 日制計算方式
      employeeStartDate === 1 && employeeEndDate === realDaysInMonth
      ? 30 / 30
      : realDaysInMonth < 30
        ? (employeeEndDate - employeeStartDate + 1 + 30 - realDaysInMonth) / 30
        : (employeeEndDate - employeeStartDate + 1) / 30
    : // Info: (20250814 - Luphia) 際日曆天數計算方式
      (employeeEndDate - employeeStartDate + 1) / realDaysInMonth;

  // Info: (20250814 - Luphia) 計算約定月薪
  const baseSalary = baseSalaryTaxable + baseSalaryTaxFree;

  // Info: (20250814 - Luphia) 計算當月基礎薪資
  const baseSalaryTaxablePay = Math.ceil(baseSalaryTaxable * baseSalaryRatio);
  const baseSalaryTaxFreePay = Math.ceil(baseSalaryTaxFree * baseSalaryRatio);

  // Info: (20250727 - Luphia) 計算勞保、健保、勞退費用
  const salaryLevel = getSalaryLevel({ year, salary: baseSalary });
  const healthInsuranceLevel = salaryLevel.healthInsurance.salary;
  const laborInsuranceLevel = salaryLevel.laborInsurance.salary;
  const employmentInsuranceLevel = salaryLevel.salary;
  const occupationalDisasterInsuranceLevel = salaryLevel.salary;
  const pensionInsuranceLevel = salaryLevel.pensionInsurance.salary;
  const insuredSalary = baseSalary;

  // ToDo: (20250727 - Luphia) 定義職災行業別費率
  const occupationalDisasterIndustryRate = 0;

  // Info: (20250727 - Luphia) 計算當月總日數
  const daysInMonth = isUsing30DaysSystem ? 30 : new Date(year, month, 0).getDate();

  // Info: (20250727 - Luphia) 計算每小時薪資
  const baseSalaryTaxablePerHour = baseSalaryTaxable / (daysInMonth * 8);
  const baseSalaryTaxFreePerHour = baseSalaryTaxFree / (daysInMonth * 8);
  const baseSalaryPerHour = baseSalaryTaxablePerHour + baseSalaryTaxFreePerHour;

  // Info: (20250825 - Luphia) 取得有效休假換算薪資時數，並計算折抵薪資，無條件進入整數位
  const vacationToPayHours =
    (options.vacationToPayHours ?? 0) > 0 ? (options.vacationToPayHours ?? 0) : 0;
  const vacationToPay = Math.ceil(baseSalaryPerHour * vacationToPayHours);

  // Info: (20250727 - Luphia) 總扣薪時數
  const totalLeaveHours = sickLeaveHours * 0.5 + personalLeaveHours;

  // Info: (20250727 - Luphia) 計算加班費，無條件進入整數位
  const overTimePayTaxable = Math.ceil(
    (overTimeHoursTaxable100 +
      overTimeHoursTaxable133 * 1.34 +
      overTimeHoursTaxable166 * 1.67 +
      overTimeHoursTaxable200 * 2 +
      overTimeHoursTaxable233 * 2.34 +
      overTimeHoursTaxable266 * 2.67) *
      baseSalaryPerHour
  );
  const overTimePayTaxFree = Math.ceil(
    (overTimeHoursTaxFree100 +
      overTimeHoursTaxFree133 * 1.34 +
      overTimeHoursTaxFree166 * 1.67 +
      overTimeHoursTaxFree200 * 2 +
      overTimeHoursTaxFree233 * 2.34 +
      overTimeHoursTaxFree266 * 2.67) *
      baseSalaryPerHour
  );

  // Info: (20250727 - Luphia) 計算請假扣薪，無條件捨棄小數位
  const leaveDeductionTaxable = Math.floor(
    (sickLeaveHours / 2 + totalLeaveHours) * baseSalaryTaxablePerHour
  );
  const leaveDeductionTaxFree = Math.floor(
    (sickLeaveHours / 2 + totalLeaveHours) * baseSalaryTaxFreePerHour
  );

  // Info: (20250727 - Luphia) 計算本薪（應稅），無條件進入整數位
  const resultBaseSalaryTaxable = Math.ceil(baseSalaryTaxablePay - leaveDeductionTaxable);

  // Info: (20250815 - Luphia) 計算二代健保費，若未保健保則需計算 2.11% 二代健保費，採四捨五入
  const employeeBurdenSecondGenerationHealthInsurancePremiums = isHealthInsuranceEnrolled
    ? 0
    : Math.round(resultBaseSalaryTaxable * 0.0211);

  // Info: (20250727 - Luphia) 計算伙食費，無條件進入整數位
  const resultBaseSalaryTaxFree = Math.ceil(baseSalaryTaxFreePay - leaveDeductionTaxFree);

  // Info: (20250727 - Luphia) 計算薪資加項
  const totalSalaryTaxable = resultBaseSalaryTaxable + overTimePayTaxable + otherAllowancesTaxable;
  const totalSalaryTaxFree =
    resultBaseSalaryTaxFree + overTimePayTaxFree + otherAllowancesTaxFree + vacationToPay;
  const totalSalary = totalSalaryTaxable + totalSalaryTaxFree;

  /* Info: (20250727 - Luphia)
   * 1. 計算代扣所得稅款，分本國籍與外籍人士
   * 2. 未保勞保即視為外籍人士
   * 3. 本國籍員工依照扶養人數計算預扣稅額
   */
  const isForeignNational = !isLaborInsuranceEnrolled;
  const employeeBurdenIncomeTax = isForeignNational
    ? getForeignEmployeeBurdenIncomeTax(year, totalSalary)
    : getEmployeeBurdenIncomeTax(year, totalSalary, dependentsCount);

  // Info: (20250727 - Luphia) 計算公司負擔
  // Info: (20250815 - Luphia) 若員工記薪結束日不是月底則不需要保健保
  const companyBurdenHealthInsurance =
    isHealthInsuranceEnrolled && employeeEndDateRaw === realDaysInMonth
      ? salaryLevel.healthInsurance.company
      : 0;
  // Info: (20250815 - Luphia) 按照到職日數比例計算勞保，採四捨五入
  const companyBurdenLaborInsurance = isLaborInsuranceEnrolled
    ? Math.round(salaryLevel.laborInsurance.company * baseSalaryRatio)
    : 0;
  // Info: (20250815 - Luphia) 按照到職日數比例計算勞退，採四捨五入
  const companyBurdenPensionInsurance = isPensionInsuranceEnrolled
    ? Math.round(salaryLevel.pensionInsurance.company * baseSalaryRatio)
    : 0;
  const totalCompanyBurden =
    companyBurdenHealthInsurance + companyBurdenLaborInsurance + companyBurdenPensionInsurance;

  // Info: (20250727 - Luphia) 計算員工負擔與扣項
  // Info: (20250815 - Luphia) 按照到職日數比例計算勞保，採四捨五入
  const employeeBurdenLaborInsurance = isLaborInsuranceEnrolled
    ? Math.round(salaryLevel.laborInsurance.employee * baseSalaryRatio)
    : 0;
  // Info: (20250815 - Luphia) 若員工記薪結束日不是月底則不需要保健保
  const employeeBurdenHealthInsurance =
    isHealthInsuranceEnrolled && employeeEndDateRaw === realDaysInMonth
      ? salaryLevel.healthInsurance.employee + employeeBurdenHealthInsurancePremiums
      : 0;
  // Info: (20250815 - Luphia) 根據自負比例計算實際金額
  employeeBurdenPensionInsurance *= companyBurdenPensionInsurance / 0.06;
  const totalEmployeeBurden =
    employeeBurdenLaborInsurance +
    employeeBurdenHealthInsurance +
    employeeBurdenPensionInsurance +
    employeeBurdenIncomeTax +
    employeeBurdenSecondGenerationHealthInsurancePremiums +
    employeeBurdenOtherOverflowDeductions;

  // Info: (20250727 - Luphia) 計算給付總額
  const totalPayment = totalSalary - totalEmployeeBurden;

  const result: ISalaryCalculatorResult = {
    totalPayment, // Info: (20250727 - Luphia) 實際給付金額
    baseSalaryTaxable: resultBaseSalaryTaxable, // Info: (20250727 - Luphia) 本薪（應稅）
    overTimePayTaxable, // Info: (20250727 - Luphia) 加班費（應稅）
    otherAllowancesTaxable, // Info: (20250727 - Luphia) 其他加給（應稅）
    totalSalaryTaxable, // Info: (20250727 - Luphia) 總應稅薪資
    baseSalaryTaxFree: resultBaseSalaryTaxFree, // Info: (20250727 - Luphia) 伙食費（免稅）
    overTimePayTaxFree, // Info: (20250727 - Luphia) 加班費（免稅）
    otherAllowancesTaxFree, // Info: (20250727 - Luphia) 其他津貼（免稅）
    vacationToPay, // Info: (20250825 - Luphia) 休假折抵薪資（免稅）
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
    leaveDeduction: leaveDeductionTaxable, // Info: (20250727 - Luphia) 請假扣薪
    totalEmployeeBurden, // Info: (20250727 - Luphia) 員工負擔總計
    companyBurdenLaborInsurance, // Info: (20270727 - Luphia) 公司負擔勞保費
    companyBurdenHealthInsurance, // Info: (20270727 - Luphia) 公司負擔健保費
    companyBurdenPensionInsurance, // Info: (20270727 - Luphia) 公司負擔退休金
    totalCompanyBurden, // Info: (20270727 - Luphia) 公司負擔勞健退
  };
  return result;
};

export { salaryCalculator };
