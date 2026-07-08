"use client";

import { useState, useRef, useEffect } from "react";
import { CirclePause, Sparkles } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useTextSelectionMenu } from "@/hooks/use_text_selection_menu";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { AiContextMenu } from "@/components/pdf_tool/ai_context_menu";
import { AiSuggestionMenu } from "@/components/pdf_tool/ai_suggestion_menu";
import { PdfToolViewMode } from "@/constants/pdf_tool";

// Info: (20260604 - Julian) AI 建議（採用/捨棄）
interface IAiSuggestion {
  isOpen: boolean;
  x: number;
  y: number;
  originalContext: string;
  selectionStart: number;
  selectionEnd: number;
  selectedText: string;
  aiResult: string;
}

interface IEditPanelProps {
  viewMode: PdfToolViewMode;
  markdownContext: string;
  setMarkdownContext: React.Dispatch<React.SetStateAction<string>>;
  isAiProcessing: boolean;
  setIsAiProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  setShareToken: React.Dispatch<React.SetStateAction<string | null>>;
  setErrorModal: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      message: string;
    }>
  >;
}

export default function EditPanel({
  viewMode,
  markdownContext,
  setMarkdownContext,
  isAiProcessing,
  setIsAiProcessing,
  setShareToken,
  setErrorModal,
}: IEditPanelProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Info: (20260603 - Julian) AI Assistant Menu Hook
  const { aiAssistantMenu, setAiAssistantMenu } = useTextSelectionMenu(
    textareaRef,
    isAiProcessing,
  );
  const [aiSuggestion, setAiSuggestion] = useState<IAiSuggestion | null>(null);
  const [customAiPrompt, setCustomAiPrompt] = useState<string>("");

  useEffect(() => {
    return () => {
      // Info: (20260605 - Julian) 元件卸載時，如果還有進行中的 AI 請求，就直接中斷它，避免 Memory Leak
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Info: (20260603 - Julian) 「AI 文本微調」處理
  const handleAiAction = async (actionType: string) => {
    if (!aiAssistantMenu.selectedText || isAiProcessing) return;

    setIsAiProcessing(true);
    setAiAssistantMenu((prev) => ({ ...prev, isOpen: false }));

    try {
      // Info: (20260604 - Julian) 設置 AbortController，以便中斷請求
      abortControllerRef.current = new AbortController();
      const response = await request<IApiResponse<{ result: string }>>(
        "/api/v1/admin/pdf_editor/refine",
        {
          method: "POST",
          body: JSON.stringify({
            text: aiAssistantMenu.selectedText,
            action: actionType, // Info: (20260604 - Julian) 直接傳送 actionType，讓 Backend 處理
          }),
          signal: abortControllerRef.current.signal,
        },
      );

      if (response && response.payload && response.payload.result) {
        // Info: (20260604 - Julian) 設置 AI 建議的座標、選取範圍及結果
        setAiSuggestion({
          isOpen: true,
          x: aiAssistantMenu.x,
          y: aiAssistantMenu.y,
          originalContext: markdownContext,
          selectionStart: aiAssistantMenu.selectionStart,
          selectionEnd: aiAssistantMenu.selectionEnd,
          selectedText: aiAssistantMenu.selectedText,
          aiResult: response.payload.result,
        });
        // Info: (20260604 - Julian) 關閉 AI Assistant menu 並清空 custom prompt
        setAiAssistantMenu((prev) => ({ ...prev, isOpen: false }));
        setCustomAiPrompt("");
      } else {
        setErrorModal({
          isOpen: true,
          message: t(
            "admin_mission_board.pdf_editor.ai_assistant.ai_no_response",
          ),
        });
      }
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("abort")
      ) {
        console.log("AI request cancelled by user.");
        return; // Info: (20260604 - Julian) 用戶主動取消不報錯
      }

      console.error("Failed to refine text:", error);
      setErrorModal({
        isOpen: true,
        message: t("admin_mission_board.pdf_editor.ai_assistant.ai_timeout"),
      });
    } finally {
      setIsAiProcessing(false);
      // Info: (20260604 - Julian) 清空 AbortController
      abortControllerRef.current = null;
    }
  };

  // Info: (20260603 - Julian) AI 編輯 menu
  const aiContextMenu = aiAssistantMenu.isOpen && (
    <AiContextMenu
      isOpen={aiAssistantMenu.isOpen}
      x={aiAssistantMenu.x}
      y={aiAssistantMenu.y}
      customAiPrompt={customAiPrompt}
      setCustomAiPrompt={setCustomAiPrompt}
      isAiProcessing={isAiProcessing}
      handleAiAction={handleAiAction}
    />
  );

  // Info: (20260603 - Julian) 是否採用 AI 建議 menu
  const aiSuggestionMenuEl = aiSuggestion?.isOpen && (
    <AiSuggestionMenu
      isOpen={aiSuggestion.isOpen}
      onReplace={() => {
        const { originalContext, selectionStart, selectionEnd, aiResult } =
          aiSuggestion;
        const newContext =
          originalContext.substring(0, selectionStart) +
          aiResult +
          originalContext.substring(selectionEnd);
        setMarkdownContext(newContext);
        setAiSuggestion(null);
      }}
      onInsert={() => {
        const { originalContext, selectionEnd, aiResult } = aiSuggestion;
        const insertText = `\n\n${aiResult}`;
        const newContext =
          originalContext.substring(0, selectionEnd) +
          insertText +
          originalContext.substring(selectionEnd);
        setMarkdownContext(newContext);
        setAiSuggestion(null);
      }}
      onDiscard={() => setAiSuggestion(null)}
    />
  );

  // Info: (20260603 - Julian) AI 思考中的動畫
  const aiThinkingAnim = isAiProcessing && (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-orange-100 bg-white px-8 py-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <Sparkles size={16} className="animate-pulse" />
          </div>
          <div className="flex items-center gap-1 font-bold text-orange-600">
            <span>
              {t("admin_mission_board.pdf_editor.ai_assistant.ai_is_thinking")}
            </span>
            <span className="flex gap-0.5">
              <span
                className="animate-bounce"
                style={{ animationDelay: "0ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "150ms" }}
              >
                .
              </span>
              <span
                className="animate-bounce"
                style={{ animationDelay: "300ms" }}
              >
                .
              </span>
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (abortControllerRef.current) {
              abortControllerRef.current.abort();
            }
          }}
          className="flex items-center gap-2 rounded-full border border-gray-200 px-6 py-1.5 text-xs font-bold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        >
          <CirclePause size={16} />
          {t("admin_mission_board.pdf_editor.ai_assistant.stop_thinking")}
        </button>
      </div>
    </div>
  );

  // Info: (20260603 - Julian) AI 編輯結果差異預覽
  const diffPreview = aiSuggestion?.isOpen && (
    <div className="absolute inset-0 z-20 flex flex-col bg-white/80 p-6 backdrop-blur-sm">
      <div className="flex-1 overflow-y-auto rounded-xl border border-orange-200 bg-white p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 shadow-lg">
        {aiSuggestion.originalContext.substring(0, aiSuggestion.selectionStart)}
        <del className="text-gray-400 decoration-red-500 decoration-2">
          {aiSuggestion.selectedText}
        </del>
        <mark className="rounded bg-orange-100 px-1 text-orange-900">
          {aiSuggestion.aiResult}
        </mark>
        {aiSuggestion.originalContext.substring(aiSuggestion.selectionEnd)}
      </div>
    </div>
  );

  return (
    <>
      {/* Info: (20260426 - Luphia) Editor Pane */}
      <div
        className={`relative flex-1 flex-col border-r border-gray-200 ${viewMode === "preview" ? "hidden md:flex" : "flex"}`}
      >
        <div className="bg-gray-100 px-4 py-2 text-xs font-bold tracking-wider text-gray-500 uppercase">
          {t("admin_mission_board.pdf_editor.markdown_input")!}
        </div>
        <textarea
          ref={textareaRef}
          aria-label="Markdown Input"
          value={markdownContext}
          onChange={(e) => {
            setMarkdownContext(e.target.value);
            setShareToken(null); // Info: (20260604 - Julian) PDF 內容變更時，將 Token 設為 null
            if (aiAssistantMenu.isOpen)
              setAiAssistantMenu((prev) => ({ ...prev, isOpen: false }));
          }}
          readOnly={isAiProcessing}
          className={`flex-1 resize-none p-6 font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none focus:ring-inset ${
            isAiProcessing
              ? "cursor-not-allowed text-gray-400 opacity-75"
              : "text-gray-800"
          }`}
          placeholder={t("admin_mission_board.pdf_editor.type_here")!}
        />

        {/* Info: (20260603 - Julian) Diff Preview Overlay */}
        {diffPreview}

        {/* Info: (20260603 - Julian) Pinned AI Suggestion Menu */}
        {aiSuggestionMenuEl}

        {/* Info: (20260603 - Julian) AI Processing Animation */}
        {aiThinkingAnim}
      </div>

      {/* Info: (20260603 - Julian) AI Context Menu */}
      {aiContextMenu}
    </>
  );
}
