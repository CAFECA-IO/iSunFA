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
} from "@/types/carbon_chatbot.types";
import { fileToBase64 } from "@/lib/file_operator";
import { formatFileSize } from "@/lib/utils/common";
import {
  CARBON_REPORT_OUTLINE,
  CARBON_REPORT_SECTION_COUNT,
  buildSectionHeading,
} from "@/constants/carbon_report_outline";
import { IParagraphDraft } from "@/interfaces/carbon_paragraph_draft";
import {
  createDefaultSessions,
  createChatSession,
} from "@/constants/carbon_chatbot.session";
import {
  loadReportDraft,
  saveReportDraft,
  loadSessionsIndex,
  saveSessionsIndex,
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
import { useAuth } from "@/contexts/auth_context";
import {
  DEFAULT_SESSION_ID,
  SESSION_PROGRESS_MAX,
  buildCarbonChatChannel,
  CARBON_CHAT_REPLY_TIMEOUT_MS,
  CARBON_CHAT_AI_CONTEXT_SIZE,
  CARBON_CHAT_ALLOWED_ATTACHMENT_MIME_TYPES,
  CARBON_CHAT_MAX_ATTACHMENT_BYTES,
  CARBON_CHAT_MAX_ATTACHMENTS_PER_MESSAGE,
  CARBON_CHAT_HIGHLIGHT_DURATION_MS,
  CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS,
} from "@/constants/carbon_chatbot";

// Info: (20260714 - Emily) 報告草稿保存狀態(工具列顯示;null = 尚無變更)
export type ReportSaveStatus = "saving" | "saved" | null;

export const useCarbonChat = () => {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [sessionsData, setSessionsData] = useState<
    Record<string, IChatSession>
  >(() => createDefaultSessions());
  const [activeSessionId, setActiveSessionId] =
    useState<string>(DEFAULT_SESSION_ID);
  const [inputValue, setInputValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  // Info: (20260712 - Luphia) 是否已於進入時完成一次手勢解鎖（PRF）；未解鎖前不呼叫 AI、不顯示對話
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  // Info: (20260713 - Tzuhan) 目前對話正在引導的報告段落(vibe 模式:跳段 = 切換對話目標)
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(
    null,
  );
  // Info: (20260714 - Emily) 正在生成草稿的段落 id;同一時間只允許一段生成,避免併發寫入報告
  const [draftingParagraphId, setDraftingParagraphId] = useState<string | null>(
    null,
  );
  // Info: (20260714 - Emily) 待送出附件(base64 僅存記憶體,送出後清除)與附件驗證錯誤提示
  const [pendingAttachments, setPendingAttachments] = useState<
    IPendingAttachment[]
  >([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  // Info: (20260714 - Emily) 對話↔報告雙向連動:報告段落高亮與對話訊息閃爍(皆為短暫狀態,逾時自動清除)
  const [highlightedParagraphId, setHighlightedParagraphId] = useState<
    string | null
  >(null);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Info: (20260714 - Emily) 報告草稿保存狀態與「已還原草稿的 channel」集合(還原前禁止自動保存,避免空骨架覆蓋既有草稿)
  const [saveStatus, setSaveStatus] = useState<ReportSaveStatus>(null);
  const restoredChannelsRef = useRef<Set<string>>(new Set());
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Info: (20260714 - Emily) 已載入過歷史的 channel(切換 session 時各自載一次)
  const loadedChannelsRef = useRef<Set<string>>(new Set());
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
  // Info: (20260712 - Luphia) 等待 AI 回覆經 Centrifugo 回傳的逾時計時器；收到訊息即取消
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSessionId = useRef<string>(DEFAULT_SESSION_ID);

  // Info: (20260712 - Luphia) 用戶主金鑰：經 WebAuthn PRF 解包/註冊後持久化；xpub 供後端加密、xprv 供本地解密
  const masterKeyRef = useRef<IChatroomMasterKey | null>(null);
  const ensureMasterKeyCached =
    useCallback(async (): Promise<IChatroomMasterKey> => {
      if (!masterKeyRef.current) {
        masterKeyRef.current = await ensureMasterKey();
      }
      return masterKeyRef.current;
    }, []);

  // Info: (20260714 - Emily) 是否仍在等待 AI 回覆:附件管線拉長請求時間後,回覆常在 fetch 返回前就經訂閱送達,
  // Info: (20260714 - Emily) 此旗標避免 startReplyTimeout 在回覆已到後才啟動計時器,30 秒後誤報系統無回應
  const pendingReplyRef = useRef<boolean>(false);

  // Info: (20260712 - Luphia) 將訊息直接追加到當前 session 並解除等待狀態（訂閱收訊與 publish 失敗保底共用）
  const appendMessageLocally = useCallback(
    (message: IChatMessage, progressUpdate: number) => {
      // Info: (20260712 - Luphia) 有訊息就緒即取消等待逾時計時器
      pendingReplyRef.current = false;
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current);
        replyTimeoutRef.current = null;
      }
      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        updatedSession.messages = [...updatedSession.messages, message];
        if (progressUpdate) {
          updatedSession.progress = Math.min(
            SESSION_PROGRESS_MAX,
            updatedSession.progress + progressUpdate,
          );
        }
        return { ...prev, [activeSessionId]: updatedSession };
      });
      setIsTyping(false);
      setIsLoading(false);
    },
    [activeSessionId],
  );

  // Info: (20260712 - Luphia) 送出後啟動等待逾時；逾時仍未經訂閱收到回覆即解除等待並提示，避免卡在 typing
  const startReplyTimeout = useCallback(() => {
    // Info: (20260714 - Emily) 回覆已於 fetch 期間送達則不再啟動計時器
    if (!pendingReplyRef.current) return;
    if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
    replyTimeoutRef.current = setTimeout(() => {
      replyTimeoutRef.current = null;
      setIsError(true);
      appendMessageLocally(
        {
          id: crypto.randomUUID(),
          sender: ChatRoleEnum.AI,
          text: t("carbon_chatbot.system_unavailable"),
        },
        0,
      );
    }, CARBON_CHAT_REPLY_TIMEOUT_MS);
  }, [appendMessageLocally, t]);

  // Info: (20260712 - Luphia) 卸載時清除逾時計時器
  useEffect(() => {
    return () => {
      if (replyTimeoutRef.current) clearTimeout(replyTimeoutRef.current);
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  // Info: (20260714 - Emily) sessions 以 DB Chatroom 為 single source of truth(換裝置/清瀏覽器不再出現殭屍房間)
  // Info: (20260714 - Emily) 標題衍生自密文首訊(server 讀不到),localStorage 索引降級為標題快取
  const sessionsIndexLoadedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!user?.address || sessionsIndexLoadedRef.current) return;
    sessionsIndexLoadedRef.current = true;
    const titleCache = new Map(
      (loadSessionsIndex(user.address) ?? []).map((entry) => [
        entry.id,
        entry,
      ]),
    );

    request<{
      payload: {
        sessions: { sessionId: string; createdAt: string }[];
      } | null;
    }>("/api/v1/chat/carbon/sessions")
      .then((res) => {
        const sessions = res.payload?.sessions ?? [];
        if (sessions.length === 0) return;
        setSessionsData((prev) => {
          const next = { ...prev };
          sessions.forEach((entry) => {
            if (!entry.sessionId || next[entry.sessionId]) return;
            const cached = titleCache.get(entry.sessionId);
            next[entry.sessionId] = createChatSession(
              entry.sessionId,
              cached?.title ?? t("carbon_chatbot.new_session_title"),
              cached?.createdAt ??
                new Date(entry.createdAt).toLocaleDateString(),
            );
          });
          return next;
        });
      })
      .catch((error) => {
        // Info: (20260714 - Emily) 列表載入失敗不阻斷(仍可用預設 session 對話)
        console.error("[carbon-chat] failed to load sessions:", error);
      });
  }, [user?.address, t]);

  // Info: (20260714 - Emily) 切至 session 時還原本機報告草稿(每 channel 只還原一次,之後以記憶體狀態為準)
  useEffect(() => {
    if (restoredChannelsRef.current.has(chatChannel)) return;
    restoredChannelsRef.current.add(chatChannel);
    const draft = loadReportDraft(chatChannel);
    if (!draft) return;
    setSessionsData((prev) => {
      const session = prev[activeSessionId];
      if (!session) return prev;
      return { ...prev, [activeSessionId]: { ...session, reportData: draft } };
    });
  }, [chatChannel, activeSessionId]);

  // Info: (20260714 - Emily) 報告草稿 debounce 自動保存;還原完成前不保存,避免空骨架覆蓋既有草稿
  const activeReportData = sessionsData[activeSessionId]?.reportData;
  useEffect(() => {
    if (!activeReportData) return undefined;
    if (!restoredChannelsRef.current.has(chatChannel)) return undefined;
    setSaveStatus("saving");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      saveReportDraft(chatChannel, activeReportData);
      setSaveStatus("saved");
    }, CARBON_REPORT_AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [activeReportData, chatChannel]);

  // Info: (20260714 - Emily) sessions 索引持久化(id/標題/建立時間;訊息內容已由 DB 密文保存,不重複入本機)
  useEffect(() => {
    if (!user?.address || !sessionsIndexLoadedRef.current) return;
    const entries = Object.values(sessionsData).map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.time,
    }));
    saveSessionsIndex(user.address, entries);
  }, [sessionsData, user?.address]);

  // Info: (20260714 - Emily) 新增對話:建立空白 session 並切換;channel 隨 id 變更,歷史/草稿各自獨立
  const createNewSession = useCallback(() => {
    const id = `s${Date.now().toString(36)}`;
    const session = createChatSession(
      id,
      t("carbon_chatbot.new_session_title"),
      new Date().toLocaleDateString(),
    );
    setSessionsData((prev) => ({ ...prev, [id]: session }));
    setActiveSessionId(id);
    setActiveParagraphId(null);
  }, [t]);

  // Info: (20260714 - Emily) 跳至報告段落並短暫高亮(chip 點擊與草稿寫入後的即時回饋共用)
  const jumpToReportParagraph = useCallback((paragraphId: string) => {
    setActiveParagraphId(paragraphId);
    setHighlightedParagraphId(paragraphId);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      highlightTimerRef.current = null;
      setHighlightedParagraphId(null);
    }, CARBON_CHAT_HIGHLIGHT_DURATION_MS);
  }, []);

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
        for (const envelope of payload.messages) {
          try {
            const plaintext = await eciesDecrypt(
              master.extendedPrivateKey,
              envelope,
            );
            const { message } = JSON.parse(plaintext) as {
              message: IChatMessage;
            };
            decrypted.push(message);
          } catch {
            // Info: (20260712 - Luphia) 個別訊息解密失敗則略過
          }
        }

        setSessionsData((prev) => {
          const session = { ...prev[activeSessionId] };
          session.messages = before
            ? [...decrypted, ...session.messages]
            : decrypted;
          // Info: (20260714 - Emily) DB 還原的房間無標題快取時,以首則使用者訊息補標題(僅預設標題可覆寫)
          const firstUserMessage = session.messages.find(
            (m) => m.sender === ChatRoleEnum.USER,
          );
          if (
            firstUserMessage?.text &&
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
    [chatChannel, activeSessionId, t],
  );

  // Info: (20260712 - Luphia) 上卷載入更舊一頁
  const loadMoreHistory = useCallback(async () => {
    if (!hasMoreHistory || isLoadingHistory) return;
    await loadHistory(oldestCreatedAtRef.current ?? undefined);
  }, [hasMoreHistory, isLoadingHistory, loadHistory]);

  const activeSession = sessionsData[activeSessionId];
  // Info: (20260712 - Luphia) 以 useMemo 快取 session 列表，避免每次 render 重建陣列
  // Info: (20260713 - Tzuhan) 有段落大綱的 session,progress 一律以真實完成段落數推導(廢除訊息計次假進度)
  const sessionsList = useMemo(
    () =>
      Object.values(sessionsData).map((session) => {
        const paragraphs = session.reportData?.paragraphs;
        if (!paragraphs || paragraphs.length === 0) return session;
        const completedCount = paragraphs.filter((p) => p.isCompleted).length;
        return {
          ...session,
          progress: Math.round((completedCount / paragraphs.length) * 100),
        };
      }),
    [sessionsData],
  );

  // Info: (20260713 - Tzuhan) 完成/查核雙軌統計:工具列膠囊與進度浮窗共用的單一來源
  const reportStats: IReportProgressStats = useMemo(() => {
    const paragraphs = activeSession?.reportData?.paragraphs ?? [];
    const totalCount = paragraphs.length || CARBON_REPORT_SECTION_COUNT;
    const completedCount = paragraphs.filter((p) => p.isCompleted).length;
    const verifiedCount = paragraphs.filter((p) => p.isVerified).length;
    return {
      completedCount,
      verifiedCount,
      totalCount,
      completedPercent: Math.round((completedCount / totalCount) * 100),
      verifiedPercent: Math.round((verifiedCount / totalCount) * 100),
    };
  }, [activeSession]);

  // Info: (20260714 - Emily) 跳段後的草稿觸發目標:送出預填訊息時觸發該段草稿生成(決定性規則,非 LLM 意圖判斷)
  const pendingDraftParagraphIdRef = useRef<string | null>(null);

  // Info: (20260713 - Tzuhan) 跳段(vibe 模式):標記進行中段落、將該段撰寫指引寫入 currentStep 供 AI 引導、預填對話輸入
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

  // Info: (20260714 - Emily) 反向連動:點報告段落 → 捲動至最近一則關聯訊息並閃爍;無關聯訊息則 fallback 為跳段引導
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

  // Info: (20260714 - Emily) 將草稿寫入 reportData:補上 SECTION 標頭、標記完成、重置查核(單一寫入點,對話生成與附件管線共用)
  const applyDraftToReport = useCallback(
    (draft: IParagraphDraft) => {
      const sectionIndex = CARBON_REPORT_OUTLINE.findIndex(
        (s) => s.id === draft.paragraphId,
      );
      if (sectionIndex < 0) return;
      const section = CARBON_REPORT_OUTLINE[sectionIndex];

      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        const reportData = updatedSession.reportData;
        if (!reportData?.paragraphs) return prev;

        const heading = buildSectionHeading(section, sectionIndex);
        const newParagraphs = reportData.paragraphs.map((p) => {
          if (p.id !== draft.paragraphId) return p;
          return {
            ...p,
            content: `${heading}\n\n${draft.content}`,
            isCompleted: true,
            // Info: (20260714 - Emily) 內容更新即重置查核狀態(零信任:先有產出才有查核)
            isVerified: false,
          };
        });

        updatedSession.reportData = {
          ...reportData,
          paragraphs: newParagraphs,
        };
        return { ...prev, [activeSessionId]: updatedSession };
      });
    },
    [activeSessionId],
  );

  // Info: (20260714 - Emily) 段落草稿生成:呼叫 draft API 由 AI 撰寫敘述,成功後寫入 reportData 並標記完成(查核歸零重簽)
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
      try {
        // Info: (20260714 - Emily) 只取最近 N 則對話供 AI 理解背景,與主對話的 token 控制策略一致
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
        // Info: (20260714 - Emily) 草稿寫入後即時高亮該段,demo 觀眾可見「對話 → 報告」的即時性
        jumpToReportParagraph(draft.paragraphId);
      } catch (error) {
        console.error("[carbon-chat] paragraph draft failed:", error);
        appendMessageLocally(
          {
            id: crypto.randomUUID(),
            sender: ChatRoleEnum.AI,
            text: t("carbon_chatbot.draft_failed", {
              section: `${section.code} ${section.title}`,
            }),
          },
          0,
        );
      } finally {
        setDraftingParagraphId(null);
      }
    },
    [
      draftingParagraphId,
      activeSession,
      language,
      t,
      appendMessageLocally,
      applyDraftToReport,
      jumpToReportParagraph,
    ],
  );

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

  // Info: (20260713 - Tzuhan) vibe 模式:isCompleted 由系統依生成狀態判定,不開放手動切換;僅保留 isVerified 人工簽核
  const toggleParagraphVerified = useCallback(
    (paragraphId: string) => {
      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        if (!updatedSession.reportData?.paragraphs) return prev;

        const newParagraphs = updatedSession.reportData.paragraphs.map((p) => {
          if (p.id !== paragraphId) return p;
          // Info: (20260713 - Tzuhan) 未生成內容的段落不可簽核(零信任:先有產出才有查核)
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
      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        if (!updatedSession.reportData?.paragraphs) return prev;

        // Info: (20260713 - Tzuhan) 以 ### SECTION 切分並僅保留段落區塊(排除文件標頭),
        // Info: (20260713 - Tzuhan) 同時去除組稿時附加的 --- 分隔線,避免與段落原文比對時誤判為變更
        const blocks = newMarkdown
          .split(/(?=### SECTION)/)
          .map((s) => s.replace(/\n+---\s*$/, "").trim())
          .filter((s) => s.startsWith("### SECTION"));

        // Info: (20260713 - Tzuhan) 預覽渲染全部段落(未生成者為佔位區塊),故區塊與 33 段依序 1:1 對齊
        // Info: (20260709 - Tzuhan) 防呆機制:區塊數與段落數不一致,代表使用者可能誤刪切分標籤 (### SECTION),
        // Info: (20260709 - Tzuhan) 為確保資料正確性,將所有已生成段落設為未查核
        const isBlockCountMismatched =
          blocks.length !== updatedSession.reportData.paragraphs.length;

        let hasChanges = false;
        const newParagraphs = updatedSession.reportData.paragraphs.map(
          (p, index) => {
            // Info: (20260713 - Tzuhan) 未生成段落為唯讀佔位,不接受編輯寫入(內容須由 AI 對話生成)
            if (!p.content) return p;
            const nextContent = isBlockCountMismatched
              ? p.content
              : (blocks[index] ?? p.content);

            const isContentChanged = nextContent !== p.content;
            const shouldResetVerified =
              (isContentChanged || isBlockCountMismatched) && p.isVerified;
            // Info: (20260712 - Luphia) 僅在內容或查核狀態確實變動時才更新，避免無謂的狀態變更
            if (!isContentChanged && !shouldResetVerified) return p;

            hasChanges = true;
            return {
              ...p,
              content: nextContent,
              // Info: (20260709 - Tzuhan) 內容被修改,重置查核狀態為未查核 (isVerified: false)
              isVerified: false,
            };
          },
        );

        if (!hasChanges) return prev;

        updatedSession.reportData = {
          ...updatedSession.reportData,
          paragraphs: newParagraphs,
        };
        return { ...prev, [activeSessionId]: updatedSession };
      });
    },
    [activeSessionId],
  );

  // Info: (20260712 - Luphia) 訂閱 chatroom 頻道，接收並解密 AI 回覆等即時訊息（取代原本的 mock CustomEvent）
  useEffect(() => {
    const unsubscribe = subscribeChatroom<IEciesEnvelope>({
      channel: chatChannel,
      onMessage: async (envelope) => {
        // Info: (20260712 - Luphia) 主金鑰尚未就緒（未經 PRF 解鎖）前無法解密，先略過
        const master = masterKeyRef.current;
        if (!master) return;
        try {
          const plaintext = await eciesDecrypt(
            master.extendedPrivateKey,
            envelope,
          );
          const { message, progressUpdate } = JSON.parse(plaintext) as {
            message: IChatMessage;
            progressUpdate: number;
          };
          appendMessageLocally(message, progressUpdate);
        } catch {
          // Info: (20260712 - Luphia) 解密失敗代表非本用戶/非本金鑰的訊息（如惡意跨訂閱），直接忽略
        }
      },
      onError: () => {
        setIsError(true);
        setIsTyping(false);
        setIsLoading(false);
      },
    });
    return unsubscribe;
  }, [chatChannel, appendMessageLocally]);

  // Info: (20260714 - Emily) 加入附件:前端 Fail Fast(MIME 白名單/大小/數量),通過者轉 base64 進待送清單
  const addAttachments = useCallback(
    (files: File[]) => {
      setAttachmentError(null);

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
            data: "",
            status: PendingAttachmentStatusEnum.READING,
          },
        ]);

        // Info: (20260714 - Emily) base64 轉換為非同步;完成前 chip 顯示讀取中,失敗標記錯誤但不阻塞其他附件
        fileToBase64(file)
          .then((data) => {
            setPendingAttachments((prev) =>
              prev.map((a) =>
                a.id === attachmentId
                  ? { ...a, data, status: PendingAttachmentStatusEnum.READY }
                  : a,
              ),
            );
          })
          .catch(() => {
            setPendingAttachments((prev) =>
              prev.map((a) =>
                a.id === attachmentId
                  ? { ...a, status: PendingAttachmentStatusEnum.ERROR }
                  : a,
              ),
            );
          });
      });
    },
    [pendingAttachments.length, t],
  );

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachmentError(null);
    setPendingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  }, []);

  const handleSendMessage = useCallback(async () => {
    const readyAttachments = pendingAttachments.filter(
      (a) => a.status === PendingAttachmentStatusEnum.READY,
    );
    // Info: (20260714 - Emily) 有文字或有就緒附件即可送出
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

    // Info: (20260714 - Emily) 附件 metadata 隨訊息顯示與入庫;base64 內容僅隨請求送 AI 管線,不入 UI 狀態
    const attachmentsMeta: IAttachment[] = readyAttachments.map((a) => ({
      name: a.name,
      size: a.size,
      mimeType: a.mimeType,
    }));

    const userMessage: IChatMessage = {
      id: crypto.randomUUID(),
      sender: ChatRoleEnum.USER,
      text: inputValue,
      ...(attachmentsMeta.length > 0 ? { attachments: attachmentsMeta } : {}),
    };

    // Info: (20260713 - Tzuhan) 廢除訊息計次假進度;進度一律由 reportStats 依實際完成段落數推導
    setSessionsData((prev) => {
      const updatedSession = { ...prev[activeSessionId] };
      // Info: (20260714 - Emily) 新對話以首則使用者訊息摘要為標題(demo 精度:截前 24 字)
      const hasUserMessage = updatedSession.messages.some(
        (m) => m.sender === ChatRoleEnum.USER,
      );
      if (
        !hasUserMessage &&
        inputValue.trim() &&
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
    setIsTyping(true);
    setIsLoading(true);
    setIsError(false);
    pendingReplyRef.current = true;

    // Info: (20260714 - Emily) 跳段後送出且訊息仍指涉該段標題 → 並行觸發段落草稿生成(與聊天回覆互不等待)
    // Info: (20260714 - Emily) 決定性字串規則:預填文字由系統產生;使用者改寫成無關內容則解除,不誤觸發
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
      // Info: (20260714 - Emily) 改用 request helper:自動帶 DeWT Bearer token(後端已加授權檢查)
      const data = await request<{
        success: boolean;
        message: string;
        payload: { drafts?: IParagraphDraft[] } | null;
      }>("/api/v1/chat/carbon", {
        method: "POST",
        body: JSON.stringify({
          history: currentHistory,
          currentStep: activeSession.currentStep,
          language,
          channel: chatChannel,
          recipientPublicKey: masterKey.extendedPublicKey,
          // Info: (20260714 - Emily) 附件含 base64 內容:後端僅記錄 metadata,內容供 AI 萃取管線即時使用
          ...(readyAttachments.length > 0
            ? {
                attachments: readyAttachments.map((a) => ({
                  name: a.name,
                  size: a.size,
                  mimeType: a.mimeType,
                  data: a.data,
                })),
              }
            : {}),
        }),
      });

      if (!data.success) {
        throw new Error(data.message || "AI API returned an error");
      }

      // Info: (20260714 - Emily) 附件管線產出的段落草稿:直接寫入報告並將視角切到第一個生成段落(含即時高亮)
      const payload = data.payload;
      if (payload?.drafts && payload.drafts.length > 0) {
        payload.drafts.forEach(applyDraftToReport);
        jumpToReportParagraph(payload.drafts[0].paragraphId);
      }

      // Info: (20260712 - Luphia) 後端已加密並發佈 AI 回覆到 Centrifugo；由訂閱端解密後顯示，此處不再處理回覆內容
      // Info: (20260712 - Luphia) 啟動等待逾時，避免「已發佈但未收到」時卡在 typing
      startReplyTimeout();
    } catch (error) {
      // Info: (20260712 - Luphia) 此區塊代表「取得 AI 回覆」階段失敗（如 /api/v1/chat/carbon 錯誤）
      console.error("[carbon-chat] Failed to obtain AI response:", error);
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
  }, [
    inputValue,
    isLoading,
    pendingAttachments,
    activeSession,
    activeSessionId,
    language,
    t,
    appendMessageLocally,
    applyDraftToReport,
    jumpToReportParagraph,
    generateParagraphDraft,
    startReplyTimeout,
    chatChannel,
    ensureMasterKeyCached,
  ]);

  // Info: (20260712 - Luphia) 進入 channel 的一次性手勢：解鎖金鑰(PRF) → 請後端做前置作業並經 Centrifugo 回傳招呼詞
  const initializeChat = useCallback(async () => {
    if (isUnlocked) return;

    try {
      // Info: (20260714 - Emily) 解鎖後主金鑰存於 masterKeyRef,歷史載入/招呼詞由 channel 載入 effect 接手
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
    setIsError(false);
    // Info: (20260714 - Emily) 歷史載入與招呼詞改由 channel 載入 effect 統一處理(切換 session 亦適用)
  }, [isUnlocked, ensureMasterKeyCached, appendMessageLocally, t]);

  // Info: (20260712 - Luphia) 空 chatroom → 請後端做前置作業產生招呼詞並加密發佈；由訂閱端解密後顯示
  const requestGreeting = useCallback(
    async (recipientPublicKey: string) => {
      setIsTyping(true);
      pendingReplyRef.current = true;
      try {
        // Info: (20260714 - Emily) 改用 request helper:自動帶 DeWT Bearer token(後端已加授權檢查)
        const data = await request<{ success: boolean; message: string }>(
          "/api/v1/chat/carbon",
          {
            method: "POST",
            body: JSON.stringify({
              init: true,
              channel: chatChannel,
              recipientPublicKey,
              currentStep: activeSession?.currentStep,
              language,
            }),
          },
        );
        if (!data.success) {
          throw new Error(data.message || "Greeting init returned an error");
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
    [chatChannel, activeSession, language, startReplyTimeout, appendMessageLocally, t],
  );

  // Info: (20260714 - Emily) channel 載入 effect:解鎖後(含切換/新增 session)各 channel 載一次歷史,空房間請 AI 招呼
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
    setActiveSessionId,
    createNewSession,
    saveStatus,
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
    activeParagraphId,
    jumpToParagraph,
    highlightedParagraphId,
    focusedMessageId,
    jumpToReportParagraph,
    focusMessageForParagraph,
    draftingParagraphId,
    generateParagraphDraft,
    toggleParagraphVerified,
    handleMarkdownChange,
    chatEndRef,
  };
};
