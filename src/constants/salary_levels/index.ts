import { SALARY_LEVELS_2025 } from '@/constants/salary_levels/salary_levels_2025';
import { SALARY_DEDUCTION_2025 } from '@/constants/salary_levels/salary_deduction_2025';
import { OCCUPATIONAL_ACCIDENT_INSURANCE_RATE_2025 } from '@/constants/salary_levels/occupational_accident_insurance_rate_2025';
import { INSURANCE_PARAMETERS_2025 } from '@/constants/salary_levels/insurance_parameters_2025';

export type ISalaryLevel = (typeof SALARY_LEVELS_2025.data)[number];
export type ISalaryDeduction = (typeof SALARY_DEDUCTION_2025.DATA)[number];
export type IOccupationalAccidentInsuranceRate =
  (typeof OCCUPATIONAL_ACCIDENT_INSURANCE_RATE_2025.DATA)[number];
export type InsuranceParameters = typeof INSURANCE_PARAMETERS_2025.DATA;

export const SALARY_LEVELS = [SALARY_LEVELS_2025];
export const SALARY_DEDUCTIONS = [SALARY_DEDUCTION_2025];
export const OCCUPATIONAL_ACCIDENT_INSURANCE_RATE = [OCCUPATIONAL_ACCIDENT_INSURANCE_RATE_2025];
export const INSURANCE_PARAMETERS = [INSURANCE_PARAMETERS_2025];
