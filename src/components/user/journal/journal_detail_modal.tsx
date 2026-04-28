"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { X, Loader2, CheckCircle2, Save, Pencil, Eye } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import ConfirmModal from "@/components/common/confirm_modal";
import FilePreviewModal from "@/components/common/file_preview_modal";
import AiConfidence from "@/components/common/ai_confidence";
import { MarkdownContent } from "@/components/common/markdown_content";
import { IJournal } from "@/interfaces/journal";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

interface IJournalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal?: IJournal | null;
  journalId?: string | null;
  onUpdate: (updatedJournal: IJournal) => void;
}

export default function JournalDetailModal({
  isOpen,
  onClose,
  journal = undefined,
  journalId = undefined,
  onUpdate,
}: IJournalDetailModalProps) {
  const { t } = useTranslation();
  const params = useParams();

  // Info: (20260309 - Julian) 從 URL 取得帳簿 ID
  const accountBookId = params?.account_book_id as string;

  const [fetchedJournal, setFetchedJournal] = useState<IJournal | null>(null);
  const activeJournal = journal || fetchedJournal;
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [editText, setEditText] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Info: (20260305 - Julian) confirm conditions
  const [showConfirmClose, setShowConfirmClose] = useState<boolean>(false);
  const [showConfirmSave, setShowConfirmSave] = useState<boolean>(false);

  // Info: (20260325 - Julian) Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  const [targetVerify, setTargetVerify] = useState<boolean>(false);
  const [isUnverifyModalOpen, setIsUnverifyModalOpen] =
    useState<boolean>(false);

  const fetchJournal = useCallback(async () => {
    if (!journalId || journal) return;
    setIsLoading(true);
    try {
      const { payload } = await request<IApiResponse<IJournal>>(
        `/api/v1/user/account_book/${accountBookId}/journal/${journalId}`,
      );
      if (payload) {
        setFetchedJournal(payload);
      }
    } catch (error) {
      console.error("Failed to fetch journal", error);
    } finally {
      setIsLoading(false);
    }
  }, [journalId, journal, accountBookId]);

  useEffect(() => {
    if (isOpen) {
      // Info: (20260325 - Julian)每次打開時，重置為預覽模式
      setIsEditMode(false);
      fetchJournal();
    }
  }, [isOpen, fetchJournal]);

  useEffect(() => {
    if (isOpen && activeJournal) {
      setEditText(activeJournal.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeJournal?.id]);

  useEffect(() => {
    // Info: (20260409 - Julian) 切換編輯模式時，focus 到 textarea
    if (isEditMode) {
      const textarea = document.getElementById("journal-edit-textarea");
      textarea?.focus();
    }
  }, [isEditMode]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center p-10 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!activeJournal) return null;

  // Info: (20260325 - Julian) 判斷是否有未儲存的變更
  const hasUnsavedChanges = editText !== activeJournal.text;

  const saveJournal = (isVerified?: boolean) => {
    setTargetVerify(!!isVerified);
    setShowConfirmSave(true);
  };

  const executeSaveJournal = async (overrideVerify: boolean | null = null) => {
    if (!activeJournal) return;
    setShowConfirmSave(false);
    setIsSaving(true);
    const finalVerify = overrideVerify !== null ? overrideVerify : targetVerify;
    try {
      const data = await request<IApiResponse<IJournal>>(
        `/api/v1/user/account_book/${accountBookId}/journal/${activeJournal.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ text: editText, isVerified: finalVerify }),
        },
      );
      if (data.code === ApiCode.SUCCESS && data.payload) {
        // Info: (20260305 - Julian) Must merge the new data because the PUT api might not return the associated file object
        const newJournal = {
          ...activeJournal,
          ...data.payload,
          file: activeJournal.file,
        };
        onUpdate(newJournal);
        onClose();
      }
    } catch (error) {
      console.error("Failed to update journal", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnverifyConfirmed = () => {
    setIsUnverifyModalOpen(false);
    setTargetVerify(false);
    executeSaveJournal(false);
  };

  return (
    <>
      <div className="flex h-full w-full flex-col overflow-hidden bg-[#F8FAFC]">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[10px]">
          <div className="flex shrink-0 flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h4 className="text-base font-bold text-slate-500">
                {t("verify.type.journal")}
              </h4>
              {/* Info: (20260324 - Julian) 顯示日記帳狀態 */}
              {activeJournal.isVerified ? (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
                  {t("verify.status.verified")}
                </span>
              ) : (
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
                  {t("verify.status.unverified")}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
                  isEditMode
                    ? "border-orange-200 bg-orange-50 text-orange-600"
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-600"
                }`}
              >
                {isEditMode ? (
                  <>
                    <Eye size={14} className="text-orange-500" />
                    {t("ocr.view_preview")}
                  </>
                ) : (
                  <>
                    <Pencil size={14} className="text-slate-400" />
                    {t("ocr.edit")}
                  </>
                )}
              </button>
            </div>
            {/* Info: (20260325 - Julian) AI Confidence */}
            <div className="relative ml-auto">
              <AiConfidence
                confidence={activeJournal.confidence}
                note={activeJournal.aiNote}
              />
            </div>
          </div>

          {/* Info: (20260327 - Luphia) 將原本外層的 overflow-y-auto 移除，改由內部元素自行處理滾動 */}
          <div className="flex min-h-0 flex-1 flex-col px-4 py-4 lg:px-6">
            {isEditMode ? (
              <textarea
                id="journal-edit-textarea"
                aria-label={t("ocr.journal") as string}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => setIsEditMode(false)} // Info: (20260409 - Julian) textarea blur 即關閉編輯模式
                // Info: (20260327 - Luphia) 加入 flex-1 讓它填滿高度，並將 resize-y 改為 resize-none 防止手動拉伸破壞版面
                className="flex-1 resize-none rounded-xl border border-slate-300 bg-white p-4 leading-relaxed text-slate-700 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            ) : (
              // Info: (20260327 - Luphia) 加入 flex-1 填滿高度，並加上 overflow-y-auto 讓長文章可以在此區塊內滾動
              <div className="flex-1 overflow-y-auto rounded-xl border border-slate-300 bg-white p-4">
                {editText ? (
                  <MarkdownContent content={editText} theme="light" />
                ) : (
                  <p className="text-sm text-gray-400 italic">
                    {t("journal.detail_modal.empty") || "Empty"}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Info: (20260324 - Julian) Footer Actions */}
        <div className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-6">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(true)}
              className="mr-auto text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
            >
              {t("voucher.detail_modal.actions.cancel_edit")}
            </button>
          )}
          <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:gap-3">
            {activeJournal.isVerified ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsUnverifyModalOpen(true)}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-400 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[120px] sm:flex-none sm:px-6 sm:text-sm"
              >
                <X size={16} className="stroke-[2.5]" />
                {t("verify.button.unverify")}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => saveJournal(true)}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[120px] sm:flex-none sm:px-6 sm:text-sm"
              >
                <CheckCircle2 size={16} className="stroke-[2.5]" />
                {t("voucher.detail_modal.actions.verify_save")}
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={() => saveJournal(activeJournal?.isVerified)}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[120px] sm:flex-none sm:px-6 sm:text-sm"
            >
              <Save size={16} className="stroke-[2.5]" />
              {t("voucher.detail_modal.actions.save_only")}
            </button>
          </div>
        </div>

        {isSaving && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        )}
      </div>

      {/* Info: (20260325 - Julian) Confirm Cancel Modal */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={t("common.cancel_edit_title")}
        message={t("common.cancel_edit_message")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={() => {
          setEditText(activeJournal.text);
          setIsCancelModalOpen(false);
        }}
      />

      {/* Info: (20260305 - Julian) Confirm Save Modal */}
      <ConfirmModal
        isOpen={showConfirmSave}
        onClose={() => setShowConfirmSave(false)}
        title={t("ocr.confirm_save_title") as string}
        message={t("ocr.confirm_save_msg") as string}
        confirmText={t("ocr.save") as string}
        cancelText={t("common.cancel") as string}
        onConfirm={() => executeSaveJournal(null)}
      />

      {/* Info: (20260305 - Julian) Confirm Close Modal */}
      <ConfirmModal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        title={t("ocr.unsaved_changes_title") as string}
        message={t("ocr.unsaved_changes_msg") as string}
        confirmText={t("ocr.confirm_leave_title") as string}
        cancelText={t("common.cancel") as string}
        onConfirm={() => {
          setShowConfirmClose(false);
          onClose();
        }}
      />

      {/* Info: (20260323 - Julian) Unverify Modal */}
      <ConfirmModal
        isOpen={isUnverifyModalOpen}
        onClose={() => setIsUnverifyModalOpen(false)}
        title={t("verify.unverify_modal.title")}
        message={t("verify.unverify_modal.message", {
          type: t("verify.type.journal"),
        })}
        confirmText={t("verify.unverify_modal.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={handleUnverifyConfirmed}
      />

      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        file={activeJournal.file}
        title={t("ocr.file")}
      />
    </>
  );
}
