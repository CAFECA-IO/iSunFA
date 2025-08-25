import React, { useState, useMemo, createContext, useContext, useEffect } from 'react';
import { MONTHS, MonthType } from '@/constants/month';
import { ISalaryCalculator } from '@/interfaces/calculator';
import { salaryCalculator } from '@/lib/utils/salary_calculator';

type TabStep = {
  step: number;
  completed: boolean;
};

const defaultTabSteps: TabStep[] = [
  { step: 1, completed: true }, // Info: (20250714 - Julian) 由第一步開始，所以第一步永遠為已完成
  { step: 2, completed: false },
  { step: 3, completed: false },
  { step: 4, completed: false },
];

interface ICalculatorContext {
  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  currentStep: number;
  completeSteps: TabStep[]; // Info: (20250710 - Julian) 已完成的步驟
  switchStep: (step: number) => void;
  resetFormHandler: () => void;
  salaryCalculatorResult: ISalaryCalculator;

  // Info: (20250714 - Julian) 表單選項
  yearOptions: string[];
  monthOptions: MonthType[];
  payrollDaysBaseOptions: string[];

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state 和 functions
  employeeName: string;
  changeEmployeeName: (name: string) => void;
  employeeNumber: string;
  changeEmployeeNumber: (number: string) => void;
  employeeEmail: string; // Info: (20250723 - Julian) 員工電子郵件
  changeEmployeeEmail: (email: string) => void;
  selectedYear: string;
  changeSelectedYear: (year: string) => void;
  selectedMonth: MonthType;
  changeSelectedMonth: (month: MonthType) => void;
  payrollDaysBase: string;
  changePayrollDaysBase: (base: string) => void;
  isJoined: boolean;
  toggleJoined: () => void;
  dayOfJoining: string;
  changeJoinedDay: (day: string) => void;
  isLeft: boolean;
  toggleLeft: () => void;
  dayOfLeaving: string;
  changeLeavingDay: (day: string) => void;

  // Info: (20250709 - Julian) 是否有姓名錯誤
  isNameError: boolean;
  setIsNameError: React.Dispatch<React.SetStateAction<boolean>>;

  // Info: (20250709 - Julian) Step 2: 基本薪資相關 state 和 functions
  // 以下皆使用 Dispatch 來更新 state
  baseSalary: number;
  setBaseSalary: React.Dispatch<React.SetStateAction<number>>;
  mealAllowance: number;
  setMealAllowance: React.Dispatch<React.SetStateAction<number>>;
  otherAllowanceWithTax: number;
  setOtherAllowanceWithTax: React.Dispatch<React.SetStateAction<number>>;
  otherAllowanceWithoutTax: number;
  setOtherAllowanceWithoutTax: React.Dispatch<React.SetStateAction<number>>;

  // Info: (20250710 - Julian) Step 3: 工作時數相關 state 和 functions
  // Info: (20250722 - Julian) Non-taxable hours
  oneAndOneThirdsHoursForNonTax: number;
  setOneAndOneThirdsHoursForNonTax: React.Dispatch<React.SetStateAction<number>>;
  oneAndTwoThirdsHoursForNonTax: number;
  setOneAndTwoThirdsHoursForNonTax: React.Dispatch<React.SetStateAction<number>>;
  twoHoursForNonTax: number;
  setTwoHoursForNonTax: React.Dispatch<React.SetStateAction<number>>;
  twoAndOneThirdsHoursForNonTax: number;
  setTwoAndOneThirdsHoursForNonTax: React.Dispatch<React.SetStateAction<number>>;
  twoAndTwoThirdsHoursForNonTax: number;
  setTwoAndTwoThirdsHoursForNonTax: React.Dispatch<React.SetStateAction<number>>;
  totalNonTaxableHours: number; // Info: (20250710 - Julian) 總免稅加班時數
  // Info: (20250722 - Julian) Taxable hours
  oneAndOneThirdHoursForTaxable: number;
  setOneAndOneThirdsHoursForTaxable: React.Dispatch<React.SetStateAction<number>>;
  oneAndTwoThirdsHoursForTaxable: number;
  setOneAndTwoThirdsHoursForTaxable: React.Dispatch<React.SetStateAction<number>>;
  twoHoursForTaxable: number;
  setTwoHoursForTaxable: React.Dispatch<React.SetStateAction<number>>;
  twoAndOneThirdsHoursForTaxable: number;
  setTwoAndOneThirdsHoursForTaxable: React.Dispatch<React.SetStateAction<number>>;
  twoAndTwoThirdsHoursForTaxable: number;
  setTwoAndTwoThirdsHoursForTaxable: React.Dispatch<React.SetStateAction<number>>;
  totalTaxableHours: number; // Info: (20250710 - Julian) 總應稅加班時數
  // Info: (20250722 - Julian) Leave hours
  sickLeaveHours: number;
  setSickLeaveHours: React.Dispatch<React.SetStateAction<number>>;
  personalLeaveHours: number;
  setPersonalLeaveHours: React.Dispatch<React.SetStateAction<number>>;
  leavePayoutHours: number;
  setLeavePayoutHours: React.Dispatch<React.SetStateAction<number>>;

  // Info: (20250710 - Julian) Step 4: 其他相關 state 和 functions
  // 除了 VPC 皆使用 Dispatch 來更新 state
  isLaborInsurance: boolean;
  toggleLaborInsurance: () => void;
  isNHI: boolean;
  toggleNHI: () => void;
  isLaborPension: boolean;
  toggleLaborPension: () => void;
  numberOfDependents: number;
  setNumberOfDependents: React.Dispatch<React.SetStateAction<number>>;
  nhiBackPremium: number;
  setNhiBackPremium: React.Dispatch<React.SetStateAction<number>>;
  secondGenNhiTax: number;
  setSecondGenNhiTax: React.Dispatch<React.SetStateAction<number>>;
  otherAdjustments: number;
  setOtherAdjustments: React.Dispatch<React.SetStateAction<number>>;
  voluntaryPensionContribution: number;
  changeVoluntaryPensionContribution: (contribution: number) => void;
}

export interface ICalculatorProvider {
  children: React.ReactNode;
}

export const CalculatorContext = createContext<ICalculatorContext | undefined>(undefined);

export const CalculatorProvider = ({ children }: ICalculatorProvider) => {
  // Info: (20250714 - Julian) 計算機的表單選項
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth() + 1; // 月份從 0 開始，所以要加 1

  // Info: (20250714 - Julian) 年份選項：今年起往後推到 2025 年
  const yearGap = thisYear - 2025 + 1;
  const yearOptions = Array.from({ length: yearGap }, (_, i) => `${i + 2025}`).reverse();

  // Info: (20250714 - Julian) 月份選項：只顯示 1 月到現在的月份
  const monthOptions = MONTHS.slice(0, thisMonth);
  const defaultMonth = monthOptions[monthOptions.length - 1]; // Info: (20250815 - Julian) 預設為當前月份

  // Info: (20250806 - Julian) 基準天數選項：1. 固定 30 天、2. 實際天數
  const payrollDaysBaseOptions = ['FIXED', 'ACTUAL'];

  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completeSteps, setCompleteSteps] = useState<TabStep[]>(defaultTabSteps);

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  const [employeeEmail, setEmployeeEmail] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(yearOptions[0]);
  const [selectedMonth, setSelectedMonth] = useState<MonthType>(defaultMonth);
  const [payrollDaysBase, setPayrollDaysBase] = useState<string>(payrollDaysBaseOptions[0]); // Info: (20250710 - Julian) 基準天數選項
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [dayOfJoining, setDayOfJoining] = useState<string>('01'); // Info: (20250709 - Julian) 入職日期
  const [isLeft, setIsLeft] = useState<boolean>(false);
  const [dayOfLeaving, setDayOfLeaving] = useState<string>('01'); // Info: (20250709 - Julian) 離職日期

  // Info: (20250711 - Julian) 是否有姓名錯誤
  const [isNameError, setIsNameError] = useState<boolean>(false);

  // Info: (20250709 - Julian) Step 2: 基本薪資相關 state
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [mealAllowance, setMealAllowance] = useState<number>(0);
  const [otherAllowanceWithTax, setOtherAllowanceWithTax] = useState<number>(0);
  const [otherAllowanceWithoutTax, setOtherAllowanceWithoutTax] = useState<number>(0);

  // Info: (20250709 - Julian) Step 3: 工作時數相關 state
  const [oneAndOneThirdsHoursForNonTax, setOneAndOneThirdsHoursForNonTax] = useState<number>(0);
  const [oneAndTwoThirdsHoursForNonTax, setOneAndTwoThirdsHoursForNonTax] = useState<number>(0);
  const [twoHoursForNonTax, setTwoHoursForNonTax] = useState<number>(0);
  const [twoAndOneThirdsHoursForNonTax, setTwoAndOneThirdsHoursForNonTax] = useState<number>(0);
  const [twoAndTwoThirdsHoursForNonTax, setTwoAndTwoThirdsHoursForNonTax] = useState<number>(0);
  const [totalNonTaxableHours, setTotalNonTaxableHours] = useState<number>(0);
  const [oneAndOneThirdHoursForTaxable, setOneAndOneThirdsHoursForTaxable] = useState<number>(0);
  const [oneAndTwoThirdsHoursForTaxable, setOneAndTwoThirdsHoursForTaxable] = useState<number>(0);
  const [twoHoursForTaxable, setTwoHoursForTaxable] = useState<number>(0);
  const [twoAndOneThirdsHoursForTaxable, setTwoAndOneThirdsHoursForTaxable] = useState<number>(0);
  const [twoAndTwoThirdsHoursForTaxable, setTwoAndTwoThirdsHoursForTaxable] = useState<number>(0);
  const [totalTaxableHours, setTotalTaxableHours] = useState<number>(0);
  const [sickLeaveHours, setSickLeaveHours] = useState<number>(0);
  const [personalLeaveHours, setPersonalLeaveHours] = useState<number>(0);
  const [leavePayoutHours, setLeavePayoutHours] = useState<number>(0);

  // Info: (20250710 - Julian) Step 4: 其他相關 state
  const [isLaborInsurance, setIsLaborInsurance] = useState<boolean>(true);
  const [isNHI, setIsNHI] = useState<boolean>(true);
  const [isLaborPension, setIsLaborPension] = useState<boolean>(true);
  const [numberOfDependents, setNumberOfDependents] = useState<number>(0);
  const [nhiBackPremium, setNhiBackPremium] = useState<number>(0);
  const [secondGenNhiTax, setSecondGenNhiTax] = useState<number>(0);
  const [otherAdjustments, setOtherAdjustments] = useState<number>(0);
  const [voluntaryPensionContribution, setVoluntaryPensionContribution] = useState<number>(0);

  useEffect(() => {
    // Info: (20250710 - Julian) 計算總免稅加班時數
    const totalHours =
      oneAndOneThirdsHoursForNonTax +
      oneAndTwoThirdsHoursForNonTax +
      twoHoursForNonTax +
      twoAndOneThirdsHoursForNonTax +
      twoAndTwoThirdsHoursForNonTax;
    setTotalNonTaxableHours(totalHours);
  }, [
    oneAndOneThirdsHoursForNonTax,
    oneAndTwoThirdsHoursForNonTax,
    twoHoursForNonTax,
    twoAndOneThirdsHoursForNonTax,
    twoAndTwoThirdsHoursForNonTax,
  ]);

  useEffect(() => {
    // Info: (20250710 - Julian) 計算總應稅加班時數
    const totalHours =
      oneAndOneThirdHoursForTaxable +
      oneAndTwoThirdsHoursForTaxable +
      twoHoursForTaxable +
      twoAndOneThirdsHoursForTaxable +
      twoAndTwoThirdsHoursForTaxable;
    setTotalTaxableHours(totalHours);
  }, [
    oneAndOneThirdHoursForTaxable,
    oneAndTwoThirdsHoursForTaxable,
    twoHoursForTaxable,
    twoAndOneThirdsHoursForTaxable,
    twoAndTwoThirdsHoursForTaxable,
  ]);

  // Info: (20250728 - Julian) 計算結果
  // ToDo: (20250728 - Julian) 計算邏輯須搬到 lib
  const salaryCalculatorResult: ISalaryCalculator = useMemo(() => {
    const yearInt = parseInt(selectedYear, 10);
    const monthIndex = MONTHS.findIndex((month) => month.name === selectedMonth.name) + 1; // Info: (20250728 - Julian) index 從 0 開始，所以要加 1

    const employeeStartStr = `${yearInt}-${monthIndex.toString().padStart(2, '0')}-${dayOfJoining}`;
    const employeeStartTimestamp = new Date(employeeStartStr).getTime() / 1000;
    const employeeStartDate = isJoined ? employeeStartTimestamp : undefined;

    const employeeEndStr = `${yearInt}-${monthIndex.toString().padStart(2, '0')}-${dayOfLeaving}`;
    const employeeEndTimestamp = new Date(employeeEndStr).getTime() / 1000;
    const employeeEndDate = isLeft ? employeeEndTimestamp : undefined;

    // Info: (20250728 - Julian) 計算加班費（應稅）
    const overTimeHoursTaxable133 = oneAndOneThirdHoursForTaxable;
    const overTimeHoursTaxable166 = oneAndTwoThirdsHoursForTaxable;
    const overTimeHoursTaxable200 = twoHoursForTaxable;
    const overTimeHoursTaxable233 = twoAndOneThirdsHoursForTaxable;
    const overTimeHoursTaxable266 = twoAndTwoThirdsHoursForTaxable;

    // Info: (20250728 - Julian) 計算加班費（免稅）
    const overTimeHoursTaxFree133 = oneAndOneThirdsHoursForNonTax;
    const overTimeHoursTaxFree166 = oneAndTwoThirdsHoursForNonTax;
    const overTimeHoursTaxFree200 = twoHoursForNonTax;
    const overTimeHoursTaxFree233 = twoAndOneThirdsHoursForNonTax;
    const overTimeHoursTaxFree266 = twoAndTwoThirdsHoursForNonTax;

    const result = salaryCalculator({
      year: yearInt,
      month: monthIndex,
      employeeStartDate, // Info: (20250822 - Julian) 員工入職日期
      employeeEndDate, // Info: (20250822 - Julian) 員工離職日期
      baseSalaryTaxable: baseSalary, // Info: (20250728 - Julian) 當月應稅基本工資
      baseSalaryTaxFree: mealAllowance, // Info: (20250728 - Julian) 當月免稅基本工資（伙食津貼）
      otherAllowancesTaxable: otherAllowanceWithTax, // Info: (20250728 - Julian) 當月應稅其他津貼
      otherAllowancesTaxFree: otherAllowanceWithoutTax, // Info: (20250728 - Julian) 當月免稅其他津貼
      overTimeHoursTaxable133, // Info: (20250728 - Julian) 當月 133% 加班費（應稅）
      overTimeHoursTaxable166, // Info: (20250728 - Julian) 當月 166% 加班費（應稅）
      overTimeHoursTaxable200, // Info: (20250728 - Julian) 當月 200% 加班費（應稅）
      overTimeHoursTaxable233, // Info: (20250728 - Julian) 當月 233% 加班費（應稅）
      overTimeHoursTaxable266, // Info: (20250728 - Julian) 當月 266% 加班費（應稅）
      overTimeHoursTaxFree133, // Info: (20250728 - Julian) 當月 133% 加班費（免稅）
      overTimeHoursTaxFree166, // Info: (20250728 - Julian) 當月 166% 加班費（免稅）
      overTimeHoursTaxFree200, // Info: (20250728 - Julian) 當月 200% 加班費（免稅）
      overTimeHoursTaxFree233, // Info: (20250728 - Julian) 當月 233% 加班費（免稅）
      overTimeHoursTaxFree266, // Info: (20250728 - Julian) 當月 266% 加班費（免稅）
      vacationToPayHours: leavePayoutHours, // Info: (20250819 - Julian) 休假換算成薪資的時數
      sickLeaveHours, // Info: (20250728 - Julian) 當月病假時數
      personalLeaveHours, // Info: (20250728 - Julian) 當月事假時數
      isLaborInsuranceEnrolled: isLaborInsurance, // Info: (20250819 - Julian) 是否投保勞保
      isHealthInsuranceEnrolled: isNHI, // Info: (20250819 - Julian) 是否投保健保
      isPensionInsuranceEnrolled: isLaborPension, // Info: (20250819 - Julian) 是否投保勞退
      employeeBurdenHealthInsurancePremiums: nhiBackPremium, // Info: (20250728 - Julian) 健保加保費用
      employeeBurdenSecondGenerationHealthInsurancePremiums: secondGenNhiTax, // Info: (20250728 - Julian) 二代健保費用
      employeeBurdenOtherOverflowDeductions: otherAdjustments, // Info: (20250728 - Julian) 其他溢扣／補收
      employeeBurdenPensionInsurance: voluntaryPensionContribution, // Info: (20250728 - Julian) 勞退自提金額
      dependentsCount: numberOfDependents, // Info: (20250819 - Julian) 扶養人數
      baseSalary30Days: payrollDaysBase === 'FIXED', // Info: (20250819 - Julian) 基準天數選項：是否以 30 天計算
    });

    const formattedResult: ISalaryCalculator = {
      totalSalary: result.totalPayment,
      monthlySalary: {
        baseSalaryWithTax: result.baseSalaryTaxable,
        overtimePayWithTax: result.overTimePayTaxable,
        otherAllowanceWithTax: result.otherAllowancesTaxable,
        totalSalaryWithTax: result.totalSalaryTaxable,
        mealAllowanceWithoutTax: result.baseSalaryTaxFree,
        overtimePayWithoutTax: result.overTimePayTaxFree,
        otherAllowanceWithoutTax: result.otherAllowancesTaxFree,
        leaveSalaryWithoutTax: result.vacationToPay,
        totalSalaryWithoutTax: result.totalSalaryTaxFree,
        totalMonthlySalary: result.totalSalary,
      },
      employeeContribution: {
        employeePaidLaborInsurance: result.employeeBurdenLaborInsurance,
        employeePaidHealthInsurance: result.employeeBurdenHealthInsurance,
        healthInsuranceAdditionalPremium: 0,
        voluntaryPensionContribution: result.employeeBurdenPensionInsurance,
        withheldIncomeTax: result.employeeBurdenIncomeTax,
        withheldSecondGenerationNHIPremium:
          result.employeeBurdenSecondGenerationHealthInsurancePremiums,
        salaryDeductionForLeave: result.leaveDeduction,
        otherDeductionsOrAdjustments: result.employeeBurdenOtherOverflowDeductions,
        totalEmployeeBurden: result.totalEmployeeBurden,
      },
      insuredSalary: {
        healthInsuranceSalaryBracket: result.healthInsuranceLevel,
        laborInsuranceSalaryBracket: result.laborInsuranceLevel,
        employmentInsuranceSalaryBracket: result.employmentInsuranceLevel,
        occupationalInjuryInsuranceSalaryBracket: result.occupationalDisasterInsuranceLevel,
        laborPensionSalaryBracket: result.pensionInsuranceLevel,
        occupationalInjuryIndustryRate: result.occupationalDisasterIndustryRate,
        insuredSalary: result.insuredSalary,
      },
      employerContribution: {
        employerPaidLaborInsurance: result.companyBurdenLaborInsurance,
        employerPaidHealthInsurance: result.companyBurdenHealthInsurance,
        employerPaidPensionContribution: result.companyBurdenPensionInsurance,
        totalEmployerCost: result.totalCompanyBurden,
      },
    };

    return formattedResult;
  }, [
    selectedYear,
    selectedMonth,
    isJoined,
    dayOfJoining,
    isLeft,
    dayOfLeaving,
    baseSalary,
    oneAndOneThirdHoursForTaxable,
    oneAndTwoThirdsHoursForTaxable,
    twoHoursForTaxable,
    twoAndOneThirdsHoursForTaxable,
    twoAndTwoThirdsHoursForTaxable,
    mealAllowance,
    oneAndOneThirdsHoursForNonTax,
    oneAndTwoThirdsHoursForNonTax,
    twoHoursForNonTax,
    twoAndOneThirdsHoursForNonTax,
    twoAndTwoThirdsHoursForNonTax,
    otherAllowanceWithTax,
    otherAllowanceWithoutTax,
    sickLeaveHours,
    personalLeaveHours,
    leavePayoutHours,
    isLaborInsurance,
    isNHI,
    isLaborPension,
    numberOfDependents,
    nhiBackPremium,
    secondGenNhiTax,
    otherAdjustments,
    voluntaryPensionContribution,
  ]);

  // Info: (20250709 - Julian) 切換步驟
  const switchStep = (step: number) => {
    // Info: (20250714 - Julian) 將當前步驟標記為已完成
    setCompleteSteps((prev) => {
      const updatedSteps = prev.map((s) => {
        return s.step === step ? { ...s, completed: true } : s;
      });
      return updatedSteps;
    });

    // Info: (20250714 - Julian) 如果步驟超出範圍，則限制在 1 到 4 之間
    const targetStep = step > 4 ? 4 : step < 1 ? 1 : step;
    setCurrentStep(targetStep);
  };

  // Info: (20250709 - Julian) 重置表單
  const resetFormHandler = () => {
    // Info: (20250710 - Julian) 清空 input 欄位
    setEmployeeName('');
    setEmployeeNumber('');
    setEmployeeEmail('');
    setSelectedYear(yearOptions[0]);
    setSelectedMonth(defaultMonth);
    setPayrollDaysBase(payrollDaysBaseOptions[0]);
    setIsJoined(false);
    setIsLeft(false);
    setDayOfJoining('01');
    setDayOfLeaving('01');
    setBaseSalary(0);
    setMealAllowance(0);
    setOtherAllowanceWithTax(0);
    setOtherAllowanceWithoutTax(0);
    // Info: (20250722 - Julian) 重置工作時數相關 state
    setOneAndOneThirdsHoursForNonTax(0);
    setOneAndTwoThirdsHoursForNonTax(0);
    setTwoHoursForNonTax(0);
    setTwoAndOneThirdsHoursForNonTax(0);
    setTwoAndTwoThirdsHoursForNonTax(0);
    setTotalNonTaxableHours(0);
    setOneAndOneThirdsHoursForTaxable(0);
    setOneAndTwoThirdsHoursForTaxable(0);
    setTwoHoursForTaxable(0);
    setTwoAndOneThirdsHoursForTaxable(0);
    setTwoAndTwoThirdsHoursForTaxable(0);
    setTotalTaxableHours(0);
    setSickLeaveHours(0);
    setPersonalLeaveHours(0);
    setLeavePayoutHours(0);
    setIsLaborInsurance(true);
    setIsNHI(true);
    setIsLaborPension(true);
    setNhiBackPremium(0);
    setSecondGenNhiTax(0);
    setOtherAdjustments(0);
    setVoluntaryPensionContribution(0);
    setNumberOfDependents(0);
    // Info: (20250710 - Julian) 重置計算機狀態
    // setSalaryCalculatorResult(defaultSalaryCalculatorResult);
    // Info: (20250710 - Julian) 重置步驟狀態
    setCompleteSteps(defaultTabSteps);
    setCurrentStep(1);
    setIsNameError(false);
  };

  // Info: (20250709 - Julian) =========== 基本資訊相關 state 和 functions ===========
  const changeEmployeeName = (name: string) => {
    setEmployeeName(name);
    setIsNameError(name === ''); // Info: (20250711 - Julian) 如果未填姓名則顯示錯誤
  };
  const changeEmployeeNumber = (number: string) => {
    setEmployeeNumber(number);
  };
  const changeEmployeeEmail = (email: string) => {
    setEmployeeEmail(email);
  };
  const changeSelectedYear = (year: string) => {
    setSelectedYear(year);
  };
  const changeSelectedMonth = (month: MonthType) => {
    setSelectedMonth(month);
  };
  const changePayrollDaysBase = (base: string) => {
    setPayrollDaysBase(base);
  };
  const changeJoinedDay = (day: string) => {
    setDayOfJoining(day);
  };
  const changeLeavingDay = (day: string) => {
    setDayOfLeaving(day);
  };
  const toggleJoined = () => setIsJoined((prev) => !prev);
  const toggleLeft = () => setIsLeft((prev) => !prev);

  // Info: (20250710 - Julian) =========== 其他相關 state 和 functions ===========
  const toggleLaborInsurance = () => setIsLaborInsurance((prev) => !prev);
  const toggleNHI = () => setIsNHI((prev) => !prev);
  const toggleLaborPension = () => setIsLaborPension((prev) => !prev);
  const changeVoluntaryPensionContribution = (contribution: number) => {
    setVoluntaryPensionContribution(contribution);
  };

  const value = useMemo(
    () => ({
      yearOptions,
      monthOptions,
      payrollDaysBaseOptions,
      currentStep,
      completeSteps,
      salaryCalculatorResult,
      switchStep,
      resetFormHandler,
      employeeName,
      changeEmployeeName,
      employeeNumber,
      changeEmployeeNumber,
      employeeEmail,
      changeEmployeeEmail,
      selectedYear,
      changeSelectedYear,
      selectedMonth,
      changeSelectedMonth,
      payrollDaysBase,
      changePayrollDaysBase,
      isJoined,
      toggleJoined,
      dayOfJoining,
      changeJoinedDay,
      isLeft,
      toggleLeft,
      dayOfLeaving,
      changeLeavingDay,
      baseSalary,
      setBaseSalary,
      mealAllowance,
      setMealAllowance,
      otherAllowanceWithTax,
      setOtherAllowanceWithTax,
      otherAllowanceWithoutTax,
      setOtherAllowanceWithoutTax,
      isNameError,
      setIsNameError,
      oneAndOneThirdsHoursForNonTax,
      setOneAndOneThirdsHoursForNonTax,
      oneAndTwoThirdsHoursForNonTax,
      setOneAndTwoThirdsHoursForNonTax,
      twoHoursForNonTax,
      setTwoHoursForNonTax,
      twoAndOneThirdsHoursForNonTax,
      setTwoAndOneThirdsHoursForNonTax,
      twoAndTwoThirdsHoursForNonTax,
      setTwoAndTwoThirdsHoursForNonTax,
      totalNonTaxableHours,
      oneAndOneThirdHoursForTaxable,
      setOneAndOneThirdsHoursForTaxable,
      oneAndTwoThirdsHoursForTaxable,
      setOneAndTwoThirdsHoursForTaxable,
      twoHoursForTaxable,
      setTwoHoursForTaxable,
      twoAndOneThirdsHoursForTaxable,
      setTwoAndOneThirdsHoursForTaxable,
      twoAndTwoThirdsHoursForTaxable,
      setTwoAndTwoThirdsHoursForTaxable,
      totalTaxableHours,
      sickLeaveHours,
      setSickLeaveHours,
      personalLeaveHours,
      setPersonalLeaveHours,
      leavePayoutHours,
      setLeavePayoutHours,
      isLaborInsurance,
      toggleLaborInsurance,
      isNHI,
      toggleNHI,
      isLaborPension,
      toggleLaborPension,
      numberOfDependents,
      setNumberOfDependents,
      nhiBackPremium,
      setNhiBackPremium,
      secondGenNhiTax,
      setSecondGenNhiTax,
      otherAdjustments,
      setOtherAdjustments,
      voluntaryPensionContribution,
      changeVoluntaryPensionContribution,
    }),
    [
      yearOptions,
      monthOptions,
      payrollDaysBaseOptions,
      currentStep,
      completeSteps,
      salaryCalculatorResult,
      employeeName,
      employeeNumber,
      employeeEmail,
      selectedYear,
      selectedMonth,
      payrollDaysBase,
      isJoined,
      dayOfJoining,
      isLeft,
      dayOfLeaving,
      baseSalary,
      mealAllowance,
      otherAllowanceWithTax,
      otherAllowanceWithoutTax,
      isNameError,
      oneAndOneThirdsHoursForNonTax,
      oneAndTwoThirdsHoursForNonTax,
      twoHoursForNonTax,
      twoAndOneThirdsHoursForNonTax,
      twoAndTwoThirdsHoursForNonTax,
      totalNonTaxableHours,
      oneAndOneThirdHoursForTaxable,
      oneAndTwoThirdsHoursForTaxable,
      twoHoursForTaxable,
      twoAndOneThirdsHoursForTaxable,
      twoAndTwoThirdsHoursForTaxable,
      totalTaxableHours,
      sickLeaveHours,
      personalLeaveHours,
      leavePayoutHours,
      isLaborInsurance,
      isNHI,
      isLaborPension,
      numberOfDependents,
      nhiBackPremium,
      secondGenNhiTax,
      otherAdjustments,
      voluntaryPensionContribution,
    ]
  );

  return <CalculatorContext.Provider value={value}>{children}</CalculatorContext.Provider>;
};

export const useCalculatorCtx = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculatorCtx must be used within a CalculatorProvider');
  }
  return context;
};
