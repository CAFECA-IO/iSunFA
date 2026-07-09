import { KeyboardEvent, useRef, ChangeEvent } from "react";
import { Plus, X as XIcon, Loader2, File as FileIcon } from "lucide-react";
import { IUploadedFileData } from "@/types/carbon_chatbot.types";
import Image from "next/image";

export interface IChatInputProps {
  inputValue: string;
  isTyping: boolean;
  isLoading: boolean;
  isUploading: boolean;
  pendingAttachments: IUploadedFileData[];
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onFilesAdded: (files: File[]) => void;
  onFileRemoved: (id: string) => void;
}
import { useTranslation } from "@/i18n/i18n_context";

export function ChatInput({
  inputValue,
  isTyping,
  isLoading,
  isUploading,
  pendingAttachments,
  onInputChange,
  onSendMessage,
  onFilesAdded,
  onFileRemoved,
}: IChatInputProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSendMessage();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(Array.from(e.target.files));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const disabled =
    (!inputValue.trim() && pendingAttachments.length === 0) ||
    isTyping ||
    isLoading ||
    isUploading;

  return (
    <div className="absolute right-6 bottom-6 left-6 z-10 flex flex-col gap-3">
      {/* File Previews */}
      {pendingAttachments.length > 0 && (
        <div className="flex w-full gap-3 overflow-x-auto rounded-xl bg-white/80 p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-sm">
          {pendingAttachments.map((fileData) => (
            <div
              key={fileData.id}
              className="group relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            >
              <button
                type="button"
                onClick={() => onFileRemoved(fileData.id)}
                className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-500 opacity-0 shadow group-hover:opacity-100 hover:text-red-500"
              >
                <XIcon className="h-3 w-3" />
              </button>
              {fileData.previewUrl ? (
                <Image
                  src={fileData.previewUrl}
                  alt={fileData.file.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <FileIcon className="h-6 w-6 text-gray-400" />
              )}
            </div>
          ))}
          {isUploading && (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-orange-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </div>
      )}

      <div className="relative mx-auto flex w-full items-center rounded-full border-2 border-gray-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors focus-within:border-[#ff5a00]">
        {/* Gemini-style Plus Button */}
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading}
          className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-6 w-6" />
        </button>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading}
        />

        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("carbon_chatbot.input_placeholder")}
          className="flex-1 bg-transparent py-4 pr-16 pl-4 text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300"
          disabled={isTyping || isLoading || isUploading}
        />
        <button
          onClick={onSendMessage}
          disabled={disabled}
          aria-label="Send message"
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
