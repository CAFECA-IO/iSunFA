// Info: (20260714 - Tzuhan) 對話輸入列:純文字 + 附件(按鈕/拖放),附件驗證與 base64 轉換邏輯集中於 use_carbon_chat

import { KeyboardEvent, DragEvent, useEffect, useRef, useState } from "react";
import { Paperclip, X, Loader2, FileText, FileUp, WifiOff } from "lucide-react";
import {
  IPendingAttachment,
  PendingAttachmentStatusEnum,
} from "@/types/carbon_chatbot.types";
import { IDraftNotice } from "@/hooks/use_carbon_chat";
import { ChatroomConnectionStateEnum } from "@/lib/chatroom";
import { CARBON_CHAT_ATTACHMENT_ACCEPT } from "@/constants/carbon_chatbot";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260804 - Tzuhan) 提示列的存活訊號:一個每秒跳動的已過時間。
 *
 * 為什麼需要:逐章解析 11 章並行,「已完成 0/11」在開頭會停留很久 ——
 * 那是正常的,但畫面上「還在跑」與「已經死了」長得完全一樣,
 * 使用者只能重傳(實測就是這樣發生的)。會動的數字是最便宜的區分方式。
 *
 * 計時放在元件而非狀態:每秒重寫提示文字等於每秒一次狀態寫入與全域 re-render,
 * 而「已過多久」由起點就能算出來,不需要有人每秒告訴它一次。
 */
function ElapsedSince({ startedAt }: { startedAt: number }) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const totalSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return (
    <span className="shrink-0 tabular-nums opacity-70">
      {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

export interface IChatInputProps {
  inputValue: string;
  isTyping: boolean;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  pendingAttachments?: IPendingAttachment[];
  attachmentError?: string | null;
  onAddFiles?: (files: File[]) => void;
  onRemoveAttachment?: (attachmentId: string) => void;
  // Info: (20260714 - Tzuhan) 草稿生成狀態列(loading/error):並行任務不以對話氣泡表達,避免與回覆順序矛盾
  draftNotice?: IDraftNotice | null;
  /**
   * Info: (20260805 - Tzuhan) 即時推播的連線狀態。
   *
   * 為什麼要顯示:AI 的回覆同時走 HTTP 回帶與推播兩軌,推播斷掉時長工作的結果送不回來。
   * 而先前連線狀態只寫進沒人消費的 isError —— 壞掉完全靜默,
   * 「AI 沒回應」與「回應送不到」在畫面上一模一樣,但兩者的處置完全不同。
   */
  connectionState?: ChatroomConnectionStateEnum;
  // Info: (20260716 - Tzuhan) #56 匯入導流:疑似整份報告的附件候選(擇一:匯入報告/仍作附件)
  importCandidate?: File | null;
  onConfirmImportCandidate?: () => void;
  onAttachImportCandidate?: () => void;
  onDismissImportCandidate?: () => void;
  /**
   * Info: (20260806 - Tzuhan) 匯入之後的後續建議(空陣列即不顯示)。
   *
   * 為什麼由**報告的匯入來歷**決定而不是掛在某一則訊息上:
   * 掛在訊息上的話,對話一長就被捲走,而「這份報告可以拿來做什麼」
   * 在報告存在期間一直都成立。來歷是持久的,重載後建議仍在。
   *
   * 文案與點下去送出的內容是同一個字串(見 CARBON_IMPORT_FOLLOW_UPS)——
   * 按鈕寫一句、實際送另一句是對話紀錄裡最難查的一種不一致。
   */
  followUpPrompts?: readonly string[];
  onSendFollowUp?: (prompt: string) => void;
  /**
   * Info: (20260806 - Tzuhan) 已保存但尚未匯入的解析結果(null 即無)。
   *
   * 為什麼要在輸入列上方留這一條:待匯入結果現在會入庫並撐過重載,
   * 但一進聊天室就被一張蓋住全螢幕的預覽卡攔住不是提醒而是阻擋 ——
   * 尤其它講的可能是幾天前的事。留一條可點的線索,主導權還在使用者手上。
   */
  deferredImport?: { fileName: string; count: number } | null;
  onOpenDeferredImport?: () => void;
  onDiscardDeferredImport?: () => void;
}

export function ChatInput({
  inputValue,
  isTyping,
  isLoading,
  onInputChange,
  onSendMessage,
  pendingAttachments = [],
  attachmentError = null,
  onAddFiles = undefined,
  onRemoveAttachment = undefined,
  draftNotice = null,
  connectionState = ChatroomConnectionStateEnum.CONNECTED,
  importCandidate = null,
  onConfirmImportCandidate = undefined,
  onAttachImportCandidate = undefined,
  onDismissImportCandidate = undefined,
  followUpPrompts = [],
  onSendFollowUp = undefined,
  deferredImport = null,
  onOpenDeferredImport = undefined,
  onDiscardDeferredImport = undefined,
}: IChatInputProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const hasReadyAttachment = pendingAttachments.some(
    (a) => a.status === PendingAttachmentStatusEnum.READY,
  );
  const isReadingAttachment = pendingAttachments.some(
    (a) => a.status === PendingAttachmentStatusEnum.READING,
  );

  // Info: (20260714 - Tzuhan) 有文字或有就緒附件即可送出;附件讀取中暫不可送,避免漏附件
  const disabled =
    (!inputValue.trim() && !hasReadyAttachment) ||
    isTyping ||
    isLoading ||
    isReadingAttachment;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled) {
      onSendMessage();
    }
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0 || !onAddFiles) return;
    onAddFiles(Array.from(files));
    // Info: (20260714 - Tzuhan) 清空 input value,允許重選同一檔案
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Info: (20260714 - Tzuhan) 拖放事件掛在原生互動元素(文字輸入框)上,滿足 jsx-a11y;鍵盤使用者以附件按鈕為替代路徑
  const handleDrop = (e: DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (onAddFiles) setIsDragOver(true);
  };

  /**
   * Info: (20260814 - Emily) 輸入區改為排在文檔流裡，不再絕對定位浮在對話上。
   *
   * 原本是 `absolute right-6 bottom-6 left-6`，而 `ChatArea` 用寫死的 `pb-32`
   * 留位置。那個數字只夠一列輸入框，可是這個容器**往上長**：待送附件、附件錯誤、
   * 匯入導流卡、待匯入提示、後續建議、斷線提示、草稿提示，全部疊在輸入列上面。
   *
   * 疊到超過 8rem 就開始蓋住最後幾則訊息，而且蓋得很難看 ——
   * 這個容器自己沒有背景，卡片之間的縫隙會透出底下的對話文字。
   * 實測三個後續建議（每一句都長到各佔一行）就足以蓋掉一整則 AI 回覆。
   *
   * 用寫死的 padding 追一個會變的高度是追不完的：每加一種提示卡就要重算一次，
   * 而算錯的表現是「訊息被蓋住」——沒有錯誤、只是看不到。
   * 排進文檔流之後，重疊在結構上就不可能發生：輸入區要多高就拿多高，
   * 對話區自己讓位。堆得太高的代價變成「對話區變短」，那是看得見的。
   *
   * `bg-white` 是必要的：在流裡它會遮住捲到底下的訊息，
   * 沒有背景的話卡片縫隙仍然會透出文字。
   */
  return (
    <div className="relative z-10 shrink-0 bg-white px-6 pt-2 pb-6">
      {/* Info: (20260714 - Tzuhan) 待送附件 chips:可移除;讀取中顯示 spinner */}
      {pendingAttachments.length > 0 && (
        <div className="mx-auto mb-2 flex flex-wrap gap-2">
          {pendingAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${
                attachment.status === PendingAttachmentStatusEnum.ERROR
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {attachment.status === PendingAttachmentStatusEnum.READING ? (
                <Loader2 size={12} className="animate-spin text-[#ff5a00]" />
              ) : (
                <FileText size={12} className="text-[#ff5a00]" />
              )}
              <span className="max-w-40 truncate">{attachment.name}</span>
              <span className="text-[10px] font-medium text-gray-400">
                {attachment.size}
              </span>
              {onRemoveAttachment && (
                <button
                  type="button"
                  aria-label={t("carbon_chatbot.remove_attachment")}
                  onClick={() => onRemoveAttachment(attachment.id)}
                  className="rounded-full p-0.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info: (20260714 - Tzuhan) 附件驗證錯誤提示(前端 Fail Fast:非法類型/超大檔在此擋下) */}
      {attachmentError && (
        <div className="mx-auto mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
          {attachmentError}
        </div>
      )}

      {/* Info: (20260716 - Tzuhan) #56 匯入導流:大型 pdf 疑似整份報告,聊天萃取管線會超時 → 建議走匯入 */}
      {importCandidate && (
        <div className="mx-auto mb-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 font-bold text-orange-700">
            <FileUp size={12} className="shrink-0" />
            <span className="min-w-0 truncate">
              {t("carbon_chatbot.import_suggest", {
                name: importCandidate.name,
              })}
            </span>
          </div>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={onConfirmImportCandidate}
              className="rounded-full bg-[#ff5a00] px-3 py-1 font-bold text-white transition-colors hover:bg-[#e04f00]"
            >
              {t("carbon_chatbot.import_suggest_import")}
            </button>
            <button
              type="button"
              onClick={onAttachImportCandidate}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 font-bold text-gray-600 transition-colors hover:bg-gray-50"
            >
              {t("carbon_chatbot.import_suggest_attach")}
            </button>
            <button
              type="button"
              aria-label={t("carbon_chatbot.revision_discard")}
              onClick={onDismissImportCandidate}
              className="ml-auto rounded-full p-1 text-gray-400 hover:bg-white"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Info: (20260806 - Tzuhan) 已保存、尚未匯入的解析結果:重載與切房都還在,由使用者決定何時處理 */}
      {deferredImport && onOpenDeferredImport && (
        <div className="mx-auto mb-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs">
          <div className="flex min-w-0 items-center gap-1.5 font-bold text-orange-700">
            <FileUp size={12} className="shrink-0" />
            <span className="min-w-0 truncate">
              {t("carbon_chatbot.import_pending_bar", {
                name: deferredImport.fileName,
                count: deferredImport.count,
              })}
            </span>
          </div>
          <div className="mt-1.5 flex gap-2">
            <button
              type="button"
              onClick={onOpenDeferredImport}
              className="rounded-full bg-[#ff5a00] px-3 py-1 font-bold text-white transition-colors hover:bg-[#e04f00]"
            >
              {t("carbon_chatbot.import_pending_open")}
            </button>
            {onDiscardDeferredImport && (
              <button
                type="button"
                onClick={onDiscardDeferredImport}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 font-bold text-gray-600 transition-colors hover:bg-gray-50"
              >
                {t("carbon_chatbot.import_pending_discard")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info: (20260806 - Tzuhan) 匯入之後的後續建議:點下去即以按鈕上的原句送出(所見即所送)。
          解析中(isTyping)時不顯示 —— 那時送出只會排隊,按了沒反應比沒有按鈕更糟。 */}
      {onSendFollowUp && followUpPrompts.length > 0 && !isTyping && (
        <div className="mx-auto mb-2 flex flex-wrap gap-2">
          {followUpPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              title={prompt}
              onClick={() => onSendFollowUp(prompt)}
              className="max-w-full truncate rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-[#ff5a00] shadow-sm transition-colors hover:bg-orange-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Info: (20260805 - Tzuhan) 推播斷線提示:只在非 CONNECTED 時出現,連上就自己消失 */}
      {connectionState !== ChatroomConnectionStateEnum.CONNECTED && (
        <div
          className={`mx-auto mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ${
            connectionState === ChatroomConnectionStateEnum.CONNECTING
              ? "bg-amber-50 text-amber-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {connectionState === ChatroomConnectionStateEnum.CONNECTING ? (
            <>
              <Loader2 size={12} className="shrink-0 animate-spin" />
              {t("carbon_chatbot.realtime_connecting")}
            </>
          ) : (
            <>
              <WifiOff size={12} className="shrink-0" />
              {t("carbon_chatbot.realtime_disconnected")}
            </>
          )}
        </div>
      )}

      {/* Info: (20260714 - Tzuhan) 草稿生成狀態列:生成中 loading、失敗短暫提示後自動消失 */}
      {draftNotice && (
        <div
          className={`mx-auto mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ${
            draftNotice.type === "loading"
              ? "bg-orange-50 text-orange-700"
              : draftNotice.type === "info"
                ? "bg-orange-50 text-orange-800"
                : "bg-red-50 text-red-600"
          }`}
        >
          {draftNotice.type === "loading" && (
            <Loader2 size={12} className="shrink-0 animate-spin" />
          )}
          <span>{draftNotice.text}</span>
          {draftNotice.type === "loading" &&
            draftNotice.startedAt !== undefined && (
              <ElapsedSince startedAt={draftNotice.startedAt} />
            )}
        </div>
      )}

      <div
        className={`relative mx-auto flex items-center rounded-full border-2 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors focus-within:border-[#ff5a00] ${
          isDragOver ? "border-[#ff5a00] bg-orange-50" : "border-gray-100"
        }`}
      >
        {onAddFiles && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={CARBON_CHAT_ATTACHMENT_ACCEPT}
              onChange={(e) => handleFilesSelected(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              aria-label={t("carbon_chatbot.attach_file")}
              title={t("carbon_chatbot.attach_file")}
              disabled={isTyping || isLoading}
              onClick={() => fileInputRef.current?.click()}
              className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-orange-50 hover:text-[#ff5a00] disabled:cursor-not-allowed disabled:text-gray-200"
            >
              <Paperclip size={18} />
            </button>
          </>
        )}

        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          placeholder={t("carbon_chatbot.input_placeholder")}
          className={`flex-1 bg-transparent py-4 pr-16 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300 ${
            onAddFiles ? "pl-2" : "pl-6"
          }`}
          disabled={isTyping || isLoading}
        />
        <button
          /**
           * Info: (20260825 - Emily) 不可直接 onClick={onSendMessage}:
           * onSendMessage 底層是 handleSendMessage(overrideText?),直接綁定會把
           * MouseEvent 當 overrideText 傳入 → `.trim is not a function` ——
           * 實測按鈕自此送不出任何訊息(只剩 Enter 可用),且每點一次
           * 一個 unhandledRejection。包一層丟棄事件參數。
           */
          onClick={() => onSendMessage()}
          disabled={disabled}
          aria-label={t("carbon_chatbot.send_message")}
          className="absolute top-1/2 right-2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[#ff5a00] text-white shadow-sm transition-colors hover:bg-[#e04f00] disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          <svg
            className="mt-[1px] ml-[-2px] h-5 w-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
