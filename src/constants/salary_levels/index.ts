import { SALARY_LEVELS_2026 } from '@/constants/salary_levels/salary_levels_2026';
import { SALARY_DEDUCTION_2026 } from '@/constants/salary_levels/salary_deduction_2026';
import { OCCUPATIONAL_ACCIDENT_INSURANCE_RATE_2026 } from '@/constants/salary_levels/occupational_accident_insurance_rate_2026';
import { INSURANCE_PARAMETERS_2026 } from '@/constants/salary_levels/insurance_parameters_2026';

export type ISalaryLevel = (typeof SALARY_LEVELS_2026.data)[number];
export type ISalaryDeduction = (typeof SALARY_DEDUCTION_2026.DATA)[number];
export type IOccupationalAccidentInsuranceRate =
  (typeof OCCUPATIONAL_ACCIDENT_INSURANCE_RATE_2026.DATA)[number];
export type IInsuranceParameters = typeof INSURANCE_PARAMETERS_2026.DATA;

export const SALARY_LEVELS = [SALARY_LEVELS_2026];
export const SALARY_DEDUCTIONS = [SALARY_DEDUCTION_2026];
export const OCCUPATIONAL_ACCIDENT_INSURANCE_RATE = [
  OCCUPATIONAL_ACCIDENT_INSURANCE_RATE_2026,
];
export const INSURANCE_PARAMETERS = [ INSURANCE_PARAMETERS_2026];
