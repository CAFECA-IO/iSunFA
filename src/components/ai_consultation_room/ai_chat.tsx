"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/utils/request";
import { uploadFile, ILariaMetadata } from "@/lib/file_operator";
import {
  PlusIcon,
  MinusIcon,
  MessageCircleMore,
  Bot,
  X,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAiContext } from "@/contexts/ai_context";
import { useAuth } from "@/contexts/auth_context";
import { IFile } from "@/interfaces/ai_talk";
import { ApiCode } from "@/lib/utils/status";
import LoginButton from "@/components/common/login_button";
import ConfirmModal from "@/components/common/confirm_modal";
import { IApiResponse } from "@/lib/utils/response";
import { FilePreview } from "@/components/common/file_preview";

// Info: (20260213 - Julian) 將 File 轉換為 Base64 (不含 prefix)
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Info: (20260302 - Julian) 目前先限制一次只能上傳一張圖片
const FILE_LIMIT = 1;
// Info: (20260302 - Julian) 限制 20MB
const MAX_FILE_SIZE = 1024 * 1024 * 20;

export const AiChat = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const { isChatOpen, setIsChatOpen } = useAiContext();

  const [files, setFiles] = useState<(IFile & { base64?: string })[]>([]);
  const [localFiles, setLocalFiles] = useState<{ file: File; url: string }[]>(
    [],
  );
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
  }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Info: (20260213 - Julian) 清除 Object URLs 避免記憶體洩漏
  useEffect(() => {
    return () => {
      localFiles.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [localFiles]);

  // Info: (20260302 - Julian) 不可上傳：1. 正在提交 2. 檔案數量(包含上傳中)超過限制
  const isUploadDisabled =
    isSubmitting || files.length + localFiles.length >= FILE_LIMIT;

  // Info: (20260302 - Julian) 不可提交：1. 沒有輸入問題 2. 正在提交 3. 正在上傳檔案
  const isSubmitDisabled =
    !question.trim() || isSubmitting || localFiles.length > 0;

  const handleSubmit = async () => {
    if (isSubmitDisabled || !user) return;

    setIsSubmitting(true);
    try {
      const data = await request<IApiResponse<{ threadId: string }>>(
        "/api/v1/ai_talk/thread",
        {
          method: "POST",
          body: JSON.stringify({
            question,
            files,
          }),
        },
      );

      if (data.code === ApiCode.SUCCESS) {
        setQuestion("");
        setFiles([]);
        setLocalFiles([]);

        // Info: (20260212 - Julian) 延遲 500 ms 後導向 /ai_consultation_room/{threadId} 頁面
        setTimeout(() => {
          if (data.payload && data.payload.threadId) {
            router.push(`/ai_consultation_room/${data.payload.threadId}`);
          }
        }, 500);
      } else {
        console.error("Failed to create thread:", data.message);
      }
    } catch (error) {
      console.error("Error creating thread:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const processFiles = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || isUploadDisabled) return;
    const fileList = Array.from(selectedFiles);
    const maxSize = MAX_FILE_SIZE;
    const maxCount = FILE_LIMIT;

    const validFiles = fileList.filter((file) => {
      if (!file.type.startsWith("image/")) {
        return false;
      }
      if (file.size > maxSize) {
        setConfirmModal({
          isOpen: true,
          title: t("ai_consultation_room.file_size_error_title"),
          message: t("ai_consultation_room.file_size_error_content").replace(
            "{name}",
            file.name,
          ),
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Info: (20260302 - Julian) 檢查包含已選取、上傳中的檔案，總數是否超過限制
    if (files.length + localFiles.length + validFiles.length > maxCount) {
      setConfirmModal({
        isOpen: true,
        title: t("ai_consultation_room.file_count_error_title"),
        message: t("ai_consultation_room.file_count_error_content").replace(
          "{count}",
          maxCount.toString(),
        ),
      });
      return;
    }
    try {
      const newLocalFiles = validFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));
      setLocalFiles((prev) => [...prev, ...newLocalFiles]);

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];

        try {
          const uploadResult = await new Promise<{
            hash: string;
            metadata?: ILariaMetadata;
          }>((resolve, reject) => {
            uploadFile(file, {
              onSuccess: (hash, metadata) => resolve({ hash, metadata }),
              onError: (error) => reject(error),
            });
          });

          // Info: (20260213 - Julian) 同時轉換為 base64 供 AI 使用
          const base64 = await fileToBase64(file);
          setFiles((prev) => [
            ...prev,
            {
              id: uploadResult.hash,
              hash: uploadResult.hash,
              threadId: "",
              fileName: file.name,
              mimeType: file.type,
              metadata: JSON.stringify(uploadResult.metadata),
              fileSize: file.size,
              base64,
            },
          ]);

          // Info: (20260213 - Julian) 上傳成功後移除本地預覽
          setLocalFiles((prev) => {
            const target = prev.find((item) => item.file === file);
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((item) => item.file !== file);
          });
        } catch (uploadError) {
          console.error("Upload failed for file", file.name, uploadError);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeFile = async (id: string) => {
    // Info: (20260302 - Julian) 移除檔案
    setFiles((prev) => prev.filter((att) => att.id !== id));
  };

  const displayedButtons = user ? (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept="image/*"
        aria-label="Upload image"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploadDisabled}
        className={`w-full p-3 flex items-center justify-center gap-2 border-2 border-dashed outline-none rounded-2xl transition-all disabled:bg-gray-200 disabled:text-gray-500 ${isDragging
          ? "border-orange-500 bg-orange-50 text-orange-600 scale-[1.02] shadow-md"
          : "border-gray-200 text-gray-500 enabled:hover:border-orange-300 enabled:hover:text-orange-500 enabled:hover:bg-orange-50/50"
          }`}
      >
        {isUploadDisabled ? (
          <p className="text-sm text-gray-500">
            {t("ai_consultation_room.file_count_error_content").replace(
              "{count}",
              FILE_LIMIT.toString(),
            )}
          </p>
        ) : (
          <>
            <PlusIcon
              size={20}
              className={`shrink-0 ${isDragging ? "animate-bounce" : ""}`}
            />
            <span className="text-sm font-semibold">
              {isDragging
                ? t("ai_consultation_room.drop_to_upload")
                : t("ai_consultation_room.upload_btn")}
            </span>
          </>
        )}
      </button>

      <button
        id="ai-chat-submit"
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center ${isSubmitDisabled
          ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
          : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-200 active:scale-[0.98] hover:-translate-y-0.5"
          }`}
      >
        {isSubmitting ? (
          <Loader2 size={24} className="animate-spin" />
        ) : (
          t("ai_consultation_room.ask_ai")
        )}
      </button>
    </>
  ) : (
    <LoginButton label="Please login to use the AI chat" />
  );

  return (
    <div
      className={`fixed right-6 bottom-24 z-50 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) bg-white border-2 border-orange-400 shadow-[0_20px_50px_rgba(234,88,12,0.15)] flex flex-col overflow-hidden ${isChatOpen
        ? "w-80 h-[500px] p-6 rounded-3xl"
        : "w-16 h-16 p-0 rounded-full hover:scale-110 active:scale-95 items-center justify-center hover:bg-orange-50"
        }`}
    >
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="absolute inset-0 w-full h-full rounded-full z-10"
          aria-label={t("ai_consultation_room.open_chat")}
        />
      )}
      <div
        className={`flex items-center ${isChatOpen ? "justify-between" : "justify-center"} w-full transition-all duration-300`}
      >
        {isChatOpen && (
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bot size={20} className="text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 whitespace-nowrap">
              {t("ai_consultation_room.title")}
            </h2>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            if (isChatOpen) {
              e.stopPropagation();
              setIsChatOpen(false);
            }
          }}
          className={`text-orange-500 transition-all duration-300 ${isChatOpen ? "p-2 hover:bg-gray-100 rounded-full" : "p-0"
            }`}
          aria-label={
            isChatOpen
              ? t("ai_consultation_room.close_chat")
              : t("ai_consultation_room.open_chat")
          }
        >
          {isChatOpen ? (
            <MinusIcon size={24} />
          ) : (
            <div className="relative flex items-center justify-center">
              <MessageCircleMore
                size={32}
                className="text-orange-500 transition-transform duration-500"
              />
            </div>
          )}
        </button>
      </div>

      <div
        className={`overflow-y-auto overflow-x-hidden flex-col h-full ${isChatOpen ? "flex" : "hidden"}`}
      >
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          role="region"
          aria-label="File Upload Drop Zone"
          className={`transition-all duration-300 ease-in-out flex flex-col gap-4 flex-1 ${isChatOpen ? "opacity-100 h-fit mt-6" : "opacity-0 h-0"}`}
        >
          <div className="flex-1 h-full space-y-4 pr-1 flex flex-col items-center">
            <div className="relative w-full">
              <textarea
                id="ai-question-input"
                aria-label={t("ai_consultation_room.input_placeholder")}
                placeholder={t("ai_consultation_room.input_placeholder")}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full h-36 p-4 outline-none bg-gray-50 border-2 border-transparent focus:border-orange-200 rounded-2xl text-sm text-gray-800 transition-all resize-none shadow-inner"
              />
            </div>

            {/* Info: (20260213 - Julian) 顯示本地預覽 */}
            {(localFiles.length > 0 || files.length > 0) && (
              <div className="flex w-full overflow-x-auto gap-2 py-1">
                {localFiles.map((item, index) => (
                  <div
                    key={`local-${index}`}
                    className="group shrink-0 w-16 h-16 relative rounded-xl border border-orange-200 bg-orange-50 flex items-center justify-center shadow-sm"
                  >
                    <div className="w-full h-full relative rounded-xl overflow-hidden opacity-60">
                      <FilePreview
                        file={{
                          filename: item.file.name,
                          mimeType: item.file.type,
                        }}
                        url={item.url}
                        className="object-cover w-full h-full pointer-events-none"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2
                          size={16}
                          className="animate-spin text-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="group shrink-0 w-16 h-16 relative rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm"
                  >
                    <div className="w-full h-full relative rounded-xl overflow-hidden">
                      <FilePreview
                        file={{
                          filename: file.fileName ?? "",
                          mimeType: file.mimeType,
                        }}
                        base64={file.base64}
                        className="object-cover w-full h-full pointer-events-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="absolute -top-1 -right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      aria-label="刪除文件"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {displayedButtons}
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed text-center px-4">
            {t("ai_consultation_room.disclaimer")}
          </p>
        </div>
      </div>

      {/* Info: (20260302 - Julian) File Size Error Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={t("common.close")}
      />
    </div>
  );
};
