// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Define enterprise-grade types and enums for the Carbon Chatbot domain.

import { GhgProtocolCategory } from "@/constants/esg";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";

export enum ChatRoleEnum {
  USER = "user",
  AI = "ai",
}

export enum SessionStatusEnum {
  IN_PROGRESS = "進行中",
  COMPLETED = "已完成",
  DRAFT = "草稿",
  ARCHIVED = "已歸檔",
}

// Info: (20260714 - Emily) 訊息附件 metadata(size 為人類可讀字串)
// Info: (20260714 - Emily) cid = Laria 分片儲存的 metadata hash(server 端 uploadLaria 產生);可經 recoverLaria 取回原檔
export interface IAttachment {
  name: string;
  size: string;
  mimeType?: string;
  cid?: string;
}

// Info: (20260714 - Emily) 待送出附件(ChatInput 暫存):選檔即上傳 Laria,READY 時持有 cid;送出訊息只帶 metadata
export enum PendingAttachmentStatusEnum {
  READING = "reading",
  READY = "ready",
  ERROR = "error",
}

export interface IPendingAttachment {
  id: string;
  name: string;
  size: string;
  mimeType: string;
  cid: string;
  status: PendingAttachmentStatusEnum;
}

export interface IChatMessage {
  id: string;
  sender: ChatRoleEnum;
  text: string;
  attachments?: IAttachment[];
  // Info: (20260714 - Emily) 此訊息關聯的報告段落 id(outline id);段落 chip 與雙向連動的資料來源
  relatedParagraphIds?: string[];
}

export interface IReportCategory {
  id: string;
  name: string;
  description: string;
  emissions: number;
}

export interface IReportParagraph {
  id: string;
  // Info: (20260713 - Tzuhan) 對應 CARBON_REPORT_OUTLINE 的章節分組與數據段落標記
  chapterId: string;
  code: string;
  title: string;
  content: string;
  isCompleted: boolean;
  isVerified: boolean;
  isDataDriven: boolean;
}

// Info: (20260713 - Tzuhan) 報告段落統計(完成/查核雙軌進度的單一來源)
export interface IReportProgressStats {
  completedCount: number;
  verifiedCount: number;
  totalCount: number;
  completedPercent: number;
  verifiedPercent: number;
}

export interface IReportData {
  documentName: string;
  title: string;
  section: string;
  categories: IReportCategory[];
  paragraphs?: IReportParagraph[];
  totalEmissions: number;
}

// Info: (20260712 - Luphia) 單筆活動數據（數值以字串保存，計算時於服務層轉 Decimal，避免浮點誤差）
// Info: (20260716 - Emily) #6518:unit 收斂為 MeasurementUnit enum;source 記出處(訊息/附件檔名)供零捏造溯源
export interface IActivityRecord {
  scopeCategory: GhgProtocolCategory;
  sourceName: string;
  quantity: string;
  unit: string;
  emissionFactor?: string;
  factorSource?: string;
  confidence?: "high" | "medium" | "low";
  source?: string;
}

// Info: (20260716 - Emily) #6518 LLM 事實萃取結果(已經 Zod + 白名單裁決;year 由 TS 決定性轉數字)
export interface IInventoryExtraction {
  company?: string;
  year?: number;
  boundaryApproach?: ICarbonInventoryState["boundaryApproach"];
  activities: IActivityRecord[];
}

// Info: (20260712 - Luphia) 碳盤查結構化事實狀態：AI 的長期記憶與報告的資料來源（取代重播逐字對話）
export interface ICarbonInventoryState {
  step: CarbonInventoryStep;
  company?: string;
  year?: number;
  boundaryApproach?:
    | "operational_control"
    | "financial_control"
    | "equity_share";
  activities: IActivityRecord[];
  notes?: string[];
  updatedAt: string;
  version: number;
}

export interface IChatSession {
  id: string;
  title: string;
  time: string;
  status: SessionStatusEnum;
  statusColor: string;
  progress: number;
  messages: IChatMessage[];
  currentStep?: string;
  reportData?: IReportData;
}
