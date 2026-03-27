import { AIAnalysisStatus } from "@/constants/ai_analysis_status";

export interface IJournalDashboardSummary {
  todayJournalCount: number;
  pendingJournalCount: number;
  aiAverageConfidence: number;
}

export interface IJournal {
  id: string;
  tradingTimestamp: number;
  text: string;
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
  analysisStatus: AIAnalysisStatus;
  confidence: number;
  isVerified: boolean;
  aiNote: string;
}
