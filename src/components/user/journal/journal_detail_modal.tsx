"use client";

import { Fragment, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  X,
  Loader2,
  CheckCircle2,
  Save,
  // TrashIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import ConfirmModal from "@/components/common/confirm_modal";
import ZoomablePreview from "@/components/common/zoomable_preview";
import AiConfidenceBar from "@/components/common/ai_confidence_bar";
import { IJournal } from "@/interfaces/journal";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

interface IJournalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: IJournal | null;
  onUpdate: (updatedJournal: IJournal) => void;
  // onDelete: (journal: IJournal) => void;
}

export default function JournalDetailModal({
  isOpen,
  onClose,
  journal,
  onUpdate,
  // onDelete,
}: IJournalDetailModalProps) {
  const { t } = useTranslation();
  const params = useParams();

  // Info: (20260309 - Julian) 從 URL 取得帳簿 ID
  const accountBookId = params?.account_book_id as string;

  const [editText, setEditText] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Info: (20260305 - Julian) confirm conditions
  const [showConfirmClose, setShowConfirmClose] = useState<boolean>(false);
  const [showConfirmSave, setShowConfirmSave] = useState<boolean>(false);

  const [targetVerify, setTargetVerify] = useState<boolean>(false);
  const [isUnverifyModalOpen, setIsUnverifyModalOpen] =
    useState<boolean>(false);

  useEffect(() => {
    if (isOpen && journal) {
      setEditText(journal.text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, journal?.id]);

  if (!journal) return null;

  const hasUnsavedChanges = editText !== journal.text;

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const saveJournal = (isVerified?: boolean) => {
    setTargetVerify(!!isVerified);
    setShowConfirmSave(true);
  };

  const executeSaveJournal = async (overrideVerify: boolean | null = null) => {
    setShowConfirmSave(false);
    setIsSaving(true);
    const finalVerify = overrideVerify !== null ? overrideVerify : targetVerify;
    try {
      const data = await request<IApiResponse<IJournal>>(
        `/api/v1/user/account_book/${accountBookId}/journal/${journal.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ text: editText, isVerified: finalVerify }),
        },
      );
      if (data.code === ApiCode.SUCCESS && data.payload) {
        // Info: (20260305 - Julian) Must merge the new data because the PUT api might not return the associated file object
        const newJournal = {
          ...journal,
          ...data.payload,
          file: journal.file,
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
      <Transition show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-100" onClose={requestClose}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                enterTo="opacity-100 translate-y-0 sm:scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              >
                <DialogPanel className="relative flex h-[85vh] w-full max-w-[90vw] transform flex-col overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all">
                  {/* Info: (20260305 - Julian) Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <DialogTitle
                        as="h3"
                        className="text-xl font-bold text-slate-800"
                      >
                        {t("ocr.detail_title")}
                      </DialogTitle>
                      {/* Info: (20260324 - Julian) 顯示日記帳狀態 */}
                      {journal.isVerified ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
                          {t("verify.status.verified")}
                        </span>
                      ) : (
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
                          {t("verify.status.unverified")}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 focus:outline-none"
                      onClick={requestClose}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Info: (20260305 - Julian) Body Content */}
                  <div className="flex flex-1 overflow-hidden bg-gray-50">
                    {/* Info: (20260305 - Julian) Left: Preview */}
                    <div className="flex w-1/2 flex-col border-r border-gray-200 p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-sm font-bold text-gray-500">
                          {t("ocr.file")}
                        </h4>
                        <div className="relative flex items-center gap-2">
                          {/* Info: (20260324 - Julian) AI Confidence */}
                          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                            <span className="text-xs font-bold text-gray-500">
                              {t("ocr.confidence")}
                            </span>
                            <AiConfidenceBar confidence={journal.confidence} />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                        <ZoomablePreview
                          hasContent={!!journal.file?.hash}
                          fallbackText={t("ocr.no_image") as string}
                          className="h-full w-full"
                        >
                          {journal.file?.hash && (
                            <FilePreview
                              file={{
                                filename: journal.file.fileName || "Unknown",
                              }}
                              fileId={journal.file.hash}
                              className="size-full object-contain"
                            />
                          )}
                        </ZoomablePreview>
                      </div>
                    </div>

                    {/* Info: (20260305 - Julian) Right: Text / Edit */}
                    <div className="flex w-1/2 flex-col bg-white p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-medium text-gray-700">
                          {t("ocr.journal")}
                        </h4>
                      </div>

                      <div className="flex-1 overflow-y-auto rounded-lg">
                        <textarea
                          aria-label={t("ocr.journal") as string}
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="size-full resize-none rounded-lg border border-orange-300 bg-gray-50 p-4 outline-none focus:border-orange-500"
                        />
                      </div>
                      {/* ToDo: (20260323 - Julian) 先隱藏刪除按鈕 */}
                      {/* <div className="mt-4 ml-auto">
                        <button
                          type="button"
                          onClick={() => onDelete(journal)}
                          className="flex items-center gap-2 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-200"
                        >
                          <TrashIcon size={14} />
                          {t("ocr.delete")}
                        </button>
                      {/* Info: (20260324 - Julian) Footer Actions */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 py-2 pt-5">
                        <button
                          type="button"
                          onClick={() => setEditText(journal.text)}
                          className="px-4 text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
                        >
                          {t("voucher.detail_modal.actions.cancel_edit")}
                        </button>
                        <div className="flex items-center gap-3">
                          {journal.isVerified ? (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => setIsUnverifyModalOpen(true)}
                              className="flex h-10 items-center gap-2 rounded-xl bg-red-400 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-red-500 disabled:bg-slate-300"
                            >
                              <X size={16} className="stroke-3" />
                              {t("verify.button.unverify")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => saveJournal(true)}
                              className="flex h-10 items-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:bg-slate-300"
                            >
                              <CheckCircle2 size={16} className="stroke-3" />
                              {t("voucher.detail_modal.actions.verify_save")}
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => saveJournal(journal?.isVerified)}
                            className="flex h-10 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:bg-slate-300"
                          >
                            <Save size={16} className="stroke-3" />
                            {t("voucher.detail_modal.actions.save_only")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isSaving && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                      <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                    </div>
                  )}
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

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
    </>
  );
}
