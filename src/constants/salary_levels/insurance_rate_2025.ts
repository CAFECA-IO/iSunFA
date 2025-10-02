/**
 * Info: (20251001 - Luphia) 2025 勞保、就保、職保、健保、勞退計算公式
 * 薪資級距從 28590 為最低薪資，下一級從 28800 開始
 * 初始每級級距為 1500，5 級後級距增加 400，再過 5 級後級距增加 500
 * 勞保最高級距為 45800，就保最高級距為 45800，職保最高級距為 72800，健保最高級距為 313000，勞退最高級距為 150000
 * 勞保費率為 11.5%，就保費率為 1.0%，職保費率依行業別而異，健保費率為 5.17%，勞退費率為 6%
 * 勞保負擔比例為公司 70%、員工 20%、政府 10%；健保負擔比例為公司 60%、員工 30%、政府 10%；職保負擔比例為公司 100%、員工 0%、政府 0%
 * 勞退提撥比例為公司 6%、員工自願提繳
 * 平均眷口數為 0.56 人
 * 計算健保時，公司負擔為投保薪資 * 健保費率 * (1 + 平均眷口數) * 公司負擔比例，員工負擔為投保薪資 * 健保費率 * (1 + 員工扶養眷口數) * 員工負擔比例
 */

const minimumWage = 28590; // Info: (20251001 - Luphia) 2025 最低投保薪資
const wageStart = 28800; // Info: (20251001 - Luphia) 2025 投保公式起點
const wageStepCount = 5; // Info: (20251001 - Luphia) 2025 投保公式切換極具週期
const wageStep = 1500; // Info: (20251001 - Luphia) 2025 薪資級距區間
const wageStepStep = 400; // Info: (20251001 - Luphia) 2025 投保薪資級距區間增幅
const wageStepStepStep = 100; // Info: (20251001 - Luphia) 2025 投保薪資級距區間增幅增幅

const averageDependents = 0.56; // Info: (20251001 - Luphia) 2025 平均眷口數
const healthInsuranceRate = 0.0517; // Info: (20251001 - Luphia) 2025 健保費率
const laborInsuranceRate = 0.115; // Info: (20251001 - Luphia) 2025 勞保費率
const employmentInsuranceRate = 0.01; // Info: (20251001 - Luphia) 2025 就保費率

// Info: (20251001 - Luphia) 2025 保險費負擔比例
const insuranceBurden = {
  laborInsurance: { company: 0.7, employee: 0.2, government: 0.1 },
  healthInsurance: { company: 0.6, employee: 0.3, government: 0.1 },
  accidentInsurance: { company: 1.0, employee: 0.0, government: 0.0 },
};

export const insuranceRate = {
  year: 2025,
  data: {
    minimumWage,
    wageStart,
    wageStepCount,
    wageStep,
    wageStepStep,
    wageStepStepStep,
    averageDependents,
    healthInsuranceRate,
    laborInsuranceRate,
    employmentInsuranceRate,
    insuranceBurden,
  },
};
