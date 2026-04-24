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

// Info: (20260424 - Julian) 用於「排放源歸口」列表頁
export interface IEsgRecordBrief {
  id: string;
  tradingDate: number;
  activityType: EsgActivityTypeKey | null;
  vendor: string; // Info: (20260424 - Julian) 排放源名稱
  amount: number; // Info: (20260424 - Julian) 排放量
  unit: string; // Info: (20260424 - Julian) 單位
  emissions: number; // Info: (20260424 - Julian) 碳排放量
  emissionSourceTag?: string; // Info: (20260424 - Julian) 排放源標籤（例：第一號鍋爐）
}

// Info: (20260424 - Julian) 用於「碳盤查紀錄」列表頁
export interface IEsgRecordItem extends IEsgRecordBrief {
  scope: EsgScope | null; // Info: (20260424 - Julian) 範疇
  intensity: EsgIntensity; // Info: (20260424 - Julian) 碳排放強度
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
  confidence: number; // Info: (20260424 - Julian) AI 信心分數
  isVerified: boolean; // Info: (20260424 - Julian) 是否已驗證
}

// Info: (20260424 - Julian) 用於「編輯碳盤查紀錄」 modal
export interface IEsgRecordDetail extends IEsgRecordItem {
  dqiScore: number; // Info: (20260424 - Julian) 數據品質分數
  coefficient: ICoefficient | null; // Info: (20260424 - Julian) 排放係數
  analysisStatus: AIAnalysisStatus | null; // Info: (20260424 - Julian) AI 分析狀態
  aiNote: string; // Info: (20260424 - Julian) AI 分析備註
  journalId?: string; // Info: (20260424 - Julian) 會計分錄 ID
  voucherId?: string; // Info: (20260424 - Julian) 傳票 ID
  isDeleted?: boolean; // Info: (20260424 - Julian) 是否已刪除
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
