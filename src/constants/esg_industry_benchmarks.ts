export interface IEsgIndustryBenchmark {
  id: number;
  industryName: string;
  carbonSpectrum: string;
  emissionPer10kMin: number;
  emissionPer10kMax: number;
  benchmarkDescription: string;
}

export const ESG_INDUSTRY_BENCHMARKS: IEsgIndustryBenchmark[] = [
  {
    id: 1,
    industryName: "esg_verify.esg_industry_benchmarks.industry_1.name",
    carbonSpectrum:
      "esg_verify.esg_industry_benchmarks.spectrum.extremely_high",
    emissionPer10kMin: 1.5,
    emissionPer10kMax: 3.65,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_1.desc",
  },
  {
    id: 2,
    industryName: "esg_verify.esg_industry_benchmarks.industry_2.name",
    carbonSpectrum:
      "esg_verify.esg_industry_benchmarks.spectrum.extremely_high",
    emissionPer10kMin: 1.5,
    emissionPer10kMax: 2.883,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_2.desc",
  },
  {
    id: 3,
    industryName: "esg_verify.esg_industry_benchmarks.industry_3.name",
    carbonSpectrum: "esg_verify.esg_industry_benchmarks.spectrum.very_high",
    emissionPer10kMin: 1.068,
    emissionPer10kMax: 2.657,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_3.desc",
  },
  {
    id: 4,
    industryName: "esg_verify.esg_industry_benchmarks.industry_4.name",
    carbonSpectrum: "esg_verify.esg_industry_benchmarks.spectrum.high",
    emissionPer10kMin: 0.126,
    emissionPer10kMax: 0.52,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_4.desc",
  },
  {
    id: 5,
    industryName: "esg_verify.esg_industry_benchmarks.industry_5.name",
    carbonSpectrum: "esg_verify.esg_industry_benchmarks.spectrum.mid_high",
    emissionPer10kMin: 0.05,
    emissionPer10kMax: 0.4,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_5.desc",
  },
  {
    id: 6,
    industryName: "esg_verify.esg_industry_benchmarks.industry_6.name",
    carbonSpectrum: "esg_verify.esg_industry_benchmarks.spectrum.mid_high",
    emissionPer10kMin: 0.1,
    emissionPer10kMax: 0.272,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_6.desc",
  },
  {
    id: 7,
    industryName: "esg_verify.esg_industry_benchmarks.industry_7.name",
    carbonSpectrum: "esg_verify.esg_industry_benchmarks.spectrum.medium",
    emissionPer10kMin: 0.03,
    emissionPer10kMax: 0.15,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_7.desc",
  },
  {
    id: 8,
    industryName: "esg_verify.esg_industry_benchmarks.industry_8.name",
    carbonSpectrum: "esg_verify.esg_industry_benchmarks.spectrum.medium",
    emissionPer10kMin: 0.02,
    emissionPer10kMax: 0.08,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_8.desc",
  },
  {
    id: 9,
    industryName: "esg_verify.esg_industry_benchmarks.industry_9.name",
    carbonSpectrum: "esg_verify.esg_industry_benchmarks.spectrum.mid_low",
    emissionPer10kMin: 0.02,
    emissionPer10kMax: 0.04,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_9.desc",
  },
  {
    id: 10,
    industryName: "esg_verify.esg_industry_benchmarks.industry_10.name",
    carbonSpectrum: "esg_verify.esg_industry_benchmarks.spectrum.extremely_low",
    emissionPer10kMin: 0.0001,
    emissionPer10kMax: 0.002,
    benchmarkDescription: "esg_verify.esg_industry_benchmarks.industry_10.desc",
  },
];

// Info: (20260515 - Julian) 產業類別列舉
export enum IndustryCategory {
  SEMICONDUCTOR = "半導體業",
  CHEMICAL = "化工業",
  METAL_PROCESSING = "傳統金屬加工業",
  PLASTIC_INJECTION = "塑膠射出成型業",
  ELECTRONIC_COMPONENTS = "電子零組件業",
  GENERAL_MANUFACTURING = "一般製造業",
  TEXTILE = "紡織業",
}

export interface IEsgIndustryLossRatioBenchmark {
  industryName: IndustryCategory;
  lossRatioMin: number;
  lossRatioMax: number;
  description: string;
}

// Info: (20260515 - Julian) 產業類別物質損耗率參考值，用於品質檢查與估算
export const ESG_INDUSTRY_LOSS_RATIO_BENCHMARKS: Record<
  string,
  IEsgIndustryLossRatioBenchmark
> = {
  [IndustryCategory.SEMICONDUCTOR]: {
    industryName: IndustryCategory.SEMICONDUCTOR,
    lossRatioMin: 0.01,
    lossRatioMax: 0.03,
    description:
      "氣體與化學品多在密閉系統或有高效率尾氣處理設備，一般製程耗損率與溢散率較低（約 1% ~ 3%）。",
  },
  [IndustryCategory.CHEMICAL]: {
    industryName: IndustryCategory.CHEMICAL,
    lossRatioMin: 0.02,
    lossRatioMax: 0.05,
    description:
      "受槽體揮發、管線洩漏與反應過程溢散影響，視製程密閉程度而定（一般約 2% ~ 5%）。高度揮發性溶劑無回收裝置時可能達 10% 以上。",
  },
  [IndustryCategory.METAL_PROCESSING]: {
    industryName: IndustryCategory.METAL_PROCESSING,
    lossRatioMin: 0.05,
    lossRatioMax: 0.1,
    description:
      "切削液、潤滑油及金屬清洗溶劑之揮發與工件帶出耗損較高（約 5% ~ 10%）。未回收之高揮發性清洗溶劑揮發率通常視為 100%。",
  },
  [IndustryCategory.PLASTIC_INJECTION]: {
    industryName: IndustryCategory.PLASTIC_INJECTION,
    lossRatioMin: 0.03,
    lossRatioMax: 0.05,
    description:
      "主要來自成型廢料、機台清料（Purging）與邊角料等實體耗損（約 3% ~ 5%）。",
  },
  [IndustryCategory.ELECTRONIC_COMPONENTS]: {
    industryName: IndustryCategory.ELECTRONIC_COMPONENTS,
    lossRatioMin: 0.02,
    lossRatioMax: 0.04,
    description:
      "如 PCB、被動元件等製程中之化學槽液揮發、顯影蝕刻液微量帶出（約 2% ~ 4%）。",
  },
  [IndustryCategory.GENERAL_MANUFACTURING]: {
    industryName: IndustryCategory.GENERAL_MANUFACTURING,
    lossRatioMin: 0.03,
    lossRatioMax: 0.05,
    description:
      "若無廠內實際製程耗損數據，以質量平衡法計算時，預設耗損率可抓約 3% ~ 5% 作為合理之工程估算。",
  },
  [IndustryCategory.TEXTILE]: {
    industryName: IndustryCategory.TEXTILE,
    lossRatioMin: 0.05,
    lossRatioMax: 0.1,
    description:
      "特別是染整製程中，染料、助劑與化學溶劑易隨廢水排出或於烘乾過程中揮發；紡紗與織布亦有飛花與下腳料耗損（約 5% ~ 10%）。",
  },
} as const;
/**
 * Info: (20260515 - Tzuhan)
 * EsgBenchmarkService (Mock Facade)
 *
 * 這是為了質量守恆防呆機制建置的 Mock。
 * 在 Ticket 6 產業容損率建置完成前，提供安全的預設值供測試。
 */
export class EsgBenchmarkService {
  /**
   * Info: (20260515 - Tzuhan)
   * 取得特定產業的合理原物料耗損/揮發率 (Loss Ratio)
   * @param industry 產業別
   * @returns 容損率 (如 0.05 代表 5%)
   */
  static getLossRatio(): number {
    // Info: (20260515 - Tzuhan) Mock: 預設給予 5% 的容損空間
    return 0.05;
  }
}
