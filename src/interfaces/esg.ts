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

export interface IEsgRecord {
  id: string;
  tradingDate: string;
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
  scope: EsgScope | null;
  activityType: string;
  vendor: string;
  amount: number;
  unit: string;
  emissions: string;
  dqiScore: number;
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
