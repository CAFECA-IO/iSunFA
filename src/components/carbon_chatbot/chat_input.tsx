// Info: (20260714 - Emily) 對話輸入列:純文字 + 附件(按鈕/拖放),附件驗證與 base64 轉換邏輯集中於 use_carbon_chat

import { KeyboardEvent, DragEvent, useRef, useState } from "react";
import { Paperclip, X, Loader2, FileText } from "lucide-react";
import {
  IPendingAttachment,
  PendingAttachmentStatusEnum,
} from "@/types/carbon_chatbot.types";
import { IDraftNotice } from "@/hooks/use_carbon_chat";
import { CARBON_CHAT_ATTACHMENT_ACCEPT } from "@/constants/carbon_chatbot";
import { useTranslation } from "@/i18n/i18n_context";

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
  // Info: (20260714 - Emily) 草稿生成狀態列(loading/error):並行任務不以對話氣泡表達,避免與回覆順序矛盾
  draftNotice?: IDraftNotice | null;
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

  // Info: (20260714 - Emily) 有文字或有就緒附件即可送出;附件讀取中暫不可送,避免漏附件
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
    // Info: (20260714 - Emily) 清空 input value,允許重選同一檔案
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Info: (20260714 - Emily) 拖放事件掛在原生互動元素(文字輸入框)上,滿足 jsx-a11y;鍵盤使用者以附件按鈕為替代路徑
  const handleDrop = (e: DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (onAddFiles) setIsDragOver(true);
  };

  return (
    <div className="absolute right-6 bottom-6 left-6 z-10">
      {/* Info: (20260714 - Emily) 待送附件 chips:可移除;讀取中顯示 spinner */}
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

      {/* Info: (20260714 - Emily) 附件驗證錯誤提示(前端 Fail Fast:非法類型/超大檔在此擋下) */}
      {attachmentError && (
        <div className="mx-auto mb-2 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600">
          {attachmentError}
        </div>
      )}

      {/* Info: (20260714 - Emily) 草稿生成狀態列:生成中 loading、失敗短暫提示後自動消失 */}
      {draftNotice && (
        <div
          className={`mx-auto mb-2 flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ${
            draftNotice.type === "loading"
              ? "bg-orange-50 text-[#e04f00]"
              : "bg-red-50 text-red-600"
          }`}
        >
          {draftNotice.type === "loading" && (
            <Loader2 size={12} className="shrink-0 animate-spin" />
          )}
          {draftNotice.text}
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
          onClick={onSendMessage}
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
