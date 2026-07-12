"use client";

import { useCarbonChat } from "@/hooks/use_carbon_chat";
import { ChatHeader } from "@/components/carbon_chatbot/chat_header";
import { ChatSidebar } from "@/components/carbon_chatbot/chat_sidebar";
import { ChatArea } from "@/components/carbon_chatbot/chat_area";
import { ChatInput } from "@/components/carbon_chatbot/chat_input";
import { ChatProgressWidget } from "@/components/carbon_chatbot/chat_progress_widget";
import CarbonReportPreview from "@/components/carbon_chatbot/carbon_report_preview";

export default function CarbonChatbotPage() {
  const {
    sessionsList,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    inputValue,
    setInputValue,
    isTyping,
    isLoading,
    handleSendMessage,
    toggleParagraphCompleted,
    toggleParagraphVerified,
    handleMarkdownChange,
    chatEndRef,
  } = useCarbonChat();

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
          <ChatArea
            messages={activeSession.messages}
            isTyping={isTyping}
            isLoading={isLoading}
            chatEndRef={chatEndRef}
          />

          <ChatInput
            inputValue={inputValue}
            isTyping={isTyping}
            isLoading={isLoading}
            onInputChange={setInputValue}
            onSendMessage={handleSendMessage}
          />
        </div>

        <div className="relative hidden w-[45%] shrink-0 flex-col bg-[#f8fafc] xl:flex">
          <CarbonReportPreview
            session={activeSession}
            onMarkdownChange={handleMarkdownChange}
            onToggleCompleted={toggleParagraphCompleted}
            onToggleVerified={toggleParagraphVerified}
          />

          {/* Info: (20260708 - Tzuhan) 進度浮窗 */}
          <ChatProgressWidget progress={activeSession.progress} />
        </div>
      </div>
    </div>
  );
}
