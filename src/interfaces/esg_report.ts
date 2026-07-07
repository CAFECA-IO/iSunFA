export interface IEsgReportItem {
  id: string;
  name: string;
  amount: string | number; // Info: (20260406 - Luphia) Emissions in kgCO2e
  percentageOfScope: string;
}

export interface IEsgReportDetailedRecord {
  id: string;
  activityType: string;
  originalData: string;
  unit: string;
  emissions: string | number;
  emissionFactor: string | null; // Info: (20260512 - Tzuhan) Allow null to prevent greenwashing when originalData is 0
  percentage: string;
}

export interface IEsgReportSection {
  items: IEsgReportItem[];
  records?: IEsgReportDetailedRecord[];
  total: string | number;
}

export interface IEsgReportMetrics {
  totalEmissions: string | number;
  scope1Proportion: string;
  scope2Proportion: string;
  scope3Proportion: string;
  iso1Proportion: string;
  iso2Proportion: string;
  iso3Proportion: string;
  iso4Proportion: string;
  iso5Proportion: string;
  iso6Proportion: string;
}

export interface IEsgReport {
  sections: {
    scope1: IEsgReportSection;
    scope2: IEsgReportSection;
    scope3: IEsgReportSection;
    iso1: IEsgReportSection;
    iso2: IEsgReportSection;
    iso3: IEsgReportSection;
    iso4: IEsgReportSection;
    iso5: IEsgReportSection;
    iso6: IEsgReportSection;
    grossEmissions: { total: string | number };
  };
  metrics: IEsgReportMetrics;
}
