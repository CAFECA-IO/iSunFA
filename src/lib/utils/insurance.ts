import { INSURANCETABLE } from '@/constants/insurance_pension_table';

export function getInsuranceInfo(salary: number): {
  insuredSalary: number;
  employerTotalContribution: number;
} {
  const insuranceTable = INSURANCETABLE;
  const { length } = insuranceTable;
  if (salary < insuranceTable[0].insuredSalary) {
    return insuranceTable[0];
  }
  if (salary > insuranceTable[length - 1].insuredSalary) {
    return insuranceTable[length - 1];
  }
  const insuranceInfo = insuranceTable.find((data) => salary <= data.insuredSalary);
  return insuranceInfo
    ? {
        insuredSalary: insuranceInfo.insuredSalary,
        employerTotalContribution: insuranceInfo.employerTotalContribution,
      }
    : insuranceTable[length - 1];
}
