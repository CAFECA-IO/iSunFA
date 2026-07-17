"use client";

// Info: (20260714 - Emily) 版面改為「session 列表 + 報告」雙欄並排(報告為主視圖),
// Info: (20260714 - Emily) 聊天改為 FaithAgent 式浮動視窗(CarbonChatWidget 殼 + 原碳盤查聊天引擎),ChatHeader 移除

import { useState } from "react";
import { useCarbonChat } from "@/hooks/use_carbon_chat";
import { MOBILE_MEDIA_QUERY } from "@/constants/carbon_chatbot";
import { useTranslation } from "@/i18n/i18n_context";
import { ChatSidebar } from "@/components/carbon_chatbot/chat_sidebar";
import { ChatArea } from "@/components/carbon_chatbot/chat_area";
import { ChatInput } from "@/components/carbon_chatbot/chat_input";
import { ChatProgressWidget } from "@/components/carbon_chatbot/chat_progress_widget";
import { ActivityLedger } from "@/components/carbon_chatbot/activity_ledger";
import { CarbonChatWidget } from "@/components/carbon_chatbot/carbon_chat_widget";
import CarbonReportPreview from "@/components/carbon_chatbot/carbon_report_preview";
import { RevisionPreview } from "@/components/carbon_chatbot/revision_preview";
import { ImportPreview } from "@/components/carbon_chatbot/import_preview";
import { BookReportViewer } from "@/components/carbon_chatbot/book_report_viewer";

export default function CarbonChatbotPage() {
  const { t } = useTranslation();
  const {
    sessionsList,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createNewSession,
    saveStatus,
    renameSession,
    renameReportDocument,
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
    pendingAttachments,
    attachmentError,
    addAttachments,
    removeAttachment,
    reportStats,
    accountBooks,
    activeSessionAccess,
    fetchBookSessions,
    masterKey,
    inventoryState,
    activeParagraphId,
    jumpToParagraph,
    highlightedParagraphId,
    focusedMessageId,
    jumpToReportParagraph,
    focusMessageForParagraph,
    draftingParagraphId,
    draftNotice,
    pendingRevision,
    applyPendingRevision,
    discardPendingRevision,
    pendingImport,
    importReportFile,
    toggleImportItem,
    applyPendingImport,
    discardPendingImport,
    retryFailedImportChapters,
    importCandidate,
    confirmImportCandidate,
    attachImportCandidate,
    dismissImportCandidate,
    generateParagraphDraft,
    toggleParagraphVerified,
    handleMarkdownChange,
    chatEndRef,
  } = useCarbonChat();

  // Info: (20260714 - Emily) 聊天浮動視窗開關；預設開啟讓解鎖入口可見
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  // Info: (20260716 - Emily) UAT 帳本報告檢視器:開啟中的他人會話 channel(null = 關閉)
  const [viewerChannel, setViewerChannel] = useState<string | null>(null);

  // Info: (20260714 - Emily) chip 點擊: 跳報告段落並高亮；行動版聊天視窗全螢幕，先收起讓報告可見
  const handleChipJump = (paragraphId: string) => {
    jumpToReportParagraph(paragraphId);
    if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
      setIsChatOpen(false);
    }
  };

  // Info: (20260714 - Emily) 反向連動: 點報告段落回跳對話訊息；開啟聊天視窗讓閃爍訊息可見
  const handleParagraphHeadingClick = (paragraphId: string) => {
    focusMessageForParagraph(paragraphId);
    setIsChatOpen(true);
  };

  // Info: (20260714 - Emily) 跳段引導(目錄/佔位點擊): 預填輸入並開啟聊天視窗
  const handleJumpToParagraph = (paragraphId: string) => {
    jumpToParagraph(paragraphId);
    setIsChatOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-170px)] min-h-0 overflow-hidden rounded-2xl border border-gray-200 bg-white text-sm shadow-[0_4px_20px_rgb(0,0,0,0.05)]">
      {/* Info: (20260708 - Tzuhan) 左欄：專案與會話列表 (Desktop Only) */}
      <ChatSidebar
        sessionsList={sessionsList}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewChat={createNewSession}
        accountBooks={accountBooks}
        onRenameSession={renameSession}
        onFetchBookSessions={fetchBookSessions}
        onOpenBookReport={setViewerChannel}
      />

      {/* Info: (20260714 - Emily) 報告為主視圖: 佔滿剩餘寬度，窄螢幕單欄直向捲動(目錄由工具列抽屜提供) */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-[#f8fafc]">
        <CarbonReportPreview
          session={activeSession}
          stats={reportStats}
          activeParagraphId={activeParagraphId}
          onMarkdownChange={handleMarkdownChange}
          onJumpToParagraph={handleJumpToParagraph}
          onToggleVerified={toggleParagraphVerified}
          draftingParagraphId={draftingParagraphId}
          onGenerateDraft={generateParagraphDraft}
          highlightedParagraphId={highlightedParagraphId}
          onParagraphHeadingClick={handleParagraphHeadingClick}
          saveStatus={saveStatus}
          readOnly={!activeSessionAccess.canEdit}
          onImportReport={importReportFile}
          onRenameDocument={renameReportDocument}
        />

        {/* Info: (20260716 - Emily) UAT 重疊修正:左下浮窗改單一堆疊容器(活動帳本在上、進度在下),
            展開/收合皆佔文檔流不再互相覆蓋。意義:藥丸 = 活動數據帳本(#6518),面板 = 報告產出/查核進度 */}
        <div className="absolute bottom-10 left-10 z-20 hidden flex-col items-start gap-2 xl:flex">
          <ActivityLedger
            state={inventoryState}
            positionClassName="relative flex"
          />
          <ChatProgressWidget
            stats={reportStats}
            positionClassName="relative flex"
          />
        </div>
      </div>

      {/* Info: (20260714 - Emily) 碳盤查聊天浮動視窗(FaithAgent 式外殼，引擎為 use_carbon_chat，功能全保留) */}
      <CarbonChatWidget
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen((prev) => !prev)}
      >
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
              onChipJump={handleChipJump}
              focusedMessageId={focusedMessageId}
            />
            <ChatInput
              inputValue={inputValue}
              isTyping={isTyping}
              isLoading={isLoading}
              onInputChange={setInputValue}
              onSendMessage={handleSendMessage}
              pendingAttachments={pendingAttachments}
              attachmentError={attachmentError}
              onAddFiles={addAttachments}
              onRemoveAttachment={removeAttachment}
              draftNotice={draftNotice}
              importCandidate={importCandidate}
              onConfirmImportCandidate={confirmImportCandidate}
              onAttachImportCandidate={attachImportCandidate}
              onDismissImportCandidate={dismissImportCandidate}
            />
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
      </CarbonChatWidget>

      {/* Info: (20260716 - Emily) UAT 帳本報告檢視器:他人會話僅共享報告,聊天記錄個人加密不可見 */}
      {viewerChannel && (
        <BookReportViewer
          channel={viewerChannel}
          masterKey={masterKey}
          onClose={() => setViewerChannel(null)}
        />
      )}

      {/* Info: (20260716 - Emily) #56 匯入預覽卡:逐段勾選確認後才寫入 */}
      {pendingImport && (
        <ImportPreview
          pendingImport={pendingImport}
          onToggleItem={toggleImportItem}
          onApply={applyPendingImport}
          onDiscard={discardPendingImport}
          onRetryFailed={retryFailedImportChapters}
        />
      )}

      {/* Info: (20260716 - Emily) #55 修訂對照卡:AI 修改既有段落必經人工確認 */}
      {pendingRevision && (
        <RevisionPreview
          revision={pendingRevision}
          onApply={applyPendingRevision}
          onDiscard={discardPendingRevision}
        />
      )}
    </div>
  );
}
