// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Custom hook to manage Carbon Chatbot state, including UI states and AI API integration.

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  IChatSession,
  IChatMessage,
  ChatRoleEnum,
} from "@/types/carbon_chatbot.types";
import { INITIAL_SESSIONS } from "@/constants/carbon_chatbot.mock";
import { useTranslation } from "@/i18n/i18n_context";

// Info: (20260712 - Luphia) 抽出魔術字串與魔術數字為具名常數，提升可讀性與可維護性
const DEFAULT_SESSION_ID = "2025";
const USER_PROGRESS_MAX = 80;
const USER_PROGRESS_STEP = 15;
const SESSION_PROGRESS_MAX = 95;
const AI_REPLY_PROGRESS_STEP = 10;

export const useCarbonChat = () => {
  const { t, language } = useTranslation();
  const [sessionsData, setSessionsData] =
    useState<Record<string, IChatSession>>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] =
    useState<string>(DEFAULT_SESSION_ID);
  const [inputValue, setInputValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef<number>(0);
  const prevSessionId = useRef<string>(DEFAULT_SESSION_ID);

  useEffect(() => {
    // Info: (20260708 - Tzuhan) Dynamically update welcome message when language changes
    setSessionsData((prev) => {
      const updated = { ...prev };
      if (updated[DEFAULT_SESSION_ID]) {
        const newMessages = [...updated[DEFAULT_SESSION_ID].messages];
        if (
          newMessages.length > 0 &&
          newMessages[0].sender === ChatRoleEnum.AI &&
          newMessages.length === 1
        ) {
          newMessages[0] = {
            ...newMessages[0],
            text: t("carbon_chatbot.welcome_message"),
          };
        }
        updated[DEFAULT_SESSION_ID] = {
          ...updated[DEFAULT_SESSION_ID],
          messages: newMessages,
        };
      }
      return updated;
    });
  }, [t]);

  const activeSession = sessionsData[activeSessionId];
  // Info: (20260712 - Luphia) 以 useMemo 快取 session 列表，避免每次 render 重建陣列
  const sessionsList = useMemo(
    () => Object.values(sessionsData),
    [sessionsData],
  );

  useEffect(() => {
    // Info: (20260708 - Tzuhan) Scroll to bottom only on new messages within the same session
    const currentCount = activeSession?.messages.length || 0;
    const isSameSession = prevSessionId.current === activeSessionId;

    if (
      isSameSession &&
      (currentCount > prevMessageCount.current || isTyping)
    ) {
      // Info: (20260708 - Tzuhan) Use block: "nearest" to prevent scrolling the whole page
      chatEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    prevMessageCount.current = currentCount;
    prevSessionId.current = activeSessionId;
  }, [activeSession?.messages.length, activeSessionId, isTyping]);

  // Info: (20260712 - Luphia) 合併原本重複的 toggleParagraphCompleted / toggleParagraphVerified，改由單一 helper 依欄位切換
  const toggleParagraphField = useCallback(
    (paragraphId: string, field: "isCompleted" | "isVerified") => {
      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        if (!updatedSession.reportData?.paragraphs) return prev;

        const newParagraphs = updatedSession.reportData.paragraphs.map((p) =>
          p.id === paragraphId ? { ...p, [field]: !p[field] } : p,
        );

        updatedSession.reportData = {
          ...updatedSession.reportData,
          paragraphs: newParagraphs,
        };
        return { ...prev, [activeSessionId]: updatedSession };
      });
    },
    [activeSessionId],
  );

  const toggleParagraphCompleted = useCallback(
    (paragraphId: string) => toggleParagraphField(paragraphId, "isCompleted"),
    [toggleParagraphField],
  );

  const toggleParagraphVerified = useCallback(
    (paragraphId: string) => toggleParagraphField(paragraphId, "isVerified"),
    [toggleParagraphField],
  );

  const handleMarkdownChange = useCallback(
    (newMarkdown: string) => {
      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        if (!updatedSession.reportData?.paragraphs) return prev;

        // Info: (20260708 - Tzuhan) Regex/Diff 比對法：用標題切分段落並比對
        const blocks = newMarkdown
          .split(/(?=### SECTION)/)
          .map((s) => s.trim())
          .filter(Boolean);
        let hasChanges = false;
        const newParagraphs = [...updatedSession.reportData.paragraphs];

        // Info: (20260709 - Tzuhan) 防呆機制：如果 Regex 切割出來的區塊數量與原先的段落數量不一致，
        // Info: (20260709 - Tzuhan) 代表使用者可能誤刪了關鍵的切分標籤 (### SECTION)，為確保資料正確性，直接將所有段落設為未查核。
        if (blocks.length !== newParagraphs.length) {
          for (let i = 0; i < newParagraphs.length; i++) {
            const nextContent = blocks[i] || newParagraphs[i].content;
            // Info: (20260712 - Luphia) 僅在內容或查核狀態確實變動時才更新，避免無謂的狀態變更
            if (
              nextContent !== newParagraphs[i].content ||
              newParagraphs[i].isVerified
            ) {
              newParagraphs[i] = {
                ...newParagraphs[i],
                content: nextContent,
                isVerified: false,
              };
              hasChanges = true;
            }
          }
        } else {
          for (let i = 0; i < newParagraphs.length; i++) {
            const currentBlock = blocks[i] || "";
            // Info: (20260709 - Tzuhan) 如果內容被修改，重置查核狀態為未查核 (isVerified: false)
            if (currentBlock !== newParagraphs[i].content) {
              newParagraphs[i] = {
                ...newParagraphs[i],
                content: currentBlock,
                isVerified: false,
              };
              hasChanges = true;
            }
          }
        }

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

  // Info: (20260708 - Tzuhan) Mock Pusher Implementation
  useEffect(() => {
    // Info: (20260708 - Tzuhan) 模擬 Pusher Client 監聽
    const handleMockPusherEvent = (event: CustomEvent) => {
      const { message, progressUpdate } = event.detail;

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
    };

    window.addEventListener(
      `mock-pusher-chat-${activeSessionId}`,
      handleMockPusherEvent as EventListener,
    );
    return () => {
      window.removeEventListener(
        `mock-pusher-chat-${activeSessionId}`,
        handleMockPusherEvent as EventListener,
      );
    };
  }, [activeSessionId]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: IChatMessage = {
      id: crypto.randomUUID(),
      sender: ChatRoleEnum.USER,
      text: inputValue,
    };

    setSessionsData((prev) => {
      const updatedSession = { ...prev[activeSessionId] };
      updatedSession.messages = [...updatedSession.messages, userMessage];
      updatedSession.progress = Math.min(
        USER_PROGRESS_MAX,
        updatedSession.progress + USER_PROGRESS_STEP,
      );
      return { ...prev, [activeSessionId]: updatedSession };
    });

    setInputValue("");
    setIsTyping(true);
    setIsLoading(true);
    setIsError(false);

    try {
      const currentHistory = [...activeSession.messages, userMessage].map(
        (msg) => ({
          role: msg.sender === ChatRoleEnum.USER ? "user" : "model",
          text: msg.text,
        }),
      );

      const response = await fetch("/api/v1/chat/carbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          history: currentHistory,
          currentStep: activeSession.currentStep,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error("API Network response was not ok");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || "API returned an error");
      }

      const aiReply: IChatMessage = {
        id: crypto.randomUUID(),
        sender: ChatRoleEnum.AI,
        text: data.payload?.reply || t("carbon_chatbot.system_unavailable"),
      };

      // Info: (20260708 - Tzuhan) 改由 Mock Pusher 派發事件來更新畫面
      const event = new CustomEvent(`mock-pusher-chat-${activeSessionId}`, {
        detail: { message: aiReply, progressUpdate: AI_REPLY_PROGRESS_STEP },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      setIsError(true);

      const errorReply: IChatMessage = {
        id: crypto.randomUUID(),
        sender: ChatRoleEnum.AI,
        text: t("carbon_chatbot.system_error"),
      };

      // Info: (20260708 - Tzuhan) 若發生錯誤，直接派發事件
      const event = new CustomEvent(`mock-pusher-chat-${activeSessionId}`, {
        detail: { message: errorReply, progressUpdate: 0 },
      });
      window.dispatchEvent(event);
    }
  }, [inputValue, isLoading, activeSession, activeSessionId, language, t]);

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
    handleSendMessage,
    toggleParagraphCompleted,
    toggleParagraphVerified,
    handleMarkdownChange,
    chatEndRef,
  };
};
