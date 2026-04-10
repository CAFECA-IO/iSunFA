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

export interface IEsgDashboardSummary {
  todayEsgRecordCount: number;
  dqiAverage: number;
  pendingEsgRecordCount: number;
  aiAverageConfidence: number;
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
  rawActivityData: string;
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
