// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Custom hook to manage Carbon Chatbot state, including UI states and AI API integration.

import { useState, useRef, useEffect } from "react";
import {
  IChatSession,
  IChatMessage,
  ChatRoleEnum,
  IUploadedFileData,
} from "@/types/carbon_chatbot.types";
import { INITIAL_SESSIONS } from "@/constants/carbon_chatbot.mock";
import { useTranslation } from "@/i18n/i18n_context";
import { uploadFile, fileToBase64 } from "@/lib/file_operator";

export const useCarbonChat = () => {
  const { t, language } = useTranslation();
  const [sessionsData, setSessionsData] =
    useState<Record<string, IChatSession>>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>("2025");
  const [inputValue, setInputValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  // Info: (20260709 - Tzuhan) Manage files selected before sending
  const [pendingAttachments, setPendingAttachments] = useState<
    IUploadedFileData[]
  >([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef<number>(0);
  const prevSessionId = useRef<string>("2025");

  useEffect(() => {
    // Info: (20260708 - Tzuhan) Dynamically update welcome message when language changes
    setSessionsData((prev) => {
      const updated = { ...prev };
      if (updated["2025"]) {
        const newMessages = [...updated["2025"].messages];
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
        updated["2025"] = { ...updated["2025"], messages: newMessages };
      }
      return updated;
    });
  }, [t]);

  // Info: (20260709 - Tzuhan) Clean up object URLs to prevent memory leak
  useEffect(() => {
    return () => {
      pendingAttachments.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      });
    };
  }, [pendingAttachments]);

  const activeSession = sessionsData[activeSessionId];
  const sessionsList = Object.values(sessionsData);

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

  const toggleParagraphCompleted = (paragraphId: string) => {
    setSessionsData((prev) => {
      const updatedSession = { ...prev[activeSessionId] };
      if (!updatedSession.reportData?.paragraphs) return prev;

      const newParagraphs = updatedSession.reportData.paragraphs.map((p) =>
        p.id === paragraphId ? { ...p, isCompleted: !p.isCompleted } : p,
      );

      updatedSession.reportData = {
        ...updatedSession.reportData,
        paragraphs: newParagraphs,
      };
      return { ...prev, [activeSessionId]: updatedSession };
    });
  };

  const toggleParagraphVerified = (paragraphId: string) => {
    setSessionsData((prev) => {
      const updatedSession = { ...prev[activeSessionId] };
      if (!updatedSession.reportData?.paragraphs) return prev;

      const newParagraphs = updatedSession.reportData.paragraphs.map((p) =>
        p.id === paragraphId ? { ...p, isVerified: !p.isVerified } : p,
      );

      updatedSession.reportData = {
        ...updatedSession.reportData,
        paragraphs: newParagraphs,
      };
      return { ...prev, [activeSessionId]: updatedSession };
    });
  };

  const handleMarkdownChange = (newMarkdown: string) => {
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
      // 代表使用者可能誤刪了關鍵的切分標籤 (### SECTION)，為確保資料正確性，直接將所有段落設為未查核。
      if (blocks.length !== newParagraphs.length) {
        for (let i = 0; i < newParagraphs.length; i++) {
          newParagraphs[i] = {
            ...newParagraphs[i],
            content: blocks[i] || newParagraphs[i].content,
            isVerified: false,
          };
        }
        hasChanges = true;
      } else {
        for (let i = 0; i < newParagraphs.length; i++) {
          const currentBlock = blocks[i] || "";
          // 如果內容被修改，重置查核狀態為未查核 (isVerified: false)
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
  };

  // Info: (20260708 - Tzuhan) Mock Pusher Implementation
  useEffect(() => {
    // 模擬 Pusher Client 監聽
    const handleMockPusherEvent = (event: CustomEvent) => {
      const { message, progressUpdate } = event.detail;

      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        updatedSession.messages = [...updatedSession.messages, message];
        if (progressUpdate) {
          updatedSession.progress = Math.min(
            95,
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

  const handleFilesAdded = async (files: File[]) => {
    setIsUploading(true);
    try {
      const newUploads: IUploadedFileData[] = [];
      await Promise.all(
        files.map(async (file) => {
          const [hashInfo, base64] = await Promise.all([
            new Promise<{ hash: string }>((resolve, reject) => {
              uploadFile(file, {
                onSuccess: (hash) => resolve({ hash }),
                onError: (error) => reject(error),
              });
            }),
            fileToBase64(file),
          ]);
          newUploads.push({
            id: crypto.randomUUID(),
            file: {
              ...file,
              name: file.name,
              type: file.type,
            } as File,
            previewUrl: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : null,
            hash: hashInfo.hash,
            base64,
          });
        }),
      );
      setPendingAttachments((prev) => [...prev, ...newUploads]);
    } catch (error) {
      console.error("Upload failed", error);
      setIsError(true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileRemoved = (id: string) => {
    setPendingAttachments((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSendMessage = async () => {
    if (
      (!inputValue.trim() && pendingAttachments.length === 0) ||
      isLoading ||
      isUploading
    )
      return;

    const currentAttachments = [...pendingAttachments];
    const userMessage: IChatMessage = {
      id: Date.now().toString(),
      sender: ChatRoleEnum.USER,
      text: inputValue,
      attachments:
        currentAttachments.length > 0 ? currentAttachments : undefined,
    };

    setSessionsData((prev) => {
      const updatedSession = { ...prev[activeSessionId] };
      updatedSession.messages = [...updatedSession.messages, userMessage];
      updatedSession.progress = Math.min(80, updatedSession.progress + 15);
      return { ...prev, [activeSessionId]: updatedSession };
    });

    setInputValue("");
    setPendingAttachments([]); // Clear pending files after sending
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
          attachments: currentAttachments.map((att) => ({
            hash: att.hash,
            base64: att.base64,
            type: att.file.type,
          })),
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
        id: (Date.now() + 1).toString(),
        sender: ChatRoleEnum.AI,
        text: data.payload?.reply || t("carbon_chatbot.system_unavailable"),
      };

      // Info: (20260708 - Tzuhan) 改由 Mock Pusher 派發事件來更新畫面
      const event = new CustomEvent(`mock-pusher-chat-${activeSessionId}`, {
        detail: { message: aiReply, progressUpdate: 10 },
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      setIsError(true);

      const errorReply: IChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: ChatRoleEnum.AI,
        text: t("carbon_chatbot.system_error"),
      };

      // 若發生錯誤，直接派發事件
      const event = new CustomEvent(`mock-pusher-chat-${activeSessionId}`, {
        detail: { message: errorReply, progressUpdate: 0 },
      });
      window.dispatchEvent(event);
    }
  };

  return {
    sessionsList,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    inputValue,
    setInputValue,
    pendingAttachments,
    isUploading,
    isTyping,
    isLoading,
    isError,
    handleSendMessage,
    handleFilesAdded,
    handleFileRemoved,
    toggleParagraphCompleted,
    toggleParagraphVerified,
    handleMarkdownChange,
    chatEndRef,
  };
};
