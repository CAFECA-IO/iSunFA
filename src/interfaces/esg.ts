import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { EsgActivityTypeKey } from "@/constants/esg_activity_type";
import { ICoefficient } from "@/interfaces/coefficient";

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

export interface IEsgScopeDistributionData {
  scope: EsgScope;
  value: number;
  percentage: number;
}

export interface IEsgDashboardSummary {
  totalEmissions: IEsgTotalEmissions;
  emissionIntensity: IEsgEmissionIntensity;
  scopeDistribution: IEsgScopeDistributionData[];
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
  activityType: EsgActivityTypeKey | null;
  vendor: string;
  amount: number;
  unit: string;
  emissions: string;
  dqiScore: number;
  coefficient: ICoefficient | null;
  intensity: EsgIntensity;
  confidence: number;
  isVerified: boolean;
  analysisStatus: AIAnalysisStatus | null;
  aiNote: string;
  journalId?: string;
  voucherId?: string;
  isDeleted?: boolean;
  emissionSourceTag?: string; // Info: (20260421 - Julian) 排放源標籤（例：第一號鍋爐）
}
