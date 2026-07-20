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
// Info: (20260714 - Emily) cid = Laria 分片儲存的 metadata hash(server 端 uploadLaria 產生)；可經 recoverLaria 取回原檔
export interface IAttachment {
  name: string;
  size: string;
  mimeType?: string;
  cid?: string;
}

// Info: (20260714 - Emily) 待送出附件(ChatInput 暫存): 選檔即上傳 Laria,READY 時持有 cid；送出訊息只帶 metadata
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
  // Info: (20260714 - Emily) 此訊息關聯的報告段落 id(outline id)；段落 chip 與雙向連動的資料來源
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
  /**
   * Info: (20260716 - Emily) 報告全文的權威來源(使用者所見即所存,零改動保證):
   * 存在時預覽直接渲染本欄,不重組大綱骨架;paragraphs 降為 derived view(進度/chip/查核)。
   * AI 草稿/修訂/匯入寫入時以標題 patch 本欄對應段落,不重排使用者的文件結構。
   */
  rawMarkdown?: string;
  title: string;
  section: string;
  categories: IReportCategory[];
  paragraphs?: IReportParagraph[];
  totalEmissions: number;
}

// Info: (20260712 - Luphia) 單筆活動數據（數值以字串保存，計算時於服務層轉 Decimal，避免浮點誤差）
// Info: (20260716 - Emily) #6518: unit 收斂為 MeasurementUnit enum;source 記出處(訊息/附件檔名)供零捏造溯源
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

// Info: (20260716 - Emily) #6519 係數快照: 計算當下凍結採用的係數(稽核軌跡地基)
export interface IFactorSnapshot {
  factorId: string;
  name: string;
  value: string;
  unit: string;
  source: string;
}

// Info: (20260716 - Emily) #6519 單筆計算結果: 全部數值為字串化 Decimal,禁止 number 運算
export interface IComputedLedgerEntry {
  activityKey: string;
  scopeCategory: GhgProtocolCategory;
  sourceName: string;
  quantityRaw: string;
  convertedQuantity: string;
  convertedUnit: string;
  co2eKg: string;
  ghgBreakdown?: Record<string, string>;
  gwpVersion?: string;
  factor: IFactorSnapshot;
}

// Info: (20260716 - Emily) #6519 待補清單: 無法決定性裁決的活動(絕不猜值)
export interface IPendingLedgerEntry {
  activityKey: string;
  sourceName: string;
  reason: string;
}

// Info: (20260716 - Emily) #6519 計算總表: 決定論引擎輸出,掛回 E2EE state
export interface IComputedLedger {
  entries: IComputedLedgerEntry[];
  pending: IPendingLedgerEntry[];
  scopeSubtotals: Record<string, string>;
  totalCo2eKg: string;
  computedAt: string;
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
  // Info: (20260716 - Emily) #6519 決定論引擎的計算總表(隨 state E2EE 入庫)
  computedLedger?: IComputedLedger;
  notes?: string[];
  updatedAt: string;
  version: number;
}

export interface IChatSession {
  id: string;
  title: string;
  // Info: (20260716 - Emily) 使用者自訂標題:true 時首訊衍生標題不得覆蓋
  isTitleCustom?: boolean;
  time: string;
  status: SessionStatusEnum;
  statusColor: string;
  progress: number;
  messages: IChatMessage[];
  currentStep?: string;
  reportData?: IReportData;
}
