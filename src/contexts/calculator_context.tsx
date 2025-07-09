import { useState, useMemo, createContext, useContext } from 'react';
import { MONTH_FULL_NAME } from '@/constants/display';

interface ICalculatorContext {
  // Info: (20250709 - Julian) 整個計算機的 state 和 functions
  currentStep: number;
  switchStep: (step: number) => void;
  resetFormHandler: () => void;

  // Info: (20250709 - Julian) 基本資訊相關 state 和 functions
  employeeName: string;
  changeEmployeeName: (name: string) => void;
  employeeNumber: string;
  changeEmployeeNumber: (number: string) => void;
  selectedYear: string;
  changeSelectedYear: (year: string) => void;
  selectedMonth: string;
  changeSelectedMonth: (month: string) => void;
  workedDays: number;
  changeWorkedDays: (days: number) => void;

  //   employeeNameInput: string;
  //   setEmployeeNameInput: (name: string) => void;
  //   employeeNumberInput: string;
  //   setEmployeeNumberInput: (number: string) => void;
  //   selectedYear: string;
  //   setSelectedYear: (year: string) => void;
  //   selectedMonth: string;
  //   setSelectedMonth: (month: string) => void;
  //   workedDaysInput: number;
  //   setWorkedDaysInput: (days: number) => void;
}

export interface ICalculatorProvider {
  children: React.ReactNode;
}

export const CalculatorContext = createContext<ICalculatorContext | undefined>(undefined);

export const CalculatorProvider = ({ children }: ICalculatorProvider) => {
  const yearOptions = ['2025', '2024', '2023'];
  const monthOptions = MONTH_FULL_NAME;

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeNumber, setEmployeeNumber] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(yearOptions[0]);
  const [selectedMonth, setSelectedMonth] = useState<string>(monthOptions[0]);
  const [workedDays, setWorkedDays] = useState<number>(31);

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
  const changeWorkedDays = (days: number) => {
    setWorkedDays(days);
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
      changeWorkedDays,
    }),
    [currentStep, employeeName, employeeNumber, selectedYear, selectedMonth, workedDays]
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
