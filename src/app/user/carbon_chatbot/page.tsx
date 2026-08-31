"use client";

// Info: (20260714 - Tzuhan) 版面改為「session 列表 + 報告」雙欄並排(報告為主視圖),
// Info: (20260714 - Tzuhan) 聊天改為 FaithAgent 式浮動視窗(CarbonChatWidget 殼 + 原碳盤查聊天引擎),ChatHeader 移除

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCarbonChat } from "@/hooks/use_carbon_chat";
import {
  MOBILE_MEDIA_QUERY,
  CarbonChatPanelSizeEnum,
} from "@/constants/carbon_chatbot";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { WalletCustodyType } from "@/constants/auth_provider";
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

/**
 * Info: (20260828 - Julian) 通知的深連結落地：切到那一個會話，並把待匯入的卡打開
 *（計劃 `resumable_job_resume_landing_and_copy.md` §2.2）。
 *
 * 「可以繼續了」那則通知的整個價值在於**把人放在能動手的地方**。少了這一段，
 * 使用者落在頁面層級，還要自己從側欄認出是哪一個盤查對話、切到聊天視圖、
 * 展開待匯入的卡 —— 四層，而通知只說了一句「回去按一下」。
 *
 * ## 為什麼是一個只回 null 的子元件
 *
 * `useSearchParams()` 需要一個 Suspense 邊界（否則整頁在建置時被逼成動態渲染），
 * 而頁面元件自己包不住自己。同一個做法見 `(landing)/analysis/page.tsx`。
 *
 * ## 為什麼用完就把 query 清掉
 *
 * 這是一次**指令**，不是狀態。留著的話有兩個症狀：重新整理會再開一次卡，
 * 而且使用者手動切到別的會話時，任何依 `searchParams` 重跑的 effect
 * 都會把他拉回來 —— 那是在跟使用者搶方向盤。
 *
 * 用 ref 記「這組參數處理過了」而不是只靠清 query：`router.replace` 是非同步的，
 * 在它生效之前 effect 還會再跑幾次。
 */
function ImportDeepLink({
  sessionIds,
  sessionsSettled,
  activeSessionId,
  onSelectSession,
  hasPendingImport,
  onOpenImport,
}: {
  sessionIds: string[];
  sessionsSettled: boolean;
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  hasPendingImport: boolean;
  onOpenImport: () => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  /**
   * Info: (20260831 - Julian) 參數**讀完就抹**，指令留在 ref 裡（review #6732 的 1-H）。
   *
   * 原本是做完才 `router.replace`，於是還原不出待匯入內容時（金鑰未解鎖、
   * 紀錄已刪）那一步永遠不執行，`?session=…&openImport=1` 就一直留在網址列
   * 與瀏覽器歷史裡。今天留的是不透明的 sessionId，不算秘密；
   * 但「參數在網址上停留多久」不該取決於**後續有沒有成功**。
   *
   * 抹掉之後，未完成的指令由這個 ref 撐著 —— 它不觸發重繪，
   * 而下面那支 effect 本來就會因為清單載入或解鎖而重跑，那時再讀它。
   */
  const instructionRef = useRef<{
    sessionId: string | null;
    openImport: boolean;
  } | null>(null);
  const consumedRef = useRef<string | null>(null);

  const sessionParam = searchParams.get("session");
  const openImportParam = searchParams.get("openImport");

  useEffect(() => {
    if (sessionParam === null && openImportParam === null) return;

    const instruction = `${sessionParam ?? ""}|${openImportParam ?? ""}`;
    if (consumedRef.current === instruction) return;
    consumedRef.current = instruction;

    instructionRef.current = {
      sessionId: sessionParam,
      openImport: openImportParam === "1",
    };
    router.replace(pathname, { scroll: false });
  }, [sessionParam, openImportParam, router, pathname]);

  useEffect(() => {
    const instruction = instructionRef.current;
    if (instruction === null) return;

    // Info: (20260831 - Julian) 做完或放棄都是「這道指令結束了」，兩者都清掉
    const finish = () => {
      instructionRef.current = null;
    };

    if (instruction.sessionId !== null) {
      /**
       * Info: (20260828 - Julian) 等清單**問完**，不是等它非空（實測 §10.5）。
       *
       * 會話清單是非同步問伺服器的，在它回來之前 `sessionsData` 裡只有預設
       * 會話 —— 非空，但不完整。原本這裡用 `length === 0` 當「還沒載好」，
       * 於是深連結指向非預設會話時，判斷會在清單補齊之前就跑完、
       * 得到「查無此會話」而放棄，使用者落在預設會話上，什麼也沒發生。
       */
      if (!sessionsSettled) return;
      /**
       * Info: (20260828 - Julian) 問完了還是沒有就**放棄**（不新建、不猜）。
       *
       * 會走到這裡的情境是換了帳號、或會話已封存／刪除。
       * 猜一個最接近的會讓使用者在別人的報告上按「接著匯入」。
       */
      if (!sessionIds.includes(instruction.sessionId)) {
        finish();
        return;
      }
      if (activeSessionId !== instruction.sessionId) {
        onSelectSession(instruction.sessionId);
        return;
      }
    }

    if (instruction.openImport) {
      /**
       * Info: (20260828 - Julian) 待匯入的內容是從伺服器還原的（端到端加密、
       * 逐 channel），到站當下不一定在手上 —— 等它，不要把卡打開成空的。
       *
       * 還原不出來（紀錄不存在、或金鑰沒解開）時這裡就一直等，
       * 而「一直等」在這裡等於什麼都不做：使用者仍然在正確的會話裡，
       * 而網址已經抹乾淨了（見上方 ref 的說明）。
       */
      if (!hasPendingImport) return;
      onOpenImport();
    }

    finish();
  }, [
    sessionIds,
    sessionsSettled,
    activeSessionId,
    hasPendingImport,
    onSelectSession,
    onOpenImport,
  ]);

  return null;
}

export default function CarbonChatbotPage() {
  const { t } = useTranslation();
  // Info: (20260812 - Luphia) custody 決定解鎖說明給的是哪一種保證（見下方 unlock 提示）
  const { user, loading: authLoading } = useAuth();

  /**
   * Info: (20260812 - Luphia) custody 未知時不給任何保證、也不讓解鎖成立（PR review P-2）。
   *
   * `user?.custody` 在 `/auth/me` 回來之前是 undefined,而原本兩處都寫成
   * 「不是 CUSTODIAL 就當 passkey」—— 於是託管使用者在那個窗口看到的是
   * **passkey 那句保證**（「以裝置的安全金鑰進行端對端加密」),
   * 而 ADR 016 補充明寫「在使用者按下解鎖之前就要講清楚」。
   *
   * 按下去更糟:走 passkey 派生 → 開出一個永遠不會成功的系統對話框,
   * 正是這批修正要消滅的 bug。未知時倒向「不給保證」而不是「給較強的保證」。
   */
  const custodyKnown = !authLoading && user?.custody !== undefined;
  const isCustodial = user?.custody === WalletCustodyType.CUSTODIAL;
  const {
    sessionsList,
    sessionsIndexSettled,
    activeSession,
    activeSessionId,
    setActiveSessionId,
    createNewSession,
    saveStatus,
    renameSession,
    renameReportDocument,
    updateReportIdentity,
    inputValue,
    setInputValue,
    isTyping,
    isLoading,
    isUnlocked,
    unlockError,
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
    isImportPreviewOpen,
    deferImportPreview,
    openImportPreview,
    retryFailedImportChapters,
    resumePausedImportChapters,
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
      {/* Info: (20260828 - Julian) 通知的深連結；不畫任何東西，只在落地時做兩件事 */}
      <Suspense fallback={null}>
        <ImportDeepLink
          sessionIds={sessionsList.map((session) => session.id)}
          sessionsSettled={sessionsIndexSettled}
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          hasPendingImport={pendingImport !== null}
          onOpenImport={openImportPreview}
        />
      </Suspense>
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
            onUpdateIdentity={updateReportIdentity}
            dataBadgeState={dataBadgeState}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <FileLock2 className="h-12 w-12 text-gray-300" />
            {/*
              Info: (20260812 - Luphia) 這裡也不能對託管帳號說「以裝置金鑰端對端加密」——
              與下方 unlock 提示同一個理由(見 requestPrfSecret)。上一版只改了聊天區那句,
              漏了報告區這句,等於揭露只做一半。
            */}
            <p className="max-w-sm text-sm text-gray-500">
              {!custodyKnown
                ? t("carbon_chatbot.custody_loading")
                : isCustodial
                  ? t("carbon_chatbot.report_locked_hint_custodial")
                  : t("carbon_chatbot.report_locked_hint")}
            </p>
            <button
              type="button"
              onClick={initializeChat}
              disabled={!custodyKnown}
              className="rounded-full bg-[#ff5a00] px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-colors hover:bg-[#e04f00] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("carbon_chatbot.unlock_button")}
            </button>
            {/*
              Info: (20260812 - Luphia) 解鎖失敗的原因顯示在這裡。
              原本失敗只 appendMessageLocally() 到聊天區,而那個區塊在解鎖前還鎖著 ——
              訊息一則都看不到,使用者的體驗是「點了完全沒有反應」。
            */}
            {unlockError ? (
              <p
                role="alert"
                className="max-w-sm text-sm font-medium text-[#c2410c]"
              >
                {unlockError}
              </p>
            ) : null}
            {/*
              Info: (20260828 - Julian) 匯入的狀態在鎖著的時候也要說得出來。

              這與上面那段解鎖失敗的訊息是**同一個病的第二次發作**：那次是
              「失敗只 appendMessageLocally() 到還鎖著的聊天區，使用者的體驗是
              點了完全沒有反應」。這次是匯入 —— 進度、每一條早退的原因
              （「已經有一份匯入在跑」「這個會話還沒綁定帳本」）與解析完成的提示，
              全都只掛在 `ChatInput` 上，而它在 `isUnlocked` 為 false 時整個不渲染。

              而「匯入報告」的入口在報告工具列上，帳本綁定的會話**不需要解鎖**
              就能匯入。於是使用者按下匯入、等了幾分鐘，畫面上一個字都沒有。

              這裡只補最小的兩件事：正在發生什麼、以及有一份結果等著看。
              **尚未做**：把那條「已保存待匯入的解析結果」的橘色列也移出解鎖閘
              （它現在仍然只活在 `ChatInput` 裡）。見計劃書 §6.3 與 §8。
            */}
            {draftNotice ? (
              <p
                role="status"
                className="max-w-sm text-sm font-medium text-gray-600"
              >
                {draftNotice.text}
              </p>
            ) : null}
            {pendingImport && !isImportPreviewOpen ? (
              <button
                type="button"
                onClick={openImportPreview}
                className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-bold text-orange-700 transition-colors hover:bg-orange-100"
              >
                {t("carbon_chatbot.import_pending_open")}
              </button>
            ) : null}
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
              // Info: (20260806 - Tzuhan) 收起中的待匯入結果:重載後也會出現在這裡(紀錄已入庫)
              deferredImport={
                pendingImport && !isImportPreviewOpen
                  ? {
                      fileName: pendingImport.fileName,
                      count: pendingImport.items.length,
                    }
                  : null
              }
              onOpenDeferredImport={openImportPreview}
              onDiscardDeferredImport={discardPendingImport}
            />
          </>
        ) : (
          // Info: (20260712 - Luphia) 進入時需一次手勢解鎖加密金鑰(PRF)，之後才由 AI 前置作業回傳招呼詞
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            {/*
              Info: (20260812 - Luphia) 託管帳號看到的是不同的保證。
              那些帳號的加密金鑰由伺服器派生（見 requestPrfSecret），沿用 passkey 那句
              「以裝置的安全金鑰進行端對端加密」會給出一個它們沒有的承諾。
            */}
            <p className="max-w-sm text-sm text-gray-500">
              {!custodyKnown
                ? t("carbon_chatbot.custody_loading")
                : isCustodial
                  ? t("carbon_chatbot.unlock_hint_custodial")
                  : t("carbon_chatbot.unlock_hint")}
            </p>
            <button
              type="button"
              onClick={initializeChat}
              disabled={!custodyKnown}
              className="rounded-full bg-[#ff5a00] px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-500/20 transition-colors hover:bg-[#e04f00] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("carbon_chatbot.unlock_button")}
            </button>
            {/*
              Info: (20260812 - Luphia) 解鎖失敗的原因顯示在這裡。
              原本失敗只 appendMessageLocally() 到聊天區,而那個區塊在解鎖前還鎖著 ——
              訊息一則都看不到,使用者的體驗是「點了完全沒有反應」。
            */}
            {unlockError ? (
              <p
                role="alert"
                className="max-w-sm text-sm font-medium text-[#c2410c]"
              >
                {unlockError}
              </p>
            ) : null}
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
      {/* Info: (20260806 - Tzuhan) 收起時不渲染:內容仍在(已入庫),由輸入列上方那條提示帶回來 */}
      {pendingImport && isImportPreviewOpen && (
        <ImportPreview
          pendingImport={pendingImport}
          onToggleItem={toggleImportItem}
          onApply={applyPendingImport}
          onDiscard={discardPendingImport}
          onDefer={deferImportPreview}
          onRetryFailed={retryFailedImportChapters}
          // Info: (20260825 - Luphia) 點數用完而還沒做的章：接著匯入（issue #6713）
          onResumePaused={resumePausedImportChapters}
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
