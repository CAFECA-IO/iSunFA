// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Define enterprise-grade types and enums for the Carbon Chatbot domain.

import { GhgProtocolCategory, Iso14064Category } from "@/constants/esg";
import {
  EmissionBasisEnum,
  LedgerProvenanceEnum,
} from "@/constants/imported_quantity";
import {
  CarbonInventoryStep,
  ParagraphOriginEnum,
} from "@/constants/carbon_chatbot";
import {
  ArticulationStatusEnum,
  ArticulationViolationReasonEnum,
  ArticulationWarningReasonEnum,
} from "@/constants/carbon_articulation";
import type { ICarbonReportIdentity } from "@/lib/utils/carbon_report_identity";

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

// Info: (20260714 - Tzuhan) 訊息附件 metadata(size 為人類可讀字串)
// Info: (20260714 - Tzuhan) cid = Laria 分片儲存的 metadata hash(server 端 uploadLaria 產生)；可經 recoverLaria 取回原檔
export interface IAttachment {
  name: string;
  size: string;
  mimeType?: string;
  cid?: string;
}

// Info: (20260714 - Tzuhan) 待送出附件(ChatInput 暫存): 選檔即上傳 Laria,READY 時持有 cid；送出訊息只帶 metadata
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
  // Info: (20260714 - Tzuhan) 此訊息關聯的報告段落 id(outline id)；段落 chip 與雙向連動的資料來源
  relatedParagraphIds?: string[];
}

// Info: (20260720 - Tzuhan) #23 emissions 改字串化 Decimal:值取自 computedLedger.scopeSubtotals,
// Info: (20260720 - Tzuhan) 全程不經 number(ADR 003);顯示端直接渲染,禁 .toFixed
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
  // Info: (20260730 - Tzuhan) 內容來源:逐字匯入 / AI 草稿 / 人工編輯。舊草稿無此欄,視為未知不計入任一分項
  origin?: ParagraphOriginEnum;
}

/**
 * Info: (20260730 - Tzuhan) 已封存會話(供還原清單)。
 * title 由本地快取補:標題衍生自密文首訊,伺服器讀不到,無快取時退回建立日期。
 */
export interface IArchivedSessionEntry {
  sessionId: string;
  channel: string;
  createdAt: string;
  archivedAt: string;
  title: string;
}

// Info: (20260713 - Tzuhan) 報告段落統計(完成/查核雙軌進度的單一來源)
export interface IReportProgressStats {
  completedCount: number;
  verifiedCount: number;
  totalCount: number;
  completedPercent: number;
  verifiedPercent: number;
  // Info: (20260730 - Tzuhan) 完成數的來源拆解:逐字照抄自原文的節數 vs AI 撰寫的節數
  importedCount: number;
  draftedCount: number;
}

export interface IReportData {
  documentName: string;
  /**
   * Info: (20260812 - Emily) 報告名稱 —— 印在文件第一頁的那個
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * **與 `documentName` 是兩件事**:那個是下載的檔名（帶副檔名，預設
   * `Carbon_Report_Draft_<id>.pdf`），這個是文件本身的名稱。
   * 一份要送第三方查證的報告，封面不能印檔名。
   *
   * 是選填的:`undefined` 代表**使用者還沒命名**，而不是「名稱是空的」——
   * 兩者要分得開，否則沒辦法決定要不要退回既有草稿烤進去的那個舊標題
   * （見 `resolveReportName`）。
   */
  reportName?: string;
  /**
   * Info: (20260814 - Emily) 查證用的四個識別欄位
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * 盤查年度／製作單位／查證單位／更新日期。與 `reportName` 一樣是**文件的中繼資料**
   * 而不是內容 —— ADR 014 要求 `content` 逐字照抄原文，這四項是我們加上去的，
   * 不能住在那裡面。
   *
   * 為什麼不從內容抽:查證單位原文裡根本沒有；盤查年度雖然 2.1 節寫了涵蓋期間，
   * 但抽錯的代價是**封面印錯年度**，而那會被查證單位當成事實。
   * 更新日期現在印的是「下載當下」，需要的是定稿日 —— 兩者不是同一件事。
   */
  identity?: ICarbonReportIdentity;
  /**
   * Info: (20260716 - Tzuhan) 報告全文的權威來源(使用者所見即所存,零改動保證):
   * 存在時預覽直接渲染本欄,不重組大綱骨架;paragraphs 降為 derived view(進度/chip/查核)。
   * AI 草稿/修訂/匯入寫入時以標題 patch 本欄對應段落,不重排使用者的文件結構。
   */
  rawMarkdown?: string;
  title: string;
  section: string;
  categories: IReportCategory[];
  paragraphs?: IReportParagraph[];
  // Info: (20260720 - Tzuhan) #23 接真值:computedLedger.totalCo2eKg(字串化 Decimal,kg)
  totalEmissions: string;
  /**
   * Info: (20260804 - Tzuhan) 這份報告是從哪個檔匯入的(報告層級的事實)。
   *
   * 為什麼段落層的 origin 不夠:**任何編輯都會把 origin 改成 MANUAL**,
   * 使用者改一節、匯入計數就掉一個;計數歸零時工具列那塊 UI 直接消失,
   * 於是「改過幾節的匯入報告」與「從未匯入過」在畫面上完全同形。
   * 匯入是發生過的事實,不該隨後續編輯蒸發 —— 查核者需要知道這份報告的來歷。
   *
   * 只在匯入套用時寫入一次,之後不再改動。
   */
  importedFrom?: {
    fileName: string;
    /** Info: (20260804 - Tzuhan) ISO 8601 */
    importedAt: string;
  };
}

// Info: (20260712 - Luphia) 單筆活動數據（數值以字串保存，計算時於服務層轉 Decimal，避免浮點誤差）
// Info: (20260716 - Tzuhan) #6518: unit 收斂為 MeasurementUnit enum;source 記出處(訊息/附件檔名)供零捏造溯源
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
   * Info: (20260720 - Tzuhan) #53 憑證聯動:結構化證據引用(帳本匯入時由後端填入;
   * LLM 萃取永不填 — responseSchema 無此欄位)。esgRecordId 為證據鏈根、
   * voucherId/journalId/fileId 供 RecordTabModal 憑證下鑽(#54)。
   */
  esgRecordId?: string;
  voucherId?: string;
  journalId?: string;
  fileId?: string;
  /**
   * Info: (20260806 - Tzuhan) 交易日期(Unix **秒**;來源為 `IEsgRecordDetail.tradingDate`)。
   *
   * 帳本紀錄本來就有真實日期,但這個 interface 先前沒有時間欄位,
   * 於是月份在 `carbon_esg_link` 映射的那一步就被丟掉了 ——
   * 圖表因此只能畫年度合計,連「多期趨勢」模板都因為「單期 ledger 無時間序列」
   * 而刻意不上架(見 CarbonChartTemplateEnum 的註解)。
   *
   * 存原始時間戳而非 `YYYY-MM`:月別只是其中一種聚合,
   * 先把粒度砍到月,以後要季/週就得回頭改資料模型。
   * 用 number 而非 `Date`:整個 state 會 JSON 序列化後 E2EE 入庫,`Date` 過不去。
   *
   * 選填 —— 對話/附件申報與匯入報告都沒有逐筆日期,那是事實而不是缺漏。
   */
  tradingTimestamp?: number;
  // Info: (20260721 - Tzuhan) 原始憑證檔 hash/檔名:RecordTabModal 的原始憑證分頁憑此啟用預覽/下載
  // Info: (20260721 - Tzuhan) (detail modal 載入時不回填 file,須開門即備妥)
  fileHash?: string;
  fileName?: string;
  // Info: (20260720 - Tzuhan) #53 憑證管線已算好的排放量(kgCO2e,字串 Decimal):
  // Info: (20260720 - Tzuhan) 同一決定論引擎產物,計算 facade 直採不重算(不重選係數,零衝突)
  precomputedCo2eKg?: string;
}

/**
 * Info: (20260720 - Tzuhan) #6520 可盤點物料庫存紀錄(質量守恆等式的左側資料):
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

// Info: (20260720 - Tzuhan) #6520 單筆守恆違反明細(等式兩側 Decimal 字串值透明呈現,審計可追溯)
export interface IArticulationViolation {
  materialName: string;
  unit: string;
  reason: ArticulationViolationReasonEnum;
  // Info: (20260720 - Tzuhan) 預期消耗 = 期初 + 採購 - 期末;實際消耗 = 同名活動數據加總
  expectedConsumption: string;
  actualConsumption: string;
  gap: string;
}

// Info: (20260720 - Tzuhan) #6520 合理性警示(非庫存類超出物理量級邊界;僅警示不凍結)
export interface IArticulationWarning {
  activityKey: string;
  sourceName: string;
  reason: ArticulationWarningReasonEnum;
  quantity: string;
  plausibleMax: string;
  unit: string;
}

// Info: (20260720 - Tzuhan) #6520 勾稽結果:REVIEW 步驟出口與 #23 數據段落凍結的唯一裁決來源
export interface IArticulationResult {
  status: ArticulationStatusEnum;
  violations: IArticulationViolation[];
  warnings: IArticulationWarning[];
  checkedAt: string;
}

// Info: (20260716 - Tzuhan) #6519 係數快照: 計算當下凍結採用的係數(稽核軌跡地基)
export interface IFactorSnapshot {
  factorId: string;
  name: string;
  value: string;
  unit: string;
  source: string;
}

// Info: (20260716 - Tzuhan) #6519 單筆計算結果: 全部數值為字串化 Decimal,禁止 number 運算
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
  /**
   * Info: (20260803 - Tzuhan) 這筆數字是誰算的(Issue B)。未給即視為 COMPUTED ——
   * 既有的憑證計算路徑因此零改動,不必為了新增欄位去回填每一個呼叫點。
   * 但**桑基圖與對帳一律以此分流**:外部照抄的與本系統計算的絕不混為一張圖。
   */
  provenance?: LedgerProvenanceEnum;
  /**
   * Info: (20260803 - Tzuhan) 範疇二的報告基準。這份報告所在地與市場基準數字相同
   * (沒有綠電採購),但一旦不同,把兩者都寫進同一個 ledger 就是同一度電算兩次。
   * 故此維度必須存在於資料上,而不是靠「反正通常一樣」蒙過去。
   */
  emissionBasis?: EmissionBasisEnum;
  /**
   * Info: (20260803 - Tzuhan) 匯入項目的原始位置(廠址 + ISO 子代碼),供桑基圖三層與溯源。
   * 只有 IMPORTED 有值 —— 憑證路徑的位置資訊在 evidence 裡。
   */
  importedOrigin?: {
    site: string;
    isoCategory: Iso14064Category;
    subCategory: string;
    tableNo: string;
  };
  /**
   * Info: (20260806 - Tzuhan) 交易日期(Unix 秒),自 `IActivityRecord.tradingTimestamp` 帶過。
   * 桑基圖的月別層憑此分層;無值即「未標註期間」,**絕不由旁證推測月份**。
   */
  tradingTimestamp?: number;
  // Info: (20260720 - Tzuhan) #53 證據引用(桑基圖與 #54 證據鏈下鑽的資料來源;對話申報者無)
  evidence?: {
    esgRecordId: string;
    voucherId?: string;
    journalId?: string;
    fileId?: string;
  };
}

// Info: (20260716 - Tzuhan) #6519 待補清單: 無法決定性裁決的活動(絕不猜值)
export interface IPendingLedgerEntry {
  activityKey: string;
  sourceName: string;
  reason: string;
}

// Info: (20260716 - Tzuhan) #6519 計算總表: 決定論引擎輸出,掛回 E2EE state
export interface IComputedLedger {
  entries: IComputedLedgerEntry[];
  pending: IPendingLedgerEntry[];
  scopeSubtotals: Record<string, string>;
  totalCo2eKg: string;
  computedAt: string;
  // Info: (20260720 - Tzuhan) #6520 質量守恆勾稽結果(/calculate 一併回傳,隨 ledger E2EE 入庫)
  articulation?: IArticulationResult;
}

// Info: (20260716 - Tzuhan) #6518 LLM 事實萃取結果(已經 Zod + 白名單裁決;year 由 TS 決定性轉數字)
export interface IInventoryExtraction {
  company?: string;
  year?: number;
  boundaryApproach?: ICarbonInventoryState["boundaryApproach"];
  activities: IActivityRecord[];
  // Info: (20260720 - Tzuhan) #6520 可盤點物料庫存紀錄(期初/採購/期末;守恆等式的驗證資料)
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
  // Info: (20260720 - Tzuhan) #6520 物料庫存紀錄(守恆檢核資料;與 activities 同軌合併去重)
  stockRecords?: IMaterialStockRecord[];
  // Info: (20260716 - Tzuhan) #6519 決定論引擎的計算總表(隨 state E2EE 入庫)
  computedLedger?: IComputedLedger;
  /**
   * Info: (20260825 - Emily) 匯入表格被勾稽擋下的紀錄(#6707「對帳差異」偵測器的資料源)。
   *
   * 原本這個資訊死在前端 console.warn:使用者問「有沒有異常」,
   * 系統只答得出「帳本沒資料」,說不出「表3.8 有 6 列解析失敗被擋」——
   * 帳本為空的**原因**正是最該浮出的疑點。隨 state E2EE 入庫;
   * 下一次匯入成功入帳即清空(見 applyImportedLedgerEntries)。
   */
  ledgerImportBlocks?: ILedgerImportBlock[];
  notes?: string[];
  updatedAt: string;
  version: number;
}

// Info: (20260825 - Emily) 單筆勾稽阻擋紀錄:reason 沿用匯入端組好的字句(含差額/列數,即證據鏈)
export interface ILedgerImportBlock {
  paragraphId: string;
  reason: string;
  blockedAt: string;
}

export interface IChatSession {
  id: string;
  title: string;
  // Info: (20260716 - Tzuhan) 使用者自訂標題:true 時首訊衍生標題不得覆蓋
  isTitleCustom?: boolean;
  time: string;
  /**
   * Info: (20260806 - Tzuhan) 最後一次有動作的時間(ISO 字串);清單排序依據。
   *
   * 為什麼不用 `time`:那是 `toLocaleDateString()` 的產物 —— 只有日期、而且格式隨語系變
   * (zh-TW 的 `2026/8/6` 與 en-US 的 `8/6/2026` 字典序完全不同)。
   * 拿它排序在中文環境下「剛好會對」,換個語系就錯,而那種錯沒有人會聯想到排序。
   *
   * 選填:舊的本機快取沒有這個欄位,缺值時排在有值者之後(不假裝它很新)。
   */
  updatedAt?: string;
  status: SessionStatusEnum;
  statusColor: string;
  progress: number;
  messages: IChatMessage[];
  currentStep?: string;
  reportData?: IReportData;
}
