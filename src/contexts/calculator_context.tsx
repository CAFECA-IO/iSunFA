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
  workedDays: number;
  // Info: (20250709 - Julian) <NumericInput /> 這個元件須使用 Dispatch 來更新 state
  setWorkedDays: React.Dispatch<React.SetStateAction<number>>;

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
  threeAndTwoThirdsHoursForNonTax: number;
  setThreeAndTwoThirdsHoursForNonTax: React.Dispatch<React.SetStateAction<number>>;
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
  threeAndTwoThirdsHoursForTaxable: number;
  setThreeAndTwoThirdsHoursForTaxable: React.Dispatch<React.SetStateAction<number>>;
  totalTaxableHours: number; // Info: (20250710 - Julian) 總應稅加班時數
  // Info: (20250722 - Julian) Leave hours
  sickLeaveHours: number;
  setSickLeaveHours: React.Dispatch<React.SetStateAction<number>>;
  personalLeaveHours: number;
  setPersonalLeaveHours: React.Dispatch<React.SetStateAction<number>>;
  totalLeaveHours: number;

  // Info: (20250710 - Julian) Step 4: 其他相關 state 和 functions
  // 除了 VPC 皆使用 Dispatch 來更新 state
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

  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completeSteps, setCompleteSteps] = useState<TabStep[]>(defaultTabSteps);

  // ToDo: (20250710 - Julian) 計算機的整體計算結果
  // const [salaryCalculatorResult, setSalaryCalculatorResult] = useState<ISalaryCalculator>(
  //   defaultSalaryCalculatorResult
  // );

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  const [employeeEmail, setEmployeeEmail] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(yearOptions[0]);
  const [selectedMonth, setSelectedMonth] = useState<MonthType>(monthOptions[0]);
  const [workedDays, setWorkedDays] = useState<number>(31);

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
  const [threeAndTwoThirdsHoursForNonTax, setThreeAndTwoThirdsHoursForNonTax] = useState<number>(0);
  const [totalNonTaxableHours, setTotalNonTaxableHours] = useState<number>(0);
  const [oneAndOneThirdHoursForTaxable, setOneAndOneThirdsHoursForTaxable] = useState<number>(0);
  const [oneAndTwoThirdsHoursForTaxable, setOneAndTwoThirdsHoursForTaxable] = useState<number>(0);
  const [twoHoursForTaxable, setTwoHoursForTaxable] = useState<number>(0);
  const [twoAndOneThirdsHoursForTaxable, setTwoAndOneThirdsHoursForTaxable] = useState<number>(0);
  const [twoAndTwoThirdsHoursForTaxable, setTwoAndTwoThirdsHoursForTaxable] = useState<number>(0);
  const [threeAndTwoThirdsHoursForTaxable, setThreeAndTwoThirdsHoursForTaxable] =
    useState<number>(0);
  const [totalTaxableHours, setTotalTaxableHours] = useState<number>(0);
  const [sickLeaveHours, setSickLeaveHours] = useState<number>(0);
  const [personalLeaveHours, setPersonalLeaveHours] = useState<number>(0);
  const [totalLeaveHours, setTotalLeaveHours] = useState<number>(0);

  // Info: (20250710 - Julian) Step 4: 其他相關 state
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
      twoAndTwoThirdsHoursForNonTax +
      threeAndTwoThirdsHoursForNonTax;
    setTotalNonTaxableHours(totalHours);
  }, [
    oneAndOneThirdsHoursForNonTax,
    oneAndTwoThirdsHoursForNonTax,
    twoHoursForNonTax,
    twoAndOneThirdsHoursForNonTax,
    twoAndTwoThirdsHoursForNonTax,
    threeAndTwoThirdsHoursForNonTax,
  ]);

  useEffect(() => {
    // Info: (20250710 - Julian) 計算總應稅加班時數
    const totalHours =
      oneAndOneThirdHoursForTaxable +
      oneAndTwoThirdsHoursForTaxable +
      twoHoursForTaxable +
      twoAndOneThirdsHoursForTaxable +
      twoAndTwoThirdsHoursForTaxable +
      threeAndTwoThirdsHoursForTaxable;
    setTotalTaxableHours(totalHours);
  }, [
    oneAndOneThirdHoursForTaxable,
    oneAndTwoThirdsHoursForTaxable,
    twoHoursForTaxable,
    twoAndOneThirdsHoursForTaxable,
    twoAndTwoThirdsHoursForTaxable,
    threeAndTwoThirdsHoursForTaxable,
  ]);

  useEffect(() => {
    // Info: (20250710 - Julian) 計算總休假時數
    const totalLeave = sickLeaveHours + personalLeaveHours;
    setTotalLeaveHours(totalLeave);
  }, [sickLeaveHours, personalLeaveHours]);

  // Info: (20250728 - Julian) 計算結果
  // ToDo: (20250728 - Julian)
  const salaryCalculatorResult: ISalaryCalculator = useMemo(() => {
    const yearInt = parseInt(selectedYear, 10);
    const monthIndex = MONTHS.findIndex((month) => month.name === selectedMonth.name);

    // Info: (20250728 - Julian) 計算加班費（應稅）
    const salaryPerHour = baseSalary / workedDays / 8;
    const overTimeHoursTaxable100 = 0; // ToDo: (20250728 - Julian) 要補欄位
    const overTimeHoursTaxable133 = Math.floor(
      oneAndOneThirdHoursForTaxable * salaryPerHour * 1.33
    );
    const overTimeHoursTaxable166 = Math.floor(
      oneAndTwoThirdsHoursForTaxable * salaryPerHour * 1.66
    );
    const overTimeHoursTaxable200 = Math.floor(twoHoursForTaxable * salaryPerHour * 2);
    const overTimeHoursTaxable233 = Math.floor(
      twoAndOneThirdsHoursForTaxable * salaryPerHour * 2.33
    );
    const overTimeHoursTaxable266 = Math.floor(
      twoAndTwoThirdsHoursForTaxable * salaryPerHour * 2.66
    );

    const mealAllowancePerHour = mealAllowance / workedDays / 8;
    const overTimeHoursTaxFree100 = 0; // ToDo: (20250728 - Julian) 要補欄位
    const overTimeHoursTaxFree133 = Math.floor(
      oneAndOneThirdsHoursForNonTax * mealAllowancePerHour * 1.33
    );
    const overTimeHoursTaxFree166 = Math.floor(
      oneAndTwoThirdsHoursForNonTax * mealAllowancePerHour * 1.66
    );
    const overTimeHoursTaxFree200 = Math.floor(twoHoursForNonTax * mealAllowancePerHour * 2);
    const overTimeHoursTaxFree233 = Math.floor(
      twoAndOneThirdsHoursForNonTax * mealAllowancePerHour * 2.33
    );
    const overTimeHoursTaxFree266 = Math.floor(
      twoAndTwoThirdsHoursForNonTax * mealAllowancePerHour * 2.66
    );

    const result = salaryCalculator({
      year: yearInt,
      month: monthIndex,
      workedDays,
      baseSalaryTaxable: baseSalary, // Info: (20250728 - Julian) 當月應稅基本工資
      baseSalaryTaxFree: mealAllowance, // Info: (20250728 - Julian) 當月免稅基本工資（伙食津貼）
      otherAllowancesTaxable: otherAllowanceWithTax, // Info: (20250728 - Julian) 當月應稅其他津貼
      otherAllowancesTaxFree: otherAllowanceWithoutTax, // Info: (20250728 - Julian) 當月免稅其他津貼
      overTimeHoursTaxable100, // Info: (20250728 - Julian) 當月 100% 加班費（應稅）
      overTimeHoursTaxable133, // Info: (20250728 - Julian) 當月 133% 加班費（應稅）
      overTimeHoursTaxable166, // Info: (20250728 - Julian) 當月 166% 加班費（應稅）
      overTimeHoursTaxable200, // Info: (20250728 - Julian) 當月 200% 加班費（應稅）
      overTimeHoursTaxable233, // Info: (20250728 - Julian) 當月 233% 加班費（應稅）
      overTimeHoursTaxable266, // Info: (20250728 - Julian) 當月 266% 加班費（應稅）
      overTimeHoursTaxFree100, // Info: (20250728 - Julian) 當月 100% 加班費（免稅）
      overTimeHoursTaxFree133, // Info: (20250728 - Julian) 當月 133% 加班費（免稅）
      overTimeHoursTaxFree166, // Info: (20250728 - Julian) 當月 166% 加班費（免稅）
      overTimeHoursTaxFree200, // Info: (20250728 - Julian) 當月 200% 加班費（免稅）
      overTimeHoursTaxFree233, // Info: (20250728 - Julian) 當月 233% 加班費（免稅）
      overTimeHoursTaxFree266, // Info: (20250728 - Julian) 當月 266% 加班費（免稅）
      sickLeaveHours, // Info: (20250728 - Julian) 當月病假時數
      personalLeaveHours, // Info: (20250728 - Julian) 當月事假時數
      employeeBurdenHealthInsurancePremiums: nhiBackPremium, // Info: (20250728 - Julian) 健保加保費用
      employeeBurdenSecondGenerationHealthInsurancePremiums: secondGenNhiTax, // Info: (20250728 - Julian) 二代健保費用
      employeeBurdenOtherOverflowDeductions: otherAdjustments, // Info: (20250728 - Julian) 其他溢扣／補收
      employeeBurdenPensionInsurance: voluntaryPensionContribution, // Info: (20250728 - Julian) 勞退自提金額
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
        totalSalaryWithoutTax: result.totalSalaryTaxFree,
        totalMonthlySalary: result.totalSalary,
      },
      employeeContribution: {
        employeePaidLaborInsurance: result.employeeBurdenLaborInsurance,
        employeePaidHealthInsurance: result.employeeBurdenHealthInsurance,
        voluntaryPensionContribution: result.employeeBurdenPensionInsurance,
        withheldIncomeTax: result.employeeBurdenIncomeTax,
        withheldSecondGenerationNHIPremium:
          result.employeeBurdenSecondGenerationHealthInsurancePremiums,
        salaryDeductionForLeave: result.leaveDeduction,
        totalEmployeeContribution: result.totalEmployeeBurden,
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
        employerContributions: result.totalCompanyBurden,
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
    workedDays,
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
    setSelectedMonth(monthOptions[0]);
    setWorkedDays(31);
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
    setThreeAndTwoThirdsHoursForNonTax(0);
    setTotalNonTaxableHours(0);
    setOneAndOneThirdsHoursForTaxable(0);
    setOneAndTwoThirdsHoursForTaxable(0);
    setTwoHoursForTaxable(0);
    setTwoAndOneThirdsHoursForTaxable(0);
    setTwoAndTwoThirdsHoursForTaxable(0);
    setThreeAndTwoThirdsHoursForTaxable(0);
    setTotalTaxableHours(0);
    setSickLeaveHours(0);
    setPersonalLeaveHours(0);
    setNhiBackPremium(0);
    setSecondGenNhiTax(0);
    setOtherAdjustments(0);
    setVoluntaryPensionContribution(0);
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
    // Info: (20250710 - Julian) 根據選擇的月份更新工作天數
    setWorkedDays(month.days);
  };

  // Info: (20250710 - Julian) =========== 其他相關 state 和 functions ===========
  const changeVoluntaryPensionContribution = (contribution: number) => {
    setVoluntaryPensionContribution(contribution);
  };

  const value = useMemo(
    () => ({
      yearOptions,
      monthOptions,
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
      workedDays,
      setWorkedDays,
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
      threeAndTwoThirdsHoursForNonTax,
      setThreeAndTwoThirdsHoursForNonTax,
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
      threeAndTwoThirdsHoursForTaxable,
      setThreeAndTwoThirdsHoursForTaxable,
      totalTaxableHours,
      sickLeaveHours,
      setSickLeaveHours,
      personalLeaveHours,
      setPersonalLeaveHours,
      totalLeaveHours,
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
      currentStep,
      completeSteps,
      salaryCalculatorResult,
      employeeName,
      employeeNumber,
      employeeEmail,
      selectedYear,
      selectedMonth,
      workedDays,
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
      threeAndTwoThirdsHoursForNonTax,
      totalNonTaxableHours,
      oneAndOneThirdHoursForTaxable,
      oneAndTwoThirdsHoursForTaxable,
      twoHoursForTaxable,
      twoAndOneThirdsHoursForTaxable,
      twoAndTwoThirdsHoursForTaxable,
      threeAndTwoThirdsHoursForTaxable,
      totalTaxableHours,
      sickLeaveHours,
      personalLeaveHours,
      totalLeaveHours,
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
