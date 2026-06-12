import { useRef, useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { X, Sparkles, FileText, Upload } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IAiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: string, instruction: string) => void;
  onError: (message: string) => void;
}

export function AiReportModal({
  isOpen,
  onClose,
  onSubmit,
  onError,
}: IAiReportModalProps) {
  const { t } = useTranslation();
  const [dataInput, setDataInput] = useState<string>("");
  const [instruction, setInstruction] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Info: (20260608 - Julian) 將上傳的檔案寫入 textarea 中
  const handleFile = (file: File) => {
    // Info: (20260608 - Julian) 限制副檔名
    const validExtensions = [".txt", ".json", ".csv"];
    const isValidFormat =
      validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext)) ||
      Boolean(file.type.match(/(text|json|csv)/));

    // Info: (20260608 - Julian) 檢查檔案格式是否正確
    if (!isValidFormat) {
      onError(
        t("admin_mission_board.pdf_editor.ai_report_modal.invalid_file_type"),
      );
      return;
    }

    // Info: (20260608 - Julian) 限制 4MB
    const MAX_SIZE = 4 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      onError(
        t("admin_mission_board.pdf_editor.ai_report_modal.file_too_large"),
      );
      return;
    }

    // Info: (20260608 - Julian) 讀取檔案
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === "string") {
        setDataInput((prev) => (prev ? prev + "\n\n" + text : text));
      }
    };
    reader.readAsText(file);
  };

  // Info: (20260608 - Julian) 拖曳檔案（進入）
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Info: (20260608 - Julian) 拖曳檔案（離開）
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Info: (20260608 - Julian) 拖曳檔案（放置）
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  // Info: (20260608 - Julian) 選擇檔案
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      e.target.value = ""; // Info: (20260608 - Julian) 重置 input
    }
  };

  // Info: (20260608 - Julian) 產生按鈕
  const handleGenerate = () => {
    if (!dataInput.trim()) return;
    onSubmit(dataInput.trim(), instruction.trim());
  };

  // Info: (20260608 - Julian) 關閉
  const handleClose = () => {
    // Info: (20260608 - Julian) 關閉視窗但不清空輸入，避免 API 失敗或誤關時遺失草稿
    onClose();
  };

  // Info: (20260608 - Julian) 快捷鍵
  const handleSubmitHotkey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Info: (20260608 - Julian) 快捷鍵送出：Command + Enter (Mac) 或 Ctrl + Enter (Windows)
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault(); // Info: (20260608 - Julian) 阻止預設行為
      handleGenerate(); // Info: (20260608 - Julian) 呼叫 handleGenerate
    }
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all">
            <div className="bg-white px-6 pt-5 pb-6">
              <div className="flex items-center justify-between">
                <DialogTitle
                  as="h3"
                  className="flex items-center gap-2 text-lg leading-6 font-bold text-gray-900"
                >
                  <FileText size={20} className="text-orange-600" />
                  {t("admin_mission_board.pdf_editor.ai_report_modal.title")}
                </DialogTitle>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-4">
                <p className="mb-4 text-sm text-gray-500">
                  {t("admin_mission_board.pdf_editor.ai_report_modal.subtitle")}
                </p>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="block text-sm font-bold text-gray-700">
                        <span className="mr-1 text-red-500">*</span>
                        {t(
                          "admin_mission_board.pdf_editor.ai_report_modal.data_label",
                        )}
                      </label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 text-sm font-bold text-orange-600 transition-colors hover:text-orange-700"
                      >
                        <Upload size={14} />
                        {t(
                          "admin_mission_board.pdf_editor.ai_report_modal.upload_file",
                        )}
                      </button>
                    </div>

                    {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative w-full rounded-xl border transition-all focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 ${
                        isDragging
                          ? "border-dashed border-orange-500 bg-orange-50"
                          : "border-gray-300 bg-white"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".txt,.json,.csv"
                        className="hidden"
                      />
                      <textarea
                        value={dataInput}
                        onChange={(e) => setDataInput(e.target.value)}
                        onKeyDown={handleSubmitHotkey}
                        rows={6}
                        className="w-full resize-y rounded-xl border-none bg-transparent p-3 text-sm focus:ring-0 focus:outline-none"
                        placeholder={t(
                          "admin_mission_board.pdf_editor.ai_report_modal.data_placeholder",
                        )}
                      />
                      {isDragging && (
                        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-orange-50/90 text-sm font-bold text-orange-600 backdrop-blur-sm">
                          {t(
                            "admin_mission_board.pdf_editor.ai_report_modal.drag_drop_hint",
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">
                      {t(
                        "admin_mission_board.pdf_editor.ai_report_modal.instruction_label",
                      )}
                    </label>
                    <textarea
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      onKeyDown={handleSubmitHotkey}
                      rows={2}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                      placeholder={t(
                        "admin_mission_board.pdf_editor.ai_report_modal.instruction_placeholder",
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200"
              >
                {t("common.cancel")}
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!dataInput.trim()}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-500 disabled:bg-gray-300"
              >
                <Sparkles size={16} />
                {t("admin_mission_board.pdf_editor.ai_report_modal.generate")}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
