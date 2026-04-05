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
