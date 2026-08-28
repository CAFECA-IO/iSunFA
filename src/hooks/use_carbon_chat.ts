// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Custom hook to manage Carbon Chatbot state, including UI states and AI API integration.

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  IChatSession,
  IChatMessage,
  IReportProgressStats,
  ChatRoleEnum,
  IAttachment,
  IPendingAttachment,
  PendingAttachmentStatusEnum,
  ICarbonInventoryState,
  IInventoryExtraction,
  IActivityRecord,
  IComputedLedger,
  IComputedLedgerEntry,
  ILedgerImportBlock,
  IReportCategory,
  IReportParagraph,
  IReportData,
  IArchivedSessionEntry,
} from "@/types/carbon_chatbot.types";
import {
  buildCarbonDataTable,
  stripLlmTables,
  injectDataTable,
  hasInjectedDataTable,
  deriveDataBadgeState,
  type ICarbonDataTableLabels,
} from "@/lib/carbon_report_table.builder";
// Info: (20260801 - Tzuhan) 段落版面順序由組裝器決定(Issue A):敘述 → 原文表格 → 系統表格 → 對帳
import { composeParagraphContent } from "@/lib/carbon_paragraph_composer";
import {
  buildImportedLedger,
  LEDGER_SOURCE_TABLE_NO,
  type IImportedLedgerResult,
} from "@/lib/carbon_table38.pipeline";
import { isImportedEntry } from "@/lib/carbon_table38.ledger";
import {
  buildYearSnapshot,
  detectUndatedImportedEntries,
  mergeImportedLedgerEntries,
} from "@/lib/carbon_ledger_totals";
import type { ICarbonSourceTable } from "@/lib/carbon_source_table.builder";
import {
  buildCarbonChartBlock,
  insertCarbonChartBlock,
  hasCarbonChartBlocks,
  refreshCarbonChartBlocks,
  type ICarbonChartLabels,
} from "@/lib/carbon_report_chart.builder";
import {
  CarbonChartTemplateEnum,
  CARBON_AUTO_SANKEY_PARAGRAPH_ID,
  CARBON_SANKEY_LABEL_MAX_WIDTH,
} from "@/constants/carbon_report_charts";
import { formatGhgCategoryLabel, formatEsgScopeLabel } from "@/constants/esg";
import { formatIsoSubCategoryLabel } from "@/constants/iso14064_subcategory";
import {
  CARBON_EVIDENCE_CHAPTER_ID,
  buildEvidenceChainBlock,
  hasEvidenceChainBlock,
} from "@/constants/carbon_evidence";
import { formatFileSize } from "@/lib/utils/common";
import {
  CARBON_REPORT_OUTLINE,
  CARBON_REPORT_SECTION_COUNT,
  CARBON_REPORT_CHAPTERS,
} from "@/constants/carbon_report_outline";
import {
  IParagraphDraft,
  IContextFact,
} from "@/interfaces/carbon_paragraph_draft";
import { IPendingRevision } from "@/components/carbon_chatbot/revision_preview";
import { IPendingImport } from "@/components/carbon_chatbot/import_preview";
import { buildPendingImportRecord } from "@/lib/carbon_pending_import_record";
import {
  createDefaultSessions,
  createChatSession,
} from "@/constants/carbon_chatbot.session";
import {
  createEmptyInventoryState,
  mergeInventoryExtraction,
  describeInventoryStep,
  applyComputedLedger,
  activityDedupeKey,
  stockRecordDedupeKey,
} from "@/lib/carbon_inventory";
import { buildLedgerFactBundle } from "@/lib/carbon_ledger_query";
import {
  loadPendingImport as fetchPendingImportRecord,
  savePendingImport as putPendingImportRecord,
  discardPendingImport as deletePendingImportRecord,
} from "@/lib/carbon_pending_import_storage";
import {
  loadInventoryState,
  saveInventoryState,
} from "@/lib/carbon_inventory_storage";
import {
  loadReportDraft,
  saveReportDraft,
  isDraftVersionConflict,
  isDraftTooLargeError,
  loadSessionsIndex,
  saveSessionsIndex,
  saveLocalDraftBackup,
  loadLocalDraftBackup,
} from "@/lib/carbon_report_draft_storage";
import { useTranslation } from "@/i18n/i18n_context";
import { useOrderTransaction } from "@/hooks/use_order_transaction";
import {
  ChatroomConnectionStateEnum,
  subscribeChatroom,
  subscribeChatroomConnection,
} from "@/lib/chatroom";
import {
  eciesDecrypt,
  ChatroomUnsupportedDeviceError,
  type IEciesEnvelope,
  type IChatroomMasterKey,
} from "@/lib/chatroom_ecies";
import {
  ensureMasterKey,
  ChatroomKeySourceMismatchError,
  ChatroomCustodyUnknownError,
  prefetchOwnKeyRecord,
} from "@/lib/chatroom_key_manager";
import { request, requestEnvelope } from "@/lib/utils/request";
import {
  findDiagramTemplateForParagraph,
  hasCarbonDiagramBlock,
  insertCarbonDiagramBlock,
} from "@/lib/carbon_report_diagram.builder";
import { CarbonDiagramTemplateEnum } from "@/constants/carbon_report_diagrams";
import {
  buildImportUnits,
  nextOutlineSectionId,
  resolveUnitPageRange,
  validatePageIndex,
  type IImportUnit,
} from "@/lib/carbon_page_slice";
import {
  getApiErrorCode,
  parsePersonalPaymentRequired,
  isGatewayTimeoutError,
  isQuotaApiError,
  resolveCreditPauseReason,
  summarisePausedUnits,
  isRateLimitedApiError,
  isTimeoutApiError,
  splitReportMarkdownSections,
  alignReportSections,
  patchMarkdownSection,
  reduceDraftNotice,
  sortSessionsByRecency,
  appendImportSource,
  extractCreditPauseDetail,
  foldImportChunks,
  resolveJobClaimDenial,
  type ICarbonImportSource,
  type IImportCheckpoint,
} from "@/hooks/use_carbon_chat.helpers";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import type { ICreditPauseDetail } from "@/constants/carbon_chatbot";
import type { IJobView } from "@/interfaces/resumable_job";
import { CREDIT_EVENT } from "@/constants/credit_events";
import { publishCreditEvent, subscribeCreditEvents } from "@/lib/credit_events";
import {
  JOB_CLAIM_DENIAL,
  JOB_CLAIM_INTENT,
  JOB_CLAIM_TTL_MS,
  JOB_PAUSE_REASON,
  JOB_TYPE,
  type JobClaimDenial,
  type JobClaimIntent,
  type JobPauseReason,
} from "@/constants/resumable_job";
import { HTTP_METHOD } from "@/constants/http";
import { runResumableJob, STEP_OUTCOME } from "@/lib/jobs/resumable_job";
import { useAuth } from "@/contexts/auth_context";
import {
  DEFAULT_SESSION_ID,
  SESSION_PROGRESS_MAX,
  buildCarbonChatChannel,
  CarbonImportReconciliationStateEnum,
  CarbonImportNoticeKindEnum,
  CARBON_CHAT_REPLY_TIMEOUT_MS,
  CARBON_CHAT_REPLY_TIMEOUT_WITH_ATTACHMENTS_MS,
  CARBON_IMPORT_SINGLE_CALL_MAX_BYTES,
  CARBON_IMPORT_FOLLOW_UPS,
  buildImportFollowUpPrompt,
  CARBON_DIAGRAM_QUOTA_RETRY_MS,
  CARBON_DIAGRAM_THROTTLE_MS,
  IMPORT_CANDIDATE_MIME_TYPES,
  PDF_MIME_TYPE,
  ParagraphOriginEnum,
  CarbonReportImportModeEnum,
  CARBON_CHAT_AI_CONTEXT_SIZE,
  CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES,
  CARBON_CHAT_MAX_ATTACHMENT_BYTES,
  CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  CARBON_CHAT_HIGHLIGHT_DURATION_MS,
  CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS,
  CARBON_DRAFT_NOTICE_DISMISS_MS,
} from "@/constants/carbon_chatbot";
import type { ICarbonReportIdentity } from "@/lib/utils/carbon_report_identity";

// Info: (20260714 - Tzuhan) 報告草稿保存狀態(工具列顯示;null = 尚無變更;error = 保存失敗/版本衝突)
// Info: (20260716 - Tzuhan) #50 新增 local:未解鎖/未還原前內容僅落本機安全快取,解鎖後自動推入 DB
export type ReportSaveStatus = "saving" | "saved" | "error" | "local" | null;

// Info: (20260714 - Tzuhan) 草稿生成狀態列(顯示於輸入框上方): 生成中 loading、失敗短暫提示後自動消失
// Info: (20260714 - Tzuhan) 草稿為並行任務，失敗不以對話氣泡表達(氣泡先於回覆出現會造成 UX 混淆)
// Info: (20260720 - Tzuhan) #23 新增 info:數據表格隨活動數據自動更新的非阻斷提示
export interface IDraftNotice {
  type: "loading" | "error" | "info";
  text: string;
  /**
   * Info: (20260804 - Tzuhan) 這件工作是什麼時候開始的(epoch ms)。
   *
   * 給的是**起點**而不是格式化好的字串,因為要跳動的是畫面不是狀態:
   * 每秒重寫一次提示文字等於每秒觸發一次 re-render 與一次狀態寫入,
   * 而已經過多久這件事,元件自己有一個計時器就能算。
   *
   * 為什麼需要它:逐章解析 11 章並行,完成數在開頭會長時間停在 0/11 ——
   * 那是正常的,但畫面上「還在跑」與「已經死了」完全一樣。
   * 一個會跳動的秒數是最便宜的存活訊號。
   */
  startedAt?: number;
}

/**
 * Info: (20260803 - Tzuhan) 取指定會話,取不到即回 null。
 *
 * 為什麼需要一個專門的函式而不是直接索引:`{ ...prev[activeSessionId] }` 在會話不存在時
 * **不會拋錯** —— 展開 undefined 得到 `{}`,錯誤延後到下一行 `.messages.some(...)` 才爆,
 * 而訊息會是「Cannot read properties of undefined (reading 'some')」,
 * 指向 messages 而非真正的原因(會話不存在)。實測從對話框切換帳本時即如此,
 * 我因此在錯的地方找了一輪。
 *
 * 會話為何可能不存在:切換帳本會改 activeSessionId,而該帳本的會話是非同步載入的;
 * 封存當前會話時也會先 delete 再改 id。這兩個時點之間抵達的訊息就會撞上空會話。
 */
const resolveSession = (
  sessions: Record<string, IChatSession>,
  sessionId: string,
): IChatSession | null => sessions[sessionId] ?? null;

/**
 * Info: (20260901 - Luphia) 判決對應的話（review #6726 阻-1）。
 *
 * 已取消 ≠ 已完成 ≠ 有人在跑——這正是錯誤碼分成三個的理由，一句
 * `import_job_busy` 蓋在三種判決上會讓使用者對著錯的原因等待。
 * 查表而不是 switch：認不出的判決種類在編譯期就會被 `Record` 擋下。
 */
const JOB_CLAIM_DENIAL_TEXT_KEY: Record<JobClaimDenial, string> = {
  [JOB_CLAIM_DENIAL.BUSY]: "carbon_chatbot.import_job_busy",
  [JOB_CLAIM_DENIAL.CANCELLED]: "carbon_chatbot.import_job_cancelled",
  [JOB_CLAIM_DENIAL.COMPLETED]: "carbon_chatbot.import_job_completed_already",
  [JOB_CLAIM_DENIAL.FORBIDDEN]: "carbon_chatbot.import_job_forbidden",
};

export const useCarbonChat = () => {
  const { t, language } = useTranslation();
  /**
   * Info: (20260813 - Luphia) 無帳本會話改扣個人鏈上點數（設計書 §5.5）：
   * 後端先建單並回 402，這裡付掉那張單後以相同冪等鍵重送。
   * 託管帳號的簽章由伺服器代行，passkey 帳號提示裝置簽章一次。
   */
  const { payExistingOrder } = useOrderTransaction();
  const { user } = useAuth();
  const [sessionsData, setSessionsData] = useState<
    Record<string, IChatSession>
  >(() => createDefaultSessions());
  const [activeSessionId, setActiveSessionId] =
    useState<string>(DEFAULT_SESSION_ID);
  /**
   * Info: (20260827 - Emily) 輸入文字**不再住在這裡**(#6718)。
   *
   * 頁面整棵樹都消費這個 hook,所以文字放在這裡等於「每個按鍵重渲染整頁」——
   * 訊息列表 + 報告預覽(實測 59 頁、19 張表)+ 所有 mermaid 圖都跟著重畫。
   * 文字現在住在 `ChatInput`;這裡只保留**外部對輸入框下的指令**:
   * 預填(跳段指引)與清空(切房、送出後)。
   *
   * 以 nonce 而非值來傳遞:清空的值是空字串,而使用者自己刪空也是空字串 ——
   * 用值比對分不出「外部要求清空」與「剛好刪空」,後者會被每次 render 覆寫回去。
   * nonce 只在真的下指令時 +1,所以 state 變動次數 = 指令次數(不是按鍵次數)。
   */
  const [inputPrefill, setInputPrefill] = useState<{
    value: string;
    nonce: number;
  }>({ value: "", nonce: 0 });

  const commandInput = useCallback((value: string) => {
    setInputPrefill((prev) => ({ value, nonce: prev.nonce + 1 }));
  }, []);
  // Info: (20260714 - Tzuhan) 等待 AI 回覆的 session 集合(per-session 隔離: 舊房等待中不影響新房輸入與指示)
  const [busySessionIds, setBusySessionIds] = useState<Set<string>>(new Set());
  const [isError, setIsError] = useState<boolean>(false);
  // Info: (20260712 - Luphia) 是否已於進入時完成一次手勢解鎖（PRF）；未解鎖前不呼叫 AI、不顯示對話
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  /**
   * Info: (20260812 - Luphia) 解鎖失敗的原因，給鎖定畫面顯示。
   *
   * 不用 `isError`：那個布林值同時被送訊息、載入歷史等路徑使用，
   * 而鎖定畫面需要的是「為什麼解不開」這句話本身 —— 共用一個布林值說不出原因。
   */
  const [unlockError, setUnlockError] = useState<string | null>(null);
  // Info: (20260716 - Tzuhan) render 期不可讀 ref(react-hooks/refs):金鑰以 state 快照對外暴露(解鎖時設定)
  const [unlockedMasterKey, setUnlockedMasterKey] =
    useState<IChatroomMasterKey | null>(null);
  // Info: (20260713 - Tzuhan) 目前對話正在引導的報告段落(vibe 模式:跳段 = 切換對話目標)
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(
    null,
  );
  // Info: (20260714 - Tzuhan) 正在生成草稿的段落 id；同一時間只允許一段生成，避免併發寫入報告
  const [draftingParagraphId, setDraftingParagraphId] = useState<string | null>(
    null,
  );
  // Info: (20260803 - Tzuhan) 當前會話的 ref:供身分需穩定的 setter 讀取(見 setDraftNotice)
  const activeSessionIdRef = useRef<string>(activeSessionId);
  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  /**
   * Info: (20260714 - Tzuhan) 草稿狀態列(loading/error);error 自動清除
   *
   * Info: (20260803 - Tzuhan) 提示綁定會話(issue_drafts/inventory_table_import/03 階段二):
   * 匯入會跑好幾分鐘且不因切房而停,提示若不綁房間,B 房會看到 A 房的進度條。
   * 記下「屬於哪一間」而非改寫全部 38 個呼叫點 —— 多數呼叫點是同步的 UI 流程,
   * 「當前會話」本來就是對的;真正需要指定的只有長時間執行的匯入。
   */
  /**
   * Info: (20260806 - Tzuhan) 改為**逐會話一格**(issue_drafts/inventory_table_import/06)。
   *
   * 原本是單一格 `{ sessionId, notice }`:記得「這則提示屬於哪一房」,
   * 所以切到別房不會顯示錯的進度 —— 但**同時只存得下一則**。
   * 於是 A 房匯入跑著、切到 B 房隨手做任何會設提示的動作(綁帳本、送訊息、存草稿),
   * A 房那則就被覆蓋掉了;切回 A 房畫面一片乾淨,而匯入其實還在跑。
   * 那正是「切回來看不出有沒有在繼續分析,於是重新上傳」的成因。
   *
   * 一房一格之後,兩房各自的提示互不干擾。
   * 清除時從 map 移除而非留 null —— 沿用 pendingImportBySession 的同一慣例,
   * 留著空鍵會讓「有沒有提示」多一種等價表示。
   */
  const [draftNoticeBySession, setDraftNoticeBySession] = useState<
    Record<string, IDraftNotice>
  >({});
  // Info: (20260716 - Tzuhan) #55 待確認修訂(對照卡):null = 無;確認後才寫入報告
  const [pendingRevision, setPendingRevision] =
    useState<IPendingRevision | null>(null);
  /**
   * Info: (20260716 - Tzuhan) #56 待確認匯入(逐段勾選):確認後才寫入報告與活動帳本
   *
   * Info: (20260803 - Tzuhan) 改為 per-session(階段二):切回原房仍看得到預覽卡,
   * 而不是「切走就等於作廢」。鍵為發起匯入的會話 id。
   */
  const [pendingImportBySession, setPendingImportBySession] = useState<
    Record<string, IPendingImport>
  >({});
  /**
   * Info: (20260808 - Luphia) pendingImportBySession 的 ref 鏡像,
   * 供跨 await 的流程(重試合併)讀「當下最新」而不必進 updater。
   *
   * 為什麼不能從 updater 帶值出來:React 18 只有在該 fiber 沒有其他
   * pending update 時才會 eager 同步執行 updater —— 重試路徑前一行的
   * `notify(null)` 已經排了同元件的更新,updater 會被延後到 render 才跑,
   * 「帶出來的區域變數」在同步檢查的當下仍是 null,保存就被靜默跳過。
   * 也不能用 closure 裡的 state:await 之後它可能已過期
   * (重試期間使用者套用或捨棄,closure 那份會把已清除的紀錄復活)。
   */
  const pendingImportBySessionRef = useRef<Record<string, IPendingImport>>({});
  useEffect(() => {
    pendingImportBySessionRef.current = pendingImportBySession;
  }, [pendingImportBySession]);
  /**
   * Info: (20260803 - Tzuhan) 只顯示屬於當前會話的提示。切到別房時當前房本來就沒有進度,
   * 顯示 null 而非沿用上一房的字串 —— 沿用會讓使用者以為這一房正在跑。
   */
  const draftNotice = draftNoticeBySession[activeSessionId] ?? null;

  /**
   * Info: (20260803 - Tzuhan) 設定提示。sessionId 省略即「當前會話」——
   * 長時間執行的流程(匯入)必須明確傳入發起當下的 id,否則中途切房後
   * 提示會落到新房去。
   */
  /**
   * Info: (20260806 - Tzuhan) 自動消失的計時器也必須**逐會話**一個。
   *
   * 原本是單一 ref:A 房排了「三秒後清掉」,期間 B 房設了提示,
   * 計時器一到就把「當前那一房」的提示清掉 —— 清錯房間。
   * 而那種錯不會有任何跡象:使用者只會覺得提示閃一下就沒了。
   */
  const draftNoticeTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());

  /**
   * Info: (20260803 - Tzuhan) 以 ref 讀當前會話,讓這個 setter **身分穩定**(deps 為空)。
   * 若改用 activeSessionId 當依賴,它每次換房就換身分,
   * 三十幾個呼叫端的 useCallback/useEffect 都得跟著把它列進依賴 ——
   * 那不只是雜訊,還會讓那些 effect 在換房時無謂重跑。
   */
  /**
   * Info: (20260806 - Tzuhan) 設定提示時**一律取消該房待決的自動消失計時器**。
   *
   * 待決的「三秒後清掉」屬於排它的那一則提示;換了一則之後它就不再有效,
   * 否則新的提示會被上一則的計時器提早清掉。原本這件事靠呼叫端自己記得
   * (草稿生成那處寫了、其他幾處沒寫),放進 setter 裡就不會有人漏。
   */
  const setDraftNotice = useCallback(
    (notice: IDraftNotice | null, sessionId?: string) => {
      const target = sessionId ?? activeSessionIdRef.current;
      const pending = draftNoticeTimersRef.current.get(target);
      if (pending) {
        clearTimeout(pending);
        draftNoticeTimersRef.current.delete(target);
      }
      setDraftNoticeBySession((prev) =>
        reduceDraftNotice(prev, target, notice),
      );
    },
    [],
  );

  /**
   * Info: (20260806 - Tzuhan) 排定該房的提示自動消失。
   * 取代先前散在七個呼叫點的 clearTimeout/setTimeout 樣板 ——
   * 那七份各寫一次,其中幾份忘了先清掉前一個計時器。
   */
  const dismissDraftNoticeAfter = useCallback(
    (delayMs: number, sessionId?: string) => {
      const target = sessionId ?? activeSessionIdRef.current;
      const timers = draftNoticeTimersRef.current;
      const existing = timers.get(target);
      if (existing) clearTimeout(existing);
      timers.set(
        target,
        setTimeout(() => {
          timers.delete(target);
          setDraftNotice(null, target);
        }, delayMs),
      );
    },
    [setDraftNotice],
  );

  // Info: (20260803 - Tzuhan) 當前會話的待確認匯入(切回原房即再度出現)
  const pendingImport = pendingImportBySession[activeSessionId] ?? null;

  /**
   * Info: (20260803 - Tzuhan) 寫入/清除指定會話的待確認匯入。
   * 清除時從 map 移除而非設 null —— 留著空鍵會讓「有沒有待確認」多一種等價表示。
   */
  const setPendingImportFor = useCallback(
    (sessionId: string, next: IPendingImport | null) => {
      setPendingImportBySession((prev) => {
        if (!next) {
          if (!(sessionId in prev)) return prev;
          const rest = { ...prev };
          delete rest[sessionId];
          return rest;
        }
        return { ...prev, [sessionId]: next };
      });
    },
    [],
  );

  /**
   * Info: (20260806 - Tzuhan) 預覽卡收起的會話(「稍後再說」)。
   *
   * 待匯入結果與**要不要現在看**是兩件事:內容一直在(已入庫),
   * 但強迫使用者當場二選一(套用/丟棄)正是「先不匯入」無法表達的原因。
   * 重載還原的一律預設收起 —— 一進聊天室就被一張蓋住全螢幕的卡攔住,
   * 而它講的是幾天前的事,那不是提醒而是阻擋。
   */
  const [deferredPreviewSessions, setDeferredPreviewSessions] = useState<
    Record<string, boolean>
  >({});
  // Info: (20260806 - Tzuhan) 各 channel 待匯入紀錄的樂觀鎖版本(讀取時記下,保存成功後更新)
  const pendingImportVersionsRef = useRef<Map<string, number>>(new Map());
  /**
   * Info: (20260807 - Emily) 每個 channel 一條保存佇列
   * (issue_drafts/inventory_table_import/14_pending_import_persist_race.md)。
   *
   * 版本號的讀取與回寫之間隔著一次網路往返;兩次併發的保存會讀到同一個起始版本,
   * 後到的那次撞上樂觀鎖並回 400。實測 log 裡就是相隔 1ms 的兩個 PUT,一個 400、一個 200。
   * 串成佇列之後,後一次一定在前一次把新版本寫回 ref 之後才讀 —— 衝突從源頭消失,
   * 不需要重試邏輯(重試只是把競態換成比較慢的競態)。
   */
  const persistPendingQueueRef = useRef<Map<string, Promise<void>>>(new Map());
  /**
   * Info: (20260806 - Tzuhan) 待匯入紀錄的還原狀態,兩個集合分工同盤查狀態那條路:
   * settled = 有結論(含「存在但解不開」,再試也是同一結果);
   * attempted = 正在試,失敗時移除以便下次重試(網路抖動不該變成永久失敗)。
   */
  const pendingImportLoadAttemptedRef = useRef<Set<string>>(new Set());
  const pendingImportLoadSettledRef = useRef<Set<string>>(new Set());
  // Info: (20260716 - Tzuhan) #56 匯入導流:聊天附件疑似整份報告時的候選(File 保留供直接匯入)
  const [importCandidate, setImportCandidate] = useState<File | null>(null);
  /**
   * Info: (20260806 - Tzuhan) 失敗章節重試中。用 state 而非 ref:預覽卡要據此
   * 禁用按鈕並顯示 spinner —— ref 改變不會觸發重繪,那正是原本「按了沒反應」的形狀。
   */
  const [isRetryingImport, setIsRetryingImport] = useState<boolean>(false);
  // Info: (20260714 - Tzuhan) 待送出附件(base64 僅存記憶體，送出後清除)與附件驗證錯誤提示
  const [pendingAttachments, setPendingAttachments] = useState<
    IPendingAttachment[]
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  // Info: (20260714 - Tzuhan) 對話↔報告雙向連動: 報告段落高亮與對話訊息閃爍(皆為短暫狀態，逾時自動清除)
  const [highlightedParagraphId, setHighlightedParagraphId] = useState<
    string | null
  >(null);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Info: (20260714 - Tzuhan) 報告草稿保存狀態與「已還原草稿的 channel」集合(還原前禁止自動保存，避免空骨架覆蓋既有草稿)
  const [saveStatus, setSaveStatus] = useState<ReportSaveStatus>(null);
  const restoredChannelsRef = useRef<Set<string>>(new Set());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Info: (20260807 - Emily) 進行中的雲端保存(逐 channel)。
   *
   * 這是「重整之後圖不見了」的根因(issue_drafts/inventory_table_import/12):
   * 舊實作只 debounce、不管有沒有請求在飛。整份報告書的 PUT 是好幾 MB,
   * 一次要跑上好幾秒;匯入落地 → 算勾稽 → 插流程圖 → 插桑基圖 這一串變更之間
   * 只隔幾百毫秒,於是第二次 PUT 帶著**還沒被更新的 version** 送出去,
   * 撞上樂觀鎖回 VL_DRAFT_VERSION_CONFLICT。
   *
   * 而圖表是整條管線**最後**才加上去的 —— 最後一次保存失敗之後就沒有下一次變更
   * 可以再觸發保存,所以外顯症狀恰好是「其他段落都在,只有圖不見了」。
   */
  const savingChannelsRef = useRef<Set<string>>(new Set());
  /**
   * Info: (20260807 - Emily) 各 channel 當下最新的報告內容。
   *
   * 保存成功後要用**最新**的內容重寫本機快取,不能用送出當時 closure 裡那一份:
   * 舊實作 `saveLocalDraftBackup(chatChannel, activeReportData, newVersion)` 寫的是
   * 送出時的舊內容,卻掛上新的 draftVersion —— 還原時 `draftVersion >= DB version`
   * 判定成立而優先採用本機快取,於是**連退路那一份也被舊內容蓋掉**,
   * 圖表在雲端與本機同時消失。
   */
  const latestReportDataRef = useRef<Map<string, IReportData>>(new Map());
  // Info: (20260714 - Tzuhan) 各 channel 草稿的樂觀鎖版本(讀取時記下，保存成功後更新)
  const draftVersionsRef = useRef<Map<string, number>>(new Map());
  // Info: (20260716 - Tzuhan) #52 各 channel 的存取中繼資料:accountBookId(決定保存模式)與 canEdit(唯讀切換)
  const [sessionAccess, setSessionAccess] = useState<
    Record<string, { accountBookId: string | null; canEdit: boolean }>
  >({});
  // Info: (20260716 - Tzuhan) #52 使用者可綁定的帳本清單(新增對話選單用)
  const [accountBooks, setAccountBooks] = useState<
    { id: string; name: string }[]
  >([]);
  // Info: (20260716 - Tzuhan) #52 未解鎖時建立的帳本會話:綁定請求需 xpub,解鎖後補送
  const pendingBindsRef = useRef<Map<string, string>>(new Map());
  // Info: (20260716 - Tzuhan) #56 匯入預覽期間暫存的活動數據(確認時才入帳本)
  const importActivitiesRef = useRef<IActivityRecord[]>([]);
  // Info: (20260717 - Tzuhan) #56 重試用:最近一次匯入的原始檔(失敗章節重跑無需重選檔)
  /**
   * Info: (20260806 - Tzuhan) 上一次匯入的檔案引用(重試失敗章節時取用)。
   * 原本存的是 `File`,而 File 是純瀏覽器記憶體物件 —— 重載即消失,
   * 於是「重試失敗章節」在重載後永遠是死鈕。改存 cid 之後這件事有解:
   * cid 是字串,可以隨待匯入紀錄一起進 DB。
   */
  const lastImportSourceRef = useRef<ICarbonImportSource | null>(null);
  // Info: (20260804 - Tzuhan) 進行中的匯入檔名(null 即無);用檔名而非布林,提示才說得出擋的是誰
  const importInFlightRef = useRef<string | null>(null);
  /**
   * Info: (20260827 - Luphia) 同一件事的可渲染版本（issue #6723）。
   *
   * `importInFlightRef` 是 ref，改它不會重新渲染，所以掛不上 `beforeunload`
   * 的生命週期。兩者必須同進同退——只更新一邊就會變成「提示常駐」或「提示不出現」。
   */
  const [importRunning, setImportRunning] = useState<boolean>(false);

  /**
   * Info: (20260827 - Luphia) 匯入中離開頁面要先問一聲（issue #6723）。
   *
   * 檢查點已經讓「做完的份」撐得過中斷，但離開的代價還是具體的：正在跑的那一份
   * 沒有結果就會重跑（那一次的點數收不回來），而原始檔案只在記憶體裡——
   * 回來之後得重新上傳同一份報告才接得下去。
   *
   * 只在跑的時候掛、跑完立刻卸下。常駐一個 `beforeunload` 會讓使用者在任何時候
   * 離開都被問一次，那種提示很快就會被無視（見 `team/allocation_modal.tsx`）。
   * `preventDefault()` 與 `returnValue` 都設是為了跨瀏覽器。
   */
  useEffect(() => {
    if (!importRunning) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [importRunning]);
  // Info: (20260730 - Tzuhan) 首次匯入取得的頁碼索引:重試失敗章節時沿用,不重問(索引不會變,重問等於再燒一次全文輸入)
  const lastPageIndexRef = useRef<Map<string, number> | undefined>(undefined);

  // Info: (20260716 - Tzuhan) #6518 盤查狀態帳本(per-channel):活動數據 + 決定性步驟;E2EE 入庫比照報告草稿
  const [inventoryStates, setInventoryStates] = useState<
    Record<string, ICarbonInventoryState>
  >({});
  const inventoryVersionsRef = useRef<Map<string, number>>(new Map());
  /**
   * Info: (20260806 - Tzuhan) 還原的「試過」與「成功」拆成兩個集合
   * (issue_drafts/inventory_table_import/04)。
   *
   * 原本只有一個集合,而且在**發出請求之前**就加進去 ——
   * 於是還原失敗一次,那個 channel 就永遠不會再試。
   * 表現是「報告與活動帳本讀不到」而畫面毫無異狀:
   * 不是空的報告,是看起來像空的報告,而使用者無從分辨。
   *
   * - attempted:防同一輪重複發射(effect 會因 sessionAccess 非同步寫入而多次重跑)
   * - settled:已有結論、再試也一樣的(讀到了、或記錄存在但解不開)
   *
   * 失敗時從 attempted 移除,下次進到這個房間就會重試。
   * **不是自動重試** —— effect 的依賴沒變不會自己重跑,
   * 這裡只是不再把一次失敗變成永久失敗。真正的自動重試要另外做。
   */
  const inventoryLoadAttemptedRef = useRef<Set<string>>(new Set());
  const inventoryLoadSettledRef = useRef<Set<string>>(new Set());
  const inventoryAutosaveTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  // Info: (20260714 - Tzuhan) 已載入過歷史的 channel(切換 session 時各自載一次)
  const loadedChannelsRef = useRef<Set<string>>(new Set());
  // Info: (20260714 - Tzuhan) 跳段後的草稿觸發目標: 送出預填訊息時觸發該段草稿生成(決定性規則，非 LLM 意圖判斷)
  const pendingDraftParagraphIdRef = useRef<string | null>(null);
  // Info: (20260712 - Luphia) 歷史訊息分頁狀態（上卷載入更多）
  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const oldestCreatedAtRef = useRef<string | null>(null);

  // Info: (20260712 - Luphia) 依「用途-用戶-session」組出獨立頻道，避免不同用戶或不同盤查 session 的訊息互相干擾
  const chatChannel = useMemo(
    () => buildCarbonChatChannel(user?.address ?? "anonymous", activeSessionId),
    [user?.address, activeSessionId],
  );

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevLastMessageIdRef = useRef<string | undefined>(undefined);
  // Info: (20260714 - Tzuhan) 等待 AI 回覆的逾時計時器(per-channel: 多聊天室並發等待互不覆蓋)
  const replyTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const prevSessionId = useRef<string>(DEFAULT_SESSION_ID);

  // Info: (20260714 - Tzuhan) 標記/解除 session 等待狀態(單一寫入點)
  const markSessionBusy = useCallback((sessionId: string, busy: boolean) => {
    setBusySessionIds((prev) => {
      if (prev.has(sessionId) === busy) return prev;
      const next = new Set(prev);
      if (busy) {
        next.add(sessionId);
      } else {
        next.delete(sessionId);
      }
      return next;
    });
  }, []);

  // Info: (20260712 - Luphia) 用戶主金鑰：經 WebAuthn PRF 解包/註冊後持久化；xpub 供後端加密、xprv 供本地解密
  const masterKeyRef = useRef<IChatroomMasterKey | null>(null);
  /**
   * Info: (20260812 - Luphia) 帶上 custody:託管帳號（第三方登入）沒有 passkey,
   * PRF 秘密改向 API 索取（見 `requestPrfSecret`）。
   *
   * 不帶的話 `navigator.credentials.get()` 會開出一個永遠不會成功的 passkey 對話框,
   * 使用者關掉它拿到 `NotAllowedError`,再被下面的 catch 翻譯成「您的裝置不支援」——
   * 而裝置沒問題,是帳號沒有 passkey。
   */
  const ensureMasterKeyCached =
    useCallback(async (): Promise<IChatroomMasterKey> => {
      if (!masterKeyRef.current) {
        masterKeyRef.current = await ensureMasterKey(user?.custody);
      }
      return masterKeyRef.current;
    }, [user?.custody]);

  // Info: (20260714 - Tzuhan) 等待中回覆的 channel 集合: 回覆若於 fetch 期間就送達，不再啟動逾時計時器(per-channel)
  const pendingReplyChannelsRef = useRef<Set<string>>(new Set());

  // Info: (20260712 - Luphia) 將訊息直接追加到當前 session 並解除等待狀態（訂閱收訊與 publish 失敗保底共用）
  // Info: (20260714 - Tzuhan) 閉包綁定建立當下的 session: 切換聊天室後，在途回覆仍寫回原房，不污染他房
  const appendMessageLocally = useCallback(
    (message: IChatMessage, progressUpdate: number) => {
      // Info: (20260712 - Luphia) 有訊息就緒即取消該 channel 的等待逾時計時器
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        activeSessionId,
      );
      pendingReplyChannelsRef.current.delete(channel);
      const timer = replyTimersRef.current.get(channel);
      if (timer) {
        clearTimeout(timer);
        replyTimersRef.current.delete(channel);
      }
      setSessionsData((prev) => {
        const existing = resolveSession(prev, activeSessionId);
        /**
         * Info: (20260803 - Tzuhan) 會話不存在就丟棄這則訊息,不即時建一個新的:
         * 憑一則訊息長出會話,會在剛切換過去的帳本裡冒出一間不屬於它的聊天室。
         * 丟棄但留 log —— 靜默丟訊息會變成「回覆有時候不見」這種查不到的問題。
         */
        if (!existing) {
          console.warn(
            "[carbon-chat] message dropped: session not found",
            activeSessionId,
          );
          return prev;
        }
        const updatedSession = { ...existing };
        // Info: (20260714 - Tzuhan) 以訊息 id 去重: HTTP 回帶與 Centrifugo 訂閱可能送達同一則訊息
        if (updatedSession.messages.some((m) => m.id === message.id)) {
          return prev;
        }
        updatedSession.messages = [...updatedSession.messages, message];
        // Info: (20260806 - Tzuhan) 有訊息就是有動作:清單依此把這一房排到最上面
        updatedSession.updatedAt = new Date().toISOString();
        if (progressUpdate) {
          updatedSession.progress = Math.min(
            SESSION_PROGRESS_MAX,
            updatedSession.progress + progressUpdate,
          );
        }
        return { ...prev, [activeSessionId]: updatedSession };
      });
      markSessionBusy(activeSessionId, false);
    },
    [activeSessionId, user?.address, markSessionBusy],
  );

  // Info: (20260712 - Luphia) 送出後啟動等待逾時；逾時仍未經訂閱收到回覆即解除等待並提示，避免卡在 typing
  // Info: (20260714 - Tzuhan) per-channel 計時器:多聊天室並發等待互不覆蓋;閉包綁定發送當下的 channel/session
  const startReplyTimeout = useCallback(
    (timeoutMs: number = CARBON_CHAT_REPLY_TIMEOUT_MS) => {
      const channel = chatChannel;
      // Info: (20260714 - Tzuhan) 回覆已於 fetch 期間送達則不再啟動計時器
      if (!pendingReplyChannelsRef.current.has(channel)) return;
      const existing = replyTimersRef.current.get(channel);
      if (existing) clearTimeout(existing);
      replyTimersRef.current.set(
        channel,
        setTimeout(() => {
          replyTimersRef.current.delete(channel);
          setIsError(true);
          appendMessageLocally(
            {
              id: crypto.randomUUID(),
              sender: ChatRoleEnum.AI,
              text: t("carbon_chatbot.system_unavailable"),
            },
            0,
          );
        }, timeoutMs),
      );
    },
    [chatChannel, appendMessageLocally, t],
  );

  // Info: (20260712 - Luphia) 卸載時清除逾時計時器
  useEffect(() => {
    const timers = replyTimersRef.current;
    const draftNoticeTimers = draftNoticeTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      // Info: (20260806 - Tzuhan) 提示計時器改逐會話一個,卸載時全數清掉
      draftNoticeTimers.forEach((timer) => clearTimeout(timer));
      draftNoticeTimers.clear();
    };
  }, []);

  // Info: (20260714 - Tzuhan) sessions 以 DB Chatroom 為 single source of truth(換裝置/清瀏覽器不再出現殭屍房間)
  // Info: (20260714 - Tzuhan) 標題衍生自密文首訊(server 讀不到),localStorage 索引降級為標題快取
  const sessionsIndexLoadedRef = useRef<boolean>(false);
  /**
   * Info: (20260828 - Julian) 清單**問完了沒有**——與 `sessionsIndexLoadedRef` 不同。
   *
   * 那支 ref 是「請求發過了」的去重旗標，在 `request()` 之前就設成 true。
   * 中間那段時間 `sessionsData` 裡只有預設會話，**非空但不完整** ——
   * 而「非空」正是通知深連結原本用來判斷「清單載好了」的依據，
   * 於是它在清單補齊之前就判定「查無此會話」而放棄
   *（見 `resumable_job_resume_landing_and_copy.md` §6.1）。
   *
   * 任何「這個 id 不存在」的判斷都要等這個旗標，失敗也要等 ——
   * 失敗時清單就是不會再補了，繼續等只會變成永遠不動作。
   */
  const [sessionsIndexSettled, setSessionsIndexSettled] = useState(false);
  useEffect(() => {
    if (!user?.address || sessionsIndexLoadedRef.current) return;
    sessionsIndexLoadedRef.current = true;
    const titleCache = new Map(
      (loadSessionsIndex(user.address) ?? []).map((entry) => [entry.id, entry]),
    );

    request<{
      payload: {
        sessions: {
          sessionId: string;
          channel: string;
          createdAt: string;
          // Info: (20260806 - Tzuhan) 伺服端算出的「最後一次有動作」(清單排序依據)
          lastActivityAt?: string;
          accountBookId?: string | null;
        }[];
      } | null;
    }>("/api/v1/chat/carbon/sessions")
      .then((res) => {
        const sessions = res.payload?.sessions ?? [];
        if (sessions.length === 0) return;
        // Info: (20260716 - Tzuhan) #52 記錄各會話的帳本綁定(決定保存/還原模式)
        setSessionAccess((prev) => {
          const next = { ...prev };
          sessions.forEach((entry) => {
            if (entry.accountBookId) {
              next[entry.channel] = {
                accountBookId: entry.accountBookId,
                canEdit: next[entry.channel]?.canEdit ?? true,
              };
            }
          });
          return next;
        });
        setSessionsData((prev) => {
          const next = { ...prev };
          sessions.forEach((entry) => {
            if (!entry.sessionId || next[entry.sessionId]) return;
            const cached = titleCache.get(entry.sessionId);
            next[entry.sessionId] = {
              ...createChatSession(
                entry.sessionId,
                cached?.title ?? t("carbon_chatbot.new_session_title"),
                cached?.createdAt ??
                  new Date(entry.createdAt).toLocaleDateString(),
              ),
              // Info: (20260716 - Tzuhan) 自訂標題旗標隨快取還原(首訊衍生不覆蓋)
              isTitleCustom: cached?.isTitleCustom ?? false,
              /**
               * Info: (20260806 - Tzuhan) 排序依據取伺服端的 lastActivityAt。
               * 缺值時退回 createdAt —— 而不是留空:留空會讓舊資料全部沉底,
               * 那比「照建立時間排」更不像使用者預期的樣子。
               */
              updatedAt: entry.lastActivityAt ?? entry.createdAt,
            };
          });
          return next;
        });
      })
      .catch((error) => {
        // Info: (20260714 - Tzuhan) 列表載入失敗不阻斷(仍可用預設 session 對話)
        console.error("[carbon-chat] failed to load sessions:", error);
      })
      // Info: (20260828 - Julian) 成功或失敗都算「問完了」，理由見旗標的說明
      .finally(() => setSessionsIndexSettled(true));
  }, [user?.address, t]);

  // Info: (20260716 - Tzuhan) #52 載入可綁定帳本(失敗不阻斷:僅影響新增對話的帳本選單)
  useEffect(() => {
    if (!user?.address) return;
    request<{ payload: { id: string; name: string }[] | null }>(
      "/api/v1/user/account_book",
    )
      .then((res) => setAccountBooks(res.payload ?? []))
      .catch((error) => {
        console.error("[carbon-chat] failed to load account books:", error);
      });
  }, [user?.address]);

  // Info: (20260716 - Tzuhan) UAT:帳本成員查看報告的入口 — 列出帳本全部碳盤查會話(含他人;server 驗成員資格)
  const fetchBookSessions = useCallback(async (accountBookId: string) => {
    const res = await request<{
      payload: {
        sessions: {
          sessionId: string;
          channel: string;
          createdAt: string;
          isOwn: boolean;
        }[];
      } | null;
    }>(`/api/v1/chat/carbon/sessions?accountBookId=${accountBookId}`);
    return res.payload?.sessions ?? [];
  }, []);

  /**
   * Info: (20260730 - Tzuhan) 列出已封存的會話(供還原)。
   * 後端 GET 帶 includeArchived 會一併回使用中者,此處只留 archivedAt 有值的——
   * 清單畫面本來就有使用中的會話,重複列出只會讓人以為封存沒生效。
   */
  const fetchArchivedSessions = useCallback(async (): Promise<
    IArchivedSessionEntry[]
  > => {
    try {
      const res = await request<{
        payload: {
          sessions: {
            sessionId: string;
            channel: string;
            createdAt: string;
            archivedAt?: string | null;
          }[];
        } | null;
      }>("/api/v1/chat/carbon/sessions?includeArchived=true");
      return (res.payload?.sessions ?? [])
        .filter((entry) => !!entry.archivedAt)
        .map((entry) => ({
          sessionId: entry.sessionId,
          channel: entry.channel,
          createdAt: entry.createdAt,
          archivedAt: entry.archivedAt as string,
          // Info: (20260730 - Tzuhan) 標題衍生自密文首訊(server 讀不到),故以本地快取補;無快取時以建立日期呈現
          title:
            (loadSessionsIndex(user?.address ?? "") ?? []).find(
              (cached) => cached.id === entry.sessionId,
            )?.title ?? new Date(entry.createdAt).toLocaleDateString(),
        }));
    } catch (error) {
      console.error("[carbon-chat] failed to load archived sessions:", error);
      return [];
    }
  }, [user?.address]);

  /**
   * Info: (20260730 - Tzuhan) 還原已封存的會話:PATCH 清掉 archivedAt,並把它放回本地清單。
   * 與封存同一權限層級(DELETE),伺服端裁決;成功才動本地狀態。
   */
  const restoreSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        sessionId,
      );
      try {
        await request("/api/v1/chat/carbon/sessions", {
          method: "PATCH",
          body: JSON.stringify({ channel }),
        });
      } catch (error) {
        console.error("[carbon-chat] restore session failed:", error);
        return false;
      }

      const cached = (loadSessionsIndex(user?.address ?? "") ?? []).find(
        (entry) => entry.id === sessionId,
      );
      setSessionsData((prev) => {
        if (prev[sessionId]) return prev;
        return {
          ...prev,
          [sessionId]: {
            ...createChatSession(
              sessionId,
              cached?.title ?? t("carbon_chatbot.new_session_title"),
              cached?.createdAt ?? new Date().toLocaleDateString(),
            ),
            isTitleCustom: cached?.isTitleCustom ?? false,
          },
        };
      });
      return true;
    },
    [user?.address, t],
  );

  /**
   * Info: (20260730 - Tzuhan) 封存會話(軟刪)。刻意不是硬刪:一個會話連帶整份 33 節報告草稿
   * 與活動數據帳本,在審計系統裡誤刪一份已查核的報告是不可逆的損失。伺服端只寫 archivedAt,
   * 資料仍在,可還原(PATCH)。
   * 權限為獨立的 DELETE 層級:個人會話限擁有者;帳本會話限擁有者或帳本 OWNER/ADMIN。
   */
  const archiveSession = useCallback(
    async (sessionId: string): Promise<boolean> => {
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        sessionId,
      );
      try {
        await request("/api/v1/chat/carbon/sessions", {
          method: "DELETE",
          body: JSON.stringify({ channel }),
        });
      } catch (error) {
        console.error("[carbon-chat] archive session failed:", error);
        return false;
      }

      // Info: (20260730 - Tzuhan) 封存成功才動本地狀態:失敗時清單不可先消失(否則使用者以為成功了)
      setSessionsData((prev) => {
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      /**
       * Info: (20260805 - Luphia) 待確認匯入隨會話一起消失。
       * 這是 pendingImportBySession 唯一該被移除的時機 —— 切房不是
       * (見 switchSession 的註解)。會話已經不存在,留著那一鍵就沒有任何人能套用它。
       */
      setPendingImportFor(sessionId, null);
      /**
       * Info: (20260811 - Emily) 提示同理:會話消失才是該清的時機(#6624)。
       * 切房不清之後,這一鍵沒有別的清除點 —— 留著就是一筆永遠沒人讀的殘留。
       */
      setDraftNotice(null, sessionId);
      // Info: (20260730 - Tzuhan) 封存的若是當前會話,切到其餘任一會話;全空則建新的(畫面不可留在已封存的會話上)
      setActiveSessionId((current) => {
        if (current !== sessionId) return current;
        const remaining = Object.keys(sessionsData).filter(
          (id) => id !== sessionId,
        );
        return remaining[0] ?? current;
      });
      return true;
    },
    [user?.address, sessionsData, setPendingImportFor, setDraftNotice],
  );

  // Info: (20260716 - Tzuhan) #52 綁定會話至帳本(POST sessions);成功後記入存取中繼資料
  // Info: (20260720 - Tzuhan) UAT 回饋:排隊與失敗都要對使用者說話(先前靜默,匯入按鈕不出現無從排查)
  const bindSessionToBook = useCallback(
    async (sessionId: string, accountBookId: string) => {
      const master = masterKeyRef.current;
      if (!master) {
        // Info: (20260716 - Tzuhan) 需 xpub 作 chatroom ownerPublicKey:未解鎖先排隊,解鎖後補送
        pendingBindsRef.current.set(sessionId, accountBookId);
        // Info: (20260720 - Tzuhan) 明示排隊狀態:帳本功能(匯入/證據鏈)要等解鎖綁定完成才可用
        setDraftNotice({
          type: "info",
          text: t("carbon_chatbot.book_bind_pending_unlock"),
        });
        return;
      }
      try {
        const res = await request<{
          payload: { channel: string; accountBookId: string } | null;
        }>("/api/v1/chat/carbon/sessions", {
          method: "POST",
          body: JSON.stringify({
            sessionId,
            accountBookId,
            recipientPublicKey: master.extendedPublicKey,
          }),
        });
        const bound = res.payload;
        if (!bound) return;
        setSessionAccess((prev) => ({
          ...prev,
          [bound.channel]: {
            accountBookId: bound.accountBookId,
            canEdit: true,
          },
        }));
        setDraftNotice({
          type: "info",
          text: t("carbon_chatbot.book_bind_done"),
        });
        dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS);
      } catch (error) {
        console.error("[carbon-chat] failed to bind account book:", error);
        // Info: (20260720 - Tzuhan) 綁定失敗最常見原因:角色不足(server 需 EDITOR 以上)
        setDraftNotice({
          type: "error",
          text:
            getApiErrorCode(error) === API_ERRORS.AUTH_PERMISSION_DENIED.code
              ? t("carbon_chatbot.book_bind_denied")
              : t("carbon_chatbot.book_bind_failed"),
        });
        // Info: (20260811 - Emily) 一次性事件的提示要自己消失,不能靠切房順手清掉(#6624)
        dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS);
      }
    },
    [t, setDraftNotice, dismissDraftNoticeAfter],
  );

  // Info: (20260716 - Tzuhan) #52 解鎖後補送排隊中的綁定請求
  useEffect(() => {
    if (!isUnlocked || pendingBindsRef.current.size === 0) return;
    const pending = Array.from(pendingBindsRef.current.entries());
    pendingBindsRef.current.clear();
    pending.forEach(([sessionId, accountBookId]) => {
      void bindSessionToBook(sessionId, accountBookId);
    });
  }, [isUnlocked, bindSessionToBook, setDraftNotice]);

  // Info: (20260716 - Tzuhan) UAT P0:本機常駐快取「即刻水合」— 不需金鑰,refresh 後解鎖前內容即可見。
  // Info: (20260716 - Tzuhan) 僅在該 session 仍為空骨架時套用(絕不覆蓋已還原/已編輯內容);DB 還原隨後比版本裁決
  const hydratedChannelsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (hydratedChannelsRef.current.has(chatChannel)) return;
    hydratedChannelsRef.current.add(chatChannel);
    const backup = loadLocalDraftBackup(chatChannel);
    if (!backup) return;
    const sessionIdForChannel = activeSessionId;
    setSessionsData((prev) => {
      const session = prev[sessionIdForChannel];
      const reportData = session?.reportData;
      if (!session || !reportData) return prev;
      // Info: (20260716 - Tzuhan) 空骨架判定:無全文且所有段落皆未生成
      const isSkeleton =
        !reportData.rawMarkdown &&
        (reportData.paragraphs ?? []).every((p) => !p.content);
      if (!isSkeleton) return prev;
      return {
        ...prev,
        [sessionIdForChannel]: { ...session, reportData: backup.reportData },
      };
    });
  }, [chatChannel, activeSessionId]);

  // Info: (20260714 - Tzuhan) 切至 session 時自 DB 還原報告草稿(密文 → 主私鑰解密;需先解鎖,每 channel 只還原一次)
  useEffect(() => {
    const master = masterKeyRef.current;
    // Info: (20260716 - Tzuhan) #52 帳本會話為明文模式,未解鎖亦可還原(VIEWER 閱覽動線);個人會話仍需金鑰
    const isBookBound = Boolean(sessionAccess[chatChannel]?.accountBookId);
    if (!isBookBound && (!isUnlocked || !master)) return;
    if (restoredChannelsRef.current.has(chatChannel)) return;
    restoredChannelsRef.current.add(chatChannel);
    const sessionIdForChannel = activeSessionId;

    loadReportDraft(chatChannel, master ?? null)
      .then((loaded) => {
        // Info: (20260714 - Tzuhan) 無草稿 → 版本 0(首存)；有草稿 → 記錄真實版本供樂觀鎖
        draftVersionsRef.current.set(chatChannel, loaded?.version ?? 0);
        // Info: (20260716 - Tzuhan) #52 以 server 裁決結果更新存取中繼資料(canEdit=false → 前端唯讀)
        if (loaded) {
          setSessionAccess((prev) => ({
            ...prev,
            [chatChannel]: {
              accountBookId: loaded.accountBookId,
              canEdit: loaded.canEdit,
            },
          }));
        }
        // Info: (20260716 - Tzuhan) 常駐快取與 DB 比版本取新者:
        // Info: (20260716 - Tzuhan) 快取版本 >= DB 版本 = 本機有未上雲的較新編輯(隨後 autosave 會推回);
        // Info: (20260716 - Tzuhan) DB 較新(他裝置更新過)= 以 DB 為準,快取隨 autosave 覆寫
        const localBackup = loadLocalDraftBackup(chatChannel);
        // Info: (20260714 - Tzuhan) 草稿存在但無法解讀(reportData null): 保留版本、不覆寫狀態，並提示保存異常
        if (loaded && !loaded.reportData && !localBackup) {
          console.error(
            "[carbon-chat] report draft exists but is unreadable:",
            chatChannel,
          );
          setSaveStatus("error");
          return;
        }
        const preferBackup =
          localBackup && localBackup.draftVersion >= (loaded?.version ?? 0);
        const restored = preferBackup
          ? localBackup.reportData
          : (loaded?.reportData ?? localBackup?.reportData);
        if (!restored) return;
        setSessionsData((prev) => {
          const session = prev[sessionIdForChannel];
          if (!session) return prev;
          return {
            ...prev,
            [sessionIdForChannel]: { ...session, reportData: restored },
          };
        });
      })
      .catch((error) => {
        // Info: (20260714 - Tzuhan) 還原失敗(API/網路): 不設定版本 → 凍結該 channel 的自動保存，
        // Info: (20260714 - Tzuhan) 避免以空骨架蓋掉 DB 既有草稿；以保存異常提示使用者
        console.error("[carbon-chat] failed to load report draft:", error);
        setSaveStatus("error");
      });
  }, [isUnlocked, chatChannel, activeSessionId, sessionAccess]);

  /**
   * Info: (20260807 - Emily) 送出一輪雲端保存,直到送出去的就是當下最新的那一份。
   *
   * 兩件事被綁在一起,因為它們是同一個不變式的兩半:
   * 1. **同一個 channel 同時只有一個 PUT 在飛**(savingChannelsRef)。並行送出會讓後者
   *    帶著過期的 version 撞上樂觀鎖,而那一次的內容就此消失。
   * 2. **飛的期間內容又變了就再送一次**(while 迴圈)。少了這一步,第 1 點會把
   *    「保存期間的變更」直接丟掉 —— 那只是把競態換成靜默遺失。
   *
   * 迴圈內的 await 是刻意的:這裡要的就是序列化,並行正是要防的事。
   */
  const flushReportDraftSave = useCallback(
    async (
      channel: string,
      sessionId: string,
      masterKey: IChatroomMasterKey | null,
      accountBookId: string | null,
    ): Promise<void> => {
      if (savingChannelsRef.current.has(channel)) return;
      savingChannelsRef.current.add(channel);
      setSaveStatus("saving");
      try {
        let inflight = latestReportDataRef.current.get(channel);
        while (inflight) {
          const expectedVersion = draftVersionsRef.current.get(channel) ?? 0;
          // Info: (20260716 - Tzuhan) #52 帳本會話走明文保存(模型 A);個人會話維持 E2EE
          const newVersion = await saveReportDraft(
            channel,
            masterKey,
            inflight,
            expectedVersion,
            accountBookId,
          );
          draftVersionsRef.current.set(channel, newVersion);
          // Info: (20260716 - Tzuhan) UAT P0:快取常駐(refresh 後解鎖前即刻可見)
          // Info: (20260807 - Emily) 以「當下最新」重寫,不是送出時的那份 —— 見 latestReportDataRef
          const latest = latestReportDataRef.current.get(channel) ?? inflight;
          if (!saveLocalDraftBackup(channel, latest, newVersion)) {
            // Info: (20260807 - Emily) 雲端成功時退路失效不擋流程,但不得靜默(配額爆掉是可觀測事實)
            setDraftNotice(
              { type: "info", text: t("carbon_chatbot.save_local_quota")! },
              sessionId,
            );
            dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS, sessionId);
          }
          if (latest === inflight) break;
          inflight = latest;
        }
        setSaveStatus("saved");
      } catch (error) {
        /**
         * Info: (20260807 - Emily) 保存失敗必須說得出**是哪一種**失敗,而不是共用一個小圖示。
         * 代價是幾分鐘的 LLM 成果,使用者有權當場知道這一版沒有進雲端。
         */
        let noticeText: string;
        if (isDraftTooLargeError(error)) {
          console.error("[carbon-chat] report draft too large:", channel, {
            chars: error.chars,
            limit: error.limit,
          });
          noticeText = t("carbon_chatbot.save_failed_too_large")!;
        } else if (isDraftVersionConflict(error)) {
          console.warn("[carbon-chat] draft version conflict:", channel);
          noticeText = t("carbon_chatbot.save_failed_conflict")!;
        } else {
          console.error("[carbon-chat] failed to save report draft:", error);
          noticeText = t("carbon_chatbot.save_failed_notice")!;
        }
        setSaveStatus("error");
        setDraftNotice({ type: "error", text: noticeText }, sessionId);
        // Info: (20260811 - Emily) 同上:保存失敗是事件不是狀態,持續的那面是 saveStatus(#6624)
        dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS, sessionId);
      } finally {
        savingChannelsRef.current.delete(channel);
      }
    },
    [t, setDraftNotice, dismissDraftNoticeAfter],
  );

  // Info: (20260714 - Tzuhan) 報告草稿 debounce 自動保存(前端加密 → PUT)；還原完成前不保存，避免空骨架覆蓋既有草稿
  const activeReportData = sessionsData[activeSessionId]?.reportData;
  useEffect(() => {
    if (!activeReportData) return undefined;
    // Info: (20260807 - Emily) 先記下「當下最新」,保存迴圈與快取重寫都以這裡為準
    latestReportDataRef.current.set(chatChannel, activeReportData);
    // Info: (20260715 - Luphia) 內容一有變更即先寫本機安全快取(不等 debounce);萬一保存前當機/關頁,下次還原時可救回
    // Info: (20260716 - Tzuhan) #50 提到所有雲端保存 guard 之前:本機快取不需金鑰,
    // Info: (20260716 - Tzuhan) 未解鎖的新聊天室貼上內容也先落地,解鎖後由還原流程撿回並自動推入 DB
    const backedUp = saveLocalDraftBackup(
      chatChannel,
      activeReportData,
      draftVersionsRef.current.get(chatChannel) ?? 0,
    );
    // Info: (20260716 - Tzuhan) #52 無編輯權(帳本 VIEWER)不觸發保存(server 亦會 403,此為第一道)
    if (sessionAccess[chatChannel]?.canEdit === false) return undefined;
    const master = masterKeyRef.current;
    // Info: (20260803 - Tzuhan) 明文模式(帳本會話)免金鑰,與還原那條路一致
    const draftBookId = sessionAccess[chatChannel]?.accountBookId ?? null;
    const canCloudSave =
      restoredChannelsRef.current.has(chatChannel) &&
      draftVersionsRef.current.has(chatChannel) &&
      (Boolean(master) || Boolean(draftBookId));
    if (!canCloudSave) {
      // Info: (20260716 - Tzuhan) #50 明確告知使用者「僅暫存本機」,避免誤以為已上雲
      setSaveStatus("local");
      /**
       * Info: (20260807 - Emily) 只暫存本機、而本機也寫不進去 = 這一版哪裡都沒有。
       * 這是最不能靜默的一種,原本只有一行 console.error。
       */
      if (!backedUp) {
        setSaveStatus("error");
        setDraftNotice(
          { type: "error", text: t("carbon_chatbot.save_local_quota_only")! },
          activeSessionId,
        );
      }
      return undefined;
    }

    setSaveStatus("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    const sessionIdForSave = activeSessionId;
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      void flushReportDraftSave(
        chatChannel,
        sessionIdForSave,
        master,
        draftBookId,
      );
    }, CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    activeReportData,
    chatChannel,
    activeSessionId,
    isUnlocked,
    sessionAccess,
    flushReportDraftSave,
    setDraftNotice,
    t,
  ]);

  // Info: (20260716 - Tzuhan) #6518 切至 session 時自 DB 還原盤查狀態(三態協定比照報告草稿)
  useEffect(() => {
    const master = masterKeyRef.current;
    // Info: (20260716 - Tzuhan) #52 帳本會話明文模式免金鑰(同報告還原)
    const isBookBound = Boolean(sessionAccess[chatChannel]?.accountBookId);
    if (!isBookBound && (!isUnlocked || !master)) return;
    if (
      inventoryLoadSettledRef.current.has(chatChannel) ||
      inventoryLoadAttemptedRef.current.has(chatChannel)
    ) {
      return;
    }
    inventoryLoadAttemptedRef.current.add(chatChannel);

    loadInventoryState(chatChannel, master ?? null)
      .then((loaded) => {
        /**
         * Info: (20260806 - Tzuhan) 有結論即記為 settled —— 包含「記錄存在但解不開」。
         * 那種情形再試一百次也是同一個結果(金鑰不對就是不對),
         * 重試只會每次切房都多一次無用的請求。
         */
        inventoryLoadSettledRef.current.add(chatChannel);
        inventoryVersionsRef.current.set(chatChannel, loaded?.version ?? 0);
        if (loaded && !loaded.state) {
          // Info: (20260716 - Tzuhan) 記錄存在但不可讀: 保留真實版本，不以空狀態覆蓋
          console.error(
            "[carbon-chat] inventory state exists but is unreadable:",
            chatChannel,
          );
          return;
        }
        if (!loaded?.state) return;
        const restored = loaded.state;
        setInventoryStates((prev) => ({ ...prev, [chatChannel]: restored }));
      })
      .catch((error) => {
        // Info: (20260716 - Tzuhan) 還原失敗不設版本 → 凍結該 channel 的狀態自動保存，防空狀態蓋庫
        console.error("[carbon-chat] failed to load inventory state:", error);
        /**
         * Info: (20260806 - Tzuhan) 從 attempted 移除,**不**加進 settled ——
         * 這是「沒有結論」而非「結論是失敗」:網路抖動、伺服器暫時不可用都走這條,
         * 而它們下次就會好。原本這裡什麼都不做,等於一次失敗即永久失敗。
         */
        inventoryLoadAttemptedRef.current.delete(chatChannel);
      });
  }, [isUnlocked, chatChannel, sessionAccess]);

  /**
   * Info: (20260806 - Tzuhan) 切至 session 時自 DB 還原待匯入的解析結果(三態協定同報告草稿)。
   *
   * 還原的是「解析好但還沒寫進報告」的候選,連 cid 與頁碼索引一起回來 ——
   * 所以重載之後「重試失敗章節」仍然可用(cid 是字串,File 不是)。
   *
   * 一律以收起狀態還原:一進聊天室就被一張蓋住全螢幕的預覽卡攔住,
   * 而它講的可能是幾天前的事 —— 那不是提醒,是阻擋。改在輸入列上方留一條可點的提示。
   */
  useEffect(() => {
    const master = masterKeyRef.current;
    // Info: (20260806 - Tzuhan) 帳本會話明文模式免金鑰(同報告/盤查還原)
    const isBookBound = Boolean(sessionAccess[chatChannel]?.accountBookId);
    if (!isBookBound && (!isUnlocked || !master)) return;
    if (
      pendingImportLoadSettledRef.current.has(chatChannel) ||
      pendingImportLoadAttemptedRef.current.has(chatChannel)
    ) {
      return;
    }
    pendingImportLoadAttemptedRef.current.add(chatChannel);
    const sessionIdForChannel = activeSessionId;

    fetchPendingImportRecord(chatChannel, master ?? null)
      .then((loaded) => {
        // Info: (20260806 - Tzuhan) 有結論即 settled(含「存在但解不開」——再試也是同一結果)
        pendingImportLoadSettledRef.current.add(chatChannel);
        pendingImportVersionsRef.current.set(chatChannel, loaded?.version ?? 0);
        if (loaded && !loaded.data) {
          // Info: (20260806 - Tzuhan) 紀錄存在但不可讀:保留真實版本,不以空內容覆蓋
          console.error(
            "[carbon-chat] pending import exists but is unreadable:",
            chatChannel,
          );
          return;
        }
        if (!loaded?.data) return;
        const restored = loaded.data;
        /**
         * Info: (20260806 - Tzuhan) 還原的歸屬以**這個 channel 的會話**為準,
         * 不採用紀錄裡的 originSessionId —— 那是寫入當下的值,
         * 而紀錄是綁在 chatroom 上的,兩者不一致時 chatroom 才是事實。
         */
        setPendingImportFor(sessionIdForChannel, {
          ...restored.pending,
          originSessionId: sessionIdForChannel,
        });
        setDeferredPreviewSessions((prev) => ({
          ...prev,
          [sessionIdForChannel]: true,
        }));
        importActivitiesRef.current = restored.activities;
        lastPageIndexRef.current =
          restored.pageIndex.length > 0
            ? new Map(restored.pageIndex)
            : undefined;
        /**
         * Info: (20260806 - Tzuhan) 重試用的檔案引用:重載後只剩 cid(File 是記憶體物件)。
         * cid 為 null 表示當初上傳失敗、走了直傳退路 —— 那時重試沒有素材,
         * 由 appendImportSource 在發請求前就擋下(而不是送出一個註定失敗的請求)。
         */
        lastImportSourceRef.current = {
          cid: restored.source.cid,
          fileName: restored.source.fileName,
          mimeType: restored.source.mimeType,
          file: null,
        };
      })
      .catch((error) => {
        console.error("[carbon-chat] failed to load pending import:", error);
        /**
         * Info: (20260806 - Tzuhan) 從 attempted 移除、**不**加進 settled:
         * 這是「沒有結論」而非「結論是失敗」——網路抖動下次就會好。
         */
        pendingImportLoadAttemptedRef.current.delete(chatChannel);
      });
  }, [
    isUnlocked,
    chatChannel,
    activeSessionId,
    sessionAccess,
    setPendingImportFor,
  ]);

  // Info: (20260716 - Tzuhan) #6518 盤查狀態 debounce 自動保存(前端加密 → PUT；樂觀鎖)
  const activeInventoryState = inventoryStates[chatChannel];

  // Info: (20260720 - Tzuhan) #23 數據表格文案(i18n;數字本身與語言無關,一律引擎字串)
  const dataTableLabels: ICarbonDataTableLabels = useMemo(
    () => ({
      detailHeading: t("carbon_chatbot.report_table_detail_heading"),
      colSource: t("carbon_chatbot.report_table_col_source"),
      colScope: t("carbon_chatbot.report_table_col_scope"),
      colQuantity: t("carbon_chatbot.report_table_col_quantity"),
      colFactor: t("carbon_chatbot.report_table_col_factor"),
      colCo2e: t("carbon_chatbot.report_table_col_co2e"),
      subtotalHeading: t("carbon_chatbot.report_table_subtotal_heading"),
      total: t("carbon_chatbot.report_table_total"),
      insufficient: t("carbon_chatbot.report_table_insufficient"),
      frozen: t("carbon_chatbot.report_table_frozen"),
      pendingNote: t("carbon_chatbot.report_table_pending_note"),
      colProvenance: t("carbon_chatbot.report_table_col_provenance"),
      provenanceComputed: t("carbon_chatbot.report_table_provenance_computed"),
      provenanceImported: t("carbon_chatbot.report_table_provenance_imported"),
      notProvided: t("carbon_chatbot.report_table_not_provided"),
      importedNote: t("carbon_chatbot.report_table_imported_note"),
      // Info: (20260722 - Tzuhan) UAT:範疇顯示名(enum 值不可讀)
      formatScope: (scope: string) => formatGhgCategoryLabel(scope, language),
    }),
    [t, language],
  );

  // Info: (20260720 - Tzuhan) #23 數據段落勾稽徽章三態(目錄樹顯示;由 ledger 決定性裁決)
  const dataBadgeState = deriveDataBadgeState(
    activeInventoryState?.computedLedger,
  );

  /**
   * Info: (20260722 - Tzuhan) UAT 修正:草稿落地時的 ledger 一律讀 ref(非 closure)。
   * 匯入 → 自動生成草稿為長流程(LLM 10~45s),/calculate 在其間返回;
   * 舊 closure 捕獲的空 ledger 會讓表格印佔位、桑基圖被跳過 — ref 永遠是當下真值。
   */
  const computedLedgerRef = useRef<IComputedLedger | undefined>(undefined);
  useEffect(() => {
    computedLedgerRef.current = activeInventoryState?.computedLedger;
  }, [activeInventoryState?.computedLedger]);
  /**
   * Info: (20260825 - Emily) #6667:勾稽阻擋紀錄的同步鏡像(與 computedLedgerRef 同一個理由:
   * 建表發生在 setState 生效之前,當下要同步讀得到)。圖表建置憑它把
   * 「未取得該表」與「取得了但勾稽被擋」說成兩件事 —— 印錯原因的提示,
   * 會讓使用者去重匯一章根本沒壞的內容。
   */
  const ledgerImportBlocksRef = useRef<ILedgerImportBlock[] | undefined>(
    undefined,
  );
  useEffect(() => {
    ledgerImportBlocksRef.current = activeInventoryState?.ledgerImportBlocks;
  }, [activeInventoryState?.ledgerImportBlocks]);
  /**
   * Info: (20260827 - Emily) 盤查年度的同步鏡像(PR #6725 review R1;
   * 與 computedLedgerRef 同一個理由:匯入分錄在 setState 生效之前就要標上年度)。
   * 沒有年度就是沒有 —— 不由旁證推測,合併端會退回「不判年度」的舊行為。
   */
  const inventoryYearRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    inventoryYearRef.current = activeInventoryState?.year;
  }, [activeInventoryState?.year]);

  // Info: (20260720 - Tzuhan) #51 圖表文案(i18n;數值本身一律引擎產出,與語言無關)
  const chartLabels: ICarbonChartLabels = useMemo(
    () => ({
      pieTitle: t("carbon_chatbot.chart_scope_pie_title"),
      barTitle: t("carbon_chatbot.chart_scope_bar_title"),
      axisCo2e: "kgCO2e",
      insufficient: t("carbon_chatbot.chart_insufficient"),
      frozen: t("carbon_chatbot.chart_frozen"),
      sankeyChatNode: t("carbon_chatbot.chart_sankey_chat_node"),
      // Info: (20260806 - Tzuhan) 憑證桑基圖的月別層文案
      sankeyPeriodUnknown: t("carbon_chatbot.chart_sankey_period_unknown"),
      sankeyPeriodCollapsed: t("carbon_chatbot.chart_sankey_period_collapsed"),
      importedSankeyTitle: t("carbon_chatbot.chart_imported_sankey_title"),
      importedSankeyExcluded: t(
        "carbon_chatbot.chart_imported_sankey_excluded",
      ),
      // Info: (20260806 - Tzuhan) 匯入了但帳本空:必須指向表3.8/第三章,而不是「補齊活動數據」
      importedSankeyNoLedger: t(
        "carbon_chatbot.chart_imported_sankey_no_ledger",
      ),
      // Info: (20260825 - Emily) #6667:「拿到了表但勾稽被擋」與「沒拿到表」分開說
      importedSankeyBlockedLedger: t(
        "carbon_chatbot.chart_imported_sankey_blocked_ledger",
      ),
      /**
       * Info: (20260828 - Emily) 部分入帳的圖旁附註(round-2 低-1 第二半)。
       * ⚠ 必接 i18n:`chartLabels` 是完整字面值、沒有 spread 預設值,
       * builder 加了文案而這裡沒接 = 紙上什麼都不會印(見本檔 20260819 那則註解)。
       */
      partialImportBlocked: t("carbon_chatbot.chart_partial_import_blocked"),
      importedSankeyCollapsed: t(
        "carbon_chatbot.chart_imported_sankey_collapsed",
      ),
      // Info: (20260806 - Tzuhan) 兩張圖拆開後新增的文案:去向圖標題、其他節點、GHG 對照抬頭
      importedTopItemsTitle: t("carbon_chatbot.chart_imported_top_items_title"),
      importedSankeyOther: t("carbon_chatbot.chart_imported_sankey_other"),
      importedSankeyGhgMapping: t(
        "carbon_chatbot.chart_imported_sankey_ghg_mapping",
      ),

      /**
       * Info: (20260819 - Emily) `open/53` 的範疇↔類別對照說明。
       *
       * ⚠ 這一行必須接 i18n。本檔 20260806 那則註解記著同一個坑:
       * 「文案當時只改了 default 沒改 i18n,而這個 hook 會用 i18n 覆蓋 default」——
       * `chartLabels` 是完整的物件字面值,沒有 spread `CARBON_CHART_DEFAULT_LABELS`,
       * 所以 builder 加了新的預設文案而這裡沒接,結果是**紙上什麼都不會印**。
       * 08-19 兩趟驗收就是這樣紅的。
       */
      importedSankeyIsoMapping: t(
        "carbon_chatbot.chart_imported_sankey_iso_mapping",
      ),
      /**
       * Info: (20260806 - Tzuhan) 這兩個先前漏接 i18n,只吃得到 CARBON_CHART_DEFAULT_LABELS 的
       * 繁中預設值 —— 五層圖是 20260805 才加的,文案當時只改了 default 沒改 i18n,
       * 而這個 hook 會用 i18n 覆蓋 default,結果英日韓看到的是中文。
       */
      importedSankeyBelowThreshold: t(
        "carbon_chatbot.chart_imported_sankey_below_threshold",
      ),
      importedSankeyOrganization: t(
        "carbon_chatbot.chart_imported_sankey_organization",
      ),
      // Info: (20260807 - Tzuhan) 分類圖抽掉廠址層後,廠址小計改列在圖下
      importedSankeySiteTotals: t(
        "carbon_chatbot.chart_imported_sankey_site_totals",
      ),
      // Info: (20260722 - Tzuhan) UAT:範疇顯示名(enum 值不可讀)
      formatScope: (scope: string) => formatGhgCategoryLabel(scope, language),
      // Info: (20260805 - Tzuhan) 三大範疇顯示名(匯入桑基圖第三層)
      formatEsgScope: (scope: string) => formatEsgScopeLabel(scope, language),
      /**
       * Info: (20260807 - Tzuhan) 子代碼顯示名(`2.1 外購電力`)。
       * 名稱取自 ISO 14064-1 標準而非原文報告的寫法 ——
       * 各家報告的中文名稱不一致,而同一個代碼在不同報告印出不同名字,
       * 圖與圖之間就對不起來(理由詳見 formatIsoSubCategoryLabel)。
       */
      // Info: (20260807 - Emily) 以顯示寬度截斷:名稱補上之後,英文最長的一筆在 1024px 下會疊字
      formatSubCategory: (subCategory: string) =>
        formatIsoSubCategoryLabel(
          subCategory,
          language,
          CARBON_SANKEY_LABEL_MAX_WIDTH,
        ),
    }),
    [t, language],
  );
  useEffect(() => {
    if (!activeInventoryState) return undefined;
    /**
     * Info: (20260806 - Tzuhan) 自動保存的閘門用 **settled** 而非 attempted:
     * 條件是「已經讀到過庫裡的內容」,不是「發過請求」——
     * 拿在途的狀態當閘門,等於可能以還沒讀完的空狀態去蓋掉庫裡的資料。
     * (下一行的版本檢查本來也擋得住,但那是巧合而非意圖;意圖要寫在條件裡。)
     */
    if (!inventoryLoadSettledRef.current.has(chatChannel)) return undefined;
    if (!inventoryVersionsRef.current.has(chatChannel)) return undefined;
    const master = masterKeyRef.current;
    const bookId = sessionAccess[chatChannel]?.accountBookId ?? null;
    /**
     * Info: (20260803 - Tzuhan) 明文模式(帳本會話)免金鑰 —— 與還原那條路一致。
     * 兩條路的要求不對稱正是先前「讀得到卻存不了」的成因。
     *
     * Info: (20260806 - Tzuhan) 那個不對稱**已經治本了**,這段註解原本沒跟著改。
     *
     * 原文寫「保存時 PUT 的 schema 仍硬性要求 recipientPublicKey,因此一律需要 master」——
     * 那句話在 20260803 當天就不再成立:`CarbonReportDraftPutSchema` 已把
     * `recipientPublicKey` 改為選填(僅加密模式必填,見該檔的兩個 refine),
     * 前端 `saveInventoryState` 也只在「非帳本會話且無金鑰」時才拋。
     * 帳本會話未解鎖時現在是真的存得進去,不是止盲。
     *
     * 留著錯的註解比沒有註解更貴:下一個人會以為根因還在,
     * 去追一張早就關掉的票,或反過來不敢動這一行。
     *
     * 這一行現在的職責只剩下面那個 —— 兩者都沒有時,連加密都做不到,
     * 只能告知「僅暫存本機」。個人會話沒有金鑰就是沒有金鑰,那不是缺陷。
     */
    if (!bookId && !master) {
      setSaveStatus("local");
      return undefined;
    }

    if (inventoryAutosaveTimerRef.current) {
      clearTimeout(inventoryAutosaveTimerRef.current);
    }
    inventoryAutosaveTimerRef.current = setTimeout(() => {
      inventoryAutosaveTimerRef.current = null;
      const expectedVersion =
        inventoryVersionsRef.current.get(chatChannel) ?? 0;
      saveInventoryState(
        chatChannel,
        master,
        activeInventoryState,
        expectedVersion,
        bookId,
      )
        .then((newVersion) => {
          inventoryVersionsRef.current.set(chatChannel, newVersion);
        })
        .catch((error) => {
          if (isDraftVersionConflict(error)) {
            console.warn(
              "[carbon-chat] inventory version conflict:",
              chatChannel,
            );
          } else {
            console.error(
              "[carbon-chat] failed to save inventory state:",
              error,
            );
          }
        });
    }, CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (inventoryAutosaveTimerRef.current) {
        clearTimeout(inventoryAutosaveTimerRef.current);
      }
    };
  }, [activeInventoryState, chatChannel, isUnlocked, sessionAccess]);

  // Info: (20260716 - Tzuhan) #6519 決定論 CO2e 計算:活動集合變更時呼叫 /calculate,結果掛回 state
  // Info: (20260716 - Tzuhan) 簽章 guard 防迴圈:applyComputedLedger 只回填係數不改活動鍵,簽章不變不重算
  const lastCalcSignatureRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    if (!activeInventoryState || activeInventoryState.activities.length === 0) {
      return;
    }
    // Info: (20260720 - Tzuhan) #6520 簽章納入庫存紀錄:期初/採購/期末變更也要重跑勾稽
    const signature = [
      ...activeInventoryState.activities.map(activityDedupeKey),
      ...(activeInventoryState.stockRecords ?? []).map(
        (r) =>
          `stock:${stockRecordDedupeKey(r)}|${r.openingQuantity}|${r.purchasedQuantity}|${r.closingQuantity}`,
      ),
    ]
      .sort()
      .join(";");
    if (lastCalcSignatureRef.current.get(chatChannel) === signature) return;
    lastCalcSignatureRef.current.set(chatChannel, signature);

    const channelAtRequest = chatChannel;
    request<{ payload: { ledger: IComputedLedger } | null }>(
      "/api/v1/chat/carbon/calculate",
      {
        method: "POST",
        body: JSON.stringify({
          activities: activeInventoryState.activities,
          stockRecords: activeInventoryState.stockRecords ?? [],
        }),
      },
    )
      .then((res) => {
        const ledger = res.payload?.ledger;
        if (!ledger) return;
        setInventoryStates((prev) => {
          const base = prev[channelAtRequest];
          if (!base) return prev;
          return {
            ...prev,
            [channelAtRequest]: applyComputedLedger(base, ledger),
          };
        });
      })
      .catch((error) => {
        // Info: (20260716 - Tzuhan) 計算失敗不阻斷對話;清簽章讓下次活動變更重試
        console.error("[carbon-chat] co2e calculation failed:", error);
        lastCalcSignatureRef.current.delete(channelAtRequest);
      });
  }, [activeInventoryState, chatChannel]);

  // Info: (20260716 - Tzuhan) #6518 合併萃取結果進狀態帳本(去重/推進由 lib/carbon_inventory 決定性裁決)
  // Info: (20260716 - Tzuhan) 閉包綁定建立當下的 channel: 在途回覆寫回原房
  const applyInventoryExtraction = useCallback(
    (extraction: IInventoryExtraction | null | undefined, source?: string) => {
      if (!extraction) return;
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        activeSessionId,
      );
      setInventoryStates((prev) => {
        const base = prev[channel] ?? createEmptyInventoryState();
        const merged = mergeInventoryExtraction(base, extraction, source);
        const orgUnchanged =
          merged.state.company === base.company &&
          merged.state.year === base.year &&
          merged.state.boundaryApproach === base.boundaryApproach;
        // Info: (20260716 - Tzuhan) 無實質變化不換參考，避免觸發無意義的 autosave
        if (merged.addedCount === 0 && orgUnchanged) return prev;
        return { ...prev, [channel]: merged.state };
      });
    },
    [user?.address, activeSessionId],
  );

  /**
   * Info: (20260803 - Tzuhan) 把匯入的表3.8 項目併進 computedLedger(Issue B)。
   *
   * 三個刻意的決定:
   * 1. **以 activityKey 取代同一筆**,不是附加。重複匯入同一份報告是常態
   *    (改一段、重跑一次),附加會讓總量每匯入一次就翻一倍。
   * 2. **只換 IMPORTED 的部分**,COMPUTED 項目原樣保留 ——
   *    憑證算出來的東西不該因為匯入一份外部報告而消失。
   * 3. 小計與總計走共用的 summarizeLedgerEntries,與後端 /calculate 同一份實作;
   *    前端自己再寫一次累加,遲早會出現「明細加起來不等於小計」。
   */
  const applyImportedLedgerEntries = useCallback(
    (entries: IComputedLedgerEntry[]) => {
      if (entries.length === 0) return;
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        activeSessionId,
      );
      setInventoryStates((prev) => {
        const base = prev[channel] ?? createEmptyInventoryState();
        const merged = mergeImportedLedgerEntries(base.computedLedger, entries);
        /**
         * Info: (20260828 - Emily) 年度標註不完整的警示(PR #6725 round-2 追加回饋)。
         *
         * 與 merge 吃同一份輸入(base + entries),所以「被留下來的無年度分錄」
         * 這個判斷與實際入帳結果必然一致 —— 兩邊各算一次就會不一致。
         * 每次匯入無條件覆寫:這次沒有無年度分錄就寫回 undefined
         * (警示描述的狀態已不存在,與 ledgerImportBlocks 清除同一個立場)。
         */
        const yearWarning = detectUndatedImportedEntries(
          base.computedLedger,
          entries,
        );
        return {
          ...prev,
          [channel]: {
            ...base,
            computedLedger: merged,
            /**
             * Info: (20260825 - Emily) #6719 年度快照:報告有盤查年度才存
             * (state.year 由萃取而來;沒有年度的帳本存進去只會製造假比較)。
             * 同年度重匯覆蓋該年,與同鍵覆蓋語義一致。
             *
             * Info: (20260827 - Emily) 快照存**那份報告的分錄**,不是累積後的帳本
             * (PR #6725 review R1 第二項)。存累積結果會讓「2023 的快照」
             * 含有 2024 匯入的東西 —— 年間比較於是拿自己跟自己比,
             * 而那正是這個欄位存在的理由被抵銷掉的方式。
             * 小計與總計走同一支 summarizeLedgerEntries(不另外累加)。
             */
            ...(base.year !== undefined
              ? {
                  ledgerByYear: {
                    ...base.ledgerByYear,
                    [base.year]: buildYearSnapshot(entries),
                  },
                }
              : {}),
            // Info: (20260825 - Emily) 成功入帳即清除阻擋紀錄:紀錄描述的狀態已不存在
            ledgerImportBlocks: undefined,
            ledgerYearWarning: yearWarning ?? undefined,
          },
        };
      });
      // Info: (20260825 - Emily) #6667:ref 同步清除(理由見 ledgerImportBlocksRef 宣告處)
      ledgerImportBlocksRef.current = undefined;
    },
    [user?.address, activeSessionId],
  );

  /**
   * Info: (20260825 - Emily) 勾稽阻擋紀錄寫進 channel 狀態(#6707「對帳差異」偵測器)。
   * 原本只有 console.warn —— 資訊死在開發者工具裡,查詢層看不到,
   * 使用者問「有沒有異常」時系統說不出「表3.8 被擋,因為 6 列解析失敗」。
   * 與 applyImportedLedgerEntries 同一把 channel 推導,同一份 E2EE state。
   */
  const recordLedgerImportBlocks = useCallback(
    (blocks: ILedgerImportBlock[]) => {
      if (blocks.length === 0) return;
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        activeSessionId,
      );
      setInventoryStates((prev) => {
        const base = prev[channel] ?? createEmptyInventoryState();
        return {
          ...prev,
          [channel]: {
            ...base,
            ledgerImportBlocks: blocks,
            updatedAt: new Date().toISOString(),
          },
        };
      });
    },
    [user?.address, activeSessionId],
  );

  // Info: (20260721 - Tzuhan) #53 匯入狀態(定義於此供 UI;主邏輯 importBookEsgRecords 移至
  // Info: (20260721 - Tzuhan) generateParagraphDraft 之後 — 匯入成功需自動生成數據段落草稿)
  const [isImportingBookRecords, setIsImportingBookRecords] =
    useState<boolean>(false);

  // Info: (20260716 - Tzuhan) #55 發起段落修訂:附件事實 + 使用者指示 + 既有原文 → 修訂稿(對照卡確認制)
  const requestParagraphRevision = useCallback(
    async (paragraphId: string, instruction: string, facts: IContextFact[]) => {
      const paragraph = sessionsData[
        activeSessionId
      ]?.reportData?.paragraphs?.find((p) => p.id === paragraphId);
      // Info: (20260716 - Tzuhan) 無既有內容不可修訂(空白段落走草稿生成路徑)
      if (!paragraph?.content) return;

      const section = CARBON_REPORT_OUTLINE.find((o) => o.id === paragraphId);
      setDraftNotice({
        type: "loading",
        text: t("carbon_chatbot.revision_generating", {
          section: paragraph.title,
        }),
      });
      try {
        const res = await request<{
          payload: { content: string; citedFacts: string[] } | null;
        }>("/api/v1/chat/carbon/draft", {
          method: "POST",
          /**
           * Info: (20260814 - Luphia) 計費上下文（設計書 §5.5）：
           * channel 供後端推導計費帳本，clientMessageId 讓重試不重複扣點。
           */
          body: JSON.stringify({
            paragraphId,
            conversationContext: [],
            contextFacts: facts,
            language,
            existingContent: paragraph.content,
            instruction,
            channel: chatChannel,
            clientMessageId: crypto.randomUUID(),
          }),
        });
        setDraftNotice(null);
        if (!res.payload) return;
        setPendingRevision({
          paragraphId,
          title: section ? `${section.code} ${section.title}` : paragraph.title,
          original: paragraph.content,
          revised: res.payload.content,
          citedFacts: res.payload.citedFacts ?? [],
        });
      } catch (error) {
        console.error("[carbon-chat] paragraph revision failed:", error);
        setDraftNotice({
          type: "error",
          text: t("carbon_chatbot.revision_failed"),
        });
        dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS);
      }
    },
    [
      sessionsData,
      activeSessionId,
      language,
      t,
      setDraftNotice,
      dismissDraftNoticeAfter,
      // Info: (20260814 - Luphia) 計費上下文所需：channel 決定這筆消費記到哪個帳本
      chatChannel,
    ],
  );

  // Info: (20260714 - Tzuhan) sessions 索引持久化(id/標題/建立時間;訊息內容已由 DB 密文保存,不重複入本機)
  useEffect(() => {
    if (!user?.address || !sessionsIndexLoadedRef.current) return;
    const entries = Object.values(sessionsData).map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.time,
      isTitleCustom: s.isTitleCustom,
    }));
    saveSessionsIndex(user.address, entries);
  }, [sessionsData, user?.address, setDraftNotice]);

  // Info: (20260714 - Tzuhan) 切換聊天室: 各室訊息/報告/等待狀態彼此隔離，僅重置跨室共用的暫態 UI
  // Info: (20260714 - Tzuhan) (輸入框、附件、高亮、跳段目標為輸入層暫態；busy/計時器 per-session 不需重置)
  const switchSession = useCallback(
    (sessionId: string) => {
      setActiveSessionId(sessionId);
      setActiveParagraphId(null);
      setHighlightedParagraphId(null);
      setFocusedMessageId(null);
      // Info: (20260827 - Emily) #6718:切房清空輸入框(文字在 ChatInput,經 nonce 下指令)
      commandInput("");
      setPendingAttachments([]);
      setAttachmentError(null);
      setSaveStatus(null);
      setIsError(false);
      /**
       * Info: (20260811 - Emily) 這裡刻意**不再清除** draftNotice(#6624)。
       *
       * 這一行是 per-session 之前留下的:當時提示只有一格,「切房就清掉」本身就是隔離機制。
       * 改成一房一格之後(20260806),隔離已由 `draftNoticeBySession[activeSessionId]` 完成,
       * 這一行剩下的作用只有刪除 —— 而且刪的是**正要離開的那一房**:
       * 省略 sessionId 的 `setDraftNotice` 讀 `activeSessionIdRef`,該 ref 由 effect 同步,
       * 上一行的 `setActiveSessionId` 要到 commit 後才反映到 ref。
       * 於是「A 房匯入中 → 切到 B 房」把 A 房的進度從 map 裡刪掉,
       * 切回 A 房畫面是空的,要等下一次進度事件(可能好幾分鐘)才重新有字 ——
       * 那正是 #6624 描述的「不會立刻出現」。
       *
       * 與下方 pendingImportBySession(20260805 - Luphia)同一個故事:
       * 那次改了預覽卡,提示這一份漏了。
       *
       * 「匯入已結束才切回不得殘留假的進行中訊息」由匯入端保證:
       * 每一條終止路徑都以 originSessionId 明確收尾
       * (成功 `notify(null)`;失敗 `notify(error)` + `dismissDraftNoticeAfter`)。
       */
      setPendingRevision(null);
      /**
       * Info: (20260805 - Luphia) 這裡刻意**不動** pendingImportBySession。
       * 它已經以發起匯入的會話 id 為鍵,切房本來就不需要重設任何東西 ——
       * 而原本沿用「清掉唯一那筆」的舊語意去清空整個 map,恰好抵銷了 per-session 的全部意義:
       * 在 A 房啟動匯入 → 切到 B 房等 → 匯入完成落成 { A: preview } → 點回 A 房
       * → switchSession('A') 把 map 清成 {} → 預覽卡消失。
       * 數分鐘的 LLM 工作與整份報告的配額靜默丟棄,連 retryFailedImportChapters 都救不回來
       * (它需要 pendingImport)。
       *
       * 生命週期正確的清除點是「會話消失」而不是「切走」,故改在 archiveSession 移除該鍵。
       */
      pendingDraftParagraphIdRef.current = null;
    },
    [commandInput],
  );

  // Info: (20260716 - Tzuhan) 對話改名:設自訂旗標(首訊衍生不再覆蓋);sessions 索引 effect 自動持久化
  const renameSession = useCallback((sessionId: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSessionsData((prev) => {
      const session = prev[sessionId];
      if (!session) return prev;
      return {
        ...prev,
        [sessionId]: { ...session, title: trimmed, isTitleCustom: true },
      };
    });
  }, []);

  // Info: (20260716 - Tzuhan) 報告檔名改名:入 reportData(隨草稿持久化);下載檔名跟隨
  const renameReportDocument = useCallback(
    (documentName: string) => {
      const trimmed = documentName.trim();
      if (!trimmed) return;
      setSessionsData((prev) => {
        const session = prev[activeSessionId];
        if (!session?.reportData) return prev;
        return {
          ...prev,
          [activeSessionId]: {
            ...session,
            reportData: { ...session.reportData, documentName: trimmed },
          },
        };
      });
    },
    [activeSessionId],
  );

  /**
   * Info: (20260814 - Emily) 查證識別欄位逐格寫回
   * (`data/issue_drafts/open/24_report_identity_fields.md`)。
   *
   * 收 patch 而不是整包:四個輸入框各自 onChange,整包覆蓋的話
   * 連續改兩格時後寫的那次會拿著舊的 state 蓋掉前一次（React 的更新是非同步的）。
   *
   * 不 trim、不驗格式:這幾格的內容要逐字印在查證文件上,而
   * 「2023」與「2023 年度」都是合法的寫法。空字串照存 —— 使用者清空一格
   * 就是要清空它,不是要退回上一個值（列印端會印「未填寫」,見 buildIdentityRows）。
   */
  const updateReportIdentity = useCallback(
    (patch: ICarbonReportIdentity) => {
      setSessionsData((prev) => {
        const session = prev[activeSessionId];
        if (!session?.reportData) return prev;
        return {
          ...prev,
          [activeSessionId]: {
            ...session,
            reportData: {
              ...session.reportData,
              identity: { ...session.reportData.identity, ...patch },
            },
          },
        };
      });
    },
    [activeSessionId],
  );

  // Info: (20260714 - Tzuhan) 新增對話:建立空白 session 並切換;channel 隨 id 變更,歷史/草稿各自獨立
  // Info: (20260716 - Tzuhan) #52 可選綁定帳本:綁定後報告歸屬帳本(明文模式),不綁為個人會話(E2EE)
  const createNewSession = useCallback(
    (accountBookId?: string) => {
      const id = `s${Date.now().toString(36)}`;
      const session = createChatSession(
        id,
        t("carbon_chatbot.new_session_title"),
        new Date().toLocaleDateString(),
      );
      setSessionsData((prev) => ({ ...prev, [id]: session }));
      switchSession(id);
      if (accountBookId) {
        void bindSessionToBook(id, accountBookId);
      }
    },
    [t, switchSession, bindSessionToBook],
  );

  // Info: (20260714 - Tzuhan) 跳至報告段落並短暫高亮(chip 點擊與草稿寫入後的即時回饋共用)
  const jumpToReportParagraph = useCallback((paragraphId: string) => {
    setActiveParagraphId(paragraphId);
    setHighlightedParagraphId(paragraphId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      highlightTimerRef.current = null;
      setHighlightedParagraphId(null);
    }, CARBON_CHAT_HIGHLIGHT_DURATION_MS);
  }, []);

  // Info: (20260717 - Tzuhan) #56 逐章解析執行器:有限並行(2 workers,兼顧速度與 LLM 限流),
  // Info: (20260717 - Tzuhan) 結果依章節順序合併(決定性),單章失敗記錄後續行;進度以完成數回報
  /**
   * Info: (20260730 - Tzuhan) 兩階段匯入的第一階段:向後端問「33 節各自起始於第幾頁」。
   * 一次呼叫、輸出僅 33 個整數,換來後續 11 章不必各自重送整份文件。
   * 失敗一律回空 Map(後端亦同),第二階段就退回原本的送全文行為——索引是最佳化,不是前提。
   */
  const fetchSectionPageIndex = useCallback(
    async (source: ICarbonImportSource): Promise<Map<string, number>> => {
      const formData = new FormData();
      appendImportSource(formData, source);
      formData.append("language", language);
      // Info: (20260813 - Luphia) 計費上下文（設計書 §5.5）：帳本由 channel 推導，冪等鍵防重試重複扣點
      formData.append("channel", chatChannel);
      formData.append("clientMessageId", crypto.randomUUID());
      formData.append("mode", CarbonReportImportModeEnum.INDEX);
      try {
        // Info: (20260807 - Emily) 端點走保活式串流,失敗在信封裡:requestEnvelope 轉回拋出,
        // Info: (20260806 - Tzuhan) 下面既有的 catch(回空 Map、退回送全文)語意因此完全不變
        const payload = await requestEnvelope<{
          index: { paragraphId: string; startPage: number }[];
        }>("/api/v1/chat/carbon/import", { method: "POST", body: formData });
        const index = new Map(
          (payload?.index ?? []).map((entry) => [
            entry.paragraphId,
            entry.startPage,
          ]),
        );
        /**
         * Info: (20260804 - Tzuhan) 索引成功時原本零 log,而它是整條管線**最上游、
         * 唯一非決定性**的輸入 —— 後面每一章送哪幾頁都由它決定。
         * 出事時(表3.8 沒進來、桑基圖消失)完全無從回溯這一輪的索引長什麼樣,
         * 只能猜。決策點沒有痕跡,現場就無法還原。
         */
        const validation = validatePageIndex(
          CARBON_REPORT_OUTLINE.map((section) => ({
            id: section.id,
            startPage: index.get(section.id),
          })),
        );
        console.info("[carbon-chat] page index", {
          resolved: index.size,
          total: CARBON_REPORT_OUTLINE.length,
          /**
           * Info: (20260817 - Emily) 缺了**哪幾節**,不只缺幾節
           * (`data/issue_drafts/open/42_page_slice_falls_back.md`)。
           *
           * 原本只印 `resolved: 21, total: 33` —— 看得到「12 節沒索引」,
           * 看不出是哪 12 節,於是也推不出哪些工作單元會退回送全文。
           * 而退回與否是這一趟成本的分水嶺(實測 14 次有 8 次退回、
           * 每次多花約 41.6k token)。
           */
          missing: CARBON_REPORT_OUTLINE.filter(
            (section) => !index.has(section.id),
          ).map((section) => section.id),
          isValid: validation.isValid,
          reason: validation.reason,
          offending: validation.offending,
        });
        /**
         * Info: (20260804 - Tzuhan) 不合理即整份丟棄,退回送全文。
         * 半可信的索引比沒有索引更危險:沒有索引只是多花 token,
         * 錯的索引會讓內容無聲消失,而且看起來一切正常。
         */
        return validation.isValid ? index : new Map();
      } catch (error) {
        console.error("[carbon-chat] page index failed:", error);
        return new Map();
      }
    },
    [chatChannel, language],
  );

  /**
   * Info: (20260806 - Tzuhan) `notify` 由呼叫端傳入,而不是在這裡呼叫 `setDraftNotice`
   * (issue_drafts/inventory_table_import/06 根因一)。
   *
   * 這個函式會跑好幾分鐘。用不帶 sessionId 的 `setDraftNotice` 等於每次回報進度都問一次
   * 「現在人在哪一房」,於是中途切房後,A 房的進度就一路寫進 B 房。
   * 呼叫端在發起當下就把 sessionId 釘進 `notify`,這裡只管回報,不管人在哪。
   */
  const runImportChapters = useCallback(
    async (
      source: ICarbonImportSource,
      chapters: { id: string; title: string }[],
      extractActivities: boolean,
      pageIndex: Map<string, number> | undefined,
      notify: (notice: IDraftNotice | null) => void,
      /**
       * Info: (20260825 - Luphia) 接續時直接指定要跑的**工作單元**（issue #6713）。
       *
       * 粒度是單元而不是章：`buildImportUnits` 會把節數多的章切成兩份
       *（實測 11 章 → 14 個單元，ch1/ch3/ch9 各兩份），而點數用完時
       * 很可能是「一份做完、另一份撞牆」。以章接續會把做完的那一份再跑一次，
       * 而訊息裡明寫「已完成的部分不會重跑」。
       */
      resumeUnits?: IImportUnit[],
      /**
       * Info: (20260827 - Luphia) 每做完一份就回報一次檢查點（issue #6723）。
       *
       * 先前成果**只在整段跑完之後才落地**：14 份要跑 7～14 分鐘，這段時間內
       * 關掉分頁、切走頁面、或任何一次非暫停的拋錯，已經扣過點的份全部白費，
       * 下次從第 1 份重扣（單次預扣估算約 677 點）。
       *
       * 「暫停」那條路一直是對的，因為它是**正常結束**——迴圈自己跳出來，
       * 後面的落地照跑。壞的是其他每一種中斷方式，而測試全都只走前者。
       */
      onCheckpoint?: (checkpoint: IImportCheckpoint) => void,
    ) => {
      interface IImportChunkPayload {
        segments: {
          paragraphId: string;
          title: string;
          content: string;
          // Info: (20260803 - Tzuhan) 原文照錄的表格。API 一直有回,但這裡漏宣告 →
          // Info: (20260803 - Tzuhan) 逐章合併時被靜默丟棄,Issue A 的表格一張都沒進過報告。
          sourceTables?: ICarbonSourceTable[];
        }[];
        unmapped: string[];
        activities?: IActivityRecord[];
      }
      /**
       * Info: (20260805 - Tzuhan) 把章切成「單次呼叫跑得完」的工作單元。
       * ch1(7 節)、ch3(6 節)、ch9(5 節)會各切成兩份;
       * 節數少的章維持一份,行為與先前相同。
       */
      const units =
        resumeUnits ??
        buildImportUnits(
          CARBON_REPORT_OUTLINE,
          chapters.map((chapter) => chapter.id),
        );
      const results: (IImportChunkPayload | null)[] = new Array(
        units.length,
      ).fill(null);
      /**
       * Info: (20260825 - Luphia) 控制流交給共用驅動器 `runResumableJob`
       *（issue #6712 / #6713）。
       *
       * 它負責三件這裡曾經手寫、而且寫錯粒度的事：撞牆就停掉整趟、
       * 把「還沒做」與「做壞了」分成兩份清單、以**有沒有結果**判斷剩餘
       *（不是「索引之後」——併發下另一條 worker 可能正跑在更前面的索引上）。
       *
       * 先前這裡的 `settledChapterIds` 是以**章**為鍵的正向標記，
       * 於是「一份做完、另一份撞牆」時整章被當成處理過：那一章既不在暫停名單、
       * 也不在失敗名單，而合併出來的內容少了一半的節，沒有任何訊息提過。
       * `failed` 那邊「任一份壞掉就整章列入」是安全的，同樣的手法用在正向標記上
       * 語意剛好翻過來（review #6717 阻擋-1）。
       */
      // Info: (20260827 - Luphia) 第一次撞牆時 402 帶的出路與重置時間（issue #6714）
      let pauseDetail: ICreditPauseDetail | null = null;
      let completedCount = 0;
      /**
       * Info: (20260804 - Tzuhan) 正在跑的章數。只報「已完成 0/11」會讓開頭那段
       * 長時間的 0 看起來像卡死 —— 11 章並行、每章數十秒,完成數本來就會停在 0 很久。
       * 「3 章解析中」說的是同一件事的另一面:沒完成不等於沒在動。
       */
      let inFlightCount = 0;
      const startedAt = Date.now();

      const reportProgress = () => {
        notify({
          type: "loading",
          text: t("carbon_chatbot.import_parsing_chapter", {
            name: source.fileName,
            current: completedCount,
            total: units.length,
            inFlight: inFlightCount,
          }),
          startedAt,
        });
      };
      reportProgress();

      /**
       * Info: (20260825 - Luphia) 章的顯示資訊。接續時 `chapters` 只帶要重跑的那幾章，
       * 而單元可能屬於別章，因此一律回退到大綱的章名——回一個 id 當標題
       * 會讓使用者在清單裡看到 `ch3` 這種東西。
       */
      const resolveChapterOf = (chapterId: string) =>
        chapters.find((item) => item.id === chapterId) ??
        CARBON_REPORT_CHAPTERS.find((item) => item.id === chapterId) ?? {
          id: chapterId,
          title: chapterId,
        };

      /**
       * Info: (20260827 - Luphia) 目前為止的成果（issue #6723）。
       *
       * 剩餘是以**有沒有結果**算的，與驅動器同一個判準——正在跑的那一份還沒有
       * 結果，因此會被算進剩餘。那是安全的方向：下一次檢查點就會把它補上，
       * 而反過來（樂觀地算成做完）會讓一份真的沒做的內容永久消失。
       */
      const buildCheckpoint = (): IImportCheckpoint => {
        const folded = foldImportChunks(results);
        const notSettled = units.filter(
          (_unit, index) => results[index] === null,
        );
        const { pausedUnits, pausedChapters } = summarisePausedUnits({
          remainingUnits: notSettled,
          // Info: (20260827 - Luphia) 跑到一半還不知道哪些是真的壞掉，一律算剩餘
          failedChapterIds: [],
          resolveTitle: (chapterId) => resolveChapterOf(chapterId).title,
        });
        return {
          ...folded,
          remainingUnits: pausedUnits,
          pausedChapters,
          totalUnits: units.length,
        };
      };

      /**
       * Info: (20260825 - Luphia) 單一工作單元的送出（驅動器逐步呼叫）。
       *
       * 「暫停就停掉整趟」「剩餘怎麼算」都由驅動器負責，這裡只管做一件事：
       * 把這一份送出去、把結果放進 `results[index]`。
       */
      const runUnit = async (unit: IImportUnit, index: number) => {
        const chapter = resolveChapterOf(unit.chapterId);
        inFlightCount += 1;
        reportProgress();
        const formData = new FormData();
        appendImportSource(formData, source);
        formData.append("language", language);
        // Info: (20260813 - Luphia) 計費上下文（設計書 §5.5）：帳本由 channel 推導，冪等鍵防重試重複扣點
        formData.append("channel", chatChannel);
        formData.append("clientMessageId", crypto.randomUUID());
        formData.append("chapterId", chapter.id);
        // Info: (20260730 - Tzuhan) 活動數據只在「排放章」那次呼叫萃取(避免 11 章重複入帳)。
        // Info: (20260730 - Tzuhan) 原本掛在 index === 0 也就是第一章「組織與治理概況」,但用電量、油耗
        // Info: (20260730 - Tzuhan) 這些活動數據在第三章;而該次呼叫的範圍規則又明寫「與範圍無關的內容一律忽略」,
        // Info: (20260730 - Tzuhan) 兩條指令互相拉扯 → 活動數據抽不到 → computedLedger 空 → 所有數據圖表都畫不出來。
        formData.append(
          "extractActivities",
          extractActivities && chapter.id === CARBON_EVIDENCE_CHAPTER_ID
            ? "true"
            : "false",
        );
        /**
         * Info: (20260805 - Tzuhan) 只處理本單元的節。省略即整章(節數少的章仍是一份)。
         * 帶了就必須合法,伺服端會白名單複驗 —— 靜默忽略等於整章重跑卻沒人知道。
         */
        if (unit.partTotal > 1) {
          formData.append("sectionIds", JSON.stringify(unit.sectionIds));
        }
        // Info: (20260730 - Tzuhan) 該單元各節的起始頁 → 頁碼範圍;缺任何一節的索引就不帶範圍(退回送全文),
        // Info: (20260730 - Tzuhan) 寧可多花 token,也不能因為索引不全而漏送內容
        const unitPages = unit.sectionIds.map((id) => pageIndex?.get(id));
        /**
         * Info: (20260807 - Emily) 上界取本單元最後一節在**大綱**裡的下一節
         * (PR review 第 1 點;原本取 `units[index + 1]`)。
         *
         * 匯入單元是由使用者勾選的章建出來的,所以 `units[index + 1]`
         * 在勾選不連續時會指到很遠的地方:只重試 ch1 與 ch9 時,
         * ch1 的上界會變成 ch9 的起始頁 —— 等於整份文件都送進去。
         * 那條路不會報錯,只會變慢並可能再次撞逾時,
         * 而「重試失敗章節」正是最容易不連續勾選的路徑。
         *
         * 改用大綱推導仍然保留原本的用意:同章切成多份時,
         * 上一份最後一節的下一節就是下一份的第一節。
         */
        const lastSectionId = unit.sectionIds[unit.sectionIds.length - 1];
        const boundarySectionId = nextOutlineSectionId(
          CARBON_REPORT_OUTLINE,
          lastSectionId,
        );
        const range = resolveUnitPageRange({
          sectionPages: unitPages,
          nextUnitFirstPage: boundarySectionId
            ? pageIndex?.get(boundarySectionId)
            : undefined,
        });
        // Info: (20260804 - Tzuhan) 每次實際送出的範圍要留痕跡:少一張表時才查得出是被誰切掉的
        console.info("[carbon-chat] chapter slice", {
          chapterId: chapter.id,
          part: `${unit.partIndex}/${unit.partTotal}`,
          sections: unit.sectionIds,
          sectionsMissingIndex: unit.sectionIds.filter(
            (id) => !pageIndex?.get(id),
          ),
          fromPage: range?.fromPage ?? "(full text)",
          /**
           * Info: (20260817 - Emily) `"(to end)"` 現在是實話了。
           *
           * 08-17 之前伺服端要求上下界皆非 null 才切片,只有下界時整份送 ——
           * 那時這個字面是假的,而實測 14 次呼叫有 7 次走這條(`open/42`)。
           * Fix 1 之後「只有下界」會真的切到文末,字面與行為一致。
           */
          toPage: range ? (range.toPage ?? "(to end)") : "(full text)",
        });
        if (range) {
          formData.append("fromPage", String(range.fromPage));
          if (range.toPage !== undefined) {
            formData.append("toPage", String(range.toPage));
          }
        }
        try {
          // Info: (20260806 - Tzuhan) 信封裡的失敗轉回拋出:驅動器據此分類(暫停/失敗)
          results[index] = await requestEnvelope<IImportChunkPayload>(
            "/api/v1/chat/carbon/import",
            { method: "POST", body: formData },
          );
        } finally {
          /**
           * Info: (20260825 - Luphia) 進度一定要放行（成功、失敗、暫停都算走過一步）：
           * 放在 finally 而不是各分支各寫一次，漏掉任何一條都會讓
           * 「N 章解析中」的數字永遠減不回來。
           */
          completedCount += 1;
          inFlightCount -= 1;
          reportProgress();
          /**
           * Info: (20260827 - Luphia) 落地也在 finally（issue #6723）：
           * 失敗與暫停同樣改變了「還剩哪些」，只在成功時存會讓剩餘清單
           * 落後於事實。呼叫端負責不阻斷主流程。
           */
          onCheckpoint?.(buildCheckpoint());
        }
      };

      /**
       * Info: (20260825 - Luphia) 併發度 2：11 章耗時約減半，仍留限流餘裕
       *（LLM bucket 12/min）。停手與剩餘的判斷由驅動器負責（見上方說明）。
       */
      const outcome = await runResumableJob<IImportUnit, void>({
        steps: units,
        runStep: runUnit,
        /**
         * Info: (20260825 - Luphia) 「做不了」與「做壞了」的分界只有這一句
         *（issue #6713）：點數用完是前者——那一份一步都沒跑、一點都沒扣。
         */
        classify: (error) => {
          const pauseReason = resolveCreditPauseReason(error);
          if (pauseReason !== null) {
            /**
             * Info: (20260827 - Luphia) 順手把「接下來能做什麼」留下來
             *（issue #6714）。伺服器的 402 早就算好了出路與重置時間，
             * 而這裡是這一趟裡**唯一**碰得到那個回應的地方——不在這裡取，
             * 之後就再也拿不到了（驅動器只傳遞分類結果，不傳遞錯誤本身）。
             *
             * 第一次撞牆的那份留著就好：後面每一份都被同一面牆擋下，
             * 內容一樣，而覆寫會讓 resetAt 一直往後跳幾毫秒。
             */
            if (pauseDetail === null) {
              pauseDetail = extractCreditPauseDetail(error);
            }
            return { kind: STEP_OUTCOME.PAUSE, reason: pauseReason };
          }
          return { kind: STEP_OUTCOME.FAIL };
        },
        concurrency: 2,
      });

      const pausedBy = outcome.pausedBy;
      /**
       * Info: (20260805 - Tzuhan) 以章去重:同一章切成多份時可能失敗兩次,
       * 而重試的粒度是章 —— 列兩次會讓使用者以為有兩章壞掉。
       * 重試整章比重試單一份安全:份與份之間的邊界本來就有重疊。
       */
      const failed: { id: string; title: string }[] = [];
      outcome.failed.forEach((unit) => {
        if (failed.some((item) => item.id === unit.chapterId)) return;
        failed.push(resolveChapterOf(unit.chapterId));
      });
      outcome.failed.forEach((unit) => {
        console.error(
          "[carbon-chat] import chapter failed:",
          unit.chapterId,
          `part ${unit.partIndex}/${unit.partTotal}`,
        );
      });
      if (pausedBy) {
        console.info(
          "[carbon-chat] import paused by credits:",
          pausedBy,
          `remaining units: ${outcome.remaining.length}`,
        );
      }

      const folded = foldImportChunks(results);

      /**
       * Info: (20260825 - Luphia) 「還沒做」的**工作單元**——粒度是份，不是章
       *（review #6717 阻擋-1）。
       *
       * 驅動器以「有沒有結果」判斷剩餘，因此「一份做完、另一份撞牆」的章
       * 會有一份留在這裡。先前這裡以章為單位、且用正向標記，
       * 那種章會被整個排除——內容少一半而沒有任何訊息提過。
       *
       * 已經在 `failed` 的章要排除：同一章同時出現在「解析失敗」與
       * 「還沒開始解析」兩句話裡是自相矛盾的，而使用者無從判斷該信哪一句。
       * 失敗優先（它有重試入口，且那條路會把整章重跑）。
       */
      const { pausedUnits: remainingUnits, pausedChapters } =
        summarisePausedUnits({
          remainingUnits: outcome.remaining,
          failedChapterIds: failed.map((chapter) => chapter.id),
          resolveTitle: (chapterId) => resolveChapterOf(chapterId).title,
        });

      return {
        segments: folded.segments,
        unmapped: folded.unmapped,
        activities: folded.activities,
        failed,
        pausedBy,
        // Info: (20260827 - Luphia) 暫停時「接下來能做什麼」（issue #6714）
        pauseDetail,
        // Info: (20260825 - Luphia) 接續用（份粒度）與顯示用（章）各一份
        remainingUnits,
        pausedChapters,
        // Info: (20260825 - Luphia) 書籤的分母：這一趟總共有幾份
        totalUnits: units.length,
      };
    },
    // Info: (20260806 - Tzuhan) 進度回報改由呼叫端注入 notify,此處不再依賴 setDraftNotice
    [chatChannel, language, t],
  );

  // Info: (20260727 - Tzuhan) #57 草稿補齊執行器:對「原樣匯入後仍空白」的段落,依同一份上傳文件請 LLM 撰寫草稿。
  // Info: (20260727 - Tzuhan) 依章分批(沿用逐章模式的 output 上限考量),依序執行;單批失敗記錄後續行(補齊為 best-effort,不阻斷預覽)
  // Info: (20260806 - Tzuhan) notify 由呼叫端注入(理由同 runImportChapters:補齊也跑在匯入的長流程裡)
  const runGapFillSections = useCallback(
    async (
      source: ICarbonImportSource,
      missingSectionIds: string[],
      fileName: string,
      notify: (notice: IDraftNotice | null) => void,
    ): Promise<{ paragraphId: string; title: string; content: string }[]> => {
      const missingSet = new Set(missingSectionIds);
      const batches = CARBON_REPORT_CHAPTERS.map((chapter) =>
        CARBON_REPORT_OUTLINE.filter(
          (section) =>
            section.chapterId === chapter.id && missingSet.has(section.id),
        ).map((section) => section.id),
      ).filter((ids) => ids.length > 0);

      const drafted: {
        paragraphId: string;
        title: string;
        content: string;
      }[] = [];
      for (let index = 0; index < batches.length; index++) {
        notify({
          type: "loading",
          text: t("carbon_chatbot.import_drafting_sections", {
            name: fileName,
            current: index + 1,
            total: batches.length,
          }),
        });
        const formData = new FormData();
        appendImportSource(formData, source);
        formData.append("language", language);
        // Info: (20260813 - Luphia) 計費上下文（設計書 §5.5）：帳本由 channel 推導，冪等鍵防重試重複扣點
        formData.append("channel", chatChannel);
        formData.append("clientMessageId", crypto.randomUUID());
        formData.append("mode", CarbonReportImportModeEnum.DRAFT);
        formData.append("sectionIds", JSON.stringify(batches[index]));
        try {
          // Info: (20260727 - Tzuhan) 循序呼叫(非並行):草稿補齊在匯入 11 章之後,保留 LLM 限流餘裕
          // Info: (20260806 - Tzuhan) 信封裡的失敗轉回拋出:下面的 catch(記 log、不阻斷預覽)照舊
          const gapPayload = await requestEnvelope<{
            segments: {
              paragraphId: string;
              title: string;
              content: string;
            }[];
          }>("/api/v1/chat/carbon/import", { method: "POST", body: formData });
          drafted.push(...(gapPayload?.segments ?? []));
        } catch (gapError) {
          console.error(
            "[carbon-chat] gap-fill batch failed:",
            batches[index],
            gapError,
          );
        }
      }
      return drafted;
    },
    // Info: (20260806 - Tzuhan) 同上:進度回報由呼叫端注入
    [chatChannel, language, t],
  );

  /**
   * Info: (20260806 - Tzuhan) 把待匯入結果寫進 DB(E2EE,與報告草稿同一套封裝)。
   *
   * 解析一份 64 頁報告要跑十幾次 LLM、好幾分鐘,而結果原本只在 React state ——
   * 重整、切帳號或瀏覽器當掉,那幾分鐘連同 LLM 額度一起蒸發,
   * 而使用者唯一能做的是重新上傳再等一次(實測回報)。
   *
   * 連 `source.cid` 與 `pageIndex` 一起存:少了它們,重載後「重試失敗章節」
   * 與「補章」都沒有素材可用 —— 待匯入的內容看得到卻補不齊,比沒存更難理解。
   *
   * 失敗只記 log 不阻斷:記憶體裡的預覽仍然可用,而把「雲端保存失敗」
   * 變成「解析結果消失」是把小問題升級成大問題。
   */
  const persistPendingImport = useCallback(
    async (
      sessionId: string,
      pending: IPendingImport,
      source: ICarbonImportSource | null,
      activities: IActivityRecord[],
      pageIndex: Map<string, number> | undefined,
    ): Promise<void> => {
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        sessionId,
      );
      const bookId = sessionAccess[channel]?.accountBookId ?? null;
      const master = masterKeyRef.current;
      /**
       * Info: (20260806 - Tzuhan) 個人會話沒有金鑰就無從加密 —— 不送空密文,只留在記憶體。
       * 這條路實際上很難走到(匯入需先解鎖),但「沒有金鑰時靜靜地不加密就存」
       * 會是這個模組最嚴重的一種 bug,所以擋在這裡。
       */
      if (!bookId && !master) {
        console.warn(
          "[carbon-chat] pending import not persisted: no master key",
          sessionId,
        );
        return;
      }
      const run = async (): Promise<void> => {
        try {
          const version = pendingImportVersionsRef.current.get(channel) ?? 0;
          /**
           * Info: (20260828 - Julian) 形狀抽成純函式（`buildPendingImportRecord`）。
           *
           * 原本這裡是一個逐欄位手寫的物件字面量，而它漏掉了 #6713 加的三個
           * 斷點欄位 —— 存出去的紀錄因此在重載後失去「哪幾章還沒跑」，
           * 接續按鈕整個消失。抽出去是為了那件事測得到（純函式、不碰時鐘）。
           */
          const nextVersion = await putPendingImportRecord(
            channel,
            master,
            buildPendingImportRecord({
              pending,
              source,
              activities,
              pageIndex,
              savedAt: new Date().toISOString(),
            }),
            version,
            bookId,
          );
          pendingImportVersionsRef.current.set(channel, nextVersion);
        } catch (error) {
          console.error(
            "[carbon-chat] failed to persist pending import:",
            error,
          );
        }
      };

      /**
       * Info: (20260807 - Emily) 接到同一 channel 的佇列尾端。
       * previous 已經 catch 過,不會因為前一次失敗而讓整條鏈斷掉。
       */
      const previous =
        persistPendingQueueRef.current.get(channel) ?? Promise.resolve();
      const task = previous.then(run);
      persistPendingQueueRef.current.set(channel, task);
      await task;
    },
    [user?.address, sessionAccess],
  );

  /**
   * Info: (20260806 - Tzuhan) 清除待匯入紀錄(套用或捨棄後)。
   * 版本歸零:下一份解析結果是首存。
   */
  const clearPersistedPendingImport = useCallback(
    async (sessionId: string): Promise<void> => {
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        sessionId,
      );
      try {
        await deletePendingImportRecord(channel);
        pendingImportVersionsRef.current.set(channel, 0);
      } catch (error) {
        console.error("[carbon-chat] failed to clear pending import:", error);
      }
    },
    [user?.address],
  );

  /**
   * Info: (20260806 - Tzuhan) 在聊天室留下一則「解析完成、尚未匯入」的訊息並入庫。
   *
   * 與匯入摘要是兩則不同的訊息:這一則說的是「還沒寫進報告,你決定」。
   * 只送事實,文案由伺服端組出 —— 入庫的是系統的陳述,不由前端塞字串。
   *
   * 沒有金鑰時不發請求:聊天訊息一律 E2EE,而缺金鑰的請求必定失敗
   * (先前那個 500 就是拿 `0x…` 位址當 xpub 加密炸開的)。
   */
  /**
   * Info: (20260825 - Luphia) 把斷點寫進伺服器的**書籤**（issue #6712）。
   *
   * 與 `persistPendingImport` 是兩件事，兩者都要：
   *
   * - 待匯入結果（那支）存的是**內容**，個人會話是端到端加密的，
   *   而它只有這個聊天室看得到。
   * - 書籤（這支）存的是**步驟 id 與計數**，伺服器讀得懂，因此掃描行程
   *   才能在額度回來時把任務翻成「可以繼續」，而不必解開任何內容。
   *
   * 失敗不阻斷主流程：書籤是輔助（畫面上的暫停清單來自待匯入結果），
   * 掉了最多是「晚點才被通知可以繼續」。但**不靜默**——沒有它就等於
   * 那個使用者永遠不會被自動通知，而那件事查不出來。
   */
  /**
   * Info: (20260901 - Luphia) 書籤 PUT 走 per-channel 佇列（review #6726 中-1）。
   *
   * 驅動器 `concurrency = 2`，而檢查點在每一份的 `finally` 都寫一次書籤
   *（`pauseReason: null` → 伺服器記 RUNNING）；暫停的收尾另外寫一次
   *（`PAUSED`）。沒有佇列時這是**兩個沒有排序保證的 PUT**——檢查點那筆
   * 後到的話，書籤停在 RUNNING：`scanResumableJobs` 只掃 PAUSED，這一筆
   * **永遠翻不成 RESUMABLE**（「額度回來自動翻牌」對它失效），而且租約
   * 未過期前使用者自己按「接著匯入」只會拿到 BUSY。
   *
   * 佇列與 `persistPendingImport` 的同一套（呼叫順序＝落地順序）：收尾在
   * 迴圈結束後才呼叫，必然排在所有檢查點之後，於是 PAUSED 一定最後落地。
   * 用**自己的**佇列而不是共用 `persistPendingQueueRef`：兩者的失敗互不
   * 相干，串在一起只是讓書籤等內容加密（每次數百 ms）陪跑。
   */
  const bookmarkQueueRef = useRef<Map<string, Promise<void>>>(new Map());

  const saveImportJobBookmark = useCallback(
    async (params: {
      pauseReason: string | null;
      totalUnits: number;
      completedUnits: number;
      failedUnits: number;
      remainingUnits: IImportUnit[];
      nextStepInputChars?: number;
    }): Promise<void> => {
      const run = async () => {
        try {
          await request("/api/v1/user/job/bookmark", {
            method: HTTP_METHOD.PUT,
            body: JSON.stringify({
              type: JOB_TYPE.CARBON_REPORT_IMPORT,
              resourceKey: chatChannel,
              pauseReason: params.pauseReason,
              totalSteps: params.totalUnits,
              completedSteps: params.completedUnits,
              failedSteps: params.failedUnits,
              /**
               * Info: (20260825 - Luphia) 步驟 id 是「章#第幾份」——粒度必須是份。
               * 存章 id 就會把「一份做完、另一份撞牆」那個缺陷寫進資料庫
               *（review #6717 阻擋-1）。
               */
              remainingStepIds: params.remainingUnits.map(
                (unit) => `${unit.chapterId}#${unit.partIndex}`,
              ),
              nextStepInputChars: params.nextStepInputChars,
            }),
          });
        } catch (error) {
          console.error("[carbon-chat] job bookmark failed:", error);
        }
      };

      // Info: (20260901 - Luphia) 接到同一 channel 的佇列尾端；previous 已 catch 過，鏈不會斷（機制同 persistPendingImport）
      const previous =
        bookmarkQueueRef.current.get(chatChannel) ?? Promise.resolve();
      const task = previous.then(run);
      bookmarkQueueRef.current.set(chatChannel, task);
      await task;
    },
    [chatChannel],
  );

  /**
   * Info: (20260827 - Luphia) 換一把執行許可（issue #6721）。
   *
   * 要防的事：同一個帳號開兩個分頁（很常見——第一個看起來卡住了才開第二個），
   * 補點數之後兩邊都跳出「可以繼續」，兩邊都按下去 → 同一批份送兩次 →
   * **點數扣兩次**（一份 2MB 的 PDF 單次預扣估算約 677 點）。
   *
   * Info: (20260901 - Luphia) 回**判決**而不是布林（review #6726 阻-1）。
   *
   * 舊版註解說「回 false 只有一種意思」——那句話讓 catch 把
   * `TW_JOB_CANCELLED`／`TW_JOB_ALREADY_COMPLETED`／403 全部當成
   * 「鎖自己壞掉」放行：伺服器明確說「不要跑」的判決被吞掉，剩下那幾份
   * 照送、**點數照扣**——高-1 只修了伺服器那一半，這裡是另一半。
   * 判斷本體在 `resolveJobClaimDenial`（純函式，有自己的單元測試）；
   * 只有它回 `null`（網路斷、伺服器自己壞掉）才放行——這把鎖是為了省錢，
   * 不是為了在它自己壞掉的時候把功能一起關掉。那個取捨的代價是「鎖掛掉時
   * 可能重複扣一次」，而反過來的代價是「鎖掛掉時誰都不能匯入」，後者更糟。
   */
  const claimImportJob = useCallback(
    async (intent: JobClaimIntent): Promise<JobClaimDenial | null> => {
      try {
        await request("/api/v1/user/job/claim", {
          method: HTTP_METHOD.POST,
          body: JSON.stringify({
            type: JOB_TYPE.CARBON_REPORT_IMPORT,
            resourceKey: chatChannel,
            intent,
          }),
        });
        return null;
      } catch (error) {
        const denial = resolveJobClaimDenial(error);
        if (denial) return denial;
        console.error("[carbon-chat] job claim failed, proceeding:", error);
        return null;
      }
    },
    [chatChannel],
  );

  /**
   * Info: (20260827 - Luphia) 伺服器眼中的這份匯入（issue #6714）。
   *
   * 畫面在此之前只讀得到客戶端自己那份暫存，於是有兩件事說不出來：
   *
   * 1. **「額度已經回來了」**。掃描行程（每 5 分鐘）會把暫停中而且現在夠了的任務
   *    翻成 RESUMABLE——那是一個明確的時點，而畫面不讀它的話，那次改動對使用者
   *    完全是隱形的：他看到的還是「點數已用完」，得自己按下去試才知道。
   * 2. **任務 id**。取消需要它，而客戶端手上只有頻道。
   *
   * 只挑屬於**當前聊天室**的那一筆：`GET /user/job` 回的是這個人所有未完成的
   * 任務，而別的聊天室那幾筆在這張卡上沒有意義（那需要另一個入口，見設計書 §9）。
   */
  const [importJob, setImportJob] = useState<IJobView | null>(null);

  const refreshImportJob = useCallback(async () => {
    try {
      const res = await request<{ payload: { jobs: IJobView[] } | null }>(
        "/api/v1/user/job",
      );
      const jobs = res?.payload?.jobs ?? [];
      setImportJob(
        jobs.find(
          (job) =>
            job.resourceKey === chatChannel &&
            job.type === JOB_TYPE.CARBON_REPORT_IMPORT,
        ) ?? null,
      );
    } catch (error) {
      /**
       * Info: (20260827 - Luphia) 失敗不阻斷任何事：這一支只讓畫面多說一句話，
       * 而暫停清單、「接著匯入」按鈕、以及接續本身都不依賴它。
       */
      console.error("[carbon-chat] refresh job failed:", error);
    }
  }, [chatChannel]);

  /**
   * Info: (20260827 - Luphia) 進到這個聊天室就問一次伺服器（issue #6714）。
   *
   * 這是「換裝置之後看得到狀態」的那一半：內容由加密暫存帶過來，而**狀態**
   * （是不是已經可以繼續了）只有伺服器知道。
   */
  useEffect(() => {
    void refreshImportJob();
  }, [refreshImportJob]);

  /**
   * Info: (20260827 - Luphia) 放棄還沒做的那幾份（issue #6714）。
   *
   * **只放棄未完成的部分**：已經解析完的內容留著（那是已經付過錢的東西），
   * 使用者仍然可以套用它。在此之前 `cancelJob()` 是一個沒有路由的 export，
   * 也就是說一份不想做完的匯入會一直掛著，而那顆「接著匯入」會一直邀請他花錢。
   */
  const cancelImportJob = useCallback(async () => {
    const jobId = importJob?.id;
    if (!jobId || !pendingImport) return;
    try {
      await request(`/api/v1/user/job/${jobId}/cancel`, {
        method: HTTP_METHOD.POST,
      });
    } catch (error) {
      console.error("[carbon-chat] cancel job failed:", error);
      setDraftNotice(
        { type: "error", text: t("carbon_chatbot.import_cancel_failed") },
        activeSessionId,
      );
      dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS, activeSessionId);
      return;
    }
    /**
     * Info: (20260827 - Luphia) 清掉暫停狀態，**保留 items**：那些章已經解析完、
     * 也已經扣過點。連內容一起清掉才是真的造成損失。
     */
    const cleared: IPendingImport = {
      ...pendingImport,
      pausedChapters: [],
      pausedUnits: [],
      pauseReason: null,
      pauseDetail: null,
    };
    setPendingImportFor(activeSessionId, cleared);
    void persistPendingImport(
      activeSessionId,
      cleared,
      lastImportSourceRef.current,
      importActivitiesRef.current,
      lastPageIndexRef.current,
    );
    setImportJob(null);
    /**
     * Info: (20260828 - Luphia) 告訴其他分頁「這個任務不做了」（review #6726 高-1）。
     *
     * 那顆「接著匯入」在別的分頁上是用客戶端狀態判斷要不要顯示的——沒有這則
     * 廣播，它會一直留在那裡邀請使用者去花他剛剛才說不要花的點數。
     * 帶上 `resourceKey`：不帶的話，這個聊天室的取消會把別的聊天室的暫停
     * 清單一起清掉。
     */
    publishCreditEvent({
      type: CREDIT_EVENT.JOB_CANCELLED,
      resourceKey: chatChannel,
    });
    setDraftNotice(
      { type: "info", text: t("carbon_chatbot.import_cancelled") },
      activeSessionId,
    );
    dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS, activeSessionId);
  }, [
    importJob,
    pendingImport,
    activeSessionId,
    // Info: (20260828 - Luphia) 取消的廣播要帶這一間聊天室的 resourceKey
    chatChannel,
    setPendingImportFor,
    persistPendingImport,
    setDraftNotice,
    dismissDraftNoticeAfter,
    t,
  ]);

  const postImportParsedNotice = useCallback(
    async (sessionId: string, pending: IPendingImport): Promise<void> => {
      const recipientPublicKey = masterKeyRef.current?.extendedPublicKey;
      if (!recipientPublicKey) {
        console.warn(
          "[carbon-chat] parsed notice skipped: no master key",
          sessionId,
        );
        return;
      }
      try {
        await request("/api/v1/chat/carbon/import/notice", {
          method: "POST",
          body: JSON.stringify({
            kind: CarbonImportNoticeKindEnum.PARSED,
            channel: buildCarbonChatChannel(
              user?.address ?? "anonymous",
              sessionId,
            ),
            recipientPublicKey,
            fileName: pending.fileName,
            pendingCount: pending.items.filter((item) => !item.isDraft).length,
            draftedCount: pending.items.filter((item) => item.isDraft).length,
            activityCount: pending.activityCount,
            failedChapters: (pending.failedChapters ?? []).map(
              (chapter) => chapter.title,
            ),
            /**
             * Info: (20260825 - Luphia) 點數用完而未解析的章（issue #6713）。
             * 與 failedChapters 分開送：對話裡是兩句話，
             * 一句說「試過壞了」，一句說「還沒試、去補點數」。
             */
            pausedChapters: (pending.pausedChapters ?? []).map(
              (chapter) => chapter.title,
            ),
            language,
          }),
        });
      } catch (error) {
        // Info: (20260806 - Tzuhan) 訊息送失敗不影響解析結果(已入庫),但不可靜默
        console.error("[carbon-chat] parsed notice failed:", error);
      }
    },
    [user?.address, language],
  );

  // Info: (20260716 - Tzuhan) #56 上傳整份報告 → 匯入預覽(不直接寫入;查核重置與數字重勾稽於確認時執行)
  const importReportFile = useCallback(
    async (file: File) => {
      /**
       * Info: (20260804 - Tzuhan) 同一時間只跑一份匯入。
       *
       * 實測情境:切房回來看不出還在不在跑,於是重新上傳 —— 那個判斷在當下沒有錯,
       * 是介面沒給依據。但兩份匯入同時跑會各自燒 11 章的 LLM 額度、互相搶限流,
       * 兩邊都變慢甚至一起失敗,而且先完成的那份會被後完成的覆蓋。
       *
       * 擋下來並說出正在跑的是哪一個檔,比預設「使用者知道自己在做什麼」安全 ——
       * 使用者不知道,因為畫面本來就沒說。
       */
      if (importInFlightRef.current) {
        setDraftNotice({
          type: "info",
          text: t("carbon_chatbot.import_already_running", {
            name: importInFlightRef.current,
          }),
        });
        // Info: (20260811 - Emily) 同上(#6624)
        dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS);
        return;
      }
      importInFlightRef.current = file.name;
      setImportRunning(true);
      /**
       * Info: (20260803 - Tzuhan) 釘住發起匯入的會話(階段二)。
       * 匯入會跑好幾分鐘且不因切房而停 —— 沿用「當前會話」的話,中途切房後
       * 進度提示會落到新房,預覽卡也會出現在錯的房間。
       */
      const originSessionId = activeSessionId;
      const notify = (notice: IDraftNotice | null) =>
        setDraftNotice(notice, originSessionId);
      /**
       * Info: (20260826 - Luphia) 逐章匯入需要**已綁定帳本**（review #6717 二輪第 2 條）。
       *
       * 未綁帳本的會話走的是個人點數：每一次呼叫都先回 402 帶一張待付訂單，
       * 付掉之後以同一把鍵重送才會放行（見 `handleSendMessage`）。聊天與草稿
       * 各只有一次呼叫，那條路可行；而逐章匯入是 **14 次**呼叫——那會變成
       * 14 筆訂單與 14 次簽章，那不是任何人設計過的流程。
       *
       * 在此之前這條路的實際行為是：第一章就 402 → 暫停 →「點數已用完」→
       * 按「接著匯入」再撞一次 → **永久死路**，而訊息說的原因也是錯的
       *（不是點數用完，是這個會話沒有帳本可扣）。修正後在**送出之前**就說清楚，
       * 一次呼叫都不發、一毛都不花——連附件上傳都不做。
       *
       * 小檔的單發匯入不受限：那條路只有一次呼叫，因此走「付掉待付訂單再重送」
       * 那條既有流程（與聊天、草稿同一套；20260826 補上，先前這裡的註解聲稱
       * 它已經存在——那是錯的）。
       */
      const willChunk =
        file.type === PDF_MIME_TYPE ||
        file.size >= CARBON_IMPORT_SINGLE_CALL_MAX_BYTES;
      if (willChunk && !sessionAccess[chatChannel]?.accountBookId) {
        notify({
          type: "error",
          text: t("carbon_chatbot.import_requires_book"),
        });
        dismissDraftNoticeAfter(
          CARBON_DRAFT_NOTICE_DISMISS_MS,
          originSessionId,
        );
        importInFlightRef.current = null;
        setImportRunning(false);
        return;
      }

      /**
       * Info: (20260827 - Luphia) 先換一把執行許可（issue #6721）。
       *
       * 位置刻意在**附件上傳之前**：擋下來的時候一個 byte 都不該傳、一毛都不該花。
       * 兩個分頁各自從第一份開始匯入同一個聊天室的話，兩份帳都要付。
       */
      /**
       * Info: (20260901 - Luphia) 判決逐字上畫面（review #6726 阻-1）：
       * 新開時伺服器對「已取消／已完成」回的是放行（重新匯入本來就會覆寫
       * 舊書籤），所以這裡實際會出現的判決是 BUSY 或 FORBIDDEN——
       * 但處置統一走查表，將來 service 改判也不會落回吞掉。
       */
      const startDenial = await claimImportJob(JOB_CLAIM_INTENT.START);
      if (startDenial) {
        notify({
          type: "error",
          // Info: (20260901 - Luphia) minutes 綁 TTL 常數：租期改了文案跟著對（中-2）
          text: t(JOB_CLAIM_DENIAL_TEXT_KEY[startDenial], {
            minutes: JOB_CLAIM_TTL_MS / 60_000,
          }),
        });
        dismissDraftNoticeAfter(
          CARBON_DRAFT_NOTICE_DISMISS_MS,
          originSessionId,
        );
        importInFlightRef.current = null;
        setImportRunning(false);
        return;
      }

      /**
       * Info: (20260806 - Tzuhan) 先把檔案存進 Laria 拿 cid,之後每次呼叫只帶 cid。
       *
       * 一份 64 頁報告要 1 次索引 + 11 章 + 補章共十幾次 `/import`,原本每一次都重送整份 PDF。
       * 走的是附件那條既有的安全管線(magic bytes → 掃毒 → 配額 → 分片),
       * 所以匯入檔第一次也真的被掃過 —— 原本匯入路徑只驗 magic bytes,沒有掃毒。
       *
       * 上傳失敗不中止匯入:退回直傳 File(cid 為 null)。
       * 代價是重載後不能重試失敗章節,但那比「整份報告匯不進來」輕。
       */
      notify({
        type: "loading",
        text: t("carbon_chatbot.import_uploading", { name: file.name }),
      });

      let importCid: string | null = null;
      try {
        const uploadForm = new FormData();
        uploadForm.append("file", file);
        const uploaded = await request<{ payload: { cid: string } | null }>(
          "/api/v1/chat/carbon/attachment",
          { method: "POST", body: uploadForm },
        );
        importCid = uploaded.payload?.cid ?? null;
      } catch (uploadError) {
        // Info: (20260806 - Tzuhan) 記下真正原因(型別/掃毒/配額都在錯誤碼裡),但不擋匯入
        console.error("[carbon-chat] import upload failed:", uploadError);
      }
      const importSource: ICarbonImportSource = {
        cid: importCid,
        fileName: file.name,
        mimeType: file.type,
        // Info: (20260806 - Tzuhan) 有 cid 就不再留 File 參考,讓瀏覽器早點回收大檔
        file: importCid ? null : file,
      };
      lastImportSourceRef.current = importSource;
      // Info: (20260716 - Tzuhan) 逐章解析(UAT:整份真實報告單次呼叫受 output token 上限,只回少數段落):
      // Info: (20260717 - Tzuhan) pdf 或大檔逐章(11 章,並行度 2);小型文字檔單發
      // Info: (20260730 - Tzuhan) PDF 一律逐章(頁數與內容量無法由大小推斷);純文字小檔才單發
      const useChunked =
        file.type === PDF_MIME_TYPE ||
        file.size >= CARBON_IMPORT_SINGLE_CALL_MAX_BYTES;

      const chapters = useChunked
        ? CARBON_REPORT_CHAPTERS.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
          }))
        : [];

      try {
        let payload: {
          segments: { paragraphId: string; title: string; content: string }[];
          unmapped: string[];
          activities: IActivityRecord[];
        };
        let failedChapters: { id: string; title: string }[] = [];
        // Info: (20260825 - Luphia) 點數用完而還沒做的章（issue #6713）；與 failed 分開
        let pausedChapters: { id: string; title: string }[] = [];
        /**
         * Info: (20260825 - Luphia) 接續要用的**工作單元**（份粒度，review #6717 阻擋-1）：
         * 一章可能被切成兩份，而只有沒跑完的那一份需要重跑。
         */
        let pausedUnits: IImportUnit[] = [];
        let pauseReason: JobPauseReason | null = null;
        // Info: (20260827 - Luphia) 暫停時「接下來能做什麼」（issue #6714）
        let pauseDetail: ICreditPauseDetail | null = null;
        /**
         * Info: (20260825 - Luphia) 書籤的分母是**單元數**（11 章 → 14 份）：
         * 用章數當分母會讓「已完成 4／11」與實際做過的份數對不起來。
         */
        let importUnitTotal = 0;

        /**
         * Info: (20260827 - Luphia) 提到迴圈之前（issue #6723）：中途的檢查點也要
         * 算 `hasExisting`。原本在迴圈之後才算，於是檢查點只能猜——猜錯的方向是
         * 「這一段沒有既有內容」，而那會讓套用時少一次覆蓋提醒。
         */
        const paragraphs =
          sessionsData[activeSessionId]?.reportData?.paragraphs ?? [];
        const existingIds = new Set(
          paragraphs.filter((p) => p.content).map((p) => p.id),
        );

        /**
         * Info: (20260827 - Luphia) 每做完一份就落地一次（issue #6723）。
         *
         * **不動畫面狀態**（不呼叫 `setPendingImportFor`）：預覽在匯入還在跑的時候
         * 跳出來只會讓人以為做完了。這支的唯一責任是「撐過中斷」，不是報進度——
         * 進度由 `reportProgress` 負責。
         *
         * `pauseReason` 是 null：這不是暫停，是「還沒跑完」。書籤的狀態因此是
         * RUNNING 而不是 PAUSED（見 `saveJobBookmark` 的狀態推導），掃描行程
         * 不會去碰它——它本來就不該被翻成「可以繼續」，因為沒人在等額度。
         */
        const persistCheckpoint = (checkpoint: IImportCheckpoint) => {
          const snapshot: IPendingImport = {
            fileName: file.name,
            originSessionId: activeSessionId,
            originSessionTitle:
              sessionsData[activeSessionId]?.title ?? activeSessionId,
            items: checkpoint.segments.map((segment) => ({
              ...segment,
              hasExisting: existingIds.has(segment.paragraphId),
              checked: true,
            })),
            unmapped: checkpoint.unmapped,
            activityCount: checkpoint.activities.length,
            failedChapters: [],
            pausedChapters: checkpoint.pausedChapters,
            pausedUnits: checkpoint.remainingUnits,
            pauseReason: null,
            /**
             * Info: (20260827 - Luphia) 中斷不是暫停，沒有出路可談（issue #6723）：
             * 使用者不需要補點數，他只要按「接著匯入」。留一份出路清單在這裡
             * 會讓畫面叫他去買他不需要的點數。
             */
            pauseDetail: null,
          };
          void persistPendingImport(
            originSessionId,
            snapshot,
            importSource,
            checkpoint.activities,
            lastPageIndexRef.current,
          );
          void saveImportJobBookmark({
            pauseReason: null,
            totalUnits: checkpoint.totalUnits,
            completedUnits:
              checkpoint.totalUnits - checkpoint.remainingUnits.length,
            failedUnits: 0,
            remainingUnits: checkpoint.remainingUnits,
            nextStepInputChars: file.size,
          });
        };

        if (useChunked) {
          // Info: (20260730 - Tzuhan) 兩階段:先問頁碼索引(一次、輸出極小),再逐章只送對應頁。
          // Info: (20260730 - Tzuhan) 原本 11 章各送整份文件,實測 64 頁報告耗掉約 44 萬 input token,
          // Info: (20260730 - Tzuhan) 後段章節因 API 額度耗盡連請求都發不出去(失敗於 6~18ms)。
          notify({
            type: "loading",
            text: t("carbon_chatbot.import_indexing", { name: file.name }),
          });
          const pageIndex = await fetchSectionPageIndex(importSource);
          lastPageIndexRef.current = pageIndex;
          const result = await runImportChapters(
            importSource,
            chapters,
            true,
            pageIndex,
            notify,
            undefined,
            persistCheckpoint,
          );
          payload = result;
          failedChapters = result.failed;
          pausedChapters = result.pausedChapters;
          pausedUnits = result.remainingUnits;
          pauseReason = result.pausedBy;
          pauseDetail = result.pauseDetail;
          importUnitTotal = result.totalUnits;
        } else {
          // Info: (20260717 - Tzuhan) 小型文字檔:單發全綱呼叫
          notify({
            type: "loading",
            text: t("carbon_chatbot.import_parsing", { name: file.name }),
          });
          const formData = new FormData();
          appendImportSource(formData, importSource);
          formData.append("language", language);
          // Info: (20260813 - Luphia) 計費上下文（設計書 §5.5）：帳本由 channel 推導，冪等鍵防重試重複扣點
          formData.append("channel", chatChannel);
          formData.append("clientMessageId", crypto.randomUUID());
          const postSingleCall = () =>
            requestEnvelope<{
              segments: {
                paragraphId: string;
                title: string;
                content: string;
                sourceTables?: ICarbonSourceTable[];
              }[];
              unmapped: string[];
              activities: IActivityRecord[];
            }>("/api/v1/chat/carbon/import", {
              method: "POST",
              body: formData,
            });

          /**
           * Info: (20260826 - Luphia) 未綁帳本的會話：付掉待付訂單再重送
           *（與聊天、草稿同一套，設計書 §5.5）。
           *
           * 這一段先前**不存在**，而上面那道帳本前置檢查的註解卻寫著
           * 「小檔的單發匯入不受限：待付款重送在下方照常運作」——那句話是錯的。
           * 逐章匯入擋掉的理由是「14 次呼叫就是 14 筆訂單」，而單發只有一次，
           * 所以它本來就該走這條路；缺了它，未綁帳本的小檔匯入會落到外層 catch，
           * 顯示「點數已用完」——訊息看起來合理，而真正的原因是這個會話沒有
           * 帳本可扣，補多少點數都不會變。
           *
           * `clientMessageId` 已經寫進 `formData`，重送同一個物件就是同一把
           * 冪等鍵——不會變成「付了一張、又建一張」（草稿路徑踩過那個坑）。
           */
          let chunk: Awaited<ReturnType<typeof postSingleCall>>;
          try {
            chunk = await postSingleCall();
          } catch (error) {
            const pendingPayment = parsePersonalPaymentRequired(error);
            if (!pendingPayment) throw error;
            const paid = await payExistingOrder(
              pendingPayment.orderId,
              pendingPayment.cost,
              () => {},
            );
            if (!paid) throw error;
            chunk = await postSingleCall();
          }
          /**
           * Info: (20260806 - Tzuhan) 信封裡的失敗轉回拋出。
           * 這一支特別要緊:原本 `?? { segments: [] … }` 會把失敗變成「空匯入」,
           * 而空匯入走的是「檔案裡找不到內容」那條文案 —— 使用者會回去改檔案,
           * 而真正的原因是呼叫失敗。外層 catch 才會給對的訊息。
           */
          payload = chunk ?? {
            segments: [],
            unmapped: [],
            activities: [],
          };
        }

        notify(null);
        /**
         * Info: (20260825 - Luphia) 暫停也算「有事情發生」（issue #6713）：
         * 第一章就把點數用完時 segments 與 failed 都是空的，而原本會落到
         * 「檔案裡找不到可匯入的內容」——使用者會回去改檔案，
         * 而真正的原因是點數不足。
         */
        if (
          payload.segments.length === 0 &&
          failedChapters.length === 0 &&
          pauseReason === null
        ) {
          notify({
            type: "error",
            text: t("carbon_chatbot.import_empty"),
          });
          dismissDraftNoticeAfter(
            CARBON_DRAFT_NOTICE_DISMISS_MS,
            originSessionId,
          );
          return;
        }
        // Info: (20260727 - Tzuhan) #57 完成全部小節:原樣匯入 + 既有內容之外仍空白的段落,
        // Info: (20260727 - Tzuhan) 依同一份文件補 AI 草稿(預覽中標記,與逐字原文區隔;人工確認才寫入)
        const importedIds = new Set(
          payload.segments.map((segment) => segment.paragraphId),
        );
        const missingSectionIds = CARBON_REPORT_OUTLINE.filter(
          (section) =>
            !importedIds.has(section.id) && !existingIds.has(section.id),
        ).map((section) => section.id);
        let draftedSegments: {
          paragraphId: string;
          title: string;
          content: string;
        }[] = [];
        /**
         * Info: (20260825 - Luphia) 已經暫停就**不跑草稿補齊**（issue #6713）：
         * 補齊同樣要花點數，這時送出去必然再撞一次同一面牆，
         * 而它的失敗會落到「補齊失敗」那條文案——又一則與真相無關的訊息。
         */
        if (missingSectionIds.length > 0 && pauseReason === null) {
          draftedSegments = await runGapFillSections(
            importSource,
            missingSectionIds,
            file.name,
            notify,
          );
        }
        notify(null);

        // Info: (20260716 - Tzuhan) 匯入的活動數據於確認時合併,先隨預覽暫存
        importActivitiesRef.current = payload.activities;
        const parsedPending: IPendingImport = {
          fileName: file.name,
          // Info: (20260803 - Tzuhan) 記下發起的會話,套用時比對(見 IPendingImport 註解)
          originSessionId: activeSessionId,
          originSessionTitle:
            sessionsData[activeSessionId]?.title ?? activeSessionId,
          items: [
            ...payload.segments.map((segment) => ({
              ...segment,
              hasExisting: existingIds.has(segment.paragraphId),
              checked: true,
            })),
            ...draftedSegments.map((segment) => ({
              ...segment,
              hasExisting: false,
              checked: true,
              isDraft: true,
            })),
          ],
          unmapped: payload.unmapped,
          activityCount: payload.activities.length,
          failedChapters,
          /**
           * Info: (20260825 - Luphia) 暫停的斷點跟著解析結果一起存（issue #6713）：
           * 這份 blob 本來就會落地（個人會話是端到端加密），因此重新整理頁面
           * 之後「停在哪裡」還在，不需要另一張表也不需要把內容交給伺服器。
           */
          pausedChapters,
          // Info: (20260825 - Luphia) 接續的斷點（份粒度）；顯示用的是上面那份
          pausedUnits,
          pauseReason,
          pauseDetail,
        };
        setPendingImportFor(originSessionId, parsedPending);
        /**
         * Info: (20260828 - Julian) 新的解析結果要**取消收起**（實機發現）。
         *
         * `deferredPreviewSessions` 記的是「使用者把那張卡收起來了」，
         * 但它只以 session 為鍵 —— 於是那個旗標會沾到**下一份**解析結果上。
         *
         * 而它幾乎一定是開著的：重載時的還原一律以收起狀態進來
         *（見 `pendingImport` 的還原段），所以任何「這個會話以前匯入過」的情形，
         * 重新整理之後再匯入一份，卡片就再也不會自己打開 ——
         * 使用者按下匯入、等了幾分鐘、畫面上什麼都沒有。
         *
         * 收起的是**那一張卡**，不是這個會話往後的每一張。
         */
        setDeferredPreviewSessions((prev) => {
          if (!prev[originSessionId]) return prev;
          const rest = { ...prev };
          delete rest[originSessionId];
          return rest;
        });
        /**
         * Info: (20260806 - Tzuhan) 解析結果落地(DB)+ 對話留痕,兩件事都不阻斷主流程。
         *
         * 這兩行是「當下不匯入也不會白跑」的全部依據:
         * 前者讓內容撐過重載,後者讓使用者在對話裡看得到「這件事發生過」。
         * 少任何一個,「稍後再決定」就只是嘴上說說。
         */
        void persistPendingImport(
          originSessionId,
          parsedPending,
          importSource,
          payload.activities,
          lastPageIndexRef.current,
        );
        void postImportParsedNotice(originSessionId, parsedPending);
        /**
         * Info: (20260825 - Luphia) 書籤讓伺服器知道「這個人有一份匯入停著」，
         * 額度回來時掃描行程才翻得動它（issue #6712 / #6714）。
         */
        void saveImportJobBookmark({
          pauseReason,
          totalUnits: importUnitTotal,
          completedUnits: importUnitTotal - pausedUnits.length,
          failedUnits: failedChapters.length,
          remainingUnits: pausedUnits,
          /**
           * Info: (20260826 - Luphia) 用**原始 File** 的大小，不是 `importSource.file`
           *（自我 review 第五輪）：附件上傳成功就會有 cid，而那時
           * `importSource.file` 被刻意設為 null 讓瀏覽器回收大檔——也就是
           * **常態路徑**拿不到大小。少了它，書籤的 `nextStepCost` 是 null，
           * 掃描行程只能把任務算進 `unknown`，於是整套「額度回來就翻成可以繼續」
           * 在常態路徑上是死的。
           */
          nextStepInputChars: file.size,
        });
      } catch (error) {
        console.error("[carbon-chat] report import failed:", error);
        /**
         * Info: (20260826 - Luphia) 這條 catch 也會接到**點數用完**
         *（自我 review 第五輪）。
         *
         * 逐章路徑的暫停由驅動器接住，不會走到這裡；但**小型文字檔是單發呼叫**
         * ——一次請求就是整份匯入，402 直接拋到這裡，而這裡說的是
         * 「匯入失敗」。同一份檔案改天點數夠了就會成功，而那句話會讓使用者
         * 去改檔案。單發沒有「剩餘章節」可談，所以只要把原因說對就夠了。
         */
        notify({
          type: "error",
          text:
            resolveCreditPauseReason(error) !== null
              ? t("carbon_chatbot.team_quota_exceeded")
              : t("carbon_chatbot.import_failed"),
        });
        dismissDraftNoticeAfter(
          CARBON_DRAFT_NOTICE_DISMISS_MS,
          originSessionId,
        );
      } finally {
        // Info: (20260804 - Tzuhan) 成功、失敗、拋錯都要放行,否則一次失敗就再也匯入不了
        importInFlightRef.current = null;
        setImportRunning(false);
      }
    },
    [
      chatChannel,
      sessionsData,
      activeSessionId,
      language,
      t,
      // Info: (20260827 - Luphia) 執行許可（issue #6721）
      claimImportJob,
      runImportChapters,
      runGapFillSections,
      fetchSectionPageIndex,
      setDraftNotice,
      dismissDraftNoticeAfter,
      setPendingImportFor,
      persistPendingImport,
      postImportParsedNotice,
      saveImportJobBookmark,
      // Info: (20260826 - Luphia) 逐章匯入的帳本前置檢查（review #6717 二輪第 2 條）
      sessionAccess,
      // Info: (20260826 - Luphia) 單發匯入的待付款重送（未綁帳本的會話）
      payExistingOrder,
    ],
  );

  // Info: (20260717 - Tzuhan) #56 只重跑失敗章節,結果合併進現有預覽(檔案取自暫存 ref)
  const retryFailedImportChapters = useCallback(async () => {
    const source = lastImportSourceRef.current;
    const failed = pendingImport?.failedChapters ?? [];
    if (!source || failed.length === 0 || !pendingImport) return;
    /**
     * Info: (20260806 - Tzuhan) 重試中不得再次發射。
     *
     * 預覽卡的重試鈕原本按下去毫無變化 —— 沒有 spinner、沒有禁用、進度只出現在
     * 被 modal(z-[90])蓋住的輸入列上。使用者理所當然會再按一次,
     * 而兩份重試會並行跑、各自燒一份 LLM 額度(額度是 12 次/分鐘),
     * 互相搶限流之後兩邊都更慢甚至一起失敗,先回來的還會被後回來的覆蓋。
     *
     * 這個旗標同時是 UI 的依據(見 isRetryingImport):
     * 「正在跑」必須看得見,否則使用者的補救動作只會讓情況更糟。
     */
    if (isRetryingImport) return;
    setIsRetryingImport(true);

    /**
     * Info: (20260806 - Tzuhan) 重試也釘住發起當下的會話。
     * 這裡的來源是 `pendingImport`,而它本來就只屬於當前會話(見 pendingImportBySession),
     * 所以「當前會話」在發起那一刻是對的 —— 但重跑一樣要好幾分鐘,
     * 期間切房的話「當前」就變了。釘住之後進度不會跑到別房去。
     */
    const originSessionId = activeSessionId;
    const notify = (notice: IDraftNotice | null) =>
      setDraftNotice(notice, originSessionId);
    try {
      // Info: (20260730 - Tzuhan) 重試沿用首次的頁碼索引:重問一次索引等於再燒一次全文輸入,而索引不會變
      /**
       * Info: (20260826 - Luphia) 重試也要抽活動數據（與接續同一個理由）。
       *
       * 萃取只對證據章（`ch3`）生效，而重試的觸發是「那一章真的解析失敗」——
       * 若失敗的正是 ch3，傳 `false` 就等於重試成功了但活動數據仍是 0 筆，
       * `computedLedger` 空、所有數據圖表畫不出來，而畫面上沒有任何跡象。
       */
      const result = await runImportChapters(
        source,
        failed,
        failed.some((chapter) => chapter.id === CARBON_EVIDENCE_CHAPTER_ID),
        lastPageIndexRef.current,
        notify,
      );
      notify(null);
      /**
       * Info: (20260807 - Emily) 保存不能寫在 setState 的 updater 裡
       * (issue_drafts/inventory_table_import/14_pending_import_persist_race.md)。
       *
       * updater 必須是純函式。React 18 的 StrictMode 會刻意呼叫它兩次來逼出不純的實作,
       * 於是那一行 `void persistPendingImport(...)` 會送出兩個帶著同一個起始版本的 PUT,
       * 後到的撞上樂觀鎖回 400。Emily 的 UAT log 裡抓到了這個形狀:
       * 相隔 1ms 的兩個 PUT(400 + 200),堆疊上有 basicStateReducer ——
       * 那就是 React 正在執行 updater。
       *
       * Info: (20260808 - Luphia) 也不能「從 updater 用區域變數帶值出來再保存」——
       * updater 不保證同步執行(見 pendingImportBySessionRef 的說明),
       * 那個變數在檢查當下可能還是 null,保存會被靜默跳過。
       * 改為:從 ref 鏡像讀當下最新 → 在 updater 之外算好合併結果 →
       * 同一份物件既寫進 state 也送去保存。讀不到現有紀錄就代表
       * 重試期間已被套用或捨棄,此時合併等於復活一筆已清除的紀錄,直接放棄。
       */
      const current = pendingImportBySessionRef.current[originSessionId];
      if (!current) return;
      const itemByParagraph = new Map(
        current.items.map((item) => [item.paragraphId, item]),
      );
      result.segments.forEach((segment) => {
        const existing = itemByParagraph.get(segment.paragraphId);
        itemByParagraph.set(segment.paragraphId, {
          paragraphId: segment.paragraphId,
          title: segment.title,
          content: segment.content,
          hasExisting: existing?.hasExisting ?? false,
          checked: existing?.checked ?? true,
        });
      });
      /**
       * Info: (20260826 - Luphia) 重試也可能**撞到點數用完**（自我 review 第五輪）。
       *
       * 先前這裡是 `failedChapters: result.failed`（整批取代）而完全忽略
       * `result.pausedBy`。於是「額度已經見底時按重試」會：
       *
       * - `result.failed` 是空的（暫停不進 failed，那是對的）
       * - 取代之後 `failedChapters` 變成空 → 那幾章從畫面上**整批消失**
       * - 而暫停清單沒有被更新 → 也不在那裡
       *
       * 使用者因此同時失去資訊與重試入口，而畫面上什麼都沒說。
       * 暫停的章要接回暫停清單，沒被處理到的失敗章要留著。
       */
      /**
       * Info: (20260826 - Luphia) 抽到的活動數據累加回暫存（與接續同一條線）：
       * `importActivitiesRef` 是套用時真正會被讀的那一份。
       */
      importActivitiesRef.current = [
        ...importActivitiesRef.current,
        ...result.activities,
      ];
      const retriedIds = new Set(failed.map((chapter) => chapter.id));
      const merged: IPendingImport = {
        ...current,
        items: Array.from(itemByParagraph.values()),
        unmapped: [...current.unmapped, ...result.unmapped],
        activityCount: importActivitiesRef.current.length,
        // Info: (20260826 - Luphia) 只換這次重試過的那幾章，其餘原樣留著
        failedChapters: [
          ...current.failedChapters.filter(
            (chapter) => !retriedIds.has(chapter.id),
          ),
          ...result.failed,
        ],
        pausedChapters: [
          ...(current.pausedChapters ?? []).filter(
            (chapter) => !retriedIds.has(chapter.id),
          ),
          ...result.pausedChapters,
        ],
        pausedUnits: [
          ...(current.pausedUnits ?? []).filter(
            (unit) => !retriedIds.has(unit.chapterId),
          ),
          ...result.remainingUnits,
        ],
        // Info: (20260826 - Luphia) 這一趟撞牆就記下原因；沒撞就沿用原本的狀態
        pauseReason: result.pausedBy ?? current.pauseReason ?? null,
        /**
         * Info: (20260827 - Luphia) 出路也跟著更新（issue #6714）：這一趟撞牆的
         * 402 是**比較新**的一份，重置時間可能已經往前推。沒撞牆就沿用舊的
         * ——沿用一份過時的 resetAt 比沒有好，倒數歸零時卡片會自己改口。
         */
        pauseDetail: result.pauseDetail ?? current.pauseDetail ?? null,
      };
      setPendingImportFor(originSessionId, merged);
      void persistPendingImport(
        originSessionId,
        merged,
        lastImportSourceRef.current,
        importActivitiesRef.current,
        lastPageIndexRef.current,
      );
      /**
       * Info: (20260826 - Luphia) 書籤要跟著更新（自我 review 第五輪）。
       *
       * 先前只有主流程寫書籤，於是重試或接續之後伺服器仍以為那份匯入
       * 停在原地：掃描行程每 5 分鐘照樣評估一次已經跑完的任務，
       * 而 `GET /user/job` 會回報一個實際上已完成的「未完成任務」。
       */
      /**
       * Info: (20260826 - Luphia) 分母是**總份數**，不是剩餘份數（review #6717 二輪低-1）。
       *
       * 先前 `totalUnits` 寫成剩餘份數、`completedUnits` 恆為 0，於是
       * `GET /user/job` 一接上畫面就會顯示 0/N，而 N 還會隨著每次重試變小。
       * 總數用「這份匯入原本切成幾份」（存在書籤裡的話會更好，但目前
       * 由暫存的章數推導已足夠——重試不改變總份數）。
       */
      const retryTotalUnits = Math.max(
        merged.pausedUnits?.length ?? 0,
        current.pausedUnits?.length ?? 0,
      );
      void saveImportJobBookmark({
        pauseReason: merged.pauseReason ?? null,
        totalUnits: retryTotalUnits,
        completedUnits: retryTotalUnits - (merged.pausedUnits?.length ?? 0),
        failedUnits: merged.failedChapters.length,
        remainingUnits: merged.pausedUnits ?? [],
      });
    } catch (error) {
      // Info: (20260806 - Tzuhan) 原本沒有 catch:重試整批拋錯時提示會卡在 loading 不散
      console.error("[carbon-chat] retry failed chapters failed:", error);
      notify({ type: "error", text: t("carbon_chatbot.import_failed") });
      dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS, originSessionId);
    } finally {
      // Info: (20260806 - Tzuhan) 成功或失敗都要放行,否則一次失敗就再也重試不了
      setIsRetryingImport(false);
    }
  }, [
    pendingImport,
    runImportChapters,
    activeSessionId,
    setDraftNotice,
    dismissDraftNoticeAfter,
    isRetryingImport,
    setPendingImportFor,
    persistPendingImport,
    saveImportJobBookmark,
    t,
  ]);

  /**
   * Info: (20260825 - Luphia) 「接著匯入」：只跑點數用完時還沒做的那幾份
   *（issue #6713 / review #6717 高-1）。
   *
   * 與「重試失敗章節」是兩件事，因此是兩顆按鈕：失敗的章試過而壞了，
   * 這些章一步都沒試。而**接續的粒度是份不是章**——`buildImportUnits`
   * 會把節數多的章切成兩份，以章接續會把已經做完的那一份再跑一次、
   * 再收一次點數，正好是訊息裡「已完成的部分不會重跑」的反面。
   *
   * 點數還沒補上時按下去會再撞一次牆：那時結果仍是暫停，清單原封不動，
   * 而使用者看到的訊息仍然是「點數已用完」——沒有一則訊息會變成別的意思。
   */
  const resumePausedImportChapters = useCallback(async () => {
    const source = lastImportSourceRef.current;
    const units = pendingImport?.pausedUnits ?? [];
    if (units.length === 0 || !pendingImport) return;
    /**
     * Info: (20260826 - Luphia) **換裝置／重載之後原始檔案不在了**（自我 review 第六輪）。
     *
     * 暫停清單跟著帳號走（存在 `CarbonPendingImport`，會話層級），但
     * `lastImportSourceRef` 只在記憶體：換瀏覽器、換裝置、或單純重新整理之後
     * 使用者看得到清單與按鈕，而 `source` 是 null。先前這裡與其他前置條件
     * 一起 `return`——按鈕按下去**毫無反應、沒有任何訊息**，而那是最難自救的
     * 一種失敗（使用者無從判斷是壞了還是自己沒按到）。
     *
     * 說出來而不是靜靜返回：接續需要原始檔案（伺服端只收 cid 或檔案本體，
     * 而 cid 也存在那個 ref 裡）。請使用者重新上傳同一份檔案——已完成的章
     * 仍然不會重跑，因為要跑的是 `pausedUnits`。
     */
    if (!source) {
      setDraftNotice(
        {
          type: "error",
          text: t("carbon_chatbot.import_resume_needs_file"),
        },
        activeSessionId,
      );
      dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS, activeSessionId);
      return;
    }
    // Info: (20260806 - Tzuhan) 進行中不得再次發射（理由同 retryFailedImportChapters）
    if (isRetryingImport) return;

    /**
     * Info: (20260827 - Luphia) 先換一把執行許可（issue #6721）。
     *
     * 這是這把鎖最要緊的一個入口：`isRetryingImport` 只擋得住**同一個分頁**，
     * 而暫停之後「開第二個分頁」正是使用者最常做的事（第一個看起來卡住了）。
     * 補點數之後兩邊都跳出「可以繼續」，兩邊都按下去 → 同一批份送兩次。
     */
    const resumeDenial = await claimImportJob(JOB_CLAIM_INTENT.RESUME);
    if (resumeDenial) {
      setDraftNotice(
        {
          type: "error",
          // Info: (20260901 - Luphia) minutes 綁 TTL 常數：租期改了文案跟著對（中-2）
          text: t(JOB_CLAIM_DENIAL_TEXT_KEY[resumeDenial], {
            minutes: JOB_CLAIM_TTL_MS / 60_000,
          }),
        },
        activeSessionId,
      );
      dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS, activeSessionId);
      /**
       * Info: (20260901 - Luphia) BUSY 以外的判決是**終局的**（已取消／已完成／
       * 不是你的）——伺服器眼中的狀態已經與這張卡上的按鈕分岔了，刷新一次。
       *
       * Info: (20260901 - Luphia) 但**光刷新不會讓按鈕消失**（自我 review 自-1，
       * §1.14——第一版的註解宣稱「刷新讓卡片改口」，那是過度宣稱）：
       * 「接著匯入」由 `pendingImport.pausedChapters` 驅動，而
       * `GET /user/job` 只回未完成的任務（`listOpenByUser`），終局的那筆
       * **根本不在回應裡**。同裝置的取消由 JOB_CANCELLED 廣播的 handler 清
       * 暫停狀態；**跨裝置**沒有廣播，唯一知道判決的時點就是這裡——所以
       * 這裡做同一件事（與 `onJobCancelledElsewhereRef` 同語意：清暫停、留內容）。
       *
       * Info: (20260902 - Luphia) 清狀態的條件是「終局」而不是只有 CANCELLED
       *（review #6726 二輪低-1）：自-1 的推理對 COMPLETED 一字不差成立——
       * 分頁 A 跑完、分頁 B 還留著暫停清單，按下去永遠報「已完成」。
       * FORBIDDEN 一起清也是安全的：那本來就不是你的任務。設計書 §7c 的
       * 「已完成 → 收起按鈕」自此對客戶端也是實話。
       */
      if (resumeDenial !== JOB_CLAIM_DENIAL.BUSY) {
        void refreshImportJob();
        if (pendingImport) {
          setPendingImportFor(activeSessionId, {
            ...pendingImport,
            pausedChapters: [],
            pausedUnits: [],
            pauseReason: null,
            pauseDetail: null,
          });
          setImportJob(null);
        }
      }
      return;
    }
    setIsRetryingImport(true);

    const originSessionId = activeSessionId;
    const notify = (notice: IDraftNotice | null) =>
      setDraftNotice(notice, originSessionId);
    try {
      // Info: (20260730 - Tzuhan) 沿用首次的頁碼索引：重問一次等於再燒一次全文輸入，而索引不會變
      /**
       * Info: (20260826 - Luphia) 接續時**要抽活動數據**（review #6717 二輪中-1）。
       *
       * 萃取只對證據章（`ch3`）生效，而 ch3 在 11 章裡排第 3、又是被切成兩份的
       * 三章之一——「點數在它之前用完」是常態而不是邊緣情形。先前接續傳 `false`，
       * 於是補上點數之後那一章的活動數據**一筆都不會有**，`computedLedger` 是空的，
       * 所有數據圖表都畫不出來，而畫面上沒有任何跡象。使用者唯一的補救是整份
       * 重新匯入——正好是這個 PR 要消滅的那件事。
       */
      const result = await runImportChapters(
        source,
        pendingImport.pausedChapters ?? [],
        units.some((unit) => unit.chapterId === CARBON_EVIDENCE_CHAPTER_ID),
        lastPageIndexRef.current,
        notify,
        units,
      );
      notify(null);
      // Info: (20260807 - Emily) 保存不能寫在 setState 的 updater 裡（見 retryFailedImportChapters）
      const current = pendingImportBySessionRef.current[originSessionId];
      if (!current) return;
      const itemByParagraph = new Map(
        current.items.map((item) => [item.paragraphId, item]),
      );
      result.segments.forEach((segment) => {
        const existing = itemByParagraph.get(segment.paragraphId);
        itemByParagraph.set(segment.paragraphId, {
          paragraphId: segment.paragraphId,
          title: segment.title,
          content: segment.content,
          hasExisting: existing?.hasExisting ?? false,
          checked: existing?.checked ?? true,
        });
      });
      /**
       * Info: (20260825 - Luphia) 三個欄位一起換：這一趟可能又暫停（點數還是不夠）、
       * 可能跑完（清空）、也可能有章真的壞掉。只換其中一個會讓畫面同時顯示
       * 舊的暫停清單與新的結果。
       */
      /**
       * Info: (20260826 - Luphia) 抽到的活動數據要**併回暫存**（review #6717 二輪中-1）。
       *
       * 旗標打開了但結果沒接回來的話，等於沒抽——`importActivitiesRef` 是套用時
       * 真正會被讀的那一份，而 `activityCount` 是畫面上的數字。累加而不是覆蓋：
       * 首次匯入可能已經抽到一部分（證據章被切成兩份，其中一份先跑完）。
       */
      importActivitiesRef.current = [
        ...importActivitiesRef.current,
        ...result.activities,
      ];
      const merged: IPendingImport = {
        ...current,
        items: Array.from(itemByParagraph.values()),
        unmapped: [...current.unmapped, ...result.unmapped],
        activityCount: importActivitiesRef.current.length,
        failedChapters: [...current.failedChapters, ...result.failed].filter(
          (chapter, index, list) =>
            list.findIndex((item) => item.id === chapter.id) === index,
        ),
        pausedChapters: result.pausedChapters,
        pausedUnits: result.remainingUnits,
        pauseReason: result.pausedBy,
        // Info: (20260827 - Luphia) 出路也跟著更新（理由同 retryFailedImportChapters）
        pauseDetail: result.pauseDetail ?? current.pauseDetail ?? null,
      };
      setPendingImportFor(originSessionId, merged);
      void persistPendingImport(
        originSessionId,
        merged,
        lastImportSourceRef.current,
        importActivitiesRef.current,
        lastPageIndexRef.current,
      );
      // Info: (20260826 - Luphia) 書籤跟著更新（理由同 retryFailedImportChapters）
      void saveImportJobBookmark({
        pauseReason: result.pausedBy,
        totalUnits: units.length,
        completedUnits: units.length - result.remainingUnits.length,
        failedUnits: result.failed.length,
        remainingUnits: result.remainingUnits,
      });
    } catch (error) {
      console.error("[carbon-chat] resume paused chapters failed:", error);
      notify({ type: "error", text: t("carbon_chatbot.import_failed") });
      dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS, originSessionId);
    } finally {
      setIsRetryingImport(false);
    }
  }, [
    pendingImport,
    runImportChapters,
    activeSessionId,
    setDraftNotice,
    dismissDraftNoticeAfter,
    isRetryingImport,
    setPendingImportFor,
    persistPendingImport,
    saveImportJobBookmark,
    t,
    // Info: (20260827 - Luphia) 執行許可（issue #6721）
    claimImportJob,
    // Info: (20260901 - Luphia) 終局判決讓卡片改口（review #6726 阻-1）
    refreshImportJob,
  ]);

  /**
   * Info: (20260827 - Luphia) 付款完成後自動接續（issue #6714）。
   *
   * 暫停時畫面上的兩條出路（加購點數、升級方案）都是 `target="_blank"`
   * 開新分頁，所以**付款一定發生在另一個分頁**。付完錢的人回到這一頁時，
   * 這一頁對剛剛發生的事一無所知——他得自己再按一次「接著匯入」，
   * 而他剛剛就是為了那件事付的錢。
   *
   * 三道閘門，一道都不能少：
   *
   * 1. **這份匯入真的在等點數**：`pauseReason` 必須是「點數用完」。需要簽章付款的
   *    那種（`PAYMENT_REQUIRED`）不在這裡處理——那條路要使用者本人簽名。
   * 2. **這一頁沒有在跑**：`isRetryingImport`。
   * 3. **伺服器同意**：接續本身會先換一把執行許可（issue #6721）。廣播只是
   *    一個提示，不是授權——同源的任何頁面都寫得進那個頻道。
   *
   * 刻意**不**在這裡先問一次「餘額夠不夠」：真正的判斷發生在執行時的扣款，
   * 而多一次檢查就會有「檢查說夠、扣款說不夠」兩個答案（見
   * `startJobResume` 的註解）。萬一還是不夠，匯入會再次暫停並說對原因，
   * 而那一次撞牆在呼叫 LLM 之前就被擋下，一點都不會扣。
   */
  const autoResumeAfterPaymentRef = useRef<(() => void) | null>(null);
  /**
   * Info: (20260828 - Luphia) 別的分頁取消了這份匯入（review #6726 高-1）。
   *
   * 只清掉**暫停狀態**，`items` 原封不動——那些章已經解析完、也已經扣過點，
   * 連內容一起清掉才是真的造成損失（與 `cancelImportJob` 同一個立場）。
   *
   * 不落地：發起取消的那個分頁已經寫過一次了，這裡再寫一次只會多一次
   * 樂觀鎖衝突。這一支的責任只有「把那顆會花錢的按鈕收起來」。
   */
  const onJobCancelledElsewhereRef = useRef<
    ((resourceKey?: string) => void) | null
  >(null);
  useEffect(() => {
    onJobCancelledElsewhereRef.current = (resourceKey) => {
      // Info: (20260828 - Luphia) 別的聊天室的取消不該動到這一間
      if (resourceKey !== chatChannel) return;
      if (!pendingImport) return;
      if ((pendingImport.pausedUnits ?? []).length === 0) return;
      setPendingImportFor(activeSessionId, {
        ...pendingImport,
        pausedChapters: [],
        pausedUnits: [],
        pauseReason: null,
        pauseDetail: null,
      });
      setImportJob(null);
    };
  }, [chatChannel, pendingImport, activeSessionId, setPendingImportFor]);

  // Info: (20260827 - Luphia) 理由同下：訂閱只掛一次，會變的東西放 ref
  const refreshImportJobRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => {
    refreshImportJobRef.current = refreshImportJob;
  }, [refreshImportJob]);
  useEffect(() => {
    autoResumeAfterPaymentRef.current = () => {
      if (isRetryingImport) return;
      const paused = pendingImport?.pausedUnits ?? [];
      if (paused.length === 0) return;
      if (pendingImport?.pauseReason !== JOB_PAUSE_REASON.CREDITS_EXHAUSTED) {
        return;
      }
      /**
       * Info: (20260827 - Luphia) 先說一句話再開跑：畫面自己動起來而沒有任何
       * 說明，比不動更難理解——使用者剛從另一個分頁回來，不會知道是誰按了什麼。
       */
      setDraftNotice(
        { type: "info", text: t("carbon_chatbot.import_auto_resuming") },
        activeSessionId,
      );
      void resumePausedImportChapters();
    };
  }, [
    isRetryingImport,
    pendingImport,
    resumePausedImportChapters,
    setDraftNotice,
    activeSessionId,
    t,
  ]);

  /**
   * Info: (20260827 - Luphia) 訂閱只掛一次（空依賴）：依賴放 `pendingImport`
   * 之類的東西會讓它在每次解析結果變動時重新訂閱，而重新訂閱之間的那個瞬間
   * 收不到訊息——付款完成的廣播只有一則，錯過就沒有了。
   * 真正會變的東西放在上面那個 ref 裡。
   */
  useEffect(
    () =>
      subscribeCreditEvents((event) => {
        if (event.type === CREDIT_EVENT.JOB_CANCELLED) {
          onJobCancelledElsewhereRef.current?.(event.resourceKey);
          return;
        }
        if (event.type !== CREDIT_EVENT.PAYMENT_SUCCEEDED) return;
        /**
         * Info: (20260827 - Luphia) 狀態也刷新一次：即使這一頁沒有暫停中的匯入
         *（例如暫停的是別的聊天室），伺服器眼中的狀態已經變了。
         */
        void refreshImportJobRef.current?.();
        autoResumeAfterPaymentRef.current?.();
      }),
    [],
  );

  const toggleImportItem = useCallback(
    (paragraphId: string) => {
      setPendingImportBySession((prev) => {
        const current = prev[activeSessionId];
        if (!current) return prev;
        return {
          ...prev,
          [activeSessionId]: {
            ...current,
            items: current.items.map((item) =>
              item.paragraphId === paragraphId
                ? { ...item, checked: !item.checked }
                : item,
            ),
          },
        };
      });
    },
    [activeSessionId],
  );

  // Info: (20260716 - Tzuhan) #56 套用匯入:勾選段落寫入(查核一律重置);活動數據入帳本交 /calculate 重勾稽
  /**
   * Info: (20260730 - Tzuhan) 為段落生成結構圖(治理架構 / 範疇對應 / 量化流程)。
   * 這三張圖不依賴 computedLedger,素材就是該段敘述本身,因此活動數據還沒進帳也畫得出來
   * (原本 4 張圖表模板全部由 ledger 產值,ledger 空的時候整份報告一張圖都沒有)。
   * LLM 只回節點與父子關係,mermaid 由後端模板組出,且節點文字必須能在該段原文找到才畫。
   */
  const generateParagraphDiagram = useCallback(
    async (paragraphId: string, contentOverride?: string): Promise<void> => {
      /**
       * Info: (20260803 - Tzuhan) 沒有對應模板就跳過,但**不再靜默**。
       * 實測「所有圖表不見了」時,前端零 log、後端零請求,無法分辨是沒觸發、
       * 被過濾掉、還是呼叫失敗 —— 只能回頭猜。決策點沒有痕跡,現場就無法還原。
       */
      if (!findDiagramTemplateForParagraph(paragraphId)) {
        console.info("[carbon-chat] diagram skipped: no template", paragraphId);
        return;
      }

      // Info: (20260730 - Tzuhan) 內容優先取呼叫端傳入者:匯入落地是在 setSessionsData 的同一個 tick 內
      // Info: (20260730 - Tzuhan) 接著呼叫本函式,此時 closure 捕獲的 sessionsData 還是「匯入前」的舊值,
      // Info: (20260730 - Tzuhan) 該段內容仍為空 → 原本會靜默 return,結果一張圖都畫不出來(實測即如此)。
      // Info: (20260730 - Tzuhan) 目錄手動觸發時無 override,讀狀態即可(那時狀態已穩定)。
      const content =
        contentOverride ??
        sessionsData[activeSessionId]?.reportData?.paragraphs?.find(
          (p) => p.id === paragraphId,
        )?.content;
      if (!content) {
        console.warn(
          "[carbon-chat] diagram skipped: no content for",
          paragraphId,
        );
        return;
      }

      const attempt = async (): Promise<boolean> => {
        try {
          const payload = await requestEnvelope<{
            templateId: CarbonDiagramTemplateEnum;
            block: string;
            isDrawn: boolean;
          }>("/api/v1/chat/carbon/diagram", {
            method: "POST",
            /**
             * Info: (20260813 - Luphia) 計費上下文（設計書 §5.5）：
             * channel 供後端推導計費帳本，clientMessageId 讓退避重試不重複扣點。
             */
            body: JSON.stringify({
              paragraphId,
              content,
              language,
              channel: chatChannel,
              clientMessageId: crypto.randomUUID(),
            }),
          });
          /**
           * Info: (20260806 - Tzuhan) 端點走保活式串流(繞開閘道 60 秒的閒置逾時),
           * 而串流一開始 HTTP 狀態就鎖成 200 —— 只看狀態碼會把失敗當成成功,
           * 表現是「圖沒出來也不重試,而且 console 一片乾淨」。
           * requestEnvelope 把信封裡的失敗轉回拋出,下面的 catch(退避重試一次)因此照舊。
           */
          if (!payload) return true;
          if (!payload.isDrawn) {
            // Info: (20260730 - Tzuhan) 被護欄拒絕:區塊仍會插入(內含原因文字),此處補一行前端 log 便於對照後端的 offendingLabels
            console.warn(
              "[carbon-chat] diagram rejected by guardrail:",
              paragraphId,
            );
          }

          setSessionsData((prev) => {
            const session = prev[activeSessionId];
            const reportData = session?.reportData;
            if (!reportData?.paragraphs) return prev;
            let nextRaw = reportData.rawMarkdown;
            const nextParagraphs = reportData.paragraphs.map((p) => {
              if (p.id !== paragraphId || !p.content) return p;
              const nextContent = insertCarbonDiagramBlock(
                p.content,
                payload.templateId,
                payload.block,
              );
              if (nextContent === p.content) return p;
              if (nextRaw) {
                nextRaw = patchMarkdownSection(nextRaw, p.title, nextContent);
              }
              // Info: (20260730 - Tzuhan) 內容變動即重置查核(與其他寫入路徑同一閘門)
              return { ...p, content: nextContent, isVerified: false };
            });
            return {
              ...prev,
              [activeSessionId]: {
                ...session,
                reportData: {
                  ...reportData,
                  rawMarkdown: nextRaw,
                  paragraphs: nextParagraphs,
                },
              },
            };
          });
        } catch (error) {
          // Info: (20260730 - Tzuhan) 圖是加值不是前提:失敗不影響段落內容與流程,但不可靜默 ——
          // Info: (20260730 - Tzuhan) 實測失敗時畫面與 console 都沒有痕跡,查不出是沒觸發、被護欄拒絕還是呼叫失敗。
          console.error(
            "[carbon-chat] diagram generation failed:",
            paragraphId,
            error,
          );
          return false;
        }
        return true;
      };

      // Info: (20260730 - Tzuhan) 額度不足是「等一下會好」:退避後重試一次即止(不做無上限重試)
      const succeeded = await attempt();
      if (!succeeded) {
        await new Promise((resolve) => {
          setTimeout(resolve, CARBON_DIAGRAM_QUOTA_RETRY_MS);
        });
        await attempt();
      }
    },
    [chatChannel, sessionsData, activeSessionId, language],
  );

  const applyPendingImport = useCallback(() => {
    if (!pendingImport) return;
    /**
     * Info: (20260803 - Tzuhan) 只能套用回發起它的會話(issue_drafts/inventory_table_import/03)。
     *
     * 匯入不會因切換聊天室而中斷,但套用寫入的是當下的 activeSessionId ——
     * 在 A 房發起、切到 B 房再套用,A 房的報告會覆蓋 B 房的內容且毫無警告。
     * 這裡先擋住(階段一);讓匯入跟著房間走是階段二。
     *
     * 提示指名道姓寫出來源對話 —— 只說「無法套用」等於把問題丟回給使用者。
     */
    if (pendingImport.originSessionId !== activeSessionId) {
      setDraftNotice({
        type: "error",
        text: t("carbon_chatbot.import_wrong_session", {
          name: pendingImport.originSessionTitle,
        }),
      });
      // Info: (20260811 - Emily) 同上(#6624)
      dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS);
      return;
    }
    const selected = pendingImport.items.filter((item) => item.checked);
    if (selected.length === 0) return;
    /**
     * Info: (20260806 - Tzuhan) 釘住套用當下的會話。
     * 上面剛確認 `pendingImport.originSessionId === activeSessionId`,所以此刻兩者相同 ——
     * 但結構圖階段最長會跑近兩分鐘,期間切房的話「當前」就變了,
     * 逐張進度會一路寫到別房去。
     */
    const originSessionId = activeSessionId;
    const notify = (notice: IDraftNotice | null) =>
      setDraftNotice(notice, originSessionId);
    const contentById = new Map(
      selected.map((item) => [item.paragraphId, item.content]),
    );
    // Info: (20260801 - Tzuhan) 原文照錄的表格與該段敘述一起落地(Issue A)
    const sourceTablesById = new Map(
      selected.map((item) => [item.paragraphId, item.sourceTables ?? []]),
    );
    // Info: (20260730 - Tzuhan) 來源標記:預覽卡已區分「逐字匯入」與「AI 草稿」(isDraft),
    // Info: (20260730 - Tzuhan) 落地時一併記錄,否則兩者在報告裡完全分不出來(gap-fill 補的節內含「(待補: …)」佔位)
    const originById = new Map(
      selected.map((item) => [
        item.paragraphId,
        item.isDraft
          ? ParagraphOriginEnum.AI_DRAFT
          : ParagraphOriginEnum.IMPORTED,
      ]),
    );

    /**
     * Info: (20260730 - Tzuhan) 數據段落的表格一律改由決定論引擎產出。
     * 原本匯入內容是 `content: imported` 直接寫入,不像 AI 草稿路徑會先 stripLlmTables +
     * injectDataTable。後果是原報告那張「排放總量統計表」原封不動落地,而且因為它沒有
     * `<!-- carbon-data-table -->` 錨點,ledger 重算時 hasInjectedDataTable 判定為 false,
     * 於是**永遠不會被刷新、也不會被標示**——報告裡會有一張不是本系統算出來的排放總量表,
     * 看報告的人卻分辨不出來。這違反「所有計算收斂到確定性規則引擎」的鐵律。
     * 原報告的數字仍看得到:它們留在匯入預覽與 unmapped,且原文件本身就是佐證附件。
     */
    /**
     * Info: (20260803 - Tzuhan) 表3.8 → 帳本 + 對帳說明(Issue B)。
     * 解析、勾稽、轉換、揭露全在 buildImportedLedger 這個純函數裡完成;
     * 這裡只負責把結果寫進狀態 —— 業務流程留在 hook 裡就再也測不到,
     * 而它的每一步都在決定數字能不能進帳本。
     */
    const importedLedgerById = new Map<string, IImportedLedgerResult>();
    selected.forEach((item) => {
      const tables = sourceTablesById.get(item.paragraphId) ?? [];
      if (tables.length === 0) return;
      /**
       * Info: (20260827 - Emily) 年度隨分錄走(PR #6725 review R1):
       * 沒有年度的匯入項在跨年度合併時無從分辨,會留下孤兒列被算進總量。
       * 年度取自盤查狀態(由萃取而來);沒有就不帶,合併端會退回舊行為。
       */
      const result = buildImportedLedger({
        sourceTables: tables,
        year: inventoryYearRef.current,
      });
      if (result.disclosure === null) return;
      importedLedgerById.set(item.paragraphId, result);
    });
    const importedEntries = Array.from(importedLedgerById.values()).flatMap(
      (result) => result.entries,
    );
    /**
     * Info: (20260804 - Tzuhan) 建表時要看到「併入匯入項目之後」的帳本。
     *
     * `applyImportedLedgerEntries` 走 setState,要到下一輪 render 才生效,
     * 但 `normalizeImported` 在本輪就要拿 ledger 去產系統表格 ——
     * 用 `computedLedgerRef.current` 等於拿併入前的舊帳本建表,首次落地必定少了匯入項目。
     * 先前看不出來,是因為表格本來就把匯入項目過濾掉、一律印「資料不足」;
     * 一旦小計表開始吃匯入資料,這個時序就會直接變成錯誤的數字。
     *
     * 合併規則與 `applyImportedLedgerEntries` 相同(以 activityKey 取代、只換 IMPORTED),
     * 小計一律走 `summarizeLedgerEntries` —— 前端自己再累加一次,遲早與後端不一致。
     */
    const ledgerForTables =
      importedEntries.length > 0
        ? mergeImportedLedgerEntries(computedLedgerRef.current, importedEntries)
        : computedLedgerRef.current;
    /**
     * Info: (20260801 - Tzuhan) 改由組裝器決定版面順序(Issue A 第 4 點):
     * 敘述 → 原文照錄的表格 → 系統計算表格 → 對帳。
     * 原文表格帶自己的錨點命名空間,故不受 stripLlmTables 剝除;
     * 系統表格仍只由 computedLedger 產出,兩者並存但絕不合併。
     */
    const normalizeImported = (
      paragraph: IReportParagraph,
      imported: string,
    ): string => {
      const sourceTables = sourceTablesById.get(paragraph.id) ?? [];
      // Info: (20260803 - Tzuhan) 有表3.8 的段落附上對帳說明(原文總量 vs 系統加總 + 揭露)
      const reconciliation =
        importedLedgerById.get(paragraph.id)?.disclosure ?? undefined;
      if (!paragraph.isDataDriven) {
        return sourceTables.length > 0
          ? composeParagraphContent({
              content: imported,
              sourceTables,
              reconciliation,
            })
          : imported;
      }
      return composeParagraphContent({
        content: stripLlmTables(imported),
        sourceTables,
        dataTableBlock: buildCarbonDataTable(ledgerForTables, dataTableLabels),
        reconciliation,
      });
    };
    setSessionsData((prev) => {
      const session = prev[activeSessionId];
      if (!session?.reportData?.paragraphs) return prev;
      // Info: (20260716 - Tzuhan) 報告保真:逐段 patch rawMarkdown(權威來源存在時)
      let nextRaw = session.reportData.rawMarkdown;
      if (nextRaw) {
        session.reportData.paragraphs.forEach((p) => {
          const imported = contentById.get(p.id);
          if (imported !== undefined && nextRaw) {
            nextRaw = patchMarkdownSection(
              nextRaw,
              p.title,
              normalizeImported(p, imported),
            );
          }
        });
      }
      return {
        ...prev,
        [activeSessionId]: {
          ...session,
          // Info: (20260806 - Tzuhan) 套用匯入是動作:清單依此把這一房排到最上面
          updatedAt: new Date().toISOString(),
          reportData: {
            ...session.reportData,
            rawMarkdown: nextRaw,
            /**
             * Info: (20260804 - Tzuhan) 記下這份報告的來歷,只在此寫入一次。
             *
             * 段落層的 origin 不夠:任何編輯都會把它改成 MANUAL,
             * 改幾節就掉幾個;計數歸零時工具列那塊 UI 直接消失,
             * 「改過的匯入報告」與「從未匯入過」因此在畫面上完全同形。
             * 匯入是發生過的事實,不該隨後續編輯蒸發。
             */
            importedFrom: session.reportData.importedFrom ?? {
              fileName: pendingImport.fileName,
              importedAt: new Date().toISOString(),
            },
            paragraphs: session.reportData.paragraphs.map((p) => {
              const imported = contentById.get(p.id);
              if (imported === undefined) return p;
              // Info: (20260716 - Tzuhan) 匯入內容原樣落地;查核重置(匯入的舊報告不可信任為已驗證)
              // Info: (20260730 - Tzuhan) 數據段落例外:表格改掛決定論引擎產出(見 normalizeImported)
              return {
                ...p,
                content: normalizeImported(p, imported),
                isCompleted: true,
                isVerified: false,
                origin: originById.get(p.id) ?? ParagraphOriginEnum.IMPORTED,
              };
            }),
          },
        },
      };
    });
    const activities = importActivitiesRef.current;
    if (activities.length > 0) {
      applyInventoryExtraction({ activities });
    }
    /**
     * Info: (20260827 - Emily) 阻擋紀錄**無條件收集**(PR #6725 round-2 低-1)。
     *
     * 原本它在 `else` 裡 —— 也就是「完全沒有任何分錄入帳」才收。
     * 一份報告若有兩個段落各自產生分錄、其中一個勾稽被擋另一個成功,
     * 就會走 apply 分支,而被擋那半**一筆紀錄都不留**:
     * 帳本只有成功的一半,畫面上卻沒有任何地方提過另一半被擋 ——
     * 圖表於是用半套資料畫出一張桑基圖,而本 PR 新增的那句文案自己在警告這件事
     * (「半套資料入帳會讓每張圖都錯得很像對的」)。
     */
    const blocks = Array.from(importedLedgerById.entries())
      .filter(
        ([, result]) =>
          result.blockedReason !== null || result.missingLedgerTable,
      )
      .map(([paragraphId, result]) => ({
        paragraphId,
        // Info: (20260804 - Tzuhan) 「該有表3.8 卻沒拿到」與「有表但勾稽沒過」是兩件事
        reason: result.missingLedgerTable
          ? `缺少 ${LEDGER_SOURCE_TABLE_NO}(同節有全公司總量表,疑似被頁碼切片切掉)`
          : (result.blockedReason ?? "未知原因"),
        blockedAt: new Date().toISOString(),
      }));
    if (importedEntries.length > 0) {
      applyImportedLedgerEntries(importedEntries);
    }
    if (blocks.length > 0) {
      console.warn("[carbon-chat] imported ledger blocked", blocks);
      /**
       * Info: (20260825 - Emily) #6707:留進 channel 狀態,讓「有沒有異常」問得到答案。
       * Info: (20260827 - Emily) 順序有意義(round-2 低-1):
       * `applyImportedLedgerEntries` 成功入帳時會清掉阻擋紀錄
       * (「紀錄描述的狀態已不存在」),而部分成功部分被擋時那句話只對成功那半成立 ——
       * 所以這次的紀錄要在 apply **之後**寫回去,兩個 setState 依序生效,後者為準。
       */
      recordLedgerImportBlocks(blocks);
      // Info: (20260825 - Emily) #6667:ref 同步更新 —— 本輪稍後的建表就要用,等不到下一輪 render
      ledgerImportBlocksRef.current = blocks;
    }
    importActivitiesRef.current = [];
    /**
     * Info: (20260805 - Tzuhan) 在聊天室留下一則匯入摘要,並且**要入庫**。
     *
     * 匯入原本全程不產生任何聊天訊息 —— 一份 64 頁的報告落地 33 個段落,
     * 對話裡卻只剩招呼語。段落層的 origin 會被編輯抹掉,報告層的 importedFrom
     * 只有檔名與時間;「當時發生了什麼」需要一則按時序排在對話裡、且能撐過重載的記錄。
     *
     * 只送事實,文案由伺服端組出 —— 入庫的是系統的陳述,不能由前端塞任意字串。
     * 送失敗不影響匯入本身(內容已經落地了),但不可靜默:那會讓「沒有記錄」
     * 與「記錄送失敗」在畫面上完全同形。
     */
    void (async () => {
      /**
       * Info: (20260806 - Tzuhan) 帶上真正的收件公鑰(xpub)。
       *
       * 原本沒帶,而伺服端以 `sessionUser.address` 補位 —— 那是 `0x…` 十六進位位址,
       * 不是 base58 xpub,於是 ECIES 加密在底層炸開,這條端點從上線起
       * **一次都沒成功過**(500:`invalid base58 value (argument="letter", value="0")`)。
       * 表現正是使用者回報的「匯入後聊天室依舊沒有記錄」。
       *
       * 沒有金鑰時不發請求:發了必定 500,而 500 只會在 log 裡多一行看不懂的 base58 錯誤。
       */
      const recipientPublicKey = masterKeyRef.current?.extendedPublicKey;
      if (!recipientPublicKey) {
        console.warn(
          "[carbon-chat] import notice skipped: no master key",
          activeSessionId,
        );
        return;
      }
      try {
        await request("/api/v1/chat/carbon/import/notice", {
          method: "POST",
          body: JSON.stringify({
            // Info: (20260806 - Tzuhan) 已寫進報告的那一則(對照 PARSED:解析完成但尚未寫入)
            kind: CarbonImportNoticeKindEnum.SUMMARY,
            channel: buildCarbonChatChannel(
              user?.address ?? "anonymous",
              activeSessionId,
            ),
            recipientPublicKey,
            fileName: pendingImport.fileName,
            importedCount: selected.filter((item) => !item.isDraft).length,
            draftedCount: selected.filter((item) => item.isDraft).length,
            reconciliation:
              importedEntries.length > 0
                ? CarbonImportReconciliationStateEnum.RECONCILED
                : importedLedgerById.size > 0
                  ? CarbonImportReconciliationStateEnum.BLOCKED
                  : CarbonImportReconciliationStateEnum.NONE,
            failedChapters: (pendingImport.failedChapters ?? []).map(
              (chapter) => chapter.title,
            ),
            language,
          }),
        });
      } catch (error) {
        console.error("[carbon-chat] import notice failed:", error);
      }
    })();
    setPendingImportFor(activeSessionId, null);
    // Info: (20260806 - Tzuhan) 已寫進報告 → 待匯入紀錄的生命週期到此結束(留著會在重載後又冒出一張預覽卡)
    void clearPersistedPendingImport(activeSessionId);
    jumpToReportParagraph(selected[0].paragraphId);

    // Info: (20260730 - Tzuhan) 匯入落地後為有對應模板的段落補結構圖(治理架構/範疇對應/量化流程)。
    // Info: (20260730 - Tzuhan) 循序執行(專案禁 await-in-loop):一次一張,避免同時寫入同一份報告狀態。
    const diagramTargets = selected.filter((item) =>
      findDiagramTemplateForParagraph(item.paragraphId),
    );
    // Info: (20260803 - Tzuhan) 這一行是為了讓「圖一張都沒出來」能被現場還原:
    // Info: (20260803 - Tzuhan) 先知道有幾段進候選、是哪幾段,才談得上查為什麼沒畫。
    console.info("[carbon-chat] diagram phase start", {
      candidates: diagramTargets.map((item) => item.paragraphId),
      selected: selected.length,
    });
    /**
     * Info: (20260804 - Tzuhan) 同節的原文表格也是畫圖素材(issue_drafts/inventory_table_import/05)。
     *
     * 原本只傳 item.content(敘述),把該節最有結構的部分排除在外。
     * 2.3 範疇對應圖真正的素材就是表2.2 —— 類別與排放源的層級全在表裡,
     * 敘述只有兩行,於是圖只畫得出兩個節點。
     *
     * 這不會放寬防捏造護欄:節點文字仍必須能在傳入的原文中找到,
     * 只是「原文」的範圍從敘述擴到同節的逐字表格 —— 兩者都是原文,
     * 差別只在先前漏給了一半。
     */
    const withSourceTables = (paragraphId: string, content: string): string => {
      const tables = sourceTablesById.get(paragraphId) ?? [];
      if (tables.length === 0) return content;
      return [
        content,
        ...tables.map((table) => `${table.caption}\n\n${table.markdown}`),
      ].join("\n\n");
    };
    void diagramTargets
      .reduce(async (previous, item, index) => {
        await previous;
        // Info: (20260730 - Tzuhan) 逐張間隔:匯入本身已吃掉當分鐘的限流額度,連發必被 429 擋掉
        if (index > 0) {
          await new Promise((resolve) => {
            setTimeout(resolve, CARBON_DIAGRAM_THROTTLE_MS);
          });
        }
        /**
         * Info: (20260803 - Tzuhan) 這個階段要有進度,否則使用者看到的是「匯入完成但沒有圖」。
         * 實測回報即為「所有圖表不見了」:它最長會跑近兩分鐘(單張逾時 + 退避重試 + 每張間隔),
         * 期間畫面完全沒有痕跡,於是「還沒畫」與「畫不出來」在使用者眼裡完全相同。
         */
        notify({
          type: "loading",
          text: t("carbon_chatbot.import_generating_diagrams", {
            current: index + 1,
            total: diagramTargets.length,
          }),
        });
        // Info: (20260730 - Tzuhan) 傳入剛落地的內容:此刻 setSessionsData 尚未生效,讀狀態會拿到空值
        await generateParagraphDiagram(
          item.paragraphId,
          withSourceTables(item.paragraphId, item.content),
        );
      }, Promise.resolve())
      // Info: (20260803 - Tzuhan) 圖是加值不是前提:全部跑完(含失敗)即收掉提示,不留常駐 loading
      .finally(() => notify(null));
  }, [
    pendingImport,
    activeSessionId,
    applyInventoryExtraction,
    jumpToReportParagraph,
    dataTableLabels,
    generateParagraphDiagram,
    applyImportedLedgerEntries,
    recordLedgerImportBlocks,
    t,
    setDraftNotice,
    dismissDraftNoticeAfter,
    setPendingImportFor,
    // Info: (20260805 - Tzuhan) 匯入摘要訊息用到:頻道由 address 組出,文案語言由此決定
    user?.address,
    language,
    clearPersistedPendingImport,
  ]);

  const discardPendingImport = useCallback(() => {
    importActivitiesRef.current = [];
    setPendingImportFor(activeSessionId, null);
    // Info: (20260806 - Tzuhan) 使用者明確捨棄:DB 那份也要刪,否則重載後它又回來了
    void clearPersistedPendingImport(activeSessionId);
  }, [activeSessionId, setPendingImportFor, clearPersistedPendingImport]);

  // Info: (20260806 - Tzuhan) 當前會話的預覽卡是否被收起(「稍後再說」或重載還原)
  const isPreviewDeferred = Boolean(deferredPreviewSessions[activeSessionId]);

  /**
   * Info: (20260806 - Tzuhan) 「稍後再說」:只收起預覽卡,內容留著(DB 那份不動)。
   *
   * 這是使用者要的第三個選項。原本只有套用與捨棄兩條路,
   * 而「我想先看看報告再決定」在那兩條路裡沒有位置 —— 關掉卡片等於丟掉幾分鐘的解析。
   */
  const deferImportPreview = useCallback(() => {
    setDeferredPreviewSessions((prev) => ({
      ...prev,
      [activeSessionId]: true,
    }));
  }, [activeSessionId]);

  // Info: (20260806 - Tzuhan) 從輸入列上方那條提示重新打開預覽卡
  const openImportPreview = useCallback(() => {
    setDeferredPreviewSessions((prev) => {
      if (!prev[activeSessionId]) return prev;
      const rest = { ...prev };
      delete rest[activeSessionId];
      return rest;
    });
  }, [activeSessionId]);

  // Info: (20260716 - Tzuhan) #55 套用修訂:寫入段落(取消查核)並高亮;人工 gate 的唯一落地點
  const applyPendingRevision = useCallback(() => {
    if (!pendingRevision) return;
    const { paragraphId, revised } = pendingRevision;
    setSessionsData((prev) => {
      const session = prev[activeSessionId];
      if (!session?.reportData?.paragraphs) return prev;
      const targetTitle = session.reportData.paragraphs.find(
        (p) => p.id === paragraphId,
      )?.title;
      // Info: (20260716 - Tzuhan) 報告保真:同步 patch rawMarkdown(權威來源)
      const nextRaw =
        session.reportData.rawMarkdown && targetTitle
          ? patchMarkdownSection(
              session.reportData.rawMarkdown,
              targetTitle,
              revised,
            )
          : session.reportData.rawMarkdown;
      return {
        ...prev,
        [activeSessionId]: {
          ...session,
          reportData: {
            ...session.reportData,
            rawMarkdown: nextRaw,
            paragraphs: session.reportData.paragraphs.map((p) =>
              p.id === paragraphId
                ? { ...p, content: revised, isVerified: false }
                : p,
            ),
          },
        },
      };
    });
    setPendingRevision(null);
    jumpToReportParagraph(paragraphId);
  }, [pendingRevision, activeSessionId, jumpToReportParagraph]);

  const discardPendingRevision = useCallback(() => {
    setPendingRevision(null);
  }, []);

  /**
   * Info: (20260720 - Tzuhan) #51 插入模板圖表至段落:
   * 圖表區塊由白名單模板從 computedLedger 決定性產出(LLM 只裁決了「哪張圖、放哪段」);
   * 同模板已存在 → 原地替換不疊加;rawMarkdown 同步 patch(權威來源);插入後跳段高亮
   */
  const insertChartIntoParagraph = useCallback(
    (templateId: CarbonChartTemplateEnum, paragraphId: string) => {
      const block = buildCarbonChartBlock(
        templateId,
        activeInventoryState?.computedLedger,
        chartLabels,
        dataTableLabels,
        // Info: (20260825 - Emily) #6667:被擋時說被擋的原因,不說「未取得該表」
        activeInventoryState?.ledgerImportBlocks,
      );
      setSessionsData((prev) => {
        const session = prev[activeSessionId];
        const reportData = session?.reportData;
        if (!reportData?.paragraphs) return prev;
        const target = reportData.paragraphs.find((p) => p.id === paragraphId);
        if (!target) return prev;
        const nextContent = insertCarbonChartBlock(
          target.content,
          templateId,
          block,
        );
        const nextRaw = reportData.rawMarkdown
          ? patchMarkdownSection(
              reportData.rawMarkdown,
              target.title,
              nextContent,
            )
          : reportData.rawMarkdown;
        return {
          ...prev,
          [activeSessionId]: {
            ...session,
            reportData: {
              ...reportData,
              rawMarkdown: nextRaw,
              paragraphs: reportData.paragraphs.map((p) =>
                p.id === paragraphId
                  ? {
                      ...p,
                      content: nextContent,
                      isCompleted: true,
                      // Info: (20260720 - Tzuhan) 內容更新即重置查核(零信任)
                      isVerified: false,
                    }
                  : p,
              ),
            },
          },
        };
      });
      jumpToReportParagraph(paragraphId);
    },
    [
      activeSessionId,
      activeInventoryState?.computedLedger,
      chartLabels,
      dataTableLabels,
      jumpToReportParagraph,
    ],
  );

  // Info: (20260714 - Tzuhan) 將草稿寫入 reportData:標記完成、重置查核(單一寫入點,對話生成與附件管線共用)
  // Info: (20260714 - Tzuhan) content 只存內文;`### {標題}` 標頭由報告預覽組稿時產生,格式變更不需資料遷移
  // Info: (20260714 - Tzuhan) onlyIfEmpty:歷史還原補寫時只填空白段落,避免覆蓋使用者後續的編輯
  // Info: (20260720 - Tzuhan) #23 數據段落組裝制:LLM 只留敘述(夾帶表格一律丟棄),
  // Info: (20260720 - Tzuhan) 表格由 TS 從 computedLedger 決定性產出注入(守恆違反 → 凍結告警取代)
  const applyDraftToReport = useCallback(
    (draft: IParagraphDraft, options?: { onlyIfEmpty?: boolean }) => {
      const section = CARBON_REPORT_OUTLINE.find(
        (s) => s.id === draft.paragraphId,
      );
      if (!section) return;

      // Info: (20260722 - Tzuhan) UAT:讀 ref 取當下 ledger(匯入→自動草稿的長流程中,
      // Info: (20260722 - Tzuhan) closure 捕獲的舊空 ledger 會讓表格印佔位、桑基圖被跳過)
      const ledgerNow = computedLedgerRef.current;
      let content = section.isDataDriven
        ? injectDataTable(
            stripLlmTables(draft.content),
            buildCarbonDataTable(ledgerNow, dataTableLabels),
          )
        : draft.content;

      // Info: (20260721 - Tzuhan) UAT:排放總量匯總段自動附掛碳流量桑基圖(憑證→排放源→Scope);
      // Info: (20260721 - Tzuhan) mermaid 原始碼進 Markdown 輸入區,PDF 預覽同步渲染;重算連動自動重繪
      if (
        section.id === CARBON_AUTO_SANKEY_PARAGRAPH_ID &&
        (ledgerNow?.entries.length ?? 0) > 0
      ) {
        // Info: (20260803 - Tzuhan) 與補位 effect 同一條規則:切面由 provenance 決定
        const sankeyTemplate = ledgerNow?.entries.some(isImportedEntry)
          ? CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY
          : CarbonChartTemplateEnum.EMISSION_SANKEY;
        content = insertCarbonChartBlock(
          content,
          sankeyTemplate,
          buildCarbonChartBlock(
            sankeyTemplate,
            ledgerNow,
            chartLabels,
            dataTableLabels,
            // Info: (20260825 - Emily) #6667:ref 而非 state —— 本輪 setState 還沒生效
            ledgerImportBlocksRef.current,
          ),
        );
      }

      // Info: (20260720 - Tzuhan) #54 第三章數據段落 + 帳本會話 → 自動附掛證據鏈區塊
      // Info: (20260720 - Tzuhan) (fence 只存帳本位址;數據由元件實時問 API,層層下鑽至單一憑證)
      const boundBookId = sessionAccess[chatChannel]?.accountBookId;
      if (
        section.chapterId === CARBON_EVIDENCE_CHAPTER_ID &&
        section.isDataDriven &&
        boundBookId &&
        !hasEvidenceChainBlock(content)
      ) {
        content = `${content}\n\n${buildEvidenceChainBlock(boundBookId)}`;
      }

      setSessionsData((prev) => {
        const session = prev[activeSessionId];
        const reportData = session?.reportData;
        if (!reportData?.paragraphs) return prev;

        const newParagraphs = reportData.paragraphs.map((p) => {
          if (p.id !== draft.paragraphId) return p;
          if (options?.onlyIfEmpty && p.content) return p;
          return {
            ...p,
            content,
            isCompleted: true,
            // Info: (20260714 - Tzuhan) 內容更新即重置查核狀態(零信任: 先有產出才有查核)
            isVerified: false,
            // Info: (20260730 - Tzuhan) 本路徑為 AI 撰寫草稿(對話蒐集/目錄的 AI 撰寫鈕),標記來源以與逐字匯入區分
            origin: ParagraphOriginEnum.AI_DRAFT,
          };
        });

        // Info: (20260716 - Tzuhan) 報告保真:rawMarkdown 存在時以標題 patch 對應段落(不重排文件結構)
        const targetTitle = newParagraphs.find(
          (p) => p.id === draft.paragraphId,
        )?.title;
        const nextRaw =
          reportData.rawMarkdown && targetTitle
            ? patchMarkdownSection(reportData.rawMarkdown, targetTitle, content)
            : reportData.rawMarkdown;

        // Info: (20260716 - Tzuhan) 純 immutable 構造(react-hooks/immutability):不對 spread 副本再賦值
        return {
          ...prev,
          [activeSessionId]: {
            ...session,
            reportData: {
              ...reportData,
              rawMarkdown: nextRaw,
              paragraphs: newParagraphs,
            },
          },
        };
      });
    },
    [activeSessionId, dataTableLabels, chartLabels, sessionAccess, chatChannel],
  );

  /**
   * Info: (20260720 - Tzuhan) #23 重算連動:computedLedger 更新 →
   * 1. 已注入表格的數據段落自動重注入(敘述零改動,查核重置)
   * 2. categories/totalEmissions 接引擎真值(字串化 Decimal,廢除空殼佔位)
   * computedAt 戳記 guard 防重複執行;表格內容相同時不換參考(不觸發 autosave)
   */
  const lastLedgerStampRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const ledger = activeInventoryState?.computedLedger;
    if (!ledger) return;
    if (lastLedgerStampRef.current.get(chatChannel) === ledger.computedAt) {
      return;
    }
    lastLedgerStampRef.current.set(chatChannel, ledger.computedAt);

    const tableBlock = buildCarbonDataTable(ledger, dataTableLabels);
    const nextCategories: IReportCategory[] = Object.entries(
      ledger.scopeSubtotals,
    ).map(([scope, subtotal]) => ({
      id: scope,
      name: scope,
      description: "",
      emissions: subtotal,
    }));

    let tableRefreshed = false;
    setSessionsData((prev) => {
      const session = prev[activeSessionId];
      const reportData = session?.reportData;
      if (!reportData?.paragraphs) return prev;

      let nextRaw = reportData.rawMarkdown;
      let paragraphsChanged = false;
      const nextParagraphs = reportData.paragraphs.map((p) => {
        if (!p.content) return p;
        let nextContent = p.content;
        if (p.isDataDriven && hasInjectedDataTable(nextContent)) {
          nextContent = injectDataTable(nextContent, tableBlock);
        }
        // Info: (20260720 - Tzuhan) #51 模板圖表同步重建(任何段落;白名單逐一檢查,敘述零改動)
        if (hasCarbonChartBlocks(nextContent)) {
          nextContent = refreshCarbonChartBlocks(
            nextContent,
            ledger,
            chartLabels,
            dataTableLabels,
          );
        }
        if (nextContent === p.content) return p;
        paragraphsChanged = true;
        if (nextRaw) {
          nextRaw = patchMarkdownSection(nextRaw, p.title, nextContent);
        }
        // Info: (20260720 - Tzuhan) 數字變動即重置查核(零信任:數據更新需重新人工確認)
        return { ...p, content: nextContent, isVerified: false };
      });

      const totalsChanged =
        reportData.totalEmissions !== ledger.totalCo2eKg ||
        JSON.stringify(reportData.categories) !==
          JSON.stringify(nextCategories);
      if (!paragraphsChanged && !totalsChanged) return prev;
      tableRefreshed = paragraphsChanged;
      return {
        ...prev,
        [activeSessionId]: {
          ...session,
          reportData: {
            ...reportData,
            rawMarkdown: nextRaw,
            paragraphs: nextParagraphs,
            categories: nextCategories,
            totalEmissions: ledger.totalCo2eKg,
          },
        },
      };
    });

    // Info: (20260720 - Tzuhan) 高亮提示(非阻斷 info,自動消失):數據表格已隨活動數據更新
    // Info: (20260720 - Tzuhan) setState 後同步讀 flag:updater 於 React 18 同步執行,此處可安全讀取
    if (tableRefreshed) {
      setDraftNotice({
        type: "info",
        text: t("carbon_chatbot.data_table_refreshed"),
      });
      dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS);
    }
  }, [
    activeInventoryState?.computedLedger,
    chatChannel,
    activeSessionId,
    dataTableLabels,
    chartLabels,
    t,
    setDraftNotice,
    dismissDraftNoticeAfter,
  ]);

  /**
   * Info: (20260722 - Tzuhan) UAT:匯總段(3.6)桑基圖補位 — 獨立 effect,不依賴重算戳記。
   * 涵蓋所有時序:草稿先落地 ledger 後到、既有會話還原、切換會話。
   * 冪等護欄:插入後 hasCarbonChartBlocks 為真,後續執行一律 no-op(不會迴圈)。
   */
  useEffect(() => {
    const ledger = activeInventoryState?.computedLedger;
    const reportData = sessionsData[activeSessionId]?.reportData;
    const wasImported = Boolean(reportData?.importedFrom);
    const hasLedgerEntries = Boolean(ledger && ledger.entries.length > 0);
    /**
     * Info: (20260806 - Tzuhan) 匯入過的報告即使帳本是空的也要插入這個區塊。
     *
     * 原本 `ledger.entries.length === 0` 直接 return —— 於是表3.8 沒進來時
     * 3.6 連錨點都沒有,畫面上只剩「資料不足,補齊活動數據」那句
     * (那是系統數據表格的文案,而它指的方向對匯入路徑是錯的)。
     * 使用者看到的是「桑基圖又不見了」而報告本身一句話都沒解釋。
     *
     * 插入之後有兩個好處:區塊裡會說出真正的原因(見 importedSankeyNoLedger),
     * 而且錨點存在,帳本後來補上時 refreshCarbonChartBlocks 會就地把圖填進去。
     *
     * 沒匯入過而帳本空的會話仍然跳過:那時 3.6 本來就還沒有內容可談。
     */
    if (!hasLedgerEntries && !wasImported) return;
    const target = reportData?.paragraphs?.find(
      (p) => p.id === CARBON_AUTO_SANKEY_PARAGRAPH_ID,
    );
    if (!target?.content || hasCarbonChartBlocks(target.content)) return;

    /**
     * Info: (20260803 - Tzuhan) 切面由 provenance 決定(Issue C 第 1 點):
     * 匯入的報告畫「廠址 → 類別 → 排放形式」,憑證帳本畫「憑證 → 排放源 → 範疇」。
     * 兩者的可信依據不同(外部已查證的年度事實 vs 本系統可下鑽的帳本),
     * 混在同一張圖裡會讓查核者無法判斷任一條流量的來源,故各用各的模板。
     *
     * Info: (20260806 - Tzuhan) 帳本空的時候 entries 判不出切面,改看報告的匯入來歷 ——
     * 那正是「該畫匯入圖卻沒有資料」的情形,說明文字也必須是匯入路徑的那一份。
     */
    /**
     * Info: (20260806 - Tzuhan) 匯入路徑掛**兩張**:排放去向 + 分類切面。
     *
     * 原本一張硬塞五層,而範疇 → ISO 類別 對類別一/二是 1:1 —— 1:1 的層在 sankey 上
     * 必然讓標籤互相重疊(見 buildImportedSankey 的檔頭)。
     * 「排放去哪了」與「怎麼分類的」是兩個問題,分開畫各自都只有三層,橫向才有空間。
     *
     * 兩張各有自己的錨點命名空間,所以可以並存、各自替換互不覆蓋 ——
     * 那個可能性 CarbonChartTemplateEnum 的註解早就留著了,這次才真的用上。
     */
    const templateIds =
      (ledger?.entries ?? []).some(isImportedEntry) ||
      (!hasLedgerEntries && wasImported)
        ? [
            CarbonChartTemplateEnum.IMPORTED_TOP_ITEMS_SANKEY,
            CarbonChartTemplateEnum.IMPORTED_EMISSION_SANKEY,
          ]
        : [CarbonChartTemplateEnum.EMISSION_SANKEY];
    const nextContent = templateIds.reduce(
      (content, templateId) =>
        insertCarbonChartBlock(
          content,
          templateId,
          buildCarbonChartBlock(
            templateId,
            ledger,
            chartLabels,
            dataTableLabels,
            // Info: (20260825 - Emily) #6667:同上,ref 是同步的權威
            ledgerImportBlocksRef.current,
          ),
        ),
      target.content,
    );
    setSessionsData((prev) => {
      const session = prev[activeSessionId];
      const prevReport = session?.reportData;
      if (!prevReport?.paragraphs) return prev;
      const nextRaw = prevReport.rawMarkdown
        ? patchMarkdownSection(
            prevReport.rawMarkdown,
            target.title,
            nextContent,
          )
        : prevReport.rawMarkdown;
      return {
        ...prev,
        [activeSessionId]: {
          ...session,
          reportData: {
            ...prevReport,
            rawMarkdown: nextRaw,
            paragraphs: prevReport.paragraphs.map((p) =>
              p.id === CARBON_AUTO_SANKEY_PARAGRAPH_ID
                ? { ...p, content: nextContent, isVerified: false }
                : p,
            ),
          },
        },
      };
    });
  }, [
    activeInventoryState?.computedLedger,
    sessionsData,
    activeSessionId,
    chartLabels,
    dataTableLabels,
  ]);

  /**
   * Info: (20260804 - Tzuhan) 結構圖補位 —— 比照上面桑基圖那個 effect。
   *
   * 為什麼需要:桑基圖與結構圖的失敗後果原本天差地遠。
   * 桑基圖是純本地計算,上面那個 effect 每次載入都會檢查並補上,錯過一次無所謂;
   * 結構圖走 LLM + 網路,而它**只在匯入套用的那一次 fire-and-forget** ——
   * 那 5 次呼叫若整批失敗(限流、90 秒逾時撞閘道、切房中斷),就永久沒有圖,
   * 沒有任何機制會再試。實測整份報告一個 carbon-diagram 錨點都沒有,即是此故。
   * 被護欄拒絕仍會插入錨點(內含原因文字),所以「零錨點」只可能是呼叫從未成功。
   *
   * 一次只掃一段並節流:這條路要燒 LLM 額度,與匯入共用同一個 bucket。
   * 全部並發等於自己把自己限流,那正是原本可能的失敗原因之一。
   *
   * 每個(會話, 段落)一輪頁面生命週期只試一次(diagramAttemptedRef)。
   * 失敗不重排 —— 否則 effect 會在每次 sessionsData 變動時重試,把額度燒光。
   * 想再試就重新載入頁面,這是刻意的:自動重試的上限交給人,比交給計時器安全。
   */
  const diagramAttemptedRef = useRef<Set<string>>(new Set());
  const diagramSweepRunningRef = useRef<boolean>(false);
  useEffect(() => {
    if (diagramSweepRunningRef.current) return;
    const paragraphs =
      sessionsData[activeSessionId]?.reportData?.paragraphs ?? [];
    const pending = paragraphs.filter((p) => {
      const templateId = findDiagramTemplateForParagraph(p.id);
      if (!templateId || !p.content) return false;
      if (hasCarbonDiagramBlock(p.content, templateId)) return false;
      return !diagramAttemptedRef.current.has(`${activeSessionId}:${p.id}`);
    });
    if (pending.length === 0) return;

    diagramSweepRunningRef.current = true;
    const originSessionId = activeSessionId;
    console.info("[carbon-chat] diagram backfill start", {
      candidates: pending.map((p) => p.id),
    });
    // Info: (20260804 - Tzuhan) 循序執行(專案禁 await-in-loop):與匯入路徑同一種寫法
    void pending
      .reduce(async (previous, paragraph, index) => {
        await previous;
        // Info: (20260804 - Tzuhan) 使用者切走就停:寫入目標是 activeSessionId,寫錯房間是靜默的災難
        if (activeSessionIdRef.current !== originSessionId) return;
        if (index > 0) {
          await new Promise((resolve) => {
            setTimeout(resolve, CARBON_DIAGRAM_THROTTLE_MS);
          });
        }
        diagramAttemptedRef.current.add(`${originSessionId}:${paragraph.id}`);
        await generateParagraphDiagram(paragraph.id, paragraph.content);
      }, Promise.resolve())
      .finally(() => {
        diagramSweepRunningRef.current = false;
      });
  }, [sessionsData, activeSessionId, generateParagraphDiagram]);

  // Info: (20260712 - Luphia) 載入歷史訊息（密文→以主私鑰解密）；before 省略為最新一頁，否則載入更舊一頁並前置
  const loadHistory = useCallback(
    async (before?: string): Promise<number> => {
      const master = masterKeyRef.current;
      if (!master) return 0;
      setIsLoadingHistory(true);
      try {
        const res = await request<{
          payload: {
            messages: (IEciesEnvelope & { id: string; createdAt: string })[];
            oldestCreatedAt: string | null;
            hasMore: boolean;
          } | null;
        }>("/api/v1/chat/carbon/history", {
          query: { channel: chatChannel, ...(before ? { before } : {}) },
        });

        const payload = res.payload;
        if (!payload) return 0;

        const decrypted: IChatMessage[] = [];
        const historyDrafts: IParagraphDraft[] = [];
        let undecryptable = 0;
        for (const envelope of payload.messages) {
          try {
            const plaintext = await eciesDecrypt(
              master.extendedPrivateKey,
              envelope,
            );
            const { message, drafts } = JSON.parse(plaintext) as {
              message: IChatMessage;
              drafts?: IParagraphDraft[];
            };
            decrypted.push(message);
            // Info: (20260714 - Tzuhan) 歷史訊息隨附的草稿收集起來補寫空白段落(報告 DB 保存失敗時的保底)
            if (drafts && drafts.length > 0) historyDrafts.push(...drafts);
          } catch {
            // Info: (20260712 - Luphia) 個別訊息解密失敗則略過
            undecryptable += 1;
          }
        }
        /**
         * Info: (20260804 - Tzuhan) 解密失敗原本是空 catch、零痕跡。
         *
         * 後果:整頁都解不開時 `decrypted` 為 [],而第一頁載入是**整組覆蓋**
         * (見下方 `session.messages = ... : decrypted`),於是聊天紀錄整個變空 ——
         * 畫面上與「這個房間本來就沒講過話」完全同形,而資料其實還在 DB 裡。
         * 略過個別壞訊息是對的,但不能連略過了幾則都不說。
         */
        if (undecryptable > 0) {
          console.warn("[carbon-chat] history messages undecryptable", {
            channel: chatChannel,
            undecryptable,
            total: payload.messages.length,
          });
        }

        // Info: (20260714 - Tzuhan) 只填空白段落(onlyIfEmpty): 不覆蓋 DB 草稿還原或使用者編輯後的內容
        historyDrafts.forEach((draft) =>
          applyDraftToReport(draft, { onlyIfEmpty: true }),
        );

        setSessionsData((prev) => {
          const existing = resolveSession(prev, activeSessionId);
          // Info: (20260803 - Tzuhan) 同上:會話已不在(切帳本/封存)就不回填歷史
          if (!existing) return prev;
          const session = { ...existing };
          session.messages = before
            ? [...decrypted, ...session.messages]
            : decrypted;
          // Info: (20260714 - Tzuhan) DB 還原的房間無標題快取時，以首則使用者訊息補標題(僅預設標題可覆寫)
          const firstUserMessage = session.messages.find(
            (m) => m.sender === ChatRoleEnum.USER,
          );
          if (
            firstUserMessage?.text &&
            !session.isTitleCustom &&
            session.title === t("carbon_chatbot.new_session_title")
          ) {
            session.title = firstUserMessage.text.trim().slice(0, 24);
          }
          return { ...prev, [activeSessionId]: session };
        });

        if (payload.oldestCreatedAt) {
          oldestCreatedAtRef.current = payload.oldestCreatedAt;
        }
        setHasMoreHistory(payload.hasMore);
        return payload.messages.length;
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [chatChannel, activeSessionId, t, applyDraftToReport],
  );

  // Info: (20260712 - Luphia) 上卷載入更舊一頁
  const loadMoreHistory = useCallback(async () => {
    if (!hasMoreHistory || isLoadingHistory) return;
    await loadHistory(oldestCreatedAtRef.current ?? undefined);
  }, [hasMoreHistory, isLoadingHistory, loadHistory]);

  const activeSession = sessionsData[activeSessionId];
  // Info: (20260712 - Luphia) 以 useMemo 快取 session 列表，避免每次 render 重建陣列
  // Info: (20260713 - Tzuhan) 有段落大綱的 session,progress 一律以真實完成段落數推導(廢除訊息計次假進度)
  // Info: (20260722 - Tzuhan) UAT:帳本會話與個人會話必須在列表上可辨識 —
  // Info: (20260722 - Tzuhan) 依 sessionAccess 附上綁定帳本名稱(boundBookName;個人會話為 undefined)
  const sessionsList = useMemo(
    () =>
      Object.values(sessionsData).map((session) => {
        const channel = buildCarbonChatChannel(
          user?.address ?? "anonymous",
          session.id,
        );
        const boundBookId = sessionAccess[channel]?.accountBookId;
        const boundBookName = boundBookId
          ? (accountBooks.find((book) => book.id === boundBookId)?.name ??
            boundBookId)
          : undefined;
        const paragraphs = session.reportData?.paragraphs;
        const progress =
          paragraphs && paragraphs.length > 0
            ? Math.round(
                (paragraphs.filter((p) => p.isCompleted).length /
                  paragraphs.length) *
                  100,
              )
            : session.progress;
        return { ...session, progress, boundBookName };
      }),
    [sessionsData, sessionAccess, accountBooks, user?.address],
  );

  /**
   * Info: (20260806 - Tzuhan) 清單依「最近有動作」由新到舊,新增對話因此在最上面。
   *
   * 原本直接吐 `Object.values(sessionsData)` 的插入順序 —— 沒有排序。
   * 看起來像照日期排是因為 API 回的是 createdAt desc,
   * 而新建的會話加在物件最後,於是**新增對話出現在清單最底部**。
   */
  const sortedSessionsList = useMemo(
    () => sortSessionsByRecency(sessionsList),
    [sessionsList],
  );

  // Info: (20260713 - Tzuhan) 完成/查核雙軌統計: 工具列膠囊與進度浮窗共用的單一來源
  const reportStats: IReportProgressStats = useMemo(() => {
    const paragraphs = activeSession?.reportData?.paragraphs ?? [];
    const totalCount = paragraphs.length || CARBON_REPORT_SECTION_COUNT;
    const completedCount = paragraphs.filter((p) => p.isCompleted).length;
    const verifiedCount = paragraphs.filter((p) => p.isVerified).length;
    // Info: (20260730 - Tzuhan) 完成數拆解來源:AI 草稿不得冒充原文照抄(審計文件底線)。
    // Info: (20260730 - Tzuhan) 舊草稿無 origin 欄,兩個分項都不計入,但仍算完成——不追溯捏造來源。
    const importedCount = paragraphs.filter(
      (p) => p.isCompleted && p.origin === ParagraphOriginEnum.IMPORTED,
    ).length;
    const draftedCount = paragraphs.filter(
      (p) => p.isCompleted && p.origin === ParagraphOriginEnum.AI_DRAFT,
    ).length;
    return {
      completedCount,
      verifiedCount,
      totalCount,
      completedPercent: Math.round((completedCount / totalCount) * 100),
      verifiedPercent: Math.round((verifiedCount / totalCount) * 100),
      importedCount,
      draftedCount,
    };
  }, [activeSession]);

  // Info: (20260713 - Tzuhan) 跳段(vibe 模式): 標記進行中段落、將該段撰寫指引寫入 currentStep 供 AI 引導、預填對話輸入
  const jumpToParagraph = useCallback(
    (paragraphId: string) => {
      setActiveParagraphId(paragraphId);
      pendingDraftParagraphIdRef.current = paragraphId;
      const section = CARBON_REPORT_OUTLINE.find((s) => s.id === paragraphId);
      if (!section) return;

      setSessionsData((prev) => {
        const existing = resolveSession(prev, activeSessionId);
        // Info: (20260803 - Tzuhan) 不存在就不寫:否則會憑一個欄位長出一間只有 currentStep 的空會話
        if (!existing) return prev;
        const updatedSession = { ...existing };
        updatedSession.currentStep = `${section.code} ${section.title}：${section.guidance}`;
        return { ...prev, [activeSessionId]: updatedSession };
      });

      // Info: (20260827 - Emily) #6718:跳段預填(同上,經 nonce 下指令)
      commandInput(
        t("carbon_chatbot.jump_prompt", {
          section: `${section.code} ${section.title}`,
        }),
      );
    },
    [activeSessionId, commandInput, t],
  );

  // Info: (20260714 - Tzuhan) 反向連動: 點報告段落 → 捲動至最近一則關聯訊息並閃爍；無關聯訊息則 fallback 為跳段引導
  const focusMessageForParagraph = useCallback(
    (paragraphId: string) => {
      const messages = activeSession?.messages ?? [];
      const related = [...messages]
        .reverse()
        .find((msg) => msg.relatedParagraphIds?.includes(paragraphId));

      if (!related) {
        jumpToParagraph(paragraphId);
        return;
      }

      setFocusedMessageId(related.id);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = null;
        setFocusedMessageId(null);
      }, CARBON_CHAT_HIGHLIGHT_DURATION_MS);
    },
    [activeSession, jumpToParagraph],
  );

  // Info: (20260714 - Tzuhan) 解密 envelope 並追加訊息: Centrifugo 訂閱與 HTTP 回帶共用(遞送雙軌，id 去重)
  // Info: (20260714 - Tzuhan) 訊息隨附的段落草稿在此套用: 報告更新不依賴 HTTP 回應存活(長請求中斷也到得了)
  const processedDraftMessageIdsRef = useRef<Set<string>>(new Set());
  const decryptAndAppendEnvelope = useCallback(
    async (envelope: IEciesEnvelope) => {
      const master = masterKeyRef.current;
      if (!master) return;
      try {
        const plaintext = await eciesDecrypt(
          master.extendedPrivateKey,
          envelope,
        );
        const { message, progressUpdate, drafts } = JSON.parse(plaintext) as {
          message: IChatMessage;
          progressUpdate: number;
          drafts?: IParagraphDraft[];
        };
        appendMessageLocally(message, progressUpdate);

        // Info: (20260714 - Tzuhan) 同一則訊息可能經 HTTP 與訂閱雙軌抵達，以訊息 id 確保草稿只套用一次
        if (
          drafts &&
          drafts.length > 0 &&
          !processedDraftMessageIdsRef.current.has(message.id)
        ) {
          processedDraftMessageIdsRef.current.add(message.id);
          drafts.forEach((draft) => applyDraftToReport(draft));
          jumpToReportParagraph(drafts[0].paragraphId);
        }
      } catch {
        // Info: (20260712 - Luphia) 解密失敗代表非本用戶/非本金鑰的訊息（如惡意跨訂閱），直接忽略
      }
    },
    [appendMessageLocally, applyDraftToReport, jumpToReportParagraph],
  );

  // Info: (20260714 - Tzuhan) 段落草稿生成: 呼叫 draft API 由 AI 撰寫敘述，成功後寫入 reportData 並標記完成(查核歸零重簽)
  const generateParagraphDraft = useCallback(
    async (paragraphId: string) => {
      if (draftingParagraphId) return;
      const sectionIndex = CARBON_REPORT_OUTLINE.findIndex(
        (s) => s.id === paragraphId,
      );
      if (sectionIndex < 0) return;
      const section = CARBON_REPORT_OUTLINE[sectionIndex];

      setDraftingParagraphId(paragraphId);
      setActiveParagraphId(paragraphId);
      // Info: (20260714 - Tzuhan) 生成中顯示狀態列(非對話氣泡): 與聊天回覆並行，不打斷對話流
      setDraftNotice({
        type: "loading",
        text: t("carbon_chatbot.draft_generating_section", {
          section: `${section.code} ${section.title}`,
        }),
      });
      try {
        // Info: (20260714 - Tzuhan) 只取最近 N 則對話供 AI 理解背景，與主對話的 token 控制策略一致
        const conversationContext = (activeSession?.messages ?? [])
          .slice(-CARBON_CHAT_AI_CONTEXT_SIZE)
          .map((msg) => ({ role: msg.sender, text: msg.text }));

        /**
         * Info: (20260825 - Luphia) 冪等鍵在**重送之間必須相同**（issue #6713 延伸）。
         *
         * 無帳本會話會先回 402 帶一張待付訂單，付掉之後以同一把鍵重送才會放行。
         * 先前這個值是 inline 產生的，一旦加上重送就會變成「付了一張、又建一張」
         *（聊天路徑的註解早就警告過這件事，草稿路徑漏了）。
         */
        const clientMessageId = crypto.randomUUID();
        const requestDraft = () =>
          request<{ payload: IParagraphDraft | null }>(
            "/api/v1/chat/carbon/draft",
            {
              method: "POST",
              // Info: (20260814 - Luphia) 計費上下文（設計書 §5.5），同段落修訂
              body: JSON.stringify({
                paragraphId,
                conversationContext,
                language,
                channel: chatChannel,
                clientMessageId,
              }),
            },
          );

        /**
         * Info: (20260825 - Luphia) 無帳本會話的待付款流程，與聊天路徑同一套
         *（設計書 §5.5）：付掉那張單後以相同冪等鍵重送即可放行。
         *
         * 草稿路徑原本沒有這一段，於是同一個使用者在同一個會話裡，
         * 送訊息會自動付款繼續、按「生成草稿」卻只看到「草稿生成失敗」——
         * 而兩者花的是同一份點數。付款失敗（取消簽章、餘額不足）原樣拋出，
         * 交由下方既有的錯誤處理顯示。
         */
        let res: Awaited<ReturnType<typeof requestDraft>>;
        try {
          res = await requestDraft();
        } catch (error) {
          const pendingPayment = parsePersonalPaymentRequired(error);
          if (!pendingPayment) throw error;
          const paid = await payExistingOrder(
            pendingPayment.orderId,
            pendingPayment.cost,
            () => {},
          );
          if (!paid) throw error;
          res = await requestDraft();
        }
        const draft = res.payload;
        if (!draft) throw new Error("Empty draft payload");

        applyDraftToReport(draft);
        // Info: (20260714 - Tzuhan) 草稿寫入後即時高亮該段，demo 觀眾可見「對話 → 報告」的即時性
        jumpToReportParagraph(draft.paragraphId);
        setDraftNotice(null);
      } catch (error) {
        // Info: (20260714 - Tzuhan) 失敗以狀態列短暫提示(自動消失)，不插對話氣泡(回覆稍後到達會造成前後矛盾)
        console.error("[carbon-chat] paragraph draft failed:", error);
        // Info: (20260716 - Tzuhan) 額度/逾時/限流分別給專屬文案(#6515/#6516)，其餘為一般草稿失敗
        let noticeText = t("carbon_chatbot.draft_failed", {
          section: `${section.code} ${section.title}`,
        });
        /**
         * Info: (20260825 - Luphia) **使用者的點數用完**要先問（issue #6713 延伸）。
         *
         * 這裡原本只認 `isQuotaApiError`——那是 **LLM 供應商**的配額，
         * 與使用者的錢無關。點數用完會落到「草稿生成失敗」，而使用者會以為
         * 是這一節的內容有問題，重試一百次也一樣。這與匯入迴圈那個缺陷同一類，
         * 只是出口不同（那邊是「章節解析失敗」）。
         *
         * 需要個人付款的那種上面已經付掉並重送過；走到這裡代表付款也失敗了
         *（取消簽章、餘額不足），那時「點數不足」仍是最準確的說法。
         */
        if (resolveCreditPauseReason(error) !== null) {
          noticeText = t("carbon_chatbot.team_quota_exceeded");
        } else if (isQuotaApiError(error)) {
          noticeText = t("carbon_chatbot.ai_quota_exceeded");
        } else if (isTimeoutApiError(error)) {
          noticeText = t("carbon_chatbot.ai_timeout");
        } else if (isRateLimitedApiError(error)) {
          noticeText = t("carbon_chatbot.rate_limited");
        }
        setDraftNotice({ type: "error", text: noticeText });
        dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS);
      } finally {
        setDraftingParagraphId(null);
      }
    },
    [
      setDraftNotice,
      dismissDraftNoticeAfter,
      draftingParagraphId,
      activeSession,
      language,
      t,
      applyDraftToReport,
      jumpToReportParagraph,
      // Info: (20260814 - Luphia) 計費上下文所需：channel 決定這筆消費記到哪個帳本
      chatChannel,
      // Info: (20260825 - Luphia) 無帳本會話的待付款流程（與聊天路徑同一套）
      payExistingOrder,
    ],
  );

  /**
   * Info: (20260720 - Tzuhan) #53 從帳本匯入憑證級活動數據:
   * 帳本(voucher → EsgRecord)已認列的碳排事實直接入活動帳本 — 報告以財報/憑證為依據。
   * 冪等:去重鍵為 esgRecordId,重按 = 重新整理(只補新認列的);合併後 /calculate 簽章
   * 變更自動重跑(precomputed 直採 + 守恆勾稽)。無法映射者(skipped)明示提示,絕不靜默。
   * Info: (20260721 - Tzuhan) UAT:匯入成功後自動生成第三章數據段落草稿(僅空白段落) —
   * 敘述由 AI 撰寫、表格/證據鏈由 applyDraftToReport 決定性注入,Markdown 與 PDF 隨之同步;
   * ledger 計算稍後返回時,#23 重算連動會自動把佔位表格換成真值(敘述零改動)
   */
  const importBookEsgRecords = useCallback(async () => {
    const accountBookId = sessionAccess[chatChannel]?.accountBookId;
    if (!accountBookId || isImportingBookRecords) return;
    setIsImportingBookRecords(true);
    setDraftNotice({
      type: "loading",
      text: t("carbon_chatbot.book_records_importing"),
    });
    let importedCount = 0;
    try {
      const res = await request<{
        payload: {
          activities: IActivityRecord[];
          skipped: { esgRecordId: string; sourceName: string }[];
        } | null;
      }>("/api/v1/chat/carbon/esg-records", {
        query: { accountBookId },
      });
      const activities = res.payload?.activities ?? [];
      const skippedCount = res.payload?.skipped.length ?? 0;
      importedCount = activities.length;
      if (activities.length > 0) {
        applyInventoryExtraction({ activities });
      }
      setDraftNotice({
        type: "info",
        text:
          skippedCount > 0
            ? t("carbon_chatbot.book_records_imported_with_skips", {
                count: activities.length,
                skipped: skippedCount,
              })
            : t("carbon_chatbot.book_records_imported", {
                count: activities.length,
              }),
      });
    } catch (error) {
      console.error("[carbon-chat] book esg import failed:", error);
      setDraftNotice({
        type: "error",
        text: t("carbon_chatbot.book_records_import_failed"),
      });
    } finally {
      setIsImportingBookRecords(false);
      dismissDraftNoticeAfter(CARBON_DRAFT_NOTICE_DISMISS_MS);
    }

    /**
     * Info: (20260721 - Tzuhan) 自動撰寫數據段落(逐段循序:同一時間僅一段生成的既有約束):
     * 只填「尚無內容」的第三章數據段落,絕不覆蓋使用者已有的編輯
     */
    if (importedCount > 0) {
      const paragraphs =
        sessionsData[activeSessionId]?.reportData?.paragraphs ?? [];
      const emptyDataSections = CARBON_REPORT_OUTLINE.filter(
        (s) =>
          s.chapterId === CARBON_EVIDENCE_CHAPTER_ID &&
          s.isDataDriven &&
          !paragraphs.find((p) => p.id === s.id)?.content,
      );
      // Info: (20260721 - Tzuhan) 循序 reduce(專案禁 await-in-loop):前段完成才開下一段
      await emptyDataSections.reduce(async (previous, section) => {
        await previous;
        await generateParagraphDraft(section.id);
      }, Promise.resolve());
    }
  }, [
    sessionAccess,
    chatChannel,
    isImportingBookRecords,
    applyInventoryExtraction,
    t,
    sessionsData,
    activeSessionId,
    generateParagraphDraft,
    setDraftNotice,
    dismissDraftNoticeAfter,
  ]);

  // Info: (20260712 - Luphia) 進入時先預抓金鑰紀錄，避免解鎖手勢當下「fetch → PRF」耗掉 user activation
  useEffect(() => {
    prefetchOwnKeyRecord().catch(() => {
      // Info: (20260712 - Luphia) 預抓失敗不阻斷；解鎖時會再嘗試
    });
  }, []);

  const currentMessages = activeSession?.messages ?? [];
  const lastMessageId =
    currentMessages.length > 0
      ? currentMessages[currentMessages.length - 1].id
      : undefined;

  // Info: (20260714 - Tzuhan) 目前聊天室是否等待 AI 回覆(per-session；對外仍以 isTyping/isLoading 名稱輸出)
  const isTyping = busySessionIds.has(activeSessionId);
  const isLoading = isTyping;

  useEffect(() => {
    // Info: (20260712 - Luphia) 僅在同一 session 出現新的底部訊息(append)或 typing 時捲到底；前置歷史(prepend)不捲動
    const isSameSession = prevSessionId.current === activeSessionId;
    const isNewBottomMessage =
      lastMessageId !== undefined &&
      lastMessageId !== prevLastMessageIdRef.current;

    if (isSameSession && (isNewBottomMessage || isTyping)) {
      // Info: (20260708 - Tzuhan) Use block: "nearest" to prevent scrolling the whole page
      chatEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    prevLastMessageIdRef.current = lastMessageId;
    prevSessionId.current = activeSessionId;
  }, [lastMessageId, activeSessionId, isTyping]);

  // Info: (20260713 - Tzuhan) vibe 模式: isCompleted 由系統依生成狀態判定，不開放手動切換；僅保留 isVerified 人工簽核
  const toggleParagraphVerified = useCallback(
    (paragraphId: string) => {
      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        if (!updatedSession.reportData?.paragraphs) return prev;
        // Info: (20260806 - Tzuhan) 編輯報告也是動作(清單排序依據)
        updatedSession.updatedAt = new Date().toISOString();

        const newParagraphs = updatedSession.reportData.paragraphs.map((p) => {
          if (p.id !== paragraphId) return p;
          // Info: (20260713 - Tzuhan) 未生成內容的段落不可簽核(零信任: 先有產出才有查核)
          if (!p.isCompleted) return p;
          return { ...p, isVerified: !p.isVerified };
        });

        updatedSession.reportData = {
          ...updatedSession.reportData,
          paragraphs: newParagraphs,
        };
        return { ...prev, [activeSessionId]: updatedSession };
      });
    },
    [activeSessionId],
  );

  const handleMarkdownChange = useCallback(
    (newMarkdown: string) => {
      // Info: (20260716 - Tzuhan) #52 唯讀(帳本 VIEWER):忽略編輯,內容以 server 版本為準
      const channel = buildCarbonChatChannel(
        user?.address ?? "anonymous",
        activeSessionId,
      );
      if (sessionAccess[channel]?.canEdit === false) return;
      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        if (!updatedSession.reportData?.paragraphs) return prev;

        // Info: (20260716 - Tzuhan) #50 改標題對齊(取代區塊數 1:1 對位):
        // Info: (20260716 - Tzuhan) 舊防呆在區塊數不符時「整批丟棄編輯」— 貼上任何自訂標題即觸發,為資料遺失主因;
        // Info: (20260716 - Tzuhan) 新制以段落標題精確對齊,未知內容併入前段保留,誤刪段落者保原文並取消查核
        const split = splitReportMarkdownSections(newMarkdown);
        const aligned = alignReportSections(
          updatedSession.reportData.paragraphs.map((p) => p.title),
          split,
        );

        let hasChanges = false;
        const newParagraphs = updatedSession.reportData.paragraphs.map(
          (p, index) => {
            if (!aligned.has(index)) {
              // Info: (20260716 - Tzuhan) 段落(含標題)自文本消失 = 誤刪:保留原內容,已查核者取消查核
              if (p.content && p.isVerified) {
                hasChanges = true;
                return { ...p, isVerified: false };
              }
              return p;
            }
            const body = aligned.get(index) ?? "";
            // Info: (20260716 - Tzuhan) 佔位段落未被觸碰(body 仍為 > _提示_ 引言)→ 維持未生成
            const isUntouchedPlaceholder =
              !p.content && /^>\s*_[^_]*_$/.test(body.trim());
            if (isUntouchedPlaceholder) return p;
            // Info: (20260714 - Tzuhan) 編輯後內文為空(僅剩標頭)視為誤刪,保留原內容避免段落退回未生成狀態
            const nextContent = body.trim() ? body : p.content;

            // Info: (20260716 - Tzuhan) #50 佔位段落接受「貼上填充」:使用者提供的內容即為事實來源,
            // Info: (20260716 - Tzuhan) 填充後標記完成、未查核(與 AI 生成同一查核閘門)
            if (!p.content && nextContent) {
              hasChanges = true;
              return {
                ...p,
                content: nextContent,
                isCompleted: true,
                isVerified: false,
                // Info: (20260730 - Tzuhan) 使用者親手貼上的內容:來源是人不是 AI,不可混入 AI 草稿計數
                origin: ParagraphOriginEnum.MANUAL,
              };
            }

            const isContentChanged = nextContent !== p.content;
            // Info: (20260712 - Luphia) 僅在內容或查核狀態確實變動時才更新，避免無謂的狀態變更
            if (!isContentChanged) return p;

            hasChanges = true;
            return {
              ...p,
              content: nextContent,
              // Info: (20260709 - Tzuhan) 內容被修改，重置查核狀態為未查核 (isVerified: false)
              isVerified: false,
              // Info: (20260730 - Tzuhan) 人一改過就不再是「逐字照抄原文」,來源轉為人工編輯
              origin: ParagraphOriginEnum.MANUAL,
            };
          },
        );

        // Info: (20260716 - Tzuhan) 報告保真:rawMarkdown 權威來源 — 使用者存什麼渲染什麼,
        // Info: (20260716 - Tzuhan) 段落對齊僅更新 derived view(進度/chip/查核),絕不重組使用者的文件結構
        const isRawChanged =
          updatedSession.reportData.rawMarkdown !== newMarkdown;
        if (!hasChanges && !isRawChanged) return prev;

        updatedSession.reportData = {
          ...updatedSession.reportData,
          rawMarkdown: newMarkdown,
          paragraphs: newParagraphs,
        };
        return { ...prev, [activeSessionId]: updatedSession };
      });
    },
    [activeSessionId, sessionAccess, user?.address],
  );

  /**
   * Info: (20260805 - Tzuhan) 訂閱只依賴 chatChannel,回呼走 ref。
   *
   * 原本依賴 `[chatChannel, activeSessionId, decryptAndAppendEnvelope, markSessionBusy]`,
   * 而 `decryptAndAppendEnvelope` 的依賴鏈一路連到 `sessionAccess` ——
   * 它在掛載後至少三處會非同步寫入(sessions 清單載入、報告草稿還原、帳本綁定),
   * 每寫一次整條 callback 換身分 → effect 重跑 → 連線被 disconnect 再重建。
   * 頁面剛載入那幾百毫秒內連續發生數次,WSS 握手來不及完成。
   *
   * 訂閱該在「頻道變了」時重建,不該在「某個 callback 換了身分」時重建 ——
   * 回呼放進 ref,身分穩定,依賴就只剩下真正決定訂閱對象的那一個值。
   */
  const decryptAndAppendEnvelopeRef = useRef(decryptAndAppendEnvelope);
  const markSessionBusyRef = useRef(markSessionBusy);
  // Info: (20260805 - Tzuhan) 在 effect 內更新(與 activeSessionIdRef 同一慣例;render 期間寫 ref 會被 ESLint 擋)
  useEffect(() => {
    decryptAndAppendEnvelopeRef.current = decryptAndAppendEnvelope;
    markSessionBusyRef.current = markSessionBusy;
  }, [decryptAndAppendEnvelope, markSessionBusy]);

  // Info: (20260712 - Luphia) 訂閱 chatroom 頻道，接收並解密 AI 回覆等即時訊息（取代原本的 mock CustomEvent）
  useEffect(() => {
    const unsubscribe = subscribeChatroom<IEciesEnvelope>({
      channel: chatChannel,
      // Info: (20260712 - Luphia) 主金鑰尚未就緒（未經 PRF 解鎖）前無法解密，先略過(decryptAndAppendEnvelope 內建防護)
      onMessage: (envelope) => decryptAndAppendEnvelopeRef.current(envelope),
      onError: () => {
        setIsError(true);
        markSessionBusyRef.current(activeSessionIdRef.current, false);
      },
    });
    return unsubscribe;
  }, [chatChannel]);

  /**
   * Info: (20260805 - Tzuhan) 推播連線狀態。原本連線壞掉只寫進 `isError`,
   * 而 `isError` **沒有任何元件消費** —— 推播整條壞掉是完全靜默的,
   * 於是「AI 沒回應」與「回應送不到」在畫面上一模一樣,而兩者的處置完全不同。
   */
  const [connectionState, setConnectionState] =
    useState<ChatroomConnectionStateEnum>(
      ChatroomConnectionStateEnum.CONNECTING,
    );
  useEffect(() => subscribeChatroomConnection(setConnectionState), []);

  // Info: (20260714 - Tzuhan) 加入附件: 前端 Fail Fast(MIME 白名單/大小/數量)，通過者轉 base64 進待送清單
  const addAttachments = useCallback(
    (files: File[], options?: { skipImportCheck?: boolean }) => {
      setAttachmentError(null);

      // Info: (20260716 - Tzuhan) #56 匯入導流(UAT:使用者把整份報告當佐證附件上傳 → 聊天管線超時):
      // Info: (20260716 - Tzuhan) 單一文件先問要「匯入報告」還是「作為佐證附件」
      // Info: (20260730 - Tzuhan) 原以檔案大小(PDF ≥ 4MB / 文字檔 ≥ 64KB)猜測是否為整份報告,
      // Info: (20260730 - Tzuhan) 但大小是壞代理:真實的 64 頁溫室氣體盤查報告書只有 2MB,永遠觸發不了導流,
      // Info: (20260730 - Tzuhan) 使用者因此被導進「附件→段落」管線(寫死只取 3 節)並誤以為系統只認得三節。
      // Info: (20260730 - Tzuhan) 改為單一文件一律詢問:不猜意圖,由使用者決定。零額外呼叫。
      const isImportCandidate = (file: File): boolean =>
        IMPORT_CANDIDATE_MIME_TYPES.includes(file.type);
      if (
        !options?.skipImportCheck &&
        files.length === 1 &&
        isImportCandidate(files[0])
      ) {
        setImportCandidate(files[0]);
        return;
      }

      const allowedMimeTypes: readonly string[] =
        CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES;
      let currentCount = pendingAttachments.length;

      files.forEach((file) => {
        if (currentCount >= CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE) {
          setAttachmentError(
            t("carbon_chatbot.attachment_limit", {
              max: String(CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE),
            }),
          );
          return;
        }
        if (!allowedMimeTypes.includes(file.type)) {
          setAttachmentError(
            t("carbon_chatbot.attachment_invalid_type", { name: file.name }),
          );
          return;
        }
        if (file.size > CARBON_CHAT_MAX_ATTACHMENT_BYTES) {
          setAttachmentError(
            t("carbon_chatbot.attachment_too_large", {
              name: file.name,
              max: formatFileSize(CARBON_CHAT_MAX_ATTACHMENT_BYTES),
            }),
          );
          return;
        }

        currentCount += 1;
        const attachmentId = crypto.randomUUID();
        setPendingAttachments((prev) => [
          ...prev,
          {
            id: attachmentId,
            name: file.name,
            size: formatFileSize(file.size),
            mimeType: file.type,
            cid: "",
            status: PendingAttachmentStatusEnum.READING,
          },
        ]);

        // Info: (20260714 - Tzuhan) 選檔即以 multipart 上傳(server 端 Laria 分片持久化取得 cid);
        // Info: (20260714 - Tzuhan) 訊息送出只帶 metadata+cid，避免大檔 base64 撐爆 JSON body
        const formData = new FormData();
        formData.append("file", file);
        request<{ payload: { cid: string } | null }>(
          "/api/v1/chat/carbon/attachment",
          { method: "POST", body: formData },
        )
          .then((res) => {
            const cid = res.payload?.cid;
            if (!cid) throw new Error("Empty attachment upload payload");
            setPendingAttachments((prev) =>
              prev.map((a) =>
                a.id === attachmentId
                  ? { ...a, cid, status: PendingAttachmentStatusEnum.READY }
                  : a,
              ),
            );
          })
          .catch((error) => {
            console.error("[carbon-chat] attachment upload failed:", error);
            setPendingAttachments((prev) =>
              prev.map((a) =>
                a.id === attachmentId
                  ? { ...a, status: PendingAttachmentStatusEnum.ERROR }
                  : a,
              ),
            );
            // Info: (20260716 - Tzuhan) 安全裁決(型別不符/掃毒/配額)給專屬文案(#6517)，其餘為一般上傳失敗
            const errorCode = getApiErrorCode(error);
            let errorText = t("carbon_chatbot.attachment_upload_failed", {
              name: file.name,
            });
            if (errorCode === API_ERRORS.IS_ATTACHMENT_TYPE_MISMATCH.code) {
              errorText = t("carbon_chatbot.attachment_type_mismatch", {
                name: file.name,
              });
            } else if (errorCode === API_ERRORS.IS_ATTACHMENT_INFECTED.code) {
              errorText = t("carbon_chatbot.attachment_infected", {
                name: file.name,
              });
            } else if (
              errorCode === API_ERRORS.IS_STORAGE_QUOTA_EXCEEDED.code
            ) {
              errorText = t("carbon_chatbot.storage_quota_exceeded");
            }
            setAttachmentError(errorText);
          });
      });
    },
    [pendingAttachments.length, t],
  );

  // Info: (20260716 - Tzuhan) #56 匯入導流出口:走整份匯入(預覽卡)或仍作佐證附件
  const confirmImportCandidate = useCallback(() => {
    if (!importCandidate) return;
    const file = importCandidate;
    setImportCandidate(null);
    void importReportFile(file);
  }, [importCandidate, importReportFile]);

  const attachImportCandidate = useCallback(() => {
    if (!importCandidate) return;
    const file = importCandidate;
    setImportCandidate(null);
    addAttachments([file], { skipImportCheck: true });
  }, [importCandidate, addAttachments]);

  const dismissImportCandidate = useCallback(() => {
    setImportCandidate(null);
  }, []);

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachmentError(null);
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  /**
   * Info: (20260806 - Tzuhan) `overrideText` 供「後續建議」按鈕直接送出既定的一句話。
   *
   * 為什麼不是 setInputValue 之後再送:setState 要到下一輪 render 才生效,
   * 此刻讀 `inputValue` 拿到的還是空字串 —— 按鈕會變成「按了沒反應」。
   * 讓文字從參數進來,送出的內容就與按鈕上的字完全一致。
   */
  const handleSendMessage = useCallback(
    async (overrideText?: string) => {
      /**
       * Info: (20260825 - Emily) 型別硬化:呼叫端若誤傳非字串(如把本函式直接綁 onClick,
       * MouseEvent 進到 overrideText),`??` 擋不住 —— 事件物件不是 nullish,
       * `.trim` 直接炸,而且是 unhandledRejection(按鈕壞了卻沒有紅字)。
       * 非字串一律退回輸入框內容:錯誤呼叫降級成正常送出,不是靜默壞死。
       */
      /**
       * Info: (20260827 - Emily) #6718:文字一律由呼叫端帶進來
       * (ChatInput 送出時上交、後續建議按鈕帶按鈕上的字)。
       * hook 這裡不再有 `inputValue` 可退 —— 非字串時退成空字串,
       * 下面「無文字且無就緒附件即不送」的既有 guard 會擋掉,
       * 也就是錯誤呼叫降級成「不送出」而不是拿到 MouseEvent 去 `.trim`。
       */
      const outgoingText = typeof overrideText === "string" ? overrideText : "";
      const readyAttachments = pendingAttachments.filter(
        (a) => a.status === PendingAttachmentStatusEnum.READY,
      );
      // Info: (20260714 - Tzuhan) 有文字或有就緒附件即可送出
      if ((!outgoingText.trim() && readyAttachments.length === 0) || isLoading)
        return;

      // Info: (20260712 - Luphia) 先於使用者手勢內備妥主金鑰（WebAuthn PRF 需 user activation）；不支援裝置直接提示
      let masterKey: IChatroomMasterKey;
      try {
        masterKey = await ensureMasterKeyCached();
      } catch (keyError) {
        /**
         * Info: (20260831 - Emily) 送不出去就把字**還給使用者**(PR #6730 review 中-1)。
         *
         * #6718 把清空搬進 ChatInput(文字的所有者),而清空發生在
         * `onSendMessage` 之前 —— 對成功路徑是對的(等 async 完成才清,
         * 使用者會看到自己的字停在框裡好幾秒),但金鑰這兩條早退在清空之後,
         * 於是使用者打完的一句話直接消失,要重打。
         *
         * develop 上不是這樣:舊的 `setInputValue("")` 位置在所有早退之後,
         * 金鑰失敗時字留在框裡 —— 這個保護是本 PR 弄掉的,所以本 PR 補回來。
         *
         * 最日常的觸發是**取消生物辨識提示**(按錯手指、誤觸、想先確認別的事),
         * 不是罕見的裝置問題。
         *
         * 還原走既有的 `commandInput` 通道(nonce +1 → 元件的 effect 覆寫回去),
         * 不需要回傳值、不必改 prop 介面。
         * 非輸入框發起的送出(後續建議按鈕、跳段自動送出)失敗時,
         * 那句話會被放進輸入框 —— 那是刻意的:比靜默丟掉使用者的動作好,
         * 而且再按一次就送得出去。
         */
        if (keyError instanceof ChatroomUnsupportedDeviceError) {
          commandInput(outgoingText);
          appendMessageLocally(
            {
              id: crypto.randomUUID(),
              sender: ChatRoleEnum.AI,
              text: t("carbon_chatbot.device_unsupported"),
            },
            0,
          );
          return;
        }
        commandInput(outgoingText);
        console.error(
          "[carbon-chat] failed to prepare encryption key:",
          keyError,
        );
        setIsError(true);
        appendMessageLocally(
          {
            id: crypto.randomUUID(),
            sender: ChatRoleEnum.AI,
            text: t("carbon_chatbot.system_error"),
          },
          0,
        );
        return;
      }

      // Info: (20260714 - Tzuhan) 附件已於選檔時上傳 Laria；訊息只帶 metadata+cid(內容由後端管線經 recoverLaria 取回)
      const attachmentsMeta: IAttachment[] = readyAttachments.map((a) => ({
        name: a.name,
        size: a.size,
        mimeType: a.mimeType,
        cid: a.cid,
      }));

      const userMessage: IChatMessage = {
        id: crypto.randomUUID(),
        sender: ChatRoleEnum.USER,
        text: outgoingText,
        ...(attachmentsMeta.length > 0 ? { attachments: attachmentsMeta } : {}),
      };

      // Info: (20260713 - Tzuhan) 廢除訊息計次假進度；進度一律由 reportStats 依實際完成段落數推導
      setSessionsData((prev) => {
        const existing = resolveSession(prev, activeSessionId);
        if (!existing) return prev;
        const updatedSession = { ...existing };
        // Info: (20260714 - Tzuhan) 新對話以首則使用者訊息摘要為標題(demo 精度: 截前 24 字)
        const hasUserMessage = updatedSession.messages.some(
          (m) => m.sender === ChatRoleEnum.USER,
        );
        if (
          !hasUserMessage &&
          outgoingText.trim() &&
          !updatedSession.isTitleCustom &&
          updatedSession.title === t("carbon_chatbot.new_session_title")
        ) {
          updatedSession.title = outgoingText.trim().slice(0, 24);
        }
        updatedSession.messages = [...updatedSession.messages, userMessage];
        return { ...prev, [activeSessionId]: updatedSession };
      });

      /**
       * Info: (20260827 - Emily) #6718:送出後清空。
       * `ChatInput` 送出時已自行清空(它是文字的所有者),這裡再下一次指令
       * 是為了**非輸入框發起的送出**(後續建議按鈕、跳段後自動送出)——
       * 那些路徑不經過元件的 submit,框裡的字不會自己消失。
       */
      commandInput("");
      setPendingAttachments([]);
      setAttachmentError(null);
      markSessionBusy(activeSessionId, true);
      setIsError(false);
      pendingReplyChannelsRef.current.add(chatChannel);

      // Info: (20260714 - Tzuhan) 跳段後送出且訊息仍指涉該段標題 → 並行觸發段落草稿生成(與聊天回覆互不等待)
      // Info: (20260714 - Tzuhan) 決定性字串規則: 預填文字由系統產生；使用者改寫成無關內容則解除，不誤觸發
      const pendingDraftId = pendingDraftParagraphIdRef.current;
      if (pendingDraftId) {
        pendingDraftParagraphIdRef.current = null;
        const pendingSection = CARBON_REPORT_OUTLINE.find(
          (s) => s.id === pendingDraftId,
        );
        if (pendingSection && userMessage.text.includes(pendingSection.title)) {
          generateParagraphDraft(pendingDraftId);
        }
      }

      try {
        // Info: (20260712 - Luphia) 只取最近 N 則送給 AI 以控 token；畫面仍保有完整歷史
        const currentHistory = [...activeSession.messages, userMessage]
          .slice(-CARBON_CHAT_AI_CONTEXT_SIZE)
          .map((msg) => ({
            role: msg.sender === ChatRoleEnum.USER ? "user" : "model",
            text: msg.text,
          }));

        // Info: (20260712 - Luphia) 傳入頻道與本 session 的加密公鑰(xpub)，由後端加密 AI 回覆並經 Centrifugo 回傳
        // Info: (20260714 - Tzuhan) 改用 request helper:自動帶 DeWT Bearer token(後端已加授權檢查)
        // Info: (20260716 - Tzuhan) 附件解析為長工(在 chat 請求內執行):以狀態列告知,避免使用者誤判卡死
        if (attachmentsMeta.length > 0) {
          setDraftNotice({
            type: "loading",
            text: t("carbon_chatbot.attachments_processing"),
          });
        }

        /**
         * Info: (20260813 - Luphia) 冪等鍵在重試間必須相同（設計書 §5.5）：
         * 無帳本會話會先收到待付款 402，付款後以同一把鍵重送才找得回那張已付訂單；
         * 每次重新產生就會變成「付了一張、又建一張」。
         */
        const clientMessageId = crypto.randomUUID();
        /**
         * Info: (20260825 - Emily) #6707 帳本事實包(第二層):每則訊息隨行注入。
         * 帳本是 E2EE 的、伺服端讀不到,事實只能在這裡(解密後的狀態)決定性組出;
         * LLM 回答數據問題的數字只能來自這一包(persona 端把「清單之外不得有數字」說死)。
         * 帳本空時為空陣列 —— persona 對「無事實」另有明確拒答指令,這裡不補、不造。
         */
        const ledgerFacts = buildLedgerFactBundle(
          inventoryStates[chatChannel]?.computedLedger,
          // Info: (20260825 - Emily) 勾稽阻擋紀錄一併注入:「帳本為什麼是空的」也是可問的事實
          inventoryStates[chatChannel]?.ledgerImportBlocks,
          // Info: (20260825 - Emily) #6719 年度快照:滿兩年時年間比較事實隨包注入
          inventoryStates[chatChannel]?.ledgerByYear,
          // Info: (20260828 - Emily) 年度標註不完整:列舉制第五個偵測器(round-2 追加回饋)
          inventoryStates[chatChannel]?.ledgerYearWarning,
        );
        const sendChatRequest = () =>
          request<{
            success: boolean;
            message: string;
            payload: {
              drafts?: IParagraphDraft[];
              envelopes?: IEciesEnvelope[];
              extraction?: IInventoryExtraction | null;
              attachmentActivities?: IActivityRecord[];
              revisionParagraphId?: string | null;
              chartRequest?: {
                templateId: CarbonChartTemplateEnum;
                paragraphId: string;
              } | null;
              attachmentFacts?: IContextFact[];
            } | null;
          }>("/api/v1/chat/carbon", {
            method: "POST",
            body: JSON.stringify({
              history: currentHistory,
              // Info: (20260716 - Tzuhan) #6518:currentStep 改餵狀態機真值(跳段指引仍優先)
              currentStep:
                activeSession.currentStep ||
                describeInventoryStep(
                  inventoryStates[chatChannel] ?? createEmptyInventoryState(),
                ),
              language,
              channel: chatChannel,
              recipientPublicKey: masterKey.extendedPublicKey,
              /**
               * Info: (20260813 - Luphia) 計費冪等鍵（設計書 §5.5）：
               * 同一則訊息重送（重試、雙擊）不重複扣點。
               */
              clientMessageId,
              /**
               * Info: (20260825 - Emily) #6707 帳本事實包(組包邏輯見上方 ledgerFacts 的註解)。
               * **空陣列也要送**(review 阻擋項):伺服端憑 [] 與 undefined 區分
               * 「碳盤查對話、帳本空」(守門照跑)與「呼叫端沒帶事實包」(守門跳過)。
               * 原本空包不帶欄位,守門在最需要它的狀態(只剩指令、編造最沒阻力)被關掉。
               */
              ledgerFacts,
              // Info: (20260714 - Tzuhan) 附件只帶 metadata+cid(檔案已在 Laria)；請求 body 維持輕量
              ...(attachmentsMeta.length > 0
                ? { attachments: attachmentsMeta }
                : {}),
            }),
          });

        /**
         * Info: (20260813 - Luphia) 無帳本會話：後端先回待付款 402 帶訂單，
         * 付掉那張單後以**相同冪等鍵**重送即可放行（設計書 §5.5）。
         * 付款失敗（用戶取消簽章、餘額不足）就原樣拋出，交由既有錯誤處理顯示。
         */
        let data: Awaited<ReturnType<typeof sendChatRequest>>;
        try {
          data = await sendChatRequest();
        } catch (error) {
          const pendingPayment = parsePersonalPaymentRequired(error);
          if (!pendingPayment) throw error;
          const paid = await payExistingOrder(
            pendingPayment.orderId,
            pendingPayment.cost,
            () => {},
          );
          if (!paid) throw error;
          data = await sendChatRequest();
        }

        if (!data.success) {
          throw new Error(data.message || "AI API returned an error");
        }

        // Info: (20260714 - Tzuhan) HTTP 回帶的密文訊息直接解密顯示(草稿隨摘要訊息一起套用);
        // Info: (20260714 - Tzuhan) Centrifugo 訂閱若也送達，由訊息 id 去重(草稿亦以訊息 id 防重複套用)
        const payload = data.payload;
        // Info: (20260716 - Tzuhan) 附件管線完成(回應已達),清除解析中提示
        if (attachmentsMeta.length > 0) setDraftNotice(null);

        // Info: (20260716 - Tzuhan) #6518 事實入帳: 對話萃取 + 附件活動數據合併進狀態帳本(去重由引擎裁決)
        applyInventoryExtraction(
          payload?.extraction,
          userMessage.text.slice(0, 80),
        );
        if (
          payload?.attachmentActivities &&
          payload.attachmentActivities.length > 0
        ) {
          applyInventoryExtraction({
            activities: payload.attachmentActivities,
          });
        }

        if (payload?.envelopes) {
          for (const envelope of payload.envelopes) {
            await decryptAndAppendEnvelope(envelope);
          }
        }

        // Info: (20260716 - Tzuhan) #55 修訂請求:以使用者原話為指示、附件事實為佐證,產生對照卡
        if (payload?.revisionParagraphId) {
          void requestParagraphRevision(
            payload.revisionParagraphId,
            userMessage.text,
            payload.attachmentFacts ?? [],
          );
        }

        // Info: (20260720 - Tzuhan) #51 圖表請求(已經雙 enum 白名單裁決):由模板從勾稽數據產圖插入
        if (payload?.chartRequest) {
          insertChartIntoParagraph(
            payload.chartRequest.templateId,
            payload.chartRequest.paragraphId,
          );
        }

        // Info: (20260712 - Luphia) 啟動等待逾時，避免「已發佈但未收到」時卡在 typing(回覆已回帶時為 no-op)
        // Info: (20260716 - Tzuhan) 帶附件時管線含萃取/草稿生成,等待窗加長(UAT:30s 誤報系統錯誤)
        startReplyTimeout(
          attachmentsMeta.length > 0
            ? CARBON_CHAT_REPLY_TIMEOUT_WITH_ATTACHMENTS_MS
            : CARBON_CHAT_REPLY_TIMEOUT_MS,
        );
      } catch (error) {
        // Info: (20260712 - Luphia) 此區塊代表「取得 AI 回覆」階段失敗（如 /api/v1/chat/carbon 錯誤）
        console.error("[carbon-chat] Failed to obtain AI response:", error);
        setDraftNotice(null);

        // Info: (20260730 - Tzuhan) gateway 讀取逾時(504)不是工作失敗:伺服端仍在跑,
        // Info: (20260730 - Tzuhan) 回覆與逐段草稿都會經 Centrifugo 訂閱送達。此時彈「系統錯誤」是誤報,
        // Info: (20260730 - Tzuhan) 改為維持等待狀態並提示仍在處理中,由等待窗逾時把真正沒回來的情況兜住。
        if (isGatewayTimeoutError(error)) {
          setDraftNotice({
            type: "loading",
            text: t("carbon_chatbot.still_processing"),
          });
          startReplyTimeout(
            attachmentsMeta.length > 0
              ? CARBON_CHAT_REPLY_TIMEOUT_WITH_ATTACHMENTS_MS
              : CARBON_CHAT_REPLY_TIMEOUT_MS,
          );
          return;
        }

        setIsError(true);
        // Info: (20260716 - Tzuhan) 額度/逾時/限流分別給專屬文案(#6515/#6516)，其餘為一般系統錯誤
        let errorText = t("carbon_chatbot.system_error");
        /**
         * Info: (20260813 - Luphia) 兩種「額度」錯誤要分開講（設計書 §5.5）：
         * IS_LLM_QUOTA_EXCEEDED 是供應商端的模型額度（稍候重試會好），
         * TW_QUOTA_EXCEEDED 是團隊訂閱額度與分配點數同時見底（重試永遠不會好，
         * 要等重置或加購）。混為一談會讓用戶一直重試一件不可能成功的事。
         */
        const apiErrorCode = getApiErrorCode(error);
        if (apiErrorCode === API_ERRORS.TW_QUOTA_EXCEEDED.code) {
          errorText = t("carbon_chatbot.team_quota_exceeded");
        } else if (
          apiErrorCode === API_ERRORS.VA_CARBON_SESSION_NOT_BOUND.code
        ) {
          errorText = t("carbon_chatbot.session_not_bound");
        } else if (isQuotaApiError(error)) {
          errorText = t("carbon_chatbot.ai_quota_exceeded");
        } else if (isTimeoutApiError(error)) {
          errorText = t("carbon_chatbot.ai_timeout");
        } else if (isRateLimitedApiError(error)) {
          errorText = t("carbon_chatbot.rate_limited");
        }
        appendMessageLocally(
          {
            id: crypto.randomUUID(),
            sender: ChatRoleEnum.AI,
            text: errorText,
          },
          0,
        );
      }
    },
    [
      payExistingOrder,
      commandInput,
      isLoading,
      pendingAttachments,
      activeSession,
      activeSessionId,
      language,
      t,
      appendMessageLocally,
      generateParagraphDraft,
      decryptAndAppendEnvelope,
      startReplyTimeout,
      chatChannel,
      ensureMasterKeyCached,
      markSessionBusy,
      applyInventoryExtraction,
      inventoryStates,
      requestParagraphRevision,
      insertChartIntoParagraph,
      setDraftNotice,
    ],
  );

  /**
   * Info: (20260806 - Tzuhan) 匯入之後的後續建議。
   *
   * 依據是**報告的匯入來歷**(`importedFrom`)而非某一則訊息:
   * 掛在訊息上會被對話捲走,而「這份報告可以拿來做什麼」在報告存在期間一直成立;
   * 來歷是持久化的,重載後建議仍在。
   */
  const importFollowUpPrompts = useMemo(
    () =>
      activeSession.reportData?.importedFrom
        ? CARBON_IMPORT_FOLLOW_UPS.map((followUp) =>
            buildImportFollowUpPrompt(language, followUp),
          )
        : [],
    [activeSession.reportData?.importedFrom, language],
  );

  // Info: (20260712 - Luphia) 進入 channel 的一次性手勢：解鎖金鑰(PRF) → 請後端做前置作業並經 Centrifugo 回傳招呼詞
  const initializeChat = useCallback(async () => {
    if (isUnlocked) return;

    /**
     * Info: (20260812 - Luphia) 解鎖失敗要在**還鎖著的畫面上**說出來。
     *
     * 原本兩條失敗路徑都是 `appendMessageLocally()`,而那則訊息會被畫進聊天區 ——
     * 解鎖失敗時聊天區還鎖著,所以訊息一則都看不到。使用者的體驗是
     * 「點了開始加密對話,完全沒有任何反應」,而 console 裡其實有錯誤。
     *
     * 改成把原因寫進 `unlockError`,由鎖定畫面渲染在按鈕旁邊。
     * 重按一次會先清掉它,所以那句訊息不會停在上一次失敗的狀態。
     */
    setUnlockError(null);

    try {
      // Info: (20260714 - Tzuhan) 解鎖後主金鑰存於 masterKeyRef，歷史載入/招呼詞由 channel 載入 effect 接手
      await ensureMasterKeyCached();
    } catch (keyError) {
      console.error("[carbon-chat] failed to unlock encryption key:", keyError);
      if (keyError instanceof ChatroomUnsupportedDeviceError) {
        setUnlockError(t("carbon_chatbot.device_unsupported"));
        return;
      }
      /**
       * Info: (20260812 - Luphia) 來源不符要說成它本來的樣子（PR review P-1）。
       *
       * 這一列是用另一種金鑰包裝的（最可能是補綁 passkey 之後託管金鑰列被廢除）,
       * 解不開不是「失敗」而是「需要先做金鑰移轉」。共用 unlock_failed 會讓人
       * 一直重按一件永遠不會成功的事。
       */
      if (keyError instanceof ChatroomKeySourceMismatchError) {
        setUnlockError(t("carbon_chatbot.key_source_mismatch"));
        return;
      }
      // Info: (20260812 - Luphia) custody 還沒載入（按鈕本該是 disabled，這是第二層）
      if (keyError instanceof ChatroomCustodyUnknownError) {
        setUnlockError(t("carbon_chatbot.custody_loading"));
        return;
      }
      /**
       * Info: (20260812 - Luphia) 限流用專屬文案，不得顯示為一般系統錯誤。
       *
       * `rate_limiting_guideline.md` 第 3 條明文要求這件事，而 `carbon_chatbot.rate_limited`
       * 早就存在（送訊息與載入歷史那兩條路徑都已經在用）。解鎖路徑原本接不上，
       * 因為 `requestPrfSecret` 用原生 fetch 拋 `AppError`，
       * 而 `isRateLimitedApiError()` 要求 `RequestApiError` —— 已在該處改掉。
       */
      if (isRateLimitedApiError(keyError)) {
        setUnlockError(t("carbon_chatbot.rate_limited"));
        return;
      }
      setIsError(true);
      setUnlockError(t("carbon_chatbot.unlock_failed"));
      return;
    }

    setIsUnlocked(true);
    setUnlockedMasterKey(masterKeyRef.current);
    setIsError(false);
    // Info: (20260714 - Tzuhan) 歷史載入與招呼詞改由 channel 載入 effect 統一處理(切換 session 亦適用)
  }, [isUnlocked, ensureMasterKeyCached, t]);

  // Info: (20260712 - Luphia) 空 chatroom → 請後端做前置作業產生招呼詞並加密發佈；由訂閱端解密後顯示
  const requestGreeting = useCallback(
    async (recipientPublicKey: string) => {
      markSessionBusy(activeSessionId, true);
      pendingReplyChannelsRef.current.add(chatChannel);
      try {
        // Info: (20260714 - Tzuhan) 改用 request helper: 自動帶 DeWT Bearer token(後端已加授權檢查)
        const data = await request<{
          success: boolean;
          message: string;
          payload: { envelopes?: IEciesEnvelope[] } | null;
        }>("/api/v1/chat/carbon", {
          method: "POST",
          body: JSON.stringify({
            init: true,
            channel: chatChannel,
            recipientPublicKey,
            currentStep: activeSession?.currentStep,
            language,
          }),
        });
        if (!data.success) {
          throw new Error(data.message || "Greeting init returned an error");
        }

        // Info: (20260714 - Tzuhan) 招呼詞密文隨 HTTP 回帶，直接解密顯示(訂閱重複由 id 去重)
        if (data.payload?.envelopes) {
          for (const envelope of data.payload.envelopes) {
            await decryptAndAppendEnvelope(envelope);
          }
        }
        // Info: (20260712 - Luphia) 啟動等待逾時，避免招呼詞「已發佈但未收到」時卡在 typing
        startReplyTimeout();
      } catch (error) {
        console.error("[carbon-chat] greeting init failed:", error);
        setIsError(true);
        appendMessageLocally(
          {
            id: crypto.randomUUID(),
            sender: ChatRoleEnum.AI,
            text: t("carbon_chatbot.system_error"),
          },
          0,
        );
      }
    },
    [
      chatChannel,
      activeSession,
      activeSessionId,
      language,
      startReplyTimeout,
      appendMessageLocally,
      decryptAndAppendEnvelope,
      markSessionBusy,
      t,
    ],
  );

  // Info: (20260714 - Tzuhan) channel 載入 effect: 解鎖後(含切換/新增 session)各 channel 載一次歷史，空房間請 AI 招呼
  useEffect(() => {
    const master = masterKeyRef.current;
    if (!isUnlocked || !master) return;
    if (loadedChannelsRef.current.has(chatChannel)) return;
    loadedChannelsRef.current.add(chatChannel);

    loadHistory()
      .then((count) => {
        if (count === 0) {
          return requestGreeting(master.extendedPublicKey);
        }
        return undefined;
      })
      .catch((error) => {
        console.error("[carbon-chat] channel load failed:", error);
        setIsError(true);
      });
  }, [isUnlocked, chatChannel, loadHistory, requestGreeting]);

  return {
    sessionsList: sortedSessionsList,
    // Info: (20260828 - Julian) 給深連結用：清單問完了沒有（非空 ≠ 完整）
    sessionsIndexSettled,
    activeSession,
    activeSessionId,
    // Info: (20260714 - Tzuhan) 對外的切換入口為 switchSession(重置跨室暫態 UI)，沿用原名稱以維持呼叫端不變
    setActiveSessionId: switchSession,
    createNewSession,
    saveStatus,
    // Info: (20260716 - Tzuhan) 命名:對話改名 + 報告檔名改名
    renameSession,
    renameReportDocument,
    updateReportIdentity,
    inputPrefill,
    isTyping,
    isLoading,
    isError,
    // Info: (20260805 - Tzuhan) 推播連線狀態(壞掉必須看得見,見上方 effect)
    connectionState,
    isUnlocked,
    unlockError,
    initializeChat,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreHistory,
    handleSendMessage,
    // Info: (20260806 - Tzuhan) 匯入後的後續建議(所見即所送:按鈕上的字就是送出的內容)
    importFollowUpPrompts,
    pendingAttachments,
    attachmentError,
    addAttachments,
    removeAttachment,
    reportStats,
    // Info: (20260716 - Tzuhan) #52 帳本清單與當前會話存取資訊(唯讀切換/新增對話選單)
    accountBooks,
    activeSessionAccess: sessionAccess[chatChannel] ?? {
      accountBookId: null,
      canEdit: true,
    },
    // Info: (20260716 - Tzuhan) UAT 帳本報告入口:列會話 + 檢視器編輯需本人金鑰(未解鎖為 null → 唯讀)
    fetchBookSessions,
    masterKey: unlockedMasterKey,
    // Info: (20260716 - Tzuhan) #6518 盤查狀態帳本(活動數據 + 決定性步驟),供記錄卡顯示
    inventoryState: activeInventoryState ?? createEmptyInventoryState(),
    // Info: (20260720 - Tzuhan) #23 數據段落勾稽徽章三態(已勾稽/守恆違反/數據不足)
    dataBadgeState,
    // Info: (20260720 - Tzuhan) #53 憑證聯動:從帳本匯入已認列的活動數據(僅帳本會話可用)
    importBookEsgRecords,
    isImportingBookRecords,
    activeParagraphId,
    jumpToParagraph,
    highlightedParagraphId,
    focusedMessageId,
    jumpToReportParagraph,
    focusMessageForParagraph,
    draftingParagraphId,
    draftNotice,
    // Info: (20260716 - Tzuhan) #55 修訂對照卡(確認/捨棄)
    pendingRevision,
    applyPendingRevision,
    discardPendingRevision,
    // Info: (20260716 - Tzuhan) #56 報告匯入(逐段勾選確認)
    pendingImport,
    importReportFile,
    toggleImportItem,
    applyPendingImport,
    discardPendingImport,
    /**
     * Info: (20260806 - Tzuhan) 預覽卡是否展開。待匯入結果存在**不等於**現在要看 ——
     * 重載還原的一律先收起(見 deferredPreviewSessions)。
     */
    isImportPreviewOpen: Boolean(pendingImport) && !isPreviewDeferred,
    deferImportPreview,
    openImportPreview,
    // Info: (20260730 - Tzuhan) 封存會話(軟刪,可還原);權限由後端 DELETE 層級裁決
    archiveSession,
    fetchArchivedSessions,
    restoreSession,
    // Info: (20260730 - Tzuhan) 手動產生結構圖(治理架構/範疇對應/量化流程);無對應模板的段落呼叫即 no-op
    generateParagraphDiagram,
    retryFailedImportChapters,
    // Info: (20260825 - Luphia) 「接著匯入」：只跑點數用完時還沒做的那幾份（issue #6713）
    resumePausedImportChapters,
    // Info: (20260827 - Luphia) 伺服器眼中的狀態與取消（issue #6714）
    importJobStatus: importJob?.status ?? null,
    canCancelImportJob: Boolean(importJob),
    cancelImportJob,
    // Info: (20260901 - Luphia) 倒數歸零時畫面自己再問一次伺服器（review #6726 中-3）
    refreshImportJob,
    // Info: (20260806 - Tzuhan) 重試中:預覽卡據此禁用按鈕並顯示進度(「正在跑」必須看得見)
    isRetryingImport,
    // Info: (20260716 - Tzuhan) #56 匯入導流(聊天附件疑似整份報告)
    importCandidate,
    confirmImportCandidate,
    attachImportCandidate,
    dismissImportCandidate,
    generateParagraphDraft,
    toggleParagraphVerified,
    handleMarkdownChange,
    chatEndRef,
  };
};
