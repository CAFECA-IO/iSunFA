import { AIAnalysisStatus } from "@/interfaces/ai_analysis_status";

export interface IJournal {
  id: string;
  createdAt: string;
  text: string;
  fileId: string;
  file?: {
    id: string;
    hash: string;
    fileName: string;
  };
  analysisStatus: AIAnalysisStatus
}
