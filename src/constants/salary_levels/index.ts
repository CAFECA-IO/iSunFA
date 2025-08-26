import { SALARY_LEVELS_2025 } from '@/constants/salary_levels/salary_levels_2025';
import { SALARY_DEDUCTION_2025 } from '@/constants/salary_levels/salary_deduction_2025';

export type ISalaryLevel = (typeof SALARY_LEVELS_2025.data)[number];
export type ISalaryDeduction = (typeof SALARY_DEDUCTION_2025.data)[number];

export const SALARY_LEVELS = [SALARY_LEVELS_2025];
export const SALARY_DEDUCTIONS = [SALARY_DEDUCTION_2025];
