import { useRef, useState } from "react";
import Image from "next/image";
import { PlusIcon, MinusIcon, MessageCircleMore, Bot, X, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useAiContext } from "@/contexts/ai_context";
import { IAttachment } from "@/interfaces/ai_talk";
import { ApiCode } from "@/lib/utils/status";

export const AiChat = () => {
  const { t } = useTranslation();
  const { isChatOpen, setIsChatOpen } = useAiContext();
  const [attachments, setAttachments] = useState<IAttachment[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [question, setQuestion] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmitDisabled = !question.trim() || isUploading;

  const processFiles = async (files: FileList | null) => {
    if (files) {
      const fileList = Array.from(files);
      const maxSize = 5 * 1024 * 1024; // Info: (20260209 - Julian) 5MB
      const maxCount = 5;

      const validFiles = fileList.filter((file) => {
        if (!file.type.startsWith("image/")) {
          return false;
        }
        if (file.size > maxSize) {
          alert(
            t("ai_consultation_room.file_size_error").replace(
              "{name}",
              file.name
            )
          );
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      if (attachments.length + validFiles.length > maxCount) {
        alert(
          t("ai_consultation_room.file_count_error").replace(
            "{count}",
            maxCount.toString()
          )
        );
        return;
      }

      setIsUploading(true);
      try {
        for (const file of validFiles) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/v1/ai_talk/attachment/upload", {
            method: "POST",
            body: formData,
          });

          const data = await response.json();
          if (data.code === ApiCode.SUCCESS) {
            setAttachments((prev) => [...prev, data.payload]);
          } else {
            console.error("Upload failed:", data.message);
          }
        }
      } catch (error) {
        console.error("Upload error:", error);
      } finally {
        setIsUploading(false);
      }
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
    try {
      const response = await fetch(`/api/v1/ai_talk/attachment/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.code === ApiCode.SUCCESS) {
        setAttachments((prev) => prev.filter((att) => att.id !== id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };


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
          className={`text-orange-500 transition-all duration-300 ${isChatOpen ? "p-2 hover:bg-gray-100 rounded-xl" : "p-0"
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

      <div className="overflow-y-auto">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`transition-all duration-300 ease-in-out flex flex-col gap-4 flex-1 ${isChatOpen ? "opacity-100 h-fit mt-6" : "opacity-0 h-0"
            }`}
        >
          <div className="flex-1 space-y-4 pr-1">
            <div className="relative">
              <textarea
                id="ai-question-input"
                aria-label={t("ai_consultation_room.input_placeholder")}
                placeholder={t("ai_consultation_room.input_placeholder")}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full h-36 p-4 outline-none bg-gray-50 border-2 border-transparent focus:border-orange-200 rounded-2xl text-sm transition-all resize-none shadow-inner"
              />
            </div>

            {/* Info: (20260209 - Julian) Display Uploaded Files */}
            {attachments.length > 0 && (
              <div className="flex overflow-x-auto gap-2 py-1">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="group shrink-0 w-16 h-16 relative rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shadow-sm"
                  >
                    <div className="w-full h-full relative rounded-xl overflow-hidden">
                      <Image
                        src={file.url}
                        alt={file.fileName}
                        fill
                        className="object-cover"
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

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept="image/*"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`w-full p-3 flex items-center justify-center gap-2 border-2 border-dashed outline-none rounded-2xl transition-all ${isDragging
                  ? "border-orange-500 bg-orange-50 text-orange-600 scale-[1.02] shadow-md"
                  : "border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50/50"
                } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isUploading ? (
                <Loader2 size={20} className="animate-spin text-orange-500" />
              ) : (
                <>
                  <PlusIcon size={20} className={`shrink-0 ${isDragging ? "animate-bounce" : ""}`} />
                  <span className="text-sm font-semibold">
                    {isDragging ? t("ai_consultation_room.drop_to_upload") : t("ai_consultation_room.upload_btn")}
                  </span>
                </>
              )}
            </button>


            <button
              id="ai-chat-submit"
              disabled={isSubmitDisabled}
              className={`w-full py-4 font-bold rounded-2xl shadow-lg transition-all ${isSubmitDisabled
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-200 active:scale-[0.98] hover:-translate-y-0.5"
                }`}
            >
              {t("ai_consultation_room.ask_ai")}
            </button>

          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed text-center px-4">
            {t("ai_consultation_room.disclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
};

