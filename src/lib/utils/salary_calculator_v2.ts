import { InsuranceParameters, INSURANCE_PARAMETERS } from '@/constants/salary_levels';
import { IGetSalaryLevelOptions } from '@/interfaces/salary_calculator';

const getInsuranceParametersByYear = (year: number): InsuranceParameters => {
  const insuranceParameters = INSURANCE_PARAMETERS.find((params) => params.year === year);
  if (!insuranceParameters) {
    // ToDo: (20250727 - Luphia) Defined ErrorCode and ErrorMessage
    throw new Error(`No insurance parameters found for year ${year}`);
  }
  const { data } = insuranceParameters;
  return data;
};

/**
 * Info: (20251003 - Luphia) 薪資級距公式說明
 * 公式近似三階等差數列，但有若干變化
 * 有最低薪資 minimumWage 與最高薪資 maximumWage 限制，不同的保險上限下限不同
 * 公式起點為 wageStart，每階段有 wageStepCount 為一個分段，在分段內屬於等差數列，公差為 wageStep
 * 每過一個階段，wageStep 增加 wageStepStep，並且 wageStepStep 增加 wageStepStepStep
 * 即第 wageStepCount 的數列與第 wageStepCount + 1 的差距規則近似三階等差數列
 * wageStart = 8800, wageStepCount = 5, wageStep = 900, wageStepStep = 0, wageStepStepStep = 100
 * 第零輪 8800 為起點， 9700, 10600, 11500, 12400, 13300 (5 個數列，公差 900)
 * 第一輪 13300 為起點， 14200, 15100, 16000, 16900, 17800 (5 個數列，公差 900)
 * 第二輪 17800 為起點， 18800, 19800, 20800, 21800, 22800 (5 個數列，公差 1000)
 * 第三輪 22800 為起點， 24000, 25200, 26400, 27600, 28800 (5 個數列，公差 1200)
 * 第四輪 28800 為起點， 30300, 31800, 33300, 34800, 36300 (5 個數列，公差 1500)
 * 第五輪 36300 為起點， 38200, 40100, 42000, 43900, 45800 (5 個數列，公差 1900)
 * 第六輪 45800 為起點， 48200, 50600, 53000, 55400, 57800 (5 個數列，公差 2400)
 * 第七輪 57800 為起點， 60800, 63800, 66800, 69800, 72800 (5 個數列，公差 3000)
 * 以此類推直到達到最高薪資 maximumWage
 */
const getInsuranceLevel = (
  salary: number,
  minimumWage: number,
  maximumWage: number,
  wageStart: number,
  wageStepCount: number,
  wageStep: number,
  wageStepStep: number,
  wageStepStepStep: number
): number => {
  if (salary <= minimumWage) return minimumWage;
  if (salary >= maximumWage) return maximumWage;

  let level = wageStart;
  let step = wageStep;
  let stepStep = wageStepStep;
  let stepCount = 0;

  while (level < salary) {
    level += step;
    stepCount += 1;
    if (stepCount === wageStepCount) {
      step += stepStep;
      stepStep += wageStepStepStep;
      stepCount = 0;
    }
  }

  return level;
};

const getLaborInsuranceLevel = (salary: number, params: InsuranceParameters): number => {
  const {
    minimumWage,
    maxLaborInsuranceWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep,
  } = params;
  const level = getInsuranceLevel(
    salary,
    minimumWage,
    maxLaborInsuranceWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep
  );

  return level;
};

const getEmploymentInsuranceLevel = (salary: number, params: InsuranceParameters): number => {
  const level = getLaborInsuranceLevel(salary, params);
  return level;
};

const getHealthInsuranceLevel = (salary: number, params: InsuranceParameters): number => {
  const {
    minimumWage,
    maxHealthInsuranceWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep,
  } = params;
  const level = getInsuranceLevel(
    salary,
    minimumWage,
    maxHealthInsuranceWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep
  );

  return level;
};

const getAccidentInsuranceLevel = (salary: number, params: InsuranceParameters): number => {
  const {
    minimumWage,
    maxAccidentInsuranceWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep,
  } = params;
  const level = getInsuranceLevel(
    salary,
    minimumWage,
    maxAccidentInsuranceWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep
  );

  return level;
};

const getPensionInsuranceLevel = (salary: number, params: InsuranceParameters): number => {
  const {
    minimumWage,
    maxPensionInsuranceWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep,
  } = params;
  const level = getInsuranceLevel(
    salary,
    minimumWage,
    maxPensionInsuranceWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep
  );

  return level;
};

export const getSalaryLevel = (options: IGetSalaryLevelOptions) => {
  const { salary, year } = options;

  // Info: (20251003 - Luphia) Fetch insurance parameters based on year
  const insuranceParameters = getInsuranceParametersByYear(year);

  // Info: (20251003 - Luphia) Calculate Labor Insurance Level
  const laborInsuranceLevel = getLaborInsuranceLevel(salary, insuranceParameters);

  // Info: (20251003 - Luphia) Calculate Employment Insurance Level
  const employmentInsuranceLevel = getEmploymentInsuranceLevel(salary, insuranceParameters);

  // Info: (20251003 - Luphia) Calculate Health Insurance Level
  const healthInsuranceLevel = getHealthInsuranceLevel(salary, insuranceParameters);

  // Info: (20251003 - Luphia) Calculate Accident Insurance Level
  const accidentInsuranceLevel = getAccidentInsuranceLevel(salary, insuranceParameters);

  // Info: (20251003 - Luphia) Calculate Pension Insurance Level
  const pensionInsuranceLevel = getPensionInsuranceLevel(salary, insuranceParameters);

  return {
    laborInsuranceLevel,
    employmentInsuranceLevel,
    healthInsuranceLevel,
    accidentInsuranceLevel,
    pensionInsuranceLevel,
  };
};

for (let salary = 10000; salary <= 600000; salary += 1000) {
  const salaryLevel = getSalaryLevel({ salary, year: 2025 });
  // eslint-disable-next-line no-console
  console.log(`Salary: ${salary}, Level: ${JSON.stringify(salaryLevel)}`);
}
