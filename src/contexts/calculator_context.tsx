"use client";

import {
  useState,
  createContext,
  useContext,
  Dispatch,
  SetStateAction,
  ReactNode,
} from "react";
import { PayrollDaysBase } from "@/constants/salary_calculator";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";
import {
  fromCalculatorOptions,
  toCalculatorOptions,
} from "@/lib/utils/salary_calculator_snapshot";

import { MONTHS, MonthType } from "@/constants/month";
import {
  ISalaryCalculatorUI,
  EmploymentType,
  TaxResidencyStatus,
  IndustryCategoryItem,
  ISalaryCalculatorOptions,
} from "@/interfaces/salary_calculator";
import {
  salaryCalculator,
  getMinimumWage,
} from "@/lib/utils/salary_calculator";
import { INDUSTRY_CATEGORY_OPTIONS } from "@/constants/industry_category";

type TabStep = {
  step: number;
  completed: boolean;
};

const defaultEmployeeName = "王小明";

const defaultTabSteps: TabStep[] = [
  { step: 1, completed: true }, // Info: (20250714 - Julian) 由第一步開始，所以第一步永遠為已完成
  { step: 2, completed: false },
  { step: 3, completed: false },
  { step: 4, completed: false },
];

const defaultIndustryCategory: IndustryCategoryItem =
  INDUSTRY_CATEGORY_OPTIONS.sort((a, b) => a.CODE - b.CODE).find(
    (item) => item.CODE === 42,
  )!; // Info: (20251113 - Julian) 預設為「42 電腦程式設計、諮詢及相關服務業、資訊服務業」

interface ICalculatorContext {
  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  currentStep: number;
  completeSteps: TabStep[]; // Info: (20250710 - Julian) 已完成的步驟
  switchStep: (step: number) => void;
  resetFormHandler: () => void;
  salaryCalculatorResult: ISalaryCalculatorUI;

  // Info: (20250714 - Julian) 表單選項
  yearOptions: string[];
  monthOptions: MonthType[];
  payrollDaysBaseOptions: string[];

  /**
   * Info: (20260831 - Julian) 這次試算對應到員工名單裡的哪一位。
   *
   * null = 沒有連結（姓名是手打的）。它決定按下「儲存薪資紀錄」時存到誰身上 ——
   * 薪資紀錄必須掛在一個 employeeId 底下，沒有連結就存不了。
   */
  selectedEmployeeId: string | null;
  linkEmployee: (employee: ISalaryCalculatorEmployee) => void;
  unlinkEmployee: () => void;

  // Info: (20260831 - Julian) 把存下來的薪資紀錄載回計算機（薪資紀錄頁的「載回計算機」）
  loadFromSnapshot: (input: ISalaryCalculatorOptions) => void;

  // Info: (20260831 - Julian) 目前表單對應的引擎輸入。儲存薪資紀錄時要把它整份存下來
  getSalaryCalculatorOptions: () => ISalaryCalculatorOptions;

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state 和 functions
  employeeName: string;
  changeEmployeeName: (name: string) => void;
  employeeNumber: string;
  changeEmployeeNumber: (number: string) => void;
  employmentType: EmploymentType;
  changeEmploymentType: (type: EmploymentType) => void;
  taxResidencyStatus: TaxResidencyStatus;
  changeTaxResidencyStatus: (status: TaxResidencyStatus) => void;
  industryCategory: IndustryCategoryItem;
  changeIndustryCategory: (category: IndustryCategoryItem) => void;
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
  setIsNameError: Dispatch<SetStateAction<boolean>>;

  // Info: (20250709 - Julian) Step 2: 基本薪資相關 state 和 functions
  // Info: (20250709 - Julian) 以下皆使用 Dispatch 來更新 state
  baseSalary: number;
  setBaseSalary: Dispatch<SetStateAction<number>>;
  mealAllowance: number;
  setMealAllowance: Dispatch<SetStateAction<number>>;
  otherAllowanceWithTax: number;
  setOtherAllowanceWithTax: Dispatch<SetStateAction<number>>;
  otherAllowanceWithoutTax: number;
  setOtherAllowanceWithoutTax: Dispatch<SetStateAction<number>>;

  // Info: (20250710 - Julian) Step 3: 工作時數相關 state 和 functions
  // Info: (20250722 - Julian) Non-taxable hours
  oneAndOneThirdsHoursForNonTax: number;
  setOneAndOneThirdsHoursForNonTax: Dispatch<SetStateAction<number>>;
  oneAndTwoThirdsHoursForNonTax: number;
  setOneAndTwoThirdsHoursForNonTax: Dispatch<SetStateAction<number>>;
  twoHoursForNonTax: number;
  setTwoHoursForNonTax: Dispatch<SetStateAction<number>>;
  twoAndOneThirdsHoursForNonTax: number;
  setTwoAndOneThirdsHoursForNonTax: Dispatch<SetStateAction<number>>;
  twoAndTwoThirdsHoursForNonTax: number;
  setTwoAndTwoThirdsHoursForNonTax: Dispatch<SetStateAction<number>>;
  // Info: (20250710 - Julian) 總免稅加班時數
  totalNonTaxableHours: number;
  // Info: (20250722 - Julian) Taxable hours
  oneAndOneThirdHoursForTaxable: number;
  setOneAndOneThirdsHoursForTaxable: Dispatch<SetStateAction<number>>;
  oneAndTwoThirdsHoursForTaxable: number;
  setOneAndTwoThirdsHoursForTaxable: Dispatch<SetStateAction<number>>;
  twoHoursForTaxable: number;
  setTwoHoursForTaxable: Dispatch<SetStateAction<number>>;
  twoAndOneThirdsHoursForTaxable: number;
  setTwoAndOneThirdsHoursForTaxable: Dispatch<SetStateAction<number>>;
  twoAndTwoThirdsHoursForTaxable: number;
  setTwoAndTwoThirdsHoursForTaxable: Dispatch<SetStateAction<number>>;
  // Info: (20250710 - Julian) 總應稅加班時數
  totalTaxableHours: number;
  // Info: (20250722 - Julian) Leave hours
  sickLeaveHours: number;
  setSickLeaveHours: Dispatch<SetStateAction<number>>;
  personalLeaveHours: number;
  setPersonalLeaveHours: Dispatch<SetStateAction<number>>;
  leavePayoutHours: number;
  setLeavePayoutHours: Dispatch<SetStateAction<number>>;

  // Info: (20250710 - Julian) Step 4: 其他相關 state 和 functions
  // Info: (20250710 - Julian) 除了 VPC 皆使用 Dispatch 來更新 state
  isLaborInsurance: boolean;
  toggleLaborInsurance: () => void;
  isNHI: boolean;
  toggleNHI: () => void;
  isLaborPension: boolean;
  toggleLaborPension: () => void;
  numberOfDependents: number;
  setNumberOfDependents: Dispatch<SetStateAction<number>>;
  nhiBackPremium: number;
  setNhiBackPremium: Dispatch<SetStateAction<number>>;
  secondGenNhiTax: number;
  setSecondGenNhiTax: Dispatch<SetStateAction<number>>;
  otherAdjustments: number;
  setOtherAdjustments: Dispatch<SetStateAction<number>>;
  voluntaryPensionContribution: number;
  changeVoluntaryPensionContribution: (contribution: number) => void;
}

export interface ICalculatorProvider {
  children: ReactNode;
}

export const CalculatorContext = createContext<ICalculatorContext | undefined>(
  undefined,
);

export const CalculatorProvider = ({ children }: ICalculatorProvider) => {
  // Info: (20250714 - Julian) 計算機的表單選項
  const thisYear = new Date().getFullYear();

  // Info: (20250714 - Julian) 月份從 0 開始，所以要加 1
  const thisMonth = new Date().getMonth() + 1;

  // Info: (20250714 - Julian) 年份選項：今年起往後推到 2025 年
  const yearGap = thisYear - 2025 + 1;
  const yearOptions = Array.from(
    { length: yearGap },
    (_, i) => `${i + 2025}`,
  ).reverse();

  // Info: (20250714 - Julian) 月份選項：只顯示 1 月到現在的月份
  const monthOptions = MONTHS.slice(0, thisMonth);

  // Info: (20250815 - Julian) 預設為當前月份
  const defaultMonth = monthOptions[monthOptions.length - 1];

  // Info: (20250806 - Julian) 基準天數選項：1. 固定 30 天、2. 實際天數
  const payrollDaysBaseOptions = [
    PayrollDaysBase.FIXED,
    PayrollDaysBase.ACTUAL,
  ];

  // Info: (20250709 - Julian) 計算機整體的 state 和 functions
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [completeSteps, setCompleteSteps] =
    useState<TabStep[]>(defaultTabSteps);

  // Info: (20250709 - Julian) Step 1: 基本資訊相關 state
  const [employeeName, setEmployeeName] = useState<string>(defaultEmployeeName);
  const [employeeNumber, setEmployeeNumber] = useState<string>("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    EmploymentType.FULL_TIME,
  );
  const [taxResidencyStatus, setTaxResidencyStatus] =
    useState<TaxResidencyStatus>(TaxResidencyStatus.TAIWAN);
  const [industryCategory, setIndustryCategory] =
    useState<IndustryCategoryItem>(defaultIndustryCategory);
  const [employeeEmail, setEmployeeEmail] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(yearOptions[0]);
  const [selectedMonth, setSelectedMonth] = useState<MonthType>(defaultMonth);
  const [payrollDaysBase, setPayrollDaysBase] = useState<string>(
    payrollDaysBaseOptions[0],
  ); // Info: (20250710 - Julian) 基準天數選項
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [dayOfJoining, setDayOfJoining] = useState<string>("01"); // Info: (20250709 - Julian) 入職日期
  const [isLeft, setIsLeft] = useState<boolean>(false);
  const [dayOfLeaving, setDayOfLeaving] = useState<string>("01"); // Info: (20250709 - Julian) 離職日期

  // Info: (20251002 - Julian) 取得當前年份的最低基本薪資
  const defaultBasicSalary = getMinimumWage(parseInt(selectedYear));

  // Info: (20250711 - Julian) 是否有姓名錯誤
  const [isNameError, setIsNameError] = useState<boolean>(false);

  // Info: (20260831 - Julian) 連結到員工名單的哪一筆（null = 手打姓名，未連結）
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );

  // Info: (20250709 - Julian) Step 2: 基本薪資相關 state
  const [baseSalary, setBaseSalary] = useState<number>(defaultBasicSalary);
  const [mealAllowance, setMealAllowance] = useState<number>(0);
  const [otherAllowanceWithTax, setOtherAllowanceWithTax] = useState<number>(0);
  const [otherAllowanceWithoutTax, setOtherAllowanceWithoutTax] =
    useState<number>(0);

  // Info: (20250709 - Julian) Step 3: 工作時數相關 state
  const [oneAndOneThirdsHoursForNonTax, setOneAndOneThirdsHoursForNonTax] =
    useState<number>(0);
  const [oneAndTwoThirdsHoursForNonTax, setOneAndTwoThirdsHoursForNonTax] =
    useState<number>(0);
  const [twoHoursForNonTax, setTwoHoursForNonTax] = useState<number>(0);
  const [twoAndOneThirdsHoursForNonTax, setTwoAndOneThirdsHoursForNonTax] =
    useState<number>(0);
  const [twoAndTwoThirdsHoursForNonTax, setTwoAndTwoThirdsHoursForNonTax] =
    useState<number>(0);
  const [oneAndOneThirdHoursForTaxable, setOneAndOneThirdsHoursForTaxable] =
    useState<number>(0);
  const [oneAndTwoThirdsHoursForTaxable, setOneAndTwoThirdsHoursForTaxable] =
    useState<number>(0);
  const [twoHoursForTaxable, setTwoHoursForTaxable] = useState<number>(0);
  const [twoAndOneThirdsHoursForTaxable, setTwoAndOneThirdsHoursForTaxable] =
    useState<number>(0);
  const [twoAndTwoThirdsHoursForTaxable, setTwoAndTwoThirdsHoursForTaxable] =
    useState<number>(0);
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
  const [voluntaryPensionContribution, setVoluntaryPensionContribution] =
    useState<number>(0);

  // Info: (20250710 - Julian) 直接計算總時數，不要用 useEffect，避免二次渲染
  const totalNonTaxableHours =
    oneAndOneThirdsHoursForNonTax +
    oneAndTwoThirdsHoursForNonTax +
    twoHoursForNonTax +
    twoAndOneThirdsHoursForNonTax +
    twoAndTwoThirdsHoursForNonTax;

  const totalTaxableHours =
    oneAndOneThirdHoursForTaxable +
    oneAndTwoThirdsHoursForTaxable +
    twoHoursForTaxable +
    twoAndOneThirdsHoursForTaxable +
    twoAndTwoThirdsHoursForTaxable;

  // Info: (20260224 - Julian) 整理薪資計算參數
  /**
   * Info: (20260831 - Julian) 表單狀態 → 引擎輸入。
   *
   * 對應關係搬到 `src/lib/utils/salary_calculator_snapshot.ts`：它與反方向的
   * `fromCalculatorOptions` 必須成對維護，而留在這裡的話只有 render React 才測得到
   * （本專案的測試不 render React）。
   */
  const getSalaryCalculatorOptions = (): ISalaryCalculatorOptions =>
    toCalculatorOptions({
      selectedYear,
      selectedMonth,
      industryCategory,
      taxResidencyStatus,
      isJoined,
      dayOfJoining,
      isLeft,
      dayOfLeaving,
      payrollDaysBase,
      baseSalary,
      mealAllowance,
      otherAllowanceWithTax,
      otherAllowanceWithoutTax,
      oneAndOneThirdHoursForTaxable,
      oneAndTwoThirdsHoursForTaxable,
      twoHoursForTaxable,
      twoAndOneThirdsHoursForTaxable,
      twoAndTwoThirdsHoursForTaxable,
      oneAndOneThirdsHoursForNonTax,
      oneAndTwoThirdsHoursForNonTax,
      twoHoursForNonTax,
      twoAndOneThirdsHoursForNonTax,
      twoAndTwoThirdsHoursForNonTax,
      leavePayoutHours,
      sickLeaveHours,
      personalLeaveHours,
      isLaborInsurance,
      isNHI,
      isLaborPension,
      nhiBackPremium,
      secondGenNhiTax,
      otherAdjustments,
      voluntaryPensionContribution,
      numberOfDependents,
    });

  // Info: (20250728 - Julian) 計算結果
  // ToDo: (20250728 - Julian) 計算邏輯須搬到 lib
  const getSalaryCalculatorResult = (): ISalaryCalculatorUI => {
    const result = salaryCalculator(getSalaryCalculatorOptions());

    const formattedResult: ISalaryCalculatorUI = {
      totalPayment: result.totalPayment,
      totalSalaryTaxable: result.totalSalaryTaxable,
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
        voluntaryPensionContribution: result.employeeBurdenPensionInsurance,
        withheldIncomeTax: result.employeeBurdenIncomeTax,
        withheldSecondGenerationNHIPremium:
          result.employeeBurdenSecondGenerationHealthInsurancePremiums,
        leaveDeductionTaxable: result.leaveDeductionTaxable,
        leaveDeductionTaxFree: result.leaveDeductionTaxFree,
        otherDeductionsOrAdjustments:
          result.employeeBurdenOtherOverflowDeductions,
        totalEmployeeBurden: result.totalEmployeeBurden,
      },
      insuredSalary: {
        healthInsuranceSalaryBracket: result.healthInsuranceLevel,
        laborInsuranceSalaryBracket: result.laborInsuranceLevel,
        employmentInsuranceSalaryBracket: result.employmentInsuranceLevel,
        occupationalInjuryInsuranceSalaryBracket:
          result.occupationalDisasterInsuranceLevel,
        laborPensionSalaryBracket: result.pensionInsuranceLevel,
        occupationalInjuryIndustryRate: result.occupationalDisasterIndustryRate,
        insuredSalary: result.insuredSalary,
      },
      employerContribution: {
        employerPaidLaborInsurance: result.companyBurdenLaborInsurance,
        employerPaidHealthInsurance: result.companyBurdenHealthInsurance,
        employerPaidPensionContribution: result.companyBurdenPensionInsurance,
        companyBurdenOccupationalAccidentInsurance:
          result.companyBurdenOccupationalAccidentInsurance,
        totalSalary: result.totalSalary,
        totalEmployerCost: result.totalCompanyBurden,
      },
    };

    return formattedResult;
  };

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
    setEmployeeName(defaultEmployeeName);
    setEmploymentType(EmploymentType.FULL_TIME);
    setEmployeeNumber("");
    setTaxResidencyStatus(TaxResidencyStatus.TAIWAN);
    setIndustryCategory(defaultIndustryCategory);
    setEmployeeEmail("");
    setSelectedYear(yearOptions[0]);
    setSelectedMonth(defaultMonth);
    setPayrollDaysBase(payrollDaysBaseOptions[0]);
    setIsJoined(false);
    setIsLeft(false);
    setDayOfJoining("01");
    setDayOfLeaving("01");
    setBaseSalary(defaultBasicSalary);
    setMealAllowance(0);
    setOtherAllowanceWithTax(0);
    setOtherAllowanceWithoutTax(0);
    // Info: (20250722 - Julian) 重置工作時數相關 state
    setOneAndOneThirdsHoursForNonTax(0);
    setOneAndTwoThirdsHoursForNonTax(0);
    setTwoHoursForNonTax(0);
    setTwoAndOneThirdsHoursForNonTax(0);
    setTwoAndTwoThirdsHoursForNonTax(0);
    setOneAndOneThirdsHoursForTaxable(0);
    setOneAndTwoThirdsHoursForTaxable(0);
    setTwoHoursForTaxable(0);
    setTwoAndOneThirdsHoursForTaxable(0);
    setTwoAndTwoThirdsHoursForTaxable(0);
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
    // Info: (20260831 - Julian) 重置也要解除員工連結，否則下一筆試算會掛到上一個人身上
    setSelectedEmployeeId(null);
    // Info: (20250710 - Julian) 重置計算機狀態
    setCompleteSteps(defaultTabSteps);
    setCurrentStep(1);
    setIsNameError(false);
  };

  /**
   * Info: (20260831 - Julian) 從員工名單選一位，把他的資料帶進計算機。
   *
   * 除了灌欄位還要記住 id —— 那才是「按下儲存會存到誰身上」的答案。
   * 姓名走 setEmployeeName 而不是 changeEmployeeName：後者會把連結清掉。
   */
  const linkEmployee = (employee: ISalaryCalculatorEmployee) => {
    setEmployeeName(employee.name);
    setIsNameError(employee.name === "");
    setEmployeeNumber(employee.number);
    setEmployeeEmail(employee.email);
    setBaseSalary(employee.baseSalary);
    // Info: (20260831 - Julian) 伙食費原本漏了沒帶，補上（employee_list_modal 的舊行為）
    setMealAllowance(employee.mealAllowance);
    setSelectedEmployeeId(employee.id);
  };

  const unlinkEmployee = () => setSelectedEmployeeId(null);

  /**
   * Info: (20260831 - Julian) 把一筆薪資紀錄的輸入快照載回計算機。
   *
   * 只還原「算出這個結果需要的輸入」，不動姓名／編號／Email 與員工連結：
   * 那四樣是「這筆紀錄屬於誰」，由呼叫端依紀錄上的員工另外設定。
   */
  const loadFromSnapshot = (input: ISalaryCalculatorOptions) => {
    const form = fromCalculatorOptions(input, defaultMonth);

    setSelectedYear(form.selectedYear);
    setSelectedMonth(form.selectedMonth);
    setIndustryCategory(form.industryCategory);
    setTaxResidencyStatus(form.taxResidencyStatus);
    setIsJoined(form.isJoined);
    setDayOfJoining(form.dayOfJoining);
    setIsLeft(form.isLeft);
    setDayOfLeaving(form.dayOfLeaving);
    setPayrollDaysBase(form.payrollDaysBase);

    setBaseSalary(form.baseSalary);
    setMealAllowance(form.mealAllowance);
    setOtherAllowanceWithTax(form.otherAllowanceWithTax);
    setOtherAllowanceWithoutTax(form.otherAllowanceWithoutTax);

    setOneAndOneThirdsHoursForTaxable(form.oneAndOneThirdHoursForTaxable);
    setOneAndTwoThirdsHoursForTaxable(form.oneAndTwoThirdsHoursForTaxable);
    setTwoHoursForTaxable(form.twoHoursForTaxable);
    setTwoAndOneThirdsHoursForTaxable(form.twoAndOneThirdsHoursForTaxable);
    setTwoAndTwoThirdsHoursForTaxable(form.twoAndTwoThirdsHoursForTaxable);
    setOneAndOneThirdsHoursForNonTax(form.oneAndOneThirdsHoursForNonTax);
    setOneAndTwoThirdsHoursForNonTax(form.oneAndTwoThirdsHoursForNonTax);
    setTwoHoursForNonTax(form.twoHoursForNonTax);
    setTwoAndOneThirdsHoursForNonTax(form.twoAndOneThirdsHoursForNonTax);
    setTwoAndTwoThirdsHoursForNonTax(form.twoAndTwoThirdsHoursForNonTax);
    setLeavePayoutHours(form.leavePayoutHours);
    setSickLeaveHours(form.sickLeaveHours);
    setPersonalLeaveHours(form.personalLeaveHours);

    setIsLaborInsurance(form.isLaborInsurance);
    setIsNHI(form.isNHI);
    setIsLaborPension(form.isLaborPension);
    setNhiBackPremium(form.nhiBackPremium);
    setSecondGenNhiTax(form.secondGenNhiTax);
    setOtherAdjustments(form.otherAdjustments);
    setVoluntaryPensionContribution(form.voluntaryPensionContribution);
    setNumberOfDependents(form.numberOfDependents);

    // Info: (20260831 - Julian) 載回來的紀錄已經填完四步，直接跳到最後一步
    setCompleteSteps(
      defaultTabSteps.map((step) => ({ ...step, completed: true })),
    );
    setCurrentStep(4);
  };

  // Info: (20250709 - Julian) =========== 基本資訊相關 state 和 functions ===========
  const changeEmployeeName = (name: string) => {
    setEmployeeName(name);
    setIsNameError(name === ""); // Info: (20250711 - Julian) 如果未填姓名則顯示錯誤
    /**
     * Info: (20260831 - Julian) 手動改姓名就解除員工連結。
     *
     * 不解除的話會出現「畫面上寫著李佳蓉，存進去卻掛在王小明底下」——
     * 那是一筆看起來正常、但掛錯人的薪資紀錄，事後很難發現。
     */
    setSelectedEmployeeId(null);
  };
  const changeEmploymentType = (type: EmploymentType) => {
    setEmploymentType(type);
  };
  const changeTaxResidencyStatus = (status: TaxResidencyStatus) => {
    setTaxResidencyStatus(status);
  };
  const changeIndustryCategory = (category: IndustryCategoryItem) => {
    setIndustryCategory(category);
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

  const value = {
    yearOptions,
    monthOptions,
    payrollDaysBaseOptions,
    currentStep,
    completeSteps,
    salaryCalculatorResult: getSalaryCalculatorResult(),
    switchStep,
    resetFormHandler,
    selectedEmployeeId,
    linkEmployee,
    unlinkEmployee,
    loadFromSnapshot,
    getSalaryCalculatorOptions,
    employeeName,
    changeEmployeeName,
    employeeNumber,
    changeEmployeeNumber,
    employmentType,
    changeEmploymentType,
    taxResidencyStatus,
    changeTaxResidencyStatus,
    industryCategory,
    changeIndustryCategory,
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
  };

  return (
    <CalculatorContext.Provider value={value}>
      {children}
    </CalculatorContext.Provider>
  );
};

export const useCalculatorCtx = () => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error(
      "useCalculatorCtx must be used within a CalculatorProvider",
    );
  }
  return context;
};
