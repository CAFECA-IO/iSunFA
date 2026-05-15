import {
  ESG_INDUSTRY_LOSS_RATIO_BENCHMARKS,
  IndustryCategory,
} from "@/constants/esg_industry_benchmarks";

export class EsgBenchmarkService {
  // Info: (20260515 - Julian) 取得特定產業容損率
  // @param industry 產業類別
  // @returns 平均耗損率 (%)
  getLossRatio(industry: string): number {
    // Info: (20260515 - Julian) 統一產業類別名稱
    const normalizedIndustry = industry?.trim() as IndustryCategory;

    // Info: (20260515 - Julian) 取得產業容損率
    const benchmark = ESG_INDUSTRY_LOSS_RATIO_BENCHMARKS[normalizedIndustry];

    // Info: (20260515 - Julian) 若找不到產業類型，則回傳一般製造業的容損率
    if (!benchmark) {
      console.warn(`找不到產業類型：${industry}`);
      return 0;
    }

    // Info: (20260515 - Julian) 回傳 min 與 max 的平均值
    const lossRatio =
      (Number(benchmark.lossRatioMin) + Number(benchmark.lossRatioMax)) / 2;
    return lossRatio;
  }
}

export const esgBenchmarkService = new EsgBenchmarkService();
