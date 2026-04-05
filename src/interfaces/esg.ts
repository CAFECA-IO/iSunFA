import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

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

export interface IEsgTotalEmissions {
  value: number;
  unit: string;
  estimatedEndOfMonth: number;
  estimatedUnit: string;
}

export interface IEsgEmissionIntensity {
  value: number | null;
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
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
  scope: EsgScope | null;
  activityType: string;
  vendor: string;
  rawActivityData: string;
  unit: string;
  emissions: string;
  coefficient?: string | null;
  coefficientSource?: string | null;
  intensity: EsgIntensity;
  confidence: number;
  isVerified: boolean;
  analysisStatus: AIAnalysisStatus | null;
  aiNote: string;
  journalId?: string;
  voucherId?: string;
  isDeleted?: boolean;
}
