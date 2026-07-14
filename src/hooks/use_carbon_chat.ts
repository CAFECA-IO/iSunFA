// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Custom hook to manage Carbon Chatbot state, including UI states and AI API integration.

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  IChatSession,
  IChatMessage,
  IReportProgressStats,
  ChatRoleEnum,
} from "@/types/carbon_chatbot.types";
import {
  CARBON_REPORT_OUTLINE,
  CARBON_REPORT_SECTION_COUNT,
} from "@/constants/carbon_report_outline";
import { INITIAL_SESSIONS } from "@/constants/carbon_chatbot.mock";
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
  CARBON_CHAT_CHANNEL_PREFIX,
  CARBON_CHAT_REPLY_TIMEOUT_MS,
  CARBON_CHAT_AI_CONTEXT_SIZE,
} from "@/constants/carbon_chatbot";

export const useCarbonChat = () => {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const [sessionsData, setSessionsData] =
    useState<Record<string, IChatSession>>(INITIAL_SESSIONS);
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
  // Info: (20260712 - Luphia) 歷史訊息分頁狀態（上卷載入更多）
  const [hasMoreHistory, setHasMoreHistory] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const oldestCreatedAtRef = useRef<string | null>(null);

  // Info: (20260712 - Luphia) 依「用途-用戶-session」組出獨立頻道，避免不同用戶或不同盤查 session 的訊息互相干擾
  const chatChannel = useMemo(
    () =>
      `${CARBON_CHAT_CHANNEL_PREFIX}-${user?.address ?? "anonymous"}-${activeSessionId}`,
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

  // Info: (20260712 - Luphia) 將訊息直接追加到當前 session 並解除等待狀態（訂閱收訊與 publish 失敗保底共用）
  const appendMessageLocally = useCallback(
    (message: IChatMessage, progressUpdate: number) => {
      // Info: (20260712 - Luphia) 有訊息就緒即取消等待逾時計時器
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
    };
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
    [chatChannel, activeSessionId],
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

  // Info: (20260713 - Tzuhan) 跳段(vibe 模式):標記進行中段落、將該段撰寫指引寫入 currentStep 供 AI 引導、預填對話輸入
  const jumpToParagraph = useCallback(
    (paragraphId: string) => {
      setActiveParagraphId(paragraphId);
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

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

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

    const userMessage: IChatMessage = {
      id: crypto.randomUUID(),
      sender: ChatRoleEnum.USER,
      text: inputValue,
    };

    // Info: (20260713 - Tzuhan) 廢除訊息計次假進度;進度一律由 reportStats 依實際完成段落數推導
    setSessionsData((prev) => {
      const updatedSession = { ...prev[activeSessionId] };
      updatedSession.messages = [...updatedSession.messages, userMessage];
      return { ...prev, [activeSessionId]: updatedSession };
    });

    setInputValue("");
    setIsTyping(true);
    setIsLoading(true);
    setIsError(false);

    try {
      // Info: (20260712 - Luphia) 只取最近 N 則送給 AI 以控 token；畫面仍保有完整歷史
      const currentHistory = [...activeSession.messages, userMessage]
        .slice(-CARBON_CHAT_AI_CONTEXT_SIZE)
        .map((msg) => ({
          role: msg.sender === ChatRoleEnum.USER ? "user" : "model",
          text: msg.text,
        }));

      // Info: (20260712 - Luphia) 傳入頻道與本 session 的加密公鑰(xpub)，由後端加密 AI 回覆並經 Centrifugo 回傳
      const response = await fetch("/api/v1/chat/carbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: currentHistory,
          currentStep: activeSession.currentStep,
          language,
          channel: chatChannel,
          recipientPublicKey: masterKey.extendedPublicKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI API responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "AI API returned an error");
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
    activeSession,
    activeSessionId,
    language,
    t,
    appendMessageLocally,
    startReplyTimeout,
    chatChannel,
    ensureMasterKeyCached,
  ]);

  // Info: (20260712 - Luphia) 進入 channel 的一次性手勢：解鎖金鑰(PRF) → 請後端做前置作業並經 Centrifugo 回傳招呼詞
  const initializeChat = useCallback(async () => {
    if (isUnlocked) return;

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

    // Info: (20260712 - Luphia) 進入時載入最近一頁歷史；已有內容則不需招呼詞
    const historyCount = await loadHistory();
    if (historyCount > 0) return;

    // Info: (20260712 - Luphia) 空 chatroom → 請後端做前置作業產生招呼詞並加密發佈；由訂閱端解密後顯示
    setIsTyping(true);
    try {
      const response = await fetch("/api/v1/chat/carbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          init: true,
          channel: chatChannel,
          recipientPublicKey: masterKey.extendedPublicKey,
          currentStep: activeSession.currentStep,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Greeting init responded with status ${response.status}`,
        );
      }
      const data = await response.json();
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
  }, [
    isUnlocked,
    ensureMasterKeyCached,
    appendMessageLocally,
    startReplyTimeout,
    loadHistory,
    t,
    chatChannel,
    activeSession,
    language,
  ]);

  return {
    sessionsList,
    activeSession,
    activeSessionId,
    setActiveSessionId,
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
    reportStats,
    activeParagraphId,
    jumpToParagraph,
    toggleParagraphVerified,
    handleMarkdownChange,
    chatEndRef,
  };
};
