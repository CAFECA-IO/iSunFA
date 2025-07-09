import React, { useState, useMemo, createContext, useContext } from 'react';
import { MONTH_FULL_NAME } from '@/constants/display';

interface ICalculatorContext {
  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  currentStep: number;
  // completeSteps:number[]
  switchStep: (step: number) => void;
  resetFormHandler: () => void;

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state 和 functions
  employeeName: string;
  changeEmployeeName: (name: string) => void;
  employeeNumber: string;
  changeEmployeeNumber: (number: string) => void;
  selectedYear: string;
  changeSelectedYear: (year: string) => void;
  selectedMonth: string;
  changeSelectedMonth: (month: string) => void;
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
}

export interface ICalculatorProvider {
  children: React.ReactNode;
}

export const CalculatorContext = createContext<ICalculatorContext | undefined>(undefined);

export const CalculatorProvider = ({ children }: ICalculatorProvider) => {
  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTH_FULL_NAME[0]);
  const [workedDays, setWorkedDays] = useState<number>(31);

  // Info: (20250709 - Julian) Step 2: 基本薪資相關 state
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [mealAllowance, setMealAllowance] = useState<number>(0);
  const [otherAllowance, setOtherAllowance] = useState<number>(0);

  // Info: (20250709 - Julian) 切換步驟
  const switchStep = (step: number) => {
    const targetStep = step > 4 ? 4 : step < 1 ? 1 : step;
    setCurrentStep(targetStep);
  };

  // Info: (20250709 - Julian) 重置表單
  const resetFormHandler = () => {
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
  const changeSelectedMonth = (month: string) => {
    setSelectedMonth(month);
  };

  const value = useMemo(
    () => ({
      currentStep,
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
    }),
    [
      currentStep,
      employeeName,
      employeeNumber,
      selectedYear,
      selectedMonth,
      workedDays,
      baseSalary,
      mealAllowance,
      otherAllowance,
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
