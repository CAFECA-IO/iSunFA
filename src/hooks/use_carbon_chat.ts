// Info: (20260708 - Tzuhan) Carbon Chatbot Framework
// Info: (20260708 - Tzuhan) Custom hook to manage Carbon Chatbot state, including UI states and AI API integration.

import { useState, useRef, useEffect } from "react";
import {
  IChatSession,
  IChatMessage,
  ChatRoleEnum,
} from "@/types/carbon_chatbot.types";
import { INITIAL_SESSIONS } from "@/constants/carbon_chatbot.mock";
import { useTranslation } from "@/i18n/i18n_context";

export const useCarbonChat = () => {
  const { t, language } = useTranslation();
  const [sessionsData, setSessionsData] =
    useState<Record<string, IChatSession>>(INITIAL_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>("2025");
  const [inputValue, setInputValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: IChatMessage = {
      id: Date.now().toString(),
      sender: ChatRoleEnum.USER,
      text: inputValue,
    };

    // Info: (20260708 - Tzuhan) Update UI immediately with user message
    setSessionsData((prev) => {
      const updatedSession = { ...prev[activeSessionId] };
      updatedSession.messages = [...updatedSession.messages, userMessage];
      // Info: (20260708 - Tzuhan) Slightly increment progress
      updatedSession.progress = Math.min(80, updatedSession.progress + 15);
      return { ...prev, [activeSessionId]: updatedSession };
    });

    setInputValue("");
    setIsTyping(true);
    setIsLoading(true);
    setIsError(false);

    try {
      // Info: (20260708 - Tzuhan) Get the full message history to send to backend
      const currentHistory = [...activeSession.messages, userMessage].map(
        (msg) => ({
          role: msg.sender === ChatRoleEnum.USER ? "user" : "model",
          text: msg.text,
        }),
      );

      // Info: (20260708 - Tzuhan) Call the AI API
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
        id: (Date.now() + 1).toString(),
        sender: ChatRoleEnum.AI,
        text: data.payload?.reply || t("carbon_chatbot.system_unavailable"),
      };

      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        updatedSession.messages = [...updatedSession.messages, aiReply];

        // Info: (20260708 - Tzuhan) Very rough heuristic: if AI asks for file, maybe step progressed?
        // Info: (20260708 - Tzuhan) Real implementation would parse structured output.
        updatedSession.progress = Math.min(95, updatedSession.progress + 10);

        return { ...prev, [activeSessionId]: updatedSession };
      });
    } catch (error) {
      console.error("Failed to fetch AI response:", error);
      setIsError(true);

      // Info: (20260708 - Tzuhan) Provide a fallback error message bubble
      const errorReply: IChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: ChatRoleEnum.AI,
        text: t("carbon_chatbot.system_error"),
      };

      setSessionsData((prev) => {
        const updatedSession = { ...prev[activeSessionId] };
        updatedSession.messages = [...updatedSession.messages, errorReply];
        return { ...prev, [activeSessionId]: updatedSession };
      });
    } finally {
      setIsTyping(false);
      setIsLoading(false);
    }
  };

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
    chatEndRef,
  };
};
