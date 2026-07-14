"use client";

import { useState } from "react";
import { FileText, ListTree, X } from "lucide-react";
import { useCarbonChat } from "@/hooks/use_carbon_chat";
import { useTranslation } from "@/i18n/i18n_context";
import { OutlineModal } from "@/components/carbon_chatbot/outline_modal";
import { ChatHeader } from "@/components/carbon_chatbot/chat_header";
import { ChatSidebar } from "@/components/carbon_chatbot/chat_sidebar";
import { ChatArea } from "@/components/carbon_chatbot/chat_area";
import { ChatInput } from "@/components/carbon_chatbot/chat_input";
import { ChatProgressWidget } from "@/components/carbon_chatbot/chat_progress_widget";
import CarbonReportPreview from "@/components/carbon_chatbot/carbon_report_preview";

export default function CarbonChatbotPage() {
  const { t } = useTranslation();
  const {
    sessionsList,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    inputValue,
    setInputValue,
    isTyping,
    isLoading,
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
  } = useCarbonChat();

  // Info: (20260713 - Tzuhan) 行動版(<xl)右欄預覽隱藏,章節目錄改以 Modal、報告改以全螢幕覆蓋層呈現
  const [isMobileOutlineOpen, setIsMobileOutlineOpen] =
    useState<boolean>(false);
  const [isMobileReportOpen, setIsMobileReportOpen] = useState<boolean>(false);
  const paragraphs = activeSession?.reportData?.paragraphs ?? [];

  return (
    <div className="flex h-[calc(100vh-170px)] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white text-sm shadow-[0_4px_20px_rgb(0,0,0,0.05)]">
      {/* Info: (20260708 - Tzuhan) 統一的頂部導覽列 */}
      <ChatHeader />

      <div className="flex min-h-0 flex-1">
        {/* Info: (20260708 - Tzuhan) 左欄：專案與會話列表 (Desktop Only) */}
        <ChatSidebar
          sessionsList={sessionsList}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
        />

        {/* Info: (20260708 - Tzuhan) 中欄：對話區 */}
        <div className="relative flex min-w-0 flex-1 flex-col border-r border-gray-200 bg-white">
          {isUnlocked ? (
            <>
              <ChatArea
                messages={activeSession.messages}
                isTyping={isTyping}
                isLoading={isLoading}
                chatEndRef={chatEndRef}
                hasMore={hasMoreHistory}
                isLoadingMore={isLoadingHistory}
                onLoadMore={loadMoreHistory}
              />

              <ChatInput
                inputValue={inputValue}
                isTyping={isTyping}
                isLoading={isLoading}
                onInputChange={setInputValue}
                onSendMessage={handleSendMessage}
              />

              {/* Info: (20260713 - Tzuhan) 行動版浮動鈕組:章節目錄 Modal 與報告全螢幕檢視(桌面由右欄操作) */}
              {paragraphs.length > 0 && (
                <div className="absolute right-4 bottom-24 z-30 flex flex-col items-end gap-2 xl:hidden">
                  <button
                    type="button"
                    aria-label={t("carbon_chatbot.report_button")}
                    onClick={() => setIsMobileReportOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-lg transition-colors hover:bg-gray-50"
                  >
                    <FileText size={16} />
                    {t("carbon_chatbot.report_button")}
                  </button>
                  <button
                    type="button"
                    aria-label={t("carbon_chatbot.outline_title")}
                    onClick={() => setIsMobileOutlineOpen(true)}
                    className="flex items-center gap-1.5 rounded-full bg-[#ff5a00] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/30 transition-colors hover:bg-[#e04f00]"
                  >
                    <ListTree size={16} />
                    {reportStats.completedCount}/{reportStats.totalCount}
                  </button>
                </div>
              )}
            </>
          ) : (
            // Info: (20260712 - Luphia) 進入時需一次手勢解鎖加密金鑰(PRF)，之後才由 AI 前置作業回傳招呼詞
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-sm text-sm text-gray-500">
                {t("carbon_chatbot.unlock_hint")}
              </p>
              <button
                type="button"
                onClick={initializeChat}
                className="rounded-full bg-[#ff5a00] px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-colors hover:bg-[#e04f00] focus:outline-none"
              >
                {t("carbon_chatbot.unlock_button")}
              </button>
            </div>
          )}
        </div>

        <div className="relative hidden w-[45%] shrink-0 flex-col bg-[#f8fafc] xl:flex">
          {/* Info: (20260713 - Tzuhan) 報告 artifact:PDF 預覽為預設模式,含章節導軌與目錄抽屜 */}
          <CarbonReportPreview
            session={activeSession}
            stats={reportStats}
            activeParagraphId={activeParagraphId}
            onMarkdownChange={handleMarkdownChange}
            onJumpToParagraph={jumpToParagraph}
            onToggleVerified={toggleParagraphVerified}
          />

          {/* Info: (20260708 - Tzuhan) 進度浮窗 */}
          <ChatProgressWidget stats={reportStats} />
        </div>
      </div>

      {/* Info: (20260713 - Tzuhan) 行動版章節目錄 Modal;跳段後自動關閉並回到對話 */}
      {isMobileOutlineOpen && (
        <OutlineModal
          paragraphs={paragraphs}
          stats={reportStats}
          activeParagraphId={activeParagraphId}
          onJump={jumpToParagraph}
          onToggleVerified={toggleParagraphVerified}
          onClose={() => setIsMobileOutlineOpen(false)}
        />
      )}

      {/* Info: (20260713 - Tzuhan) 行動版報告全螢幕檢視:沿用完整 CarbonReportPreview(含工具列/導軌/抽屜/預覽與編輯切換) */}
      {/* Info: (20260713 - Tzuhan) z-[60] 高於全站 UserHeader(sticky z-50),避免 header 疊在覆蓋層上方 */}
      {isMobileReportOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white xl:hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <span className="text-sm font-bold text-gray-700">
              {t("carbon_chatbot.report_preview_title")}
            </span>
            <button
              type="button"
              aria-label={t("carbon_chatbot.close_report")}
              onClick={() => setIsMobileReportOpen(false)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex min-h-0 flex-1">
            <CarbonReportPreview
              session={activeSession}
              stats={reportStats}
              activeParagraphId={activeParagraphId}
              onMarkdownChange={handleMarkdownChange}
              onJumpToParagraph={jumpToParagraph}
              onToggleVerified={toggleParagraphVerified}
            />
          </div>
        </div>
      )}
    </div>
  );
}
