export enum EsgScope {
  SCOPE_1 = "SCOPE_1",
  SCOPE_2 = "SCOPE_2",
  SCOPE_3 = "SCOPE_3",
}

export enum EsgIntensity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum EsgStatus {
  VERIFIED = "VERIFIED",
  MANUAL = "MANUAL",
}

export interface IEsgTotalEmissions {
  value: number;
  unit: string;
  estimatedEndOfMonth: number;
  estimatedUnit: string;
}

export interface IEsgEmissionIntensity {
  value: number;
  unit: string;
  industryAverage: number;
}

export interface IEsgScopeData {
  value: number;
  unit: string;
  percentage: number;
}

export interface IEsgScopeDistribution {
  scope1: IEsgScopeData;
  scope2: IEsgScopeData;
  scope3: IEsgScopeData;
}

export interface IEsgDashboardSummary {
  totalEmissions: IEsgTotalEmissions;
  emissionIntensity: IEsgEmissionIntensity;
  scopeDistribution: IEsgScopeDistribution;
  goalProgress: {
    percentage: number;
  };
}

export const mockDashboardSummary: IEsgDashboardSummary = {
  totalEmissions: {
    value: 1606.5,
    unit: "kgCO2e",
    estimatedEndOfMonth: 1850,
    estimatedUnit: "kg",
  },
  emissionIntensity: {
    value: 1147.5,
    unit: "kg / 萬元營收",
    industryAverage: 2.45,
  },
  scopeDistribution: {
    scope1: { value: 45.2, unit: "kg", percentage: 10 },
    scope2: { value: 1240.5, unit: "kg", percentage: 85 },
    scope3: { value: 320.8, unit: "kg", percentage: 25 },
  },
  goalProgress: {
    percentage: 35.4,
  },
};

export interface IEsgRecord {
  id: string;
  dateTimestamp: number;
   fileId:string;
     file?: {
    id: string;
    hash: string;
    fileName: string;
  };
  scope: EsgScope;
  activityType: string;
  vendor: string;
  rawActivityData: string;
  unit: string;
  emissions: string;
  intensity: EsgIntensity;
  confidence: number;
  status: EsgStatus;
}

export const mockRecords: IEsgRecord[] = [
  {
    id: '1',
    dateTimestamp: 1700000000,
    fileId:'123',
    scope: EsgScope.SCOPE_2,
    activityType: "電力使用",
    vendor: "新新小鎮有限公司 (電力採購)",
    rawActivityData: "2,435",
    unit: "kWh",
    emissions: "1,240.5",
    intensity: EsgIntensity.HIGH,
    confidence: 98,
    status: EsgStatus.VERIFIED
  },
  {
    id: '2',
    dateTimestamp: 1740000000,
      fileId:'abc',
    scope: EsgScope.SCOPE_1,
    activityType: "移動源燃燒",
    vendor: "中油股份有限公司 (公務車加油)",
    rawActivityData: "18.5",
    unit: "Unit",
    emissions: "45.2",
    intensity: EsgIntensity.LOW,
    confidence: 85,
    status: EsgStatus.MANUAL
  },
  {
    id: '3',
    dateTimestamp: 1780000000,
      fileId:'456',
    scope: EsgScope.SCOPE_3,
    activityType: "委外物流",
    vendor: "物流運送服務",
    rawActivityData: "450",
    unit: "Unit",
    emissions: "320.8",
    intensity: EsgIntensity.MEDIUM,
    confidence: 99,
    status:EsgStatus.VERIFIED
  },
];
