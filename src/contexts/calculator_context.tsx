import React, { useState, useMemo, createContext, useContext } from 'react';
import { MONTHS, MonthType } from '@/constants/month';
import { ISalaryCalculator, defaultSalaryCalculator } from '@/interfaces/calculator';

interface ICalculatorContext {
  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  currentStep: number;
  completeSteps: number[]; // Info: (20250710 - Julian) 已完成的步驟
  switchStep: (step: number) => void;
  resetFormHandler: () => void;
  salaryCalculator: ISalaryCalculator;

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

  // Info: (20250709 - Julian) Step 2: 基本薪資相關 state 和 functions
  // 以下皆使用 Dispatch 來更新 state
  baseSalary: number;
  setBaseSalary: React.Dispatch<React.SetStateAction<number>>;
  mealAllowance: number;
  setMealAllowance: React.Dispatch<React.SetStateAction<number>>;
  otherAllowance: number;
  setOtherAllowance: React.Dispatch<React.SetStateAction<number>>;

  // Info: (20250710 - Julian) Step 3: 工作時數相關 state 和 functions
  totalOvertimeHours: number;
  changeTotalOvertimeHours: (hours: number) => void;
  totalLeaveHours: number;
  changeTotalLeaveHours: (hours: number) => void;

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
  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completeSteps, setCompleteSteps] = useState<number[]>([]);
  // ToDo: (20250710 - Julian) 計算機的整體計算結果
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [salaryCalculator, setSalaryCalculator] =
    useState<ISalaryCalculator>(defaultSalaryCalculator);

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<MonthType>(MONTHS[0]);
  const [workedDays, setWorkedDays] = useState<number>(31);

  // Info: (20250709 - Julian) Step 2: 基本薪資相關 state
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [mealAllowance, setMealAllowance] = useState<number>(0);
  const [otherAllowance, setOtherAllowance] = useState<number>(0);

  // Info: (20250709 - Julian) Step 3: 工作時數相關 state
  const [totalOvertimeHours, setTotalOvertimeHours] = useState<number>(0);
  const [totalLeaveHours, setTotalLeaveHours] = useState<number>(0);

  // Info: (20250710 - Julian) Step 4: 其他相關 state
  const [nhiBackPremium, setNhiBackPremium] = useState<number>(0);
  const [secondGenNhiTax, setSecondGenNhiTax] = useState<number>(0);
  const [otherAdjustments, setOtherAdjustments] = useState<number>(0);
  const [voluntaryPensionContribution, setVoluntaryPensionContribution] = useState<number>(0);

  // Info: (20250709 - Julian) 切換步驟
  const switchStep = (step: number) => {
    if (employeeName !== '') {
      setCompleteSteps((prev) => (prev.includes(1) ? prev : [...prev, 1]));
    }
    if (baseSalary !== 0) {
      setCompleteSteps((prev) => (prev.includes(2) ? prev : [...prev, 2]));
    }
    // if (totalOvertimeHours !== 0 || totalLeaveHours !== 0) {
    //   setCompleteSteps((prev) => (prev.includes(3) ? prev : [...prev, 3]));
    // }
    if (nhiBackPremium !== 0 || secondGenNhiTax !== 0 || otherAdjustments !== 0) {
      setCompleteSteps((prev) => (prev.includes(4) ? prev : [...prev, 4]));
    }

    const targetStep = step > 4 ? 4 : step < 1 ? 1 : step;
    setCurrentStep(targetStep);
  };

  // Info: (20250709 - Julian) 重置表單
  const resetFormHandler = () => {
    // Info: (20250710 - Julian) 清空 input 欄位
    setEmployeeName('');
    setEmployeeNumber('');
    setSelectedYear('2025');
    setSelectedMonth(MONTHS[0]);
    setWorkedDays(31);
    setBaseSalary(0);
    setMealAllowance(0);
    setOtherAllowance(0);
    setTotalOvertimeHours(0);
    setTotalLeaveHours(0);
    setNhiBackPremium(0);
    setSecondGenNhiTax(0);
    setOtherAdjustments(0);
    setVoluntaryPensionContribution(0);
    // Info: (20250710 - Julian) 重置計算機狀態
    setSalaryCalculator(defaultSalaryCalculator);
    // Info: (20250710 - Julian) 重置步驟狀態
    setCompleteSteps([]);
    setCurrentStep(1);
  };

  // Info: (20250709 - Julian) =========== 基本資訊相關 state 和 functions ===========
  const changeEmployeeName = (name: string) => {
    setEmployeeName(name);
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

  // Info: (20250710 - Julian) =========== 工作時數相關 state 和 functions ===========
  const changeTotalOvertimeHours = (hours: number) => {
    setTotalOvertimeHours(hours);
  };
  const changeTotalLeaveHours = (hours: number) => {
    setTotalLeaveHours(hours);
  };

  // Info: (20250710 - Julian) =========== 其他相關 state 和 functions ===========
  const changeVoluntaryPensionContribution = (contribution: number) => {
    setVoluntaryPensionContribution(contribution);
  };

  const value = useMemo(
    () => ({
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
      totalOvertimeHours,
      changeTotalOvertimeHours,
      totalLeaveHours,
      changeTotalLeaveHours,
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
