export type RowItem = {
  label: string;
  value: number;
};

export interface IMonthlySalary {
  baseSalary: number; // Info: (20250710 - Julian) 本薪
  mealAllowance: number; // Info: (20250710 - Julian) 伙食費
  overtimePay: number; // Info: (20250710 - Julian) 加班費
  otherAllowance: number; // Info: (20250710 - Julian) 其他津貼
  totalMonthlySalary: number; // Info: (20250710 - Julian) 月薪資合計
}

export interface IEmployeeContribution {
  employeePaidLaborInsurance: number; // Info: (20250710 - Julian) 自行負擔勞保費
  employeePaidHealthInsurance: number; // Info: (20250710 - Julian) 自行負擔健保費
  voluntaryPensionContribution: number; // Info: (20250710 - Julian) 自提勞退
  withheldIncomeTax: number; // Info: (20250710 - Julian) 代扣所得稅款
  withheldSecondGenerationNHIPremium: number; // Info: (20250710 - Julian) 代扣二代健保
  salaryDeductionForLeave: number; // Info: (20250710 - Julian) 請假扣薪
  totalEmployeeContribution: number; // Info: (20250710 - Julian) 員工負擔總計
}

export interface IInsuredSalary {
  healthInsuranceSalaryBracket: number; // Info: (20250710 - Julian) 健保投保級距
  laborInsuranceSalaryBracket: number; // Info: (20250710 - Julian) 勞保投保級距
  employmentInsuranceSalaryBracket: number; // Info: (20250710 - Julian) 就業保險級距
  occupationalInjuryInsuranceSalaryBracket: number; // Info: (20250710 - Julian) 職災保險級距
  laborPensionSalaryBracket: number; // Info: (20250710 - Julian) 勞退級距
  occupationalInjuryIndustryRate: number; // Info: (20250710 - Julian) 職災行業別費率
  insuredSalary: number; // Info: (20250710 - Julian) 投保薪資
}

export interface IEmployerContribution {
  employerContributions: number; // Info: (20250710 - Julian) 公司負擔勞健退
  employerPaidLaborInsurance: number; // Info: (20250710 - Julian) 公司負擔勞保費
  employerPaidHealthInsurance: number; // Info: (20250710 - Julian) 公司負擔健保費
  employerPaidPensionContribution: number; // Info: (20250710 - Julian) 公司負擔退休金
  totalEmployerCost: number; // Info: (20250710 - Julian) 雇主總負擔
}

export interface ISalaryCalculator {
  monthlySalary: IMonthlySalary; // Info: (20250710 - Julian) 月薪資項目
  employeeContribution: IEmployeeContribution; // Info: (20250710 - Julian) 員工負擔項目
  insuredSalary: IInsuredSalary; // Info: (20250710 - Julian) 投保薪資
  employerContribution: IEmployerContribution; // Info: (20250710 - Julian) 雇主負擔項目
  totalSalary: number; // Info: (20250710 - Julian) 薪資合計
}

export const defaultSalaryCalculator: ISalaryCalculator = {
  monthlySalary: {
    baseSalary: 0,
    mealAllowance: 0,
    overtimePay: 0,
    otherAllowance: 0,
    totalMonthlySalary: 0,
  },
  employeeContribution: {
    employeePaidLaborInsurance: 0,
    employeePaidHealthInsurance: 0,
    voluntaryPensionContribution: 0,
    withheldIncomeTax: 0,
    withheldSecondGenerationNHIPremium: 0,
    salaryDeductionForLeave: 0,
    totalEmployeeContribution: 0,
  },
  insuredSalary: {
    healthInsuranceSalaryBracket: 0,
    laborInsuranceSalaryBracket: 0,
    employmentInsuranceSalaryBracket: 0,
    occupationalInjuryInsuranceSalaryBracket: 0,
    laborPensionSalaryBracket: 0,
    occupationalInjuryIndustryRate: 0,
    insuredSalary: 0,
  },
  employerContribution: {
    employerContributions: 0,
    employerPaidLaborInsurance: 0,
    employerPaidHealthInsurance: 0,
    employerPaidPensionContribution: 0,
    totalEmployerCost: 0,
  },
  totalSalary: 0,
};
