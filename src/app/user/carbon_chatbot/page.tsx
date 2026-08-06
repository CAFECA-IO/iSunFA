"use client";

// Info: (20260714 - Tzuhan) 版面改為「session 列表 + 報告」雙欄並排(報告為主視圖),
// Info: (20260714 - Tzuhan) 聊天改為 FaithAgent 式浮動視窗(CarbonChatWidget 殼 + 原碳盤查聊天引擎),ChatHeader 移除

import { useState } from "react";
import { useCarbonChat } from "@/hooks/use_carbon_chat";
import {
  MOBILE_MEDIA_QUERY,
  CarbonChatPanelSizeEnum,
} from "@/constants/carbon_chatbot";
import { useTranslation } from "@/i18n/i18n_context";
import { ChatSidebar } from "@/components/carbon_chatbot/chat_sidebar";
import { ChatArea } from "@/components/carbon_chatbot/chat_area";
import { ChatInput } from "@/components/carbon_chatbot/chat_input";
import { FileLock2 } from "lucide-react";
import { ActivityLedger } from "@/components/carbon_chatbot/activity_ledger";
import { CarbonChatWidget } from "@/components/carbon_chatbot/carbon_chat_widget";
import CarbonReportPreview from "@/components/carbon_chatbot/carbon_report_preview";
import { RevisionPreview } from "@/components/carbon_chatbot/revision_preview";
import { ImportPreview } from "@/components/carbon_chatbot/import_preview";
import { BookReportViewer } from "@/components/carbon_chatbot/book_report_viewer";
// Info: (20260720 - Tzuhan) #54 憑證下鑽:重用財報線的四分頁憑證檢視器(journal/voucher/esg/原始檔)
import dynamic from "next/dynamic";
import { IActivityRecord } from "@/types/carbon_chatbot.types";

const RecordTabModal = dynamic(
  () => import("@/components/user/common/record_tab_modal"),
  { ssr: false },
);

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
    dataBadgeState,
    importBookEsgRecords,
    isImportingBookRecords,
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
    connectionState,
    pendingRevision,
    applyPendingRevision,
    discardPendingRevision,
    pendingImport,
    importReportFile,
    toggleImportItem,
    applyPendingImport,
    discardPendingImport,
    retryFailedImportChapters,
    isRetryingImport,
    importFollowUpPrompts,
    importCandidate,
    confirmImportCandidate,
    attachImportCandidate,
    dismissImportCandidate,
    generateParagraphDraft,
    generateParagraphDiagram,
    archiveSession,
    fetchArchivedSessions,
    restoreSession,
    toggleParagraphVerified,
    handleMarkdownChange,
    chatEndRef,
  } = useCarbonChat();

  // Info: (20260714 - Tzuhan) 聊天浮動視窗開關；預設開啟讓解鎖入口可見
  // Info: (20260730 - Tzuhan) 聊天面板三段尺寸:圖示 / 浮層(預設)/ 右側 dock
  const [chatSize, setChatSize] = useState<CarbonChatPanelSizeEnum>(
    CarbonChatPanelSizeEnum.FLOATING,
  );
  // Info: (20260730 - Tzuhan) 由其他互動(chip 跳段、目錄跳段)喚出聊天時,維持使用者原本選的尺寸,
  // Info: (20260730 - Tzuhan) 只在收起狀態才展開為浮層 —— 不要替使用者把 dock 降級成浮層
  // Info: (20260730 - Tzuhan) 報告可讀性:個人會話需 PRF 解鎖主金鑰;帳本會話存明文,伺服器可讀故不需解鎖
  const isReportReadable = isUnlocked || !!activeSessionAccess.accountBookId;

  const openChat = () =>
    setChatSize((prev) =>
      prev === CarbonChatPanelSizeEnum.COLLAPSED
        ? CarbonChatPanelSizeEnum.FLOATING
        : prev,
    );
  // Info: (20260716 - Tzuhan) UAT 帳本報告檢視器:開啟中的他人會話 channel(null = 關閉)
  const [viewerChannel, setViewerChannel] = useState<string | null>(null);
  // Info: (20260720 - Tzuhan) #54 憑證下鑽:開啟中的證據引用(null = 關閉);來自活動帳本列或證據鏈元件
  const [evidenceTarget, setEvidenceTarget] = useState<IActivityRecord | null>(
    null,
  );

  // Info: (20260714 - Tzuhan) chip 點擊: 跳報告段落並高亮；行動版聊天視窗全螢幕，先收起讓報告可見
  const handleChipJump = (paragraphId: string) => {
    jumpToReportParagraph(paragraphId);
    if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
      setChatSize(CarbonChatPanelSizeEnum.COLLAPSED);
    }
  };

  // Info: (20260714 - Tzuhan) 反向連動: 點報告段落回跳對話訊息；開啟聊天視窗讓閃爍訊息可見
  const handleParagraphHeadingClick = (paragraphId: string) => {
    focusMessageForParagraph(paragraphId);
    openChat();
  };

  // Info: (20260714 - Tzuhan) 跳段引導(目錄/佔位點擊): 預填輸入並開啟聊天視窗
  const handleJumpToParagraph = (paragraphId: string) => {
    jumpToParagraph(paragraphId);
    openChat();
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
        onArchiveSession={archiveSession}
        onFetchArchivedSessions={fetchArchivedSessions}
        onRestoreSession={restoreSession}
      />

      {/* Info: (20260714 - Tzuhan) 報告為主視圖: 佔滿剩餘寬度，窄螢幕單欄直向捲動(目錄由工具列抽屜提供) */}
      {/* Info: (20260802 - Luphia) 本功能區另有一組寫死的橘色 #ff5a00 / #e04f00（48 處）。
          它們是實心按鈕、邊框與圖示強調色，在深色底上量測為 5.6:1，深色模式下可用，故未一併改。
          會動的只有「深色文字疊在淺色 tint 上」那一類 —— 那是淺色模式的慣用寫法，
          tint 變暗之後就讀不到了（#9a3412 在橘色 tint 上只有 2.26:1）。
          要不要把這組橘色統一到 --brand 是品牌決定，不在深色模式的範圍內。 */}
      <div className="relative flex min-w-0 flex-1 flex-col bg-gray-50">
        {/* Info: (20260730 - Tzuhan) 未解鎖前不顯示報告:個人會話的報告是 E2EE 密文,尚未解鎖時
            畫面上那份「內容」其實只是大綱骨架與佔位,讓它看起來像已載入的報告會誤導人
            (使用者會以為報告是空的,而非還沒解開)。帳本會話存明文、伺服器可讀,不受此限。 */}
        {isReportReadable ? (
          <CarbonReportPreview
            session={activeSession}
            stats={reportStats}
            activeParagraphId={activeParagraphId}
            onMarkdownChange={handleMarkdownChange}
            onJumpToParagraph={handleJumpToParagraph}
            onToggleVerified={toggleParagraphVerified}
            draftingParagraphId={draftingParagraphId}
            onGenerateDraft={generateParagraphDraft}
            onGenerateDiagram={generateParagraphDiagram}
            highlightedParagraphId={highlightedParagraphId}
            onParagraphHeadingClick={handleParagraphHeadingClick}
            saveStatus={saveStatus}
            readOnly={!activeSessionAccess.canEdit}
            onImportReport={importReportFile}
            onRenameDocument={renameReportDocument}
            dataBadgeState={dataBadgeState}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <FileLock2 className="h-12 w-12 text-gray-300" />
            <p className="max-w-sm text-sm text-gray-500">
              {t("carbon_chatbot.report_locked_hint")}
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

        {/* Info: (20260730 - Tzuhan) 版面收斂:原本此處疊了「活動數據帳本」與「報告進度」兩個浮窗。
            進度浮窗已移除 —— 它與工具列膠囊顯示同一組 0/33,同一數字出現兩次只會讓人懷疑哪個是對的,
            而且它壓在 Markdown 內容上。進度的唯一呈現點改為工具列膠囊(點擊展開目錄看逐節細節)。
            活動數據帳本保留為浮層:它是可展開的互動面板,不是重複資訊。 */}
        <div className="absolute bottom-10 left-10 z-20 hidden flex-col items-start gap-2 xl:flex">
          <ActivityLedger
            state={inventoryState}
            positionClassName="relative flex"
            onImportFromBook={
              activeSessionAccess.accountBookId
                ? importBookEsgRecords
                : undefined
            }
            isImportingFromBook={isImportingBookRecords}
            onOpenEvidence={setEvidenceTarget}
          />
        </div>
      </div>

      {/* Info: (20260730 - Tzuhan) 聊天改為右側 dock(桌機佔文檔流,收合為細軌;行動版仍全螢幕覆蓋)。
          它是這個頁面的第二個主要工作區,不該蓋住第一個。引擎與功能未變。 */}
      <CarbonChatWidget
        size={chatSize}
        onCollapse={() => setChatSize(CarbonChatPanelSizeEnum.COLLAPSED)}
        onExpand={() => setChatSize(CarbonChatPanelSizeEnum.FLOATING)}
        onToggleDock={() =>
          setChatSize((prev) =>
            prev === CarbonChatPanelSizeEnum.DOCKED
              ? CarbonChatPanelSizeEnum.FLOATING
              : CarbonChatPanelSizeEnum.DOCKED,
          )
        }
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
              connectionState={connectionState}
              importCandidate={importCandidate}
              onConfirmImportCandidate={confirmImportCandidate}
              onAttachImportCandidate={attachImportCandidate}
              onDismissImportCandidate={dismissImportCandidate}
              // Info: (20260806 - Tzuhan) 匯入後的後續建議:按鈕上的字就是送出的內容
              followUpPrompts={importFollowUpPrompts}
              onSendFollowUp={handleSendMessage}
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

      {/* Info: (20260716 - Tzuhan) UAT 帳本報告檢視器:他人會話僅共享報告,聊天記錄個人加密不可見 */}
      {viewerChannel && (
        <BookReportViewer
          channel={viewerChannel}
          masterKey={masterKey}
          onClose={() => setViewerChannel(null)}
        />
      )}

      {/* Info: (20260716 - Tzuhan) #56 匯入預覽卡:逐段勾選確認後才寫入 */}
      {pendingImport && (
        <ImportPreview
          pendingImport={pendingImport}
          onToggleItem={toggleImportItem}
          onApply={applyPendingImport}
          onDiscard={discardPendingImport}
          onRetryFailed={retryFailedImportChapters}
          isRetrying={isRetryingImport}
          // Info: (20260806 - Tzuhan) 進度沿用同一份 draftNotice:輸入列被本 modal(z-[90])蓋住,
          // Info: (20260806 - Tzuhan) 重試時使用者看得到的只有卡片內那一處
          retryNotice={draftNotice?.text ?? null}
        />
      )}

      {/* Info: (20260716 - Tzuhan) #55 修訂對照卡:AI 修改既有段落必經人工確認 */}
      {pendingRevision && (
        <RevisionPreview
          revision={pendingRevision}
          onApply={applyPendingRevision}
          onDiscard={discardPendingRevision}
        />
      )}

      {/* Info: (20260720 - Tzuhan) #54 憑證下鑽:四分頁檢視器(voucher 優先;無傳票的紀錄落 esg 分頁) */}
      {evidenceTarget && (
        <RecordTabModal
          isOpen
          onClose={() => setEvidenceTarget(null)}
          defaultTab={evidenceTarget.voucherId ? "voucher" : "esg"}
          voucherId={evidenceTarget.voucherId ?? null}
          journalId={evidenceTarget.journalId ?? null}
          esgId={evidenceTarget.esgRecordId ?? null}
          file={
            evidenceTarget.fileId
              ? {
                  id: evidenceTarget.fileId,
                  hash: evidenceTarget.fileHash,
                  fileName: evidenceTarget.fileName,
                }
              : undefined
          }
          // Info: (20260721 - Tzuhan) UAT:本頁不在 account_book 路徑下,帳本 id 必須由 prop 注入
          accountBookId={activeSessionAccess.accountBookId}
        />
      )}
    </div>
  );
}
