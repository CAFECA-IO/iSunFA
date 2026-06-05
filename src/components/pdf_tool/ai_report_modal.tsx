import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { X, Sparkles, FileText } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";

interface IAiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: string, instruction: string) => void;
}

export function AiReportModal({
  isOpen,
  onClose,
  onSubmit,
}: IAiReportModalProps) {
  const { t } = useTranslation();
  const [dataInput, setDataInput] = useState<string>("");
  const [instruction, setInstruction] = useState<string>("");

  const handleGenerate = () => {
    if (!dataInput.trim()) return;
    onSubmit(dataInput.trim(), instruction.trim());
    handleClose();
  };

  const handleClose = () => {
    setDataInput("");
    setInstruction("");
    onClose();
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
                  {t("admin_mission_board.pdf_editor.ai_report_modal.title") ||
                    "AI 報告生成"}
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
                  {t(
                    "admin_mission_board.pdf_editor.ai_report_modal.subtitle",
                  ) ||
                    "請貼上數據來源（支援文字、CSV、JSON），AI 將自動為您生成結構化報告。"}
                </p>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">
                      {t(
                        "admin_mission_board.pdf_editor.ai_report_modal.data_label",
                      ) || "來源數據 (必填)"}
                    </label>
                    <textarea
                      value={dataInput}
                      onChange={(e) => setDataInput(e.target.value)}
                      rows={6}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                      placeholder={
                        t(
                          "admin_mission_board.pdf_editor.ai_report_modal.data_placeholder",
                        ) || "貼上要分析的財報數字、ESG 指標等..."
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-bold text-gray-700">
                      {t(
                        "admin_mission_board.pdf_editor.ai_report_modal.instruction_label",
                      ) || "自訂指令 (選填)"}
                    </label>
                    <textarea
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      rows={2}
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                      placeholder={
                        t(
                          "admin_mission_board.pdf_editor.ai_report_modal.instruction_placeholder",
                        ) || "例如：請著重分析減碳成效，並以列表呈現重點..."
                      }
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
                {t("common.cancel") || "取消"}
              </button>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={!dataInput.trim()}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-orange-500 disabled:bg-gray-300"
              >
                <Sparkles size={16} />
                {t("admin_mission_board.pdf_editor.ai_report_modal.generate") ||
                  "生成報告"}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
