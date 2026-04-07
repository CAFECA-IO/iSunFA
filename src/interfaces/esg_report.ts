export interface IEsgReportItem {
  id: string;
  name: string;
  amount: number; // Info: (20260406 - Luphia) Emissions in kgCO2e
  percentageOfScope: number;
}

export interface IEsgReportSection {
  items: IEsgReportItem[];
  total: number;
}

export interface IEsgReportMetrics {
  totalEmissions: number;
  scope1Proportion: number;
  scope2Proportion: number;
  scope3Proportion: number;
}

export interface IEsgReport {
  sections: {
    scope1: IEsgReportSection;
    scope2: IEsgReportSection;
    scope3: IEsgReportSection;
    grossEmissions: { total: number };
  };
  metrics: IEsgReportMetrics;
}
