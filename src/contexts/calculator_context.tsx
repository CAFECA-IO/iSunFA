import React, { useState, useMemo, createContext, useContext, useEffect } from 'react';
import { MONTHS, MonthType } from '@/constants/month';
import { ISalaryCalculator, defaultSalaryCalculator } from '@/interfaces/calculator';

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
  salaryCalculator: ISalaryCalculator;

  // Info: (20250714 - Julian) 表單選項
  yearOptions: string[];
  monthOptions: MonthType[];

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state 和 functions
  employeeName: string;
  changeEmployeeName: (name: string) => void;
  employeeNumber: string;
  changeEmployeeNumber: (number: string) => void;
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
  otherAllowance: number;
  setOtherAllowance: React.Dispatch<React.SetStateAction<number>>;

  // Info: (20250710 - Julian) Step 3: 工作時數相關 state 和 functions
  oneHours: number;
  setOneHours: React.Dispatch<React.SetStateAction<number>>;
  oneAndOneThirdHours: number;
  setOneAndOneThirdHours: React.Dispatch<React.SetStateAction<number>>;
  oneAndTwoThirdsHours: number;
  setOneAndTwoThirdsHours: React.Dispatch<React.SetStateAction<number>>;
  twoHours: number;
  setTwoHours: React.Dispatch<React.SetStateAction<number>>;
  twoAndTwoThirdsHours: number;
  setTwoAndTwoThirdsHours: React.Dispatch<React.SetStateAction<number>>;
  sickLeaveHours: number;
  setSickLeaveHours: React.Dispatch<React.SetStateAction<number>>;
  personalLeaveHours: number;
  setPersonalLeaveHours: React.Dispatch<React.SetStateAction<number>>;
  totalOvertimeHours: number;
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
  // Info: (20250714 - Julian) 年份選項：今年起往後推到 2025 年
  const yearGap = thisYear - 2025 + 1;
  const yearOptions = Array.from({ length: yearGap }, (_, i) => `${i + 2025}`).reverse();

  // Info: (20250714 - Julian) 月份選項：只顯示 1 月到 6 月
  const monthOptions = MONTHS.slice(0, 6);

  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completeSteps, setCompleteSteps] = useState<TabStep[]>(defaultTabSteps);
  // ToDo: (20250710 - Julian) 計算機的整體計算結果
  const [salaryCalculator, setSalaryCalculator] =
    useState<ISalaryCalculator>(defaultSalaryCalculator);

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(yearOptions[0]);
  const [selectedMonth, setSelectedMonth] = useState<MonthType>(monthOptions[0]);
  const [workedDays, setWorkedDays] = useState<number>(31);

  // Info: (20250711 - Julian) 是否有姓名錯誤
  const [isNameError, setIsNameError] = useState<boolean>(false);

  // Info: (20250709 - Julian) Step 2: 基本薪資相關 state
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [mealAllowance, setMealAllowance] = useState<number>(0);
  const [otherAllowance, setOtherAllowance] = useState<number>(0);

  // Info: (20250709 - Julian) Step 3: 工作時數相關 state
  const [oneHours, setOneHours] = useState<number>(0);
  const [oneAndOneThirdHours, setOneAndOneThirdHours] = useState<number>(0);
  const [oneAndTwoThirdsHours, setOneAndTwoThirdsHours] = useState<number>(0);
  const [twoHours, setTwoHours] = useState<number>(0);
  const [twoAndTwoThirdsHours, setTwoAndTwoThirdsHours] = useState<number>(0);
  const [sickLeaveHours, setSickLeaveHours] = useState<number>(0);
  const [personalLeaveHours, setPersonalLeaveHours] = useState<number>(0);
  const [totalOvertimeHours, setTotalOvertimeHours] = useState<number>(0);
  const [totalLeaveHours, setTotalLeaveHours] = useState<number>(0);

  // Info: (20250710 - Julian) Step 4: 其他相關 state
  const [nhiBackPremium, setNhiBackPremium] = useState<number>(0);
  const [secondGenNhiTax, setSecondGenNhiTax] = useState<number>(0);
  const [otherAdjustments, setOtherAdjustments] = useState<number>(0);
  const [voluntaryPensionContribution, setVoluntaryPensionContribution] = useState<number>(0);

  useEffect(() => {
    // Info: (20250710 - Julian) 計算總加班時數
    const totalOvertime =
      oneHours + oneAndOneThirdHours + oneAndTwoThirdsHours + twoHours + twoAndTwoThirdsHours;

    setTotalOvertimeHours(totalOvertime);
  }, [oneHours, oneAndOneThirdHours, oneAndTwoThirdsHours, twoHours, twoAndTwoThirdsHours]);

  useEffect(() => {
    // Info: (20250710 - Julian) 計算總休假時數
    const totalLeave = sickLeaveHours + personalLeaveHours;
    setTotalLeaveHours(totalLeave);
  }, [sickLeaveHours, personalLeaveHours]);

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
    setSelectedYear(yearOptions[0]);
    setSelectedMonth(monthOptions[0]);
    setWorkedDays(31);
    setBaseSalary(0);
    setMealAllowance(0);
    setOtherAllowance(0);
    setOneHours(0);
    setOneAndOneThirdHours(0);
    setOneAndTwoThirdsHours(0);
    setTwoHours(0);
    setTwoAndTwoThirdsHours(0);
    setSickLeaveHours(0);
    setPersonalLeaveHours(0);
    // setTotalOvertimeHours(0);
    // setTotalLeaveHours(0);
    setNhiBackPremium(0);
    setSecondGenNhiTax(0);
    setOtherAdjustments(0);
    setVoluntaryPensionContribution(0);
    // Info: (20250710 - Julian) 重置計算機狀態
    setSalaryCalculator(defaultSalaryCalculator);
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
      salaryCalculator,
      switchStep,
      resetFormHandler,
      employeeName,
      changeEmployeeName,
      employeeNumber,
      changeEmployeeNumber,
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
      otherAllowance,
      setOtherAllowance,
      isNameError,
      setIsNameError,
      oneHours,
      setOneHours,
      oneAndOneThirdHours,
      setOneAndOneThirdHours,
      oneAndTwoThirdsHours,
      setOneAndTwoThirdsHours,
      twoHours,
      setTwoHours,
      twoAndTwoThirdsHours,
      setTwoAndTwoThirdsHours,
      sickLeaveHours,
      setSickLeaveHours,
      personalLeaveHours,
      setPersonalLeaveHours,
      totalOvertimeHours,
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
      salaryCalculator,
      employeeName,
      employeeNumber,
      selectedYear,
      selectedMonth,
      workedDays,
      baseSalary,
      mealAllowance,
      otherAllowance,
      isNameError,
      oneHours,
      oneAndOneThirdHours,
      oneAndTwoThirdsHours,
      twoHours,
      twoAndTwoThirdsHours,
      sickLeaveHours,
      personalLeaveHours,
      totalOvertimeHours,
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
