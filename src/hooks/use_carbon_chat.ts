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
  IReportCategory,
} from "@/types/carbon_chatbot.types";
import {
  buildCarbonDataTable,
  stripLlmTables,
  injectDataTable,
  hasInjectedDataTable,
  deriveDataBadgeState,
  type ICarbonDataTableLabels,
} from "@/lib/carbon_report_table.builder";
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
} from "@/constants/carbon_report_charts";
import { formatGhgCategoryLabel } from "@/constants/esg";
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
import {
  loadInventoryState,
  saveInventoryState,
} from "@/lib/carbon_inventory_storage";
import {
  loadReportDraft,
  saveReportDraft,
  isDraftVersionConflict,
  loadSessionsIndex,
  saveSessionsIndex,
  saveLocalDraftBackup,
  loadLocalDraftBackup,
} from "@/lib/carbon_report_draft_storage";
import { useTranslation } from "@/i18n/i18n_context";
import { subscribeChatroom } from "@/lib/chatroom";
import {
  eciesDecrypt,
  ChatroomUnsupportedDeviceError,
  type IEciesEnvelope,
  type IChatroomMasterKey,
} from "@/lib/chatroom_ecies";
import {
  ensureMasterKey,
  prefetchOwnKeyRecord,
} from "@/lib/chatroom_key_manager";
import { request } from "@/lib/utils/request";
import {
  getApiErrorCode,
  isGatewayTimeoutError,
  isQuotaApiError,
  isRateLimitedApiError,
  isTimeoutApiError,
  splitReportMarkdownSections,
  alignReportSections,
  patchMarkdownSection,
} from "@/hooks/use_carbon_chat.helpers";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { useAuth } from "@/contexts/auth_context";
import {
  DEFAULT_SESSION_ID,
  SESSION_PROGRESS_MAX,
  buildCarbonChatChannel,
  CARBON_CHAT_REPLY_TIMEOUT_MS,
  CARBON_CHAT_REPLY_TIMEOUT_WITH_ATTACHMENTS_MS,
  CARBON_IMPORT_SINGLE_CALL_MAX_BYTES,
  IMPORT_CANDIDATE_MIME_TYPES,
  ParagraphOriginEnum,
  CARBON_CHAT_AI_CONTEXT_SIZE,
  CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES,
  CARBON_CHAT_MAX_ATTACHMENT_BYTES,
  CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  CARBON_CHAT_HIGHLIGHT_DURATION_MS,
  CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS,
  CARBON_DRAFT_NOTICE_DISMISS_MS,
} from "@/constants/carbon_chatbot";

// Info: (20260714 - Tzuhan) 報告草稿保存狀態(工具列顯示;null = 尚無變更;error = 保存失敗/版本衝突)
// Info: (20260716 - Tzuhan) #50 新增 local:未解鎖/未還原前內容僅落本機安全快取,解鎖後自動推入 DB
export type ReportSaveStatus = "saving" | "saved" | "error" | "local" | null;

// Info: (20260714 - Tzuhan) 草稿生成狀態列(顯示於輸入框上方): 生成中 loading、失敗短暫提示後自動消失
// Info: (20260714 - Tzuhan) 草稿為並行任務，失敗不以對話氣泡表達(氣泡先於回覆出現會造成 UX 混淆)
// Info: (20260720 - Tzuhan) #23 新增 info:數據表格隨活動數據自動更新的非阻斷提示
export interface IDraftNotice {
  type: "loading" | "error" | "info";
  text: string;
}

export const useCarbonChat = () => {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [sessionsData, setSessionsData] = useState<
    Record<string, IChatSession>
  >(() => createDefaultSessions());
  const [activeSessionId, setActiveSessionId] =
    useState<string>(DEFAULT_SESSION_ID);
  const [inputValue, setInputValue] = useState<string>("");
  // Info: (20260714 - Tzuhan) 等待 AI 回覆的 session 集合(per-session 隔離: 舊房等待中不影響新房輸入與指示)
  const [busySessionIds, setBusySessionIds] = useState<Set<string>>(new Set());
  const [isError, setIsError] = useState<boolean>(false);
  // Info: (20260712 - Luphia) 是否已於進入時完成一次手勢解鎖（PRF）；未解鎖前不呼叫 AI、不顯示對話
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
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
  // Info: (20260714 - Tzuhan) 草稿狀態列(loading/error);error 自動清除
  const [draftNotice, setDraftNotice] = useState<IDraftNotice | null>(null);
  // Info: (20260716 - Tzuhan) #55 待確認修訂(對照卡):null = 無;確認後才寫入報告
  const [pendingRevision, setPendingRevision] =
    useState<IPendingRevision | null>(null);
  // Info: (20260716 - Tzuhan) #56 待確認匯入(逐段勾選):null = 無;確認後才寫入報告與活動帳本
  const [pendingImport, setPendingImport] = useState<IPendingImport | null>(
    null,
  );
  // Info: (20260716 - Tzuhan) #56 匯入導流:聊天附件疑似整份報告時的候選(File 保留供直接匯入)
  const [importCandidate, setImportCandidate] = useState<File | null>(null);
  const draftNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
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
  const lastImportFileRef = useRef<File | null>(null);

  // Info: (20260716 - Tzuhan) #6518 盤查狀態帳本(per-channel):活動數據 + 決定性步驟;E2EE 入庫比照報告草稿
  const [inventoryStates, setInventoryStates] = useState<
    Record<string, ICarbonInventoryState>
  >({});
  const inventoryVersionsRef = useRef<Map<string, number>>(new Map());
  const inventoryRestoredChannelsRef = useRef<Set<string>>(new Set());
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
  const ensureMasterKeyCached =
    useCallback(async (): Promise<IChatroomMasterKey> => {
      if (!masterKeyRef.current) {
        masterKeyRef.current = await ensureMasterKey();
      }
      return masterKeyRef.current;
    }, []);

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
        const updatedSession = { ...prev[activeSessionId] };
        // Info: (20260714 - Tzuhan) 以訊息 id 去重: HTTP 回帶與 Centrifugo 訂閱可能送達同一則訊息
        if (updatedSession.messages.some((m) => m.id === message.id)) {
          return prev;
        }
        updatedSession.messages = [...updatedSession.messages, message];
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
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      if (draftNoticeTimerRef.current) {
        clearTimeout(draftNoticeTimerRef.current);
      }
    };
  }, []);

  // Info: (20260714 - Tzuhan) sessions 以 DB Chatroom 為 single source of truth(換裝置/清瀏覽器不再出現殭屍房間)
  // Info: (20260714 - Tzuhan) 標題衍生自密文首訊(server 讀不到),localStorage 索引降級為標題快取
  const sessionsIndexLoadedRef = useRef<boolean>(false);
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
            };
          });
          return next;
        });
      })
      .catch((error) => {
        // Info: (20260714 - Tzuhan) 列表載入失敗不阻斷(仍可用預設 session 對話)
        console.error("[carbon-chat] failed to load sessions:", error);
      });
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
        if (draftNoticeTimerRef.current) {
          clearTimeout(draftNoticeTimerRef.current);
        }
        draftNoticeTimerRef.current = setTimeout(() => {
          draftNoticeTimerRef.current = null;
          setDraftNotice(null);
        }, CARBON_DRAFT_NOTICE_DISMISS_MS);
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
      }
    },
    [t],
  );

  // Info: (20260716 - Tzuhan) #52 解鎖後補送排隊中的綁定請求
  useEffect(() => {
    if (!isUnlocked || pendingBindsRef.current.size === 0) return;
    const pending = Array.from(pendingBindsRef.current.entries());
    pendingBindsRef.current.clear();
    pending.forEach(([sessionId, accountBookId]) => {
      void bindSessionToBook(sessionId, accountBookId);
    });
  }, [isUnlocked, bindSessionToBook]);

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

  // Info: (20260714 - Tzuhan) 報告草稿 debounce 自動保存(前端加密 → PUT)；還原完成前不保存，避免空骨架覆蓋既有草稿
  const activeReportData = sessionsData[activeSessionId]?.reportData;
  useEffect(() => {
    if (!activeReportData) return undefined;
    // Info: (20260715 - Luphia) 內容一有變更即先寫本機安全快取(不等 debounce);萬一保存前當機/關頁,下次還原時可救回
    // Info: (20260716 - Tzuhan) #50 提到所有雲端保存 guard 之前:本機快取不需金鑰,
    // Info: (20260716 - Tzuhan) 未解鎖的新聊天室貼上內容也先落地,解鎖後由還原流程撿回並自動推入 DB
    saveLocalDraftBackup(
      chatChannel,
      activeReportData,
      draftVersionsRef.current.get(chatChannel) ?? 0,
    );
    // Info: (20260716 - Tzuhan) #52 無編輯權(帳本 VIEWER)不觸發保存(server 亦會 403,此為第一道)
    if (sessionAccess[chatChannel]?.canEdit === false) return undefined;
    const master = masterKeyRef.current;
    const canCloudSave =
      restoredChannelsRef.current.has(chatChannel) &&
      draftVersionsRef.current.has(chatChannel) &&
      Boolean(master);
    if (!canCloudSave || !master) {
      // Info: (20260716 - Tzuhan) #50 明確告知使用者「僅暫存本機」,避免誤以為已上雲
      setSaveStatus("local");
      return undefined;
    }

    setSaveStatus("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      const expectedVersion = draftVersionsRef.current.get(chatChannel) ?? 0;
      // Info: (20260716 - Tzuhan) #52 帳本會話走明文保存(模型 A);個人會話維持 E2EE
      saveReportDraft(
        chatChannel,
        master,
        activeReportData,
        expectedVersion,
        sessionAccess[chatChannel]?.accountBookId ?? null,
      )
        .then((newVersion) => {
          draftVersionsRef.current.set(chatChannel, newVersion);
          setSaveStatus("saved");
          // Info: (20260716 - Tzuhan) UAT P0:快取常駐(refresh 後解鎖前即刻可見),僅同步版本號
          saveLocalDraftBackup(chatChannel, activeReportData, newVersion);
        })
        .catch((error) => {
          // Info: (20260714 - Tzuhan) 樂觀鎖衝突 = 他端已更新，不 silent overwrite；一律以 error 提示重整取得最新
          if (isDraftVersionConflict(error)) {
            console.warn("[carbon-chat] draft version conflict:", chatChannel);
          } else {
            console.error("[carbon-chat] failed to save report draft:", error);
          }
          setSaveStatus("error");
        });
    }, CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [activeReportData, chatChannel, isUnlocked, sessionAccess]);

  // Info: (20260716 - Tzuhan) #6518 切至 session 時自 DB 還原盤查狀態(三態協定比照報告草稿)
  useEffect(() => {
    const master = masterKeyRef.current;
    // Info: (20260716 - Tzuhan) #52 帳本會話明文模式免金鑰(同報告還原)
    const isBookBound = Boolean(sessionAccess[chatChannel]?.accountBookId);
    if (!isBookBound && (!isUnlocked || !master)) return;
    if (inventoryRestoredChannelsRef.current.has(chatChannel)) return;
    inventoryRestoredChannelsRef.current.add(chatChannel);

    loadInventoryState(chatChannel, master ?? null)
      .then((loaded) => {
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
      });
  }, [isUnlocked, chatChannel, sessionAccess]);

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

  // Info: (20260720 - Tzuhan) #51 圖表文案(i18n;數值本身一律引擎產出,與語言無關)
  const chartLabels: ICarbonChartLabels = useMemo(
    () => ({
      pieTitle: t("carbon_chatbot.chart_scope_pie_title"),
      barTitle: t("carbon_chatbot.chart_scope_bar_title"),
      axisCo2e: "kgCO2e",
      insufficient: t("carbon_chatbot.chart_insufficient"),
      frozen: t("carbon_chatbot.chart_frozen"),
      sankeyChatNode: t("carbon_chatbot.chart_sankey_chat_node"),
      // Info: (20260722 - Tzuhan) UAT:範疇顯示名(enum 值不可讀)
      formatScope: (scope: string) => formatGhgCategoryLabel(scope, language),
    }),
    [t, language],
  );
  useEffect(() => {
    if (!activeInventoryState) return undefined;
    if (!inventoryRestoredChannelsRef.current.has(chatChannel))
      return undefined;
    if (!inventoryVersionsRef.current.has(chatChannel)) return undefined;
    const master = masterKeyRef.current;
    if (!master) return undefined;

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
        sessionAccess[chatChannel]?.accountBookId ?? null,
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
          body: JSON.stringify({
            paragraphId,
            conversationContext: [],
            contextFacts: facts,
            language,
            existingContent: paragraph.content,
            instruction,
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
        draftNoticeTimerRef.current = setTimeout(() => {
          draftNoticeTimerRef.current = null;
          setDraftNotice(null);
        }, CARBON_DRAFT_NOTICE_DISMISS_MS);
      }
    },
    [sessionsData, activeSessionId, language, t],
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
  }, [sessionsData, user?.address]);

  // Info: (20260714 - Tzuhan) 切換聊天室: 各室訊息/報告/等待狀態彼此隔離，僅重置跨室共用的暫態 UI
  // Info: (20260714 - Tzuhan) (輸入框、附件、高亮、跳段目標為輸入層暫態；busy/計時器 per-session 不需重置)
  const switchSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setActiveParagraphId(null);
    setHighlightedParagraphId(null);
    setFocusedMessageId(null);
    setInputValue("");
    setPendingAttachments([]);
    setAttachmentError(null);
    setSaveStatus(null);
    setIsError(false);
    setDraftNotice(null);
    setPendingRevision(null);
    setPendingImport(null);
    pendingDraftParagraphIdRef.current = null;
  }, []);

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
  const runImportChapters = useCallback(
    async (
      file: File,
      chapters: { id: string; title: string }[],
      extractActivitiesOnFirst: boolean,
    ) => {
      interface IImportChunkPayload {
        segments: { paragraphId: string; title: string; content: string }[];
        unmapped: string[];
        activities?: IActivityRecord[];
      }
      const results: (IImportChunkPayload | null)[] = new Array(
        chapters.length,
      ).fill(null);
      const failed: { id: string; title: string }[] = [];
      let nextIndex = 0;
      let completedCount = 0;

      const reportProgress = () => {
        setDraftNotice({
          type: "loading",
          text: t("carbon_chatbot.import_parsing_chapter", {
            name: file.name,
            current: completedCount,
            total: chapters.length,
          }),
        });
      };
      reportProgress();

      // Info: (20260717 - Tzuhan) worker 以遞迴取號(每 worker 同時只跑一章;深度上限 = 章節數 11,無堆疊風險)
      const processNext = async (): Promise<void> => {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= chapters.length) return;
        const chapter = chapters[index];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language", language);
        formData.append("chapterId", chapter.id);
        formData.append(
          "extractActivities",
          extractActivitiesOnFirst && index === 0 ? "true" : "false",
        );
        try {
          const res = await request<{ payload: IImportChunkPayload | null }>(
            "/api/v1/chat/carbon/import",
            { method: "POST", body: formData },
          );
          results[index] = res.payload;
        } catch (chunkError) {
          console.error(
            "[carbon-chat] import chapter failed:",
            chapter.id,
            chunkError,
          );
          failed.push(chapter);
        }
        completedCount += 1;
        reportProgress();
        await processNext();
      };
      // Info: (20260717 - Tzuhan) 並行度 2:11 章耗時約減半;仍留限流餘裕(LLM bucket 12/min)
      await Promise.all([processNext(), processNext()]);

      const segmentsById = new Map<
        string,
        { title: string; parts: string[] }
      >();
      const unmapped: string[] = [];
      let activities: IActivityRecord[] = [];
      results.forEach((chunk) => {
        if (!chunk) return;
        chunk.segments.forEach((segment) => {
          const bucket = segmentsById.get(segment.paragraphId) ?? {
            title: segment.title,
            parts: [],
          };
          bucket.parts.push(segment.content);
          segmentsById.set(segment.paragraphId, bucket);
        });
        unmapped.push(...chunk.unmapped);
        if (chunk.activities && chunk.activities.length > 0) {
          activities = chunk.activities;
        }
      });

      return {
        segments: Array.from(segmentsById.entries()).map(
          ([paragraphId, bucket]) => ({
            paragraphId,
            title: bucket.title,
            content: bucket.parts.join("\n\n").trim(),
          }),
        ),
        unmapped,
        activities,
        failed,
      };
    },
    [language, t],
  );

  // Info: (20260727 - Tzuhan) #57 草稿補齊執行器:對「原樣匯入後仍空白」的段落,依同一份上傳文件請 LLM 撰寫草稿。
  // Info: (20260727 - Tzuhan) 依章分批(沿用逐章模式的 output 上限考量),依序執行;單批失敗記錄後續行(補齊為 best-effort,不阻斷預覽)
  const runGapFillSections = useCallback(
    async (
      file: File,
      missingSectionIds: string[],
      fileName: string,
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
        setDraftNotice({
          type: "loading",
          text: t("carbon_chatbot.import_drafting_sections", {
            name: fileName,
            current: index + 1,
            total: batches.length,
          }),
        });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language", language);
        formData.append("mode", "draft");
        formData.append("sectionIds", JSON.stringify(batches[index]));
        try {
          // Info: (20260727 - Tzuhan) 循序呼叫(非並行):草稿補齊在匯入 11 章之後,保留 LLM 限流餘裕
          const res = await request<{
            payload: {
              segments: {
                paragraphId: string;
                title: string;
                content: string;
              }[];
            } | null;
          }>("/api/v1/chat/carbon/import", { method: "POST", body: formData });
          drafted.push(...(res.payload?.segments ?? []));
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
    [language, t],
  );

  // Info: (20260716 - Tzuhan) #56 上傳整份報告 → 匯入預覽(不直接寫入;查核重置與數字重勾稽於確認時執行)
  const importReportFile = useCallback(
    async (file: File) => {
      lastImportFileRef.current = file;
      // Info: (20260716 - Tzuhan) 逐章解析(UAT:整份真實報告單次呼叫受 output token 上限,只回少數段落):
      // Info: (20260717 - Tzuhan) pdf 或大檔逐章(11 章,並行度 2);小型文字檔單發
      const useChunked =
        file.type === "application/pdf" ||
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

        if (useChunked) {
          const result = await runImportChapters(file, chapters, true);
          payload = result;
          failedChapters = result.failed;
        } else {
          // Info: (20260717 - Tzuhan) 小型文字檔:單發全綱呼叫
          setDraftNotice({
            type: "loading",
            text: t("carbon_chatbot.import_parsing", { name: file.name }),
          });
          const formData = new FormData();
          formData.append("file", file);
          formData.append("language", language);
          const res = await request<{
            payload: {
              segments: {
                paragraphId: string;
                title: string;
                content: string;
              }[];
              unmapped: string[];
              activities: IActivityRecord[];
            } | null;
          }>("/api/v1/chat/carbon/import", { method: "POST", body: formData });
          payload = res.payload ?? {
            segments: [],
            unmapped: [],
            activities: [],
          };
        }

        setDraftNotice(null);
        if (payload.segments.length === 0 && failedChapters.length === 0) {
          setDraftNotice({
            type: "error",
            text: t("carbon_chatbot.import_empty"),
          });
          draftNoticeTimerRef.current = setTimeout(() => {
            draftNoticeTimerRef.current = null;
            setDraftNotice(null);
          }, CARBON_DRAFT_NOTICE_DISMISS_MS);
          return;
        }
        const paragraphs =
          sessionsData[activeSessionId]?.reportData?.paragraphs ?? [];
        const existingIds = new Set(
          paragraphs.filter((p) => p.content).map((p) => p.id),
        );

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
        if (missingSectionIds.length > 0) {
          draftedSegments = await runGapFillSections(
            file,
            missingSectionIds,
            file.name,
          );
        }
        setDraftNotice(null);

        // Info: (20260716 - Tzuhan) 匯入的活動數據於確認時合併,先隨預覽暫存
        importActivitiesRef.current = payload.activities;
        setPendingImport({
          fileName: file.name,
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
        });
      } catch (error) {
        console.error("[carbon-chat] report import failed:", error);
        setDraftNotice({
          type: "error",
          text: t("carbon_chatbot.import_failed"),
        });
        draftNoticeTimerRef.current = setTimeout(() => {
          draftNoticeTimerRef.current = null;
          setDraftNotice(null);
        }, CARBON_DRAFT_NOTICE_DISMISS_MS);
      }
    },
    [
      sessionsData,
      activeSessionId,
      language,
      t,
      runImportChapters,
      runGapFillSections,
    ],
  );

  // Info: (20260717 - Tzuhan) #56 只重跑失敗章節,結果合併進現有預覽(檔案取自暫存 ref)
  const retryFailedImportChapters = useCallback(async () => {
    const file = lastImportFileRef.current;
    const failed = pendingImport?.failedChapters ?? [];
    if (!file || failed.length === 0 || !pendingImport) return;

    const result = await runImportChapters(file, failed, false);
    setDraftNotice(null);
    setPendingImport((prev) => {
      if (!prev) return prev;
      const itemByParagraph = new Map(
        prev.items.map((item) => [item.paragraphId, item]),
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
      return {
        ...prev,
        items: Array.from(itemByParagraph.values()),
        unmapped: [...prev.unmapped, ...result.unmapped],
        failedChapters: result.failed,
      };
    });
  }, [pendingImport, runImportChapters]);

  const toggleImportItem = useCallback((paragraphId: string) => {
    setPendingImport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.paragraphId === paragraphId
            ? { ...item, checked: !item.checked }
            : item,
        ),
      };
    });
  }, []);

  // Info: (20260716 - Tzuhan) #56 套用匯入:勾選段落寫入(查核一律重置);活動數據入帳本交 /calculate 重勾稽
  const applyPendingImport = useCallback(() => {
    if (!pendingImport) return;
    const selected = pendingImport.items.filter((item) => item.checked);
    if (selected.length === 0) return;
    const contentById = new Map(
      selected.map((item) => [item.paragraphId, item.content]),
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
    setSessionsData((prev) => {
      const session = prev[activeSessionId];
      if (!session?.reportData?.paragraphs) return prev;
      // Info: (20260716 - Tzuhan) 報告保真:逐段 patch rawMarkdown(權威來源存在時)
      let nextRaw = session.reportData.rawMarkdown;
      if (nextRaw) {
        session.reportData.paragraphs.forEach((p) => {
          const imported = contentById.get(p.id);
          if (imported !== undefined && nextRaw) {
            nextRaw = patchMarkdownSection(nextRaw, p.title, imported);
          }
        });
      }
      return {
        ...prev,
        [activeSessionId]: {
          ...session,
          reportData: {
            ...session.reportData,
            rawMarkdown: nextRaw,
            paragraphs: session.reportData.paragraphs.map((p) => {
              const imported = contentById.get(p.id);
              if (imported === undefined) return p;
              // Info: (20260716 - Tzuhan) 匯入內容原樣落地;查核重置(匯入的舊報告不可信任為已驗證)
              return {
                ...p,
                content: imported,
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
    importActivitiesRef.current = [];
    setPendingImport(null);
    jumpToReportParagraph(selected[0].paragraphId);
  }, [
    pendingImport,
    activeSessionId,
    applyInventoryExtraction,
    jumpToReportParagraph,
  ]);

  const discardPendingImport = useCallback(() => {
    importActivitiesRef.current = [];
    setPendingImport(null);
  }, []);

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
        content = insertCarbonChartBlock(
          content,
          CarbonChartTemplateEnum.EMISSION_SANKEY,
          buildCarbonChartBlock(
            CarbonChartTemplateEnum.EMISSION_SANKEY,
            ledgerNow,
            chartLabels,
            dataTableLabels,
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
      if (draftNoticeTimerRef.current) {
        clearTimeout(draftNoticeTimerRef.current);
      }
      draftNoticeTimerRef.current = setTimeout(() => {
        draftNoticeTimerRef.current = null;
        setDraftNotice(null);
      }, CARBON_DRAFT_NOTICE_DISMISS_MS);
    }
  }, [
    activeInventoryState?.computedLedger,
    chatChannel,
    activeSessionId,
    dataTableLabels,
    chartLabels,
    t,
  ]);

  /**
   * Info: (20260722 - Tzuhan) UAT:匯總段(3.6)桑基圖補位 — 獨立 effect,不依賴重算戳記。
   * 涵蓋所有時序:草稿先落地 ledger 後到、既有會話還原、切換會話。
   * 冪等護欄:插入後 hasCarbonChartBlocks 為真,後續執行一律 no-op(不會迴圈)。
   */
  useEffect(() => {
    const ledger = activeInventoryState?.computedLedger;
    if (!ledger || ledger.entries.length === 0) return;
    const reportData = sessionsData[activeSessionId]?.reportData;
    const target = reportData?.paragraphs?.find(
      (p) => p.id === CARBON_AUTO_SANKEY_PARAGRAPH_ID,
    );
    if (!target?.content || hasCarbonChartBlocks(target.content)) return;

    const nextContent = insertCarbonChartBlock(
      target.content,
      CarbonChartTemplateEnum.EMISSION_SANKEY,
      buildCarbonChartBlock(
        CarbonChartTemplateEnum.EMISSION_SANKEY,
        ledger,
        chartLabels,
        dataTableLabels,
      ),
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
          }
        }

        // Info: (20260714 - Tzuhan) 只填空白段落(onlyIfEmpty): 不覆蓋 DB 草稿還原或使用者編輯後的內容
        historyDrafts.forEach((draft) =>
          applyDraftToReport(draft, { onlyIfEmpty: true }),
        );

        setSessionsData((prev) => {
          const session = { ...prev[activeSessionId] };
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
        const updatedSession = { ...prev[activeSessionId] };
        updatedSession.currentStep = `${section.code} ${section.title}：${section.guidance}`;
        return { ...prev, [activeSessionId]: updatedSession };
      });

      setInputValue(
        t("carbon_chatbot.jump_prompt", {
          section: `${section.code} ${section.title}`,
        }),
      );
    },
    [activeSessionId, t],
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
      if (draftNoticeTimerRef.current) {
        clearTimeout(draftNoticeTimerRef.current);
        draftNoticeTimerRef.current = null;
      }
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

        const res = await request<{ payload: IParagraphDraft | null }>(
          "/api/v1/chat/carbon/draft",
          {
            method: "POST",
            body: JSON.stringify({
              paragraphId,
              conversationContext,
              language,
            }),
          },
        );
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
        if (isQuotaApiError(error)) {
          noticeText = t("carbon_chatbot.ai_quota_exceeded");
        } else if (isTimeoutApiError(error)) {
          noticeText = t("carbon_chatbot.ai_timeout");
        } else if (isRateLimitedApiError(error)) {
          noticeText = t("carbon_chatbot.rate_limited");
        }
        setDraftNotice({ type: "error", text: noticeText });
        draftNoticeTimerRef.current = setTimeout(() => {
          draftNoticeTimerRef.current = null;
          setDraftNotice(null);
        }, CARBON_DRAFT_NOTICE_DISMISS_MS);
      } finally {
        setDraftingParagraphId(null);
      }
    },
    [
      draftingParagraphId,
      activeSession,
      language,
      t,
      applyDraftToReport,
      jumpToReportParagraph,
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
      if (draftNoticeTimerRef.current) {
        clearTimeout(draftNoticeTimerRef.current);
      }
      draftNoticeTimerRef.current = setTimeout(() => {
        draftNoticeTimerRef.current = null;
        setDraftNotice(null);
      }, CARBON_DRAFT_NOTICE_DISMISS_MS);
    }

    // Info: (20260721 - Tzuhan) 自動撰寫數據段落(逐段循序:同一時間僅一段生成的既有約束):
    // 只填「尚無內容」的第三章數據段落,絕不覆蓋使用者已有的編輯
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

  // Info: (20260712 - Luphia) 訂閱 chatroom 頻道，接收並解密 AI 回覆等即時訊息（取代原本的 mock CustomEvent）
  useEffect(() => {
    const unsubscribe = subscribeChatroom<IEciesEnvelope>({
      channel: chatChannel,
      // Info: (20260712 - Luphia) 主金鑰尚未就緒（未經 PRF 解鎖）前無法解密，先略過(decryptAndAppendEnvelope 內建防護)
      onMessage: decryptAndAppendEnvelope,
      onError: () => {
        setIsError(true);
        markSessionBusy(activeSessionId, false);
      },
    });
    return unsubscribe;
  }, [chatChannel, activeSessionId, decryptAndAppendEnvelope, markSessionBusy]);

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

  const handleSendMessage = useCallback(async () => {
    const readyAttachments = pendingAttachments.filter(
      (a) => a.status === PendingAttachmentStatusEnum.READY,
    );
    // Info: (20260714 - Tzuhan) 有文字或有就緒附件即可送出
    if ((!inputValue.trim() && readyAttachments.length === 0) || isLoading)
      return;

    // Info: (20260712 - Luphia) 先於使用者手勢內備妥主金鑰（WebAuthn PRF 需 user activation）；不支援裝置直接提示
    let masterKey: IChatroomMasterKey;
    try {
      masterKey = await ensureMasterKeyCached();
    } catch (keyError) {
      if (keyError instanceof ChatroomUnsupportedDeviceError) {
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
      text: inputValue,
      ...(attachmentsMeta.length > 0 ? { attachments: attachmentsMeta } : {}),
    };

    // Info: (20260713 - Tzuhan) 廢除訊息計次假進度；進度一律由 reportStats 依實際完成段落數推導
    setSessionsData((prev) => {
      const updatedSession = { ...prev[activeSessionId] };
      // Info: (20260714 - Tzuhan) 新對話以首則使用者訊息摘要為標題(demo 精度: 截前 24 字)
      const hasUserMessage = updatedSession.messages.some(
        (m) => m.sender === ChatRoleEnum.USER,
      );
      if (
        !hasUserMessage &&
        inputValue.trim() &&
        !updatedSession.isTitleCustom &&
        updatedSession.title === t("carbon_chatbot.new_session_title")
      ) {
        updatedSession.title = inputValue.trim().slice(0, 24);
      }
      updatedSession.messages = [...updatedSession.messages, userMessage];
      return { ...prev, [activeSessionId]: updatedSession };
    });

    setInputValue("");
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

      const data = await request<{
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
          // Info: (20260714 - Tzuhan) 附件只帶 metadata+cid(檔案已在 Laria)；請求 body 維持輕量
          ...(attachmentsMeta.length > 0
            ? { attachments: attachmentsMeta }
            : {}),
        }),
      });

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
        applyInventoryExtraction({ activities: payload.attachmentActivities });
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
      if (isQuotaApiError(error)) {
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
  }, [
    inputValue,
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
  ]);

  // Info: (20260712 - Luphia) 進入 channel 的一次性手勢：解鎖金鑰(PRF) → 請後端做前置作業並經 Centrifugo 回傳招呼詞
  const initializeChat = useCallback(async () => {
    if (isUnlocked) return;

    try {
      // Info: (20260714 - Tzuhan) 解鎖後主金鑰存於 masterKeyRef，歷史載入/招呼詞由 channel 載入 effect 接手
      await ensureMasterKeyCached();
    } catch (keyError) {
      if (keyError instanceof ChatroomUnsupportedDeviceError) {
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
      console.error("[carbon-chat] failed to unlock encryption key:", keyError);
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

    setIsUnlocked(true);
    setUnlockedMasterKey(masterKeyRef.current);
    setIsError(false);
    // Info: (20260714 - Tzuhan) 歷史載入與招呼詞改由 channel 載入 effect 統一處理(切換 session 亦適用)
  }, [isUnlocked, ensureMasterKeyCached, appendMessageLocally, t]);

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
    sessionsList,
    activeSession,
    activeSessionId,
    // Info: (20260714 - Tzuhan) 對外的切換入口為 switchSession(重置跨室暫態 UI)，沿用原名稱以維持呼叫端不變
    setActiveSessionId: switchSession,
    createNewSession,
    saveStatus,
    // Info: (20260716 - Tzuhan) 命名:對話改名 + 報告檔名改名
    renameSession,
    renameReportDocument,
    inputValue,
    setInputValue,
    isTyping,
    isLoading,
    isError,
    isUnlocked,
    initializeChat,
    hasMoreHistory,
    isLoadingHistory,
    loadMoreHistory,
    handleSendMessage,
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
    retryFailedImportChapters,
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
