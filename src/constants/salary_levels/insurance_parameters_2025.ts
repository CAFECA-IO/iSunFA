/**
 * Info: (20251001 - Luphia) 2025 勞保、就保、職保、健保、勞退計算公式
 * 勞工保險從 39 年 5 月 1 日起實施
 * 勞工退休金舊制從 75 年 11 月 1 日起實施
 * 全民健康保險從 84 年 3 月 1 日起實施
 * 勞工退休金新制從 94 年 7 月 1 日起實施
 * 就業保險從 92 年 1 月 1 日起實施
 * 職業災害保險從 111 年 5 月 1 日起實施
 * 薪資級距主軸為二階等差級數，但有大量例外級距
 * 勞保最高級距為 45800，就保最高級距為 45800，職保最高級距為 72800，健保最高級距為 313000，勞退最高級距為 150000
 * 勞保費率為 11.5%，就保費率為 1.0%，職保費率依行業別而異，健保費率為 5.17%，勞退費率為 6%
 * 勞保負擔比例為公司 70%、員工 20%、政府 10%；健保負擔比例為公司 60%、員工 30%、政府 10%；職保負擔比例為公司 100%、員工 0%、政府 0%
 * 勞退提撥比例為公司 6%、員工自願提繳
 * 平均眷口數為 0.56 人
 * 計算健保時，公司負擔為投保薪資 * 健保費率 * (1 + 平均眷口數) * 公司負擔比例，員工負擔為投保薪資 * 健保費率 * (1 + 員工扶養眷口數) * 員工負擔比例
 */

const minimumWage = 28590; // Info: (20251001 - Luphia) 2025 最低薪資

// Info: (20251003 - Luphia) 2025 薪資級距分為四個區間

// Info: (20251003 - Luphia) 第一區間 1500 元級距
const group1 = new Array(5).fill(0).map((_, i) => (i + 1) * 1500);
// Info: (20251003 - Luphia) 第二區間 1200 元級距
const group2 = new Array(3).fill(0).map((_, i) => 7500 + (i + 1) * 1200);
// Info: (20251003 - Luphia) 第三區間無規則數列
const group3 = [
  12540, 13500, 15840, 16500, 17280, 17880, 19047, 20008, 21009, 22000, 23100, 24000, 25250, 26400,
  27600, 28590,
];
// Info: (20251003 - Luphia) 第四區間二階等差數列，穿插特例
const range = [
  [28800, 87600],
  [92100, 147900],
  [150000, 313000],
];
const rangeStepCount = 5; // Info: (20251001 - Luphia) 2025 級距週期
let level = range[0][0];
let stepCount = 0;
let rangeStep = 1500; // Info: (20251001 - Luphia) 2025 薪資級距區間
let rangeStepStep = 400; // Info: (20251001 - Luphia) 2025 投保薪資級距區間增幅
const rangeStepStepStep = 100; // Info: (20251001 - Luphia) 2025 投保薪資級距區間增幅增幅
const group4 = range
  .map((r: number[]) => {
    [level] = r;
    const currentGroup = [level];
    while (level < r[1] - rangeStep) {
      level += rangeStep;
      stepCount += 1;
      currentGroup.push(level);
      if (stepCount === rangeStepCount) {
        rangeStep += rangeStepStep;
        rangeStepStep += rangeStepStepStep;
        stepCount = 0;
      }
    }
    currentGroup.push(r[1]);
    if (stepCount > 0) {
      rangeStep += rangeStepStep;
      rangeStepStep += rangeStepStepStep;
      stepCount = 0;
    }
    return currentGroup;
  })
  .flat();
const SALARY_LEVELS = [...group1, ...group2, ...group3, ...group4];
const MAX_LABOR_INSURANCE_WAGE = 45800; // Info: (20251001 - Luphia) 2025 勞保最高投保薪資
const MAX_EMPLOYMENT_INSURANCE_WAGE = 45800; // Info: (20251001 - Luphia) 2025 就保最高投保薪資
const MAX_ACCIDENT_INSURANCE_WAGE = 72800; // Info: (20251001 - Luphia) 2025 職保最高投保薪資
const MAX_HEALTH_INSURANCE_WAGE = 313000; // Info: (20251001 - Luphia) 2025 健保最高投保薪資
const MAX_PENSION_INSURANCE_WAGE = 150000; // Info: (20251001 - Luphia) 2025 勞退最高投保薪資
const AVERAGE_DEPENDENTS = 0.56; // Info: (20251001 - Luphia) 2025 平均眷口數
const HEALTH_INSURANCE_RATE = 0.0517; // Info: (20251001 - Luphia) 2025 健保費率
const LABOR_INSURANCE_RATE = 0.115; // Info: (20251001 - Luphia) 2025 勞保費率
const EMPLOYMENT_INSURANCE_RATE = 0.01; // Info: (20251001 - Luphia) 2025 就保費率
const PENSION_INSURANCE_RATE = 0.06; // Info: (20251001 - Luphia) 2025 勞退費率

// Info: (20251001 - Luphia) 2025 保險費負擔比例
const INSURANCE_BURDEN = {
  LABOR_INSURANCE: { COMPANY: 0.7, EMPLOYEE: 0.2, GOVERNMENT: 0.1 },
  EMPLOYMENT_INSURANCE: { COMPANY: 0.7, EMPLOYEE: 0.2, GOVERNMENT: 0.1 },
  ACCIDENT_INSURANCE: { COMPANY: 1.0, EMPLOYEE: 0.0, GOVERNMENT: 0.0 },
  HEALTH_INSURANCE: { COMPANY: 0.6, EMPLOYEE: 0.3, GOVERNMENT: 0.1 },
  PENSION_INSURANCE: { COMPANY: 1.0, EMPLOYEE: 0.0, GOVERNMENT: 0.0 },
};

export const INSURANCE_PARAMETERS_2025 = {
  YEAR: 2025,
  DATA: {
    MINIMUM_WAGE: minimumWage,
    SALARY_LEVELS,
    MAX_LABOR_INSURANCE_WAGE,
    MAX_EMPLOYMENT_INSURANCE_WAGE,
    MAX_ACCIDENT_INSURANCE_WAGE,
    MAX_HEALTH_INSURANCE_WAGE,
    MAX_PENSION_INSURANCE_WAGE,
    AVERAGE_DEPENDENTS,
    HEALTH_INSURANCE_RATE,
    LABOR_INSURANCE_RATE,
    EMPLOYMENT_INSURANCE_RATE,
    PENSION_INSURANCE_RATE,
    INSURANCE_BURDEN,
  },
};
