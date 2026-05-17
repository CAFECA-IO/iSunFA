export interface IEsgReportItem {
  id: string;
  name: string;
  amount: string | number; // Info: (20260406 - Luphia) Emissions in kgCO2e
  percentageOfScope: number;
}

export interface IEsgReportDetailedRecord {
  id: string;
  activityType: string;
  originalData: number;
  unit: string;
  emissions: number;
  coefficient: number | null; // Info: (20260512 - Tzuhan) Allow null to prevent greenwashing when originalData is 0
  percentage: number;
}

export interface IEsgReportSection {
  items: IEsgReportItem[];
  records?: IEsgReportDetailedRecord[];
  total: string | number;
}

export interface IEsgReportMetrics {
  totalEmissions: string | number;
  scope1Proportion: number;
  scope2Proportion: number;
  scope3Proportion: number;
}

export interface IEsgReport {
  sections: {
    scope1: IEsgReportSection;
    scope2: IEsgReportSection;
    scope3: IEsgReportSection;
    grossEmissions: { total: string | number };
  };
  metrics: IEsgReportMetrics;
}
