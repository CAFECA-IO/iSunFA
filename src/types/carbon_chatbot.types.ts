// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Define enterprise-grade types and enums for the Carbon Chatbot domain.

import { GhgProtocolCategory } from "@/constants/esg";
import { CarbonInventoryStep } from "@/constants/carbon_chatbot";
import {
  ArticulationStatusEnum,
  ArticulationViolationReasonEnum,
  ArticulationWarningReasonEnum,
} from "@/constants/carbon_articulation";

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

// Info: (20260720 - Emily) #23 emissions 改字串化 Decimal:值取自 computedLedger.scopeSubtotals,
// Info: (20260720 - Emily) 全程不經 number(ADR 003);顯示端直接渲染,禁 .toFixed
export interface IReportCategory {
  id: string;
  name: string;
  description: string;
  emissions: string;
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
  // Info: (20260720 - Emily) #23 接真值:computedLedger.totalCo2eKg(字串化 Decimal,kg)
  totalEmissions: string;
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
  /**
   * Info: (20260720 - Emily) #53 憑證聯動:結構化證據引用(帳本匯入時由後端填入;
   * LLM 萃取永不填 — responseSchema 無此欄位)。esgRecordId 為證據鏈根、
   * voucherId/journalId/fileId 供 RecordTabModal 憑證下鑽(#54)。
   */
  esgRecordId?: string;
  voucherId?: string;
  journalId?: string;
  fileId?: string;
  // Info: (20260720 - Emily) #53 憑證管線已算好的排放量(kgCO2e,字串 Decimal):
  // Info: (20260720 - Emily) 同一決定論引擎產物,計算 facade 直採不重算(不重選係數,零衝突)
  precomputedCo2eKg?: string;
}

/**
 * Info: (20260720 - Emily) #6520 可盤點物料庫存紀錄(質量守恆等式的左側資料):
 * 期初庫存 + 本期採購 = 本期投入(消耗) + 期末庫存。
 * 數值以字串保存(嚴禁 number 運算);消耗側由同名活動數據(sourceName)加總對照。
 */
export interface IMaterialStockRecord {
  materialName: string;
  openingQuantity: string;
  purchasedQuantity: string;
  closingQuantity: string;
  unit: string;
  source?: string;
}

// Info: (20260720 - Emily) #6520 單筆守恆違反明細(等式兩側 Decimal 字串值透明呈現,審計可追溯)
export interface IArticulationViolation {
  materialName: string;
  unit: string;
  reason: ArticulationViolationReasonEnum;
  // Info: (20260720 - Emily) 預期消耗 = 期初 + 採購 - 期末;實際消耗 = 同名活動數據加總
  expectedConsumption: string;
  actualConsumption: string;
  gap: string;
}

// Info: (20260720 - Emily) #6520 合理性警示(非庫存類超出物理量級邊界;僅警示不凍結)
export interface IArticulationWarning {
  activityKey: string;
  sourceName: string;
  reason: ArticulationWarningReasonEnum;
  quantity: string;
  plausibleMax: string;
  unit: string;
}

// Info: (20260720 - Emily) #6520 勾稽結果:REVIEW 步驟出口與 #23 數據段落凍結的唯一裁決來源
export interface IArticulationResult {
  status: ArticulationStatusEnum;
  violations: IArticulationViolation[];
  warnings: IArticulationWarning[];
  checkedAt: string;
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
  // Info: (20260720 - Emily) #53 證據引用(桑基圖與 #54 證據鏈下鑽的資料來源;對話申報者無)
  evidence?: {
    esgRecordId: string;
    voucherId?: string;
    journalId?: string;
    fileId?: string;
  };
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
  // Info: (20260720 - Emily) #6520 質量守恆勾稽結果(/calculate 一併回傳,隨 ledger E2EE 入庫)
  articulation?: IArticulationResult;
}

// Info: (20260716 - Emily) #6518 LLM 事實萃取結果(已經 Zod + 白名單裁決;year 由 TS 決定性轉數字)
export interface IInventoryExtraction {
  company?: string;
  year?: number;
  boundaryApproach?: ICarbonInventoryState["boundaryApproach"];
  activities: IActivityRecord[];
  // Info: (20260720 - Emily) #6520 可盤點物料庫存紀錄(期初/採購/期末;守恆等式的驗證資料)
  stockRecords?: IMaterialStockRecord[];
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
  // Info: (20260720 - Emily) #6520 物料庫存紀錄(守恆檢核資料;與 activities 同軌合併去重)
  stockRecords?: IMaterialStockRecord[];
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
