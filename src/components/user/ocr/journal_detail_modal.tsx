"use client";

import { Fragment, useState, useEffect } from "react";
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
  PencilIcon,
  SaveIcon,
  UndoIcon,
  TrashIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { FilePreview } from "@/components/common/file_preview";
import ConfirmModal from "@/components/common/confirm_modal";
import ZoomablePreview from "@/components/common/zoomable_preview";
import { IJournal } from "@/interfaces/journal";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

interface IJournalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: IJournal | null;
  onUpdate: (updatedJournal: IJournal) => void;
  onDelete: (journal: IJournal) => void;
}

export default function JournalDetailModal({
  isOpen,
  onClose,
  journal,
  onUpdate,
  onDelete,
}: IJournalDetailModalProps) {
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // confirm conditions
  const [showConfirmClose, setShowConfirmClose] = useState<boolean>(false);
  const [showConfirmSave, setShowConfirmSave] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && journal) {
      setEditText(journal.text);
      setIsEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, journal?.id]);

  if (!journal) return null;

  const hasUnsavedChanges = isEditing && editText !== journal.text;

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setShowConfirmClose(true);
    } else {
      setIsEditing(false);
      onClose();
    }
  };

  const handleSaveAttempt = () => {
    if (editText === journal.text) {
      setIsEditing(false);
      return;
    }
    setShowConfirmSave(true);
  };

  const executeSave = async () => {
    setShowConfirmSave(false);
    setIsSaving(true);
    try {
      const data = await request<IApiResponse<{ journal: IJournal }>>(
        `/api/v1/journal/${journal.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ text: editText }),
        },
      );
      if (data.code === ApiCode.SUCCESS && data.payload?.journal) {
        // Must merge the new data because the PUT api might not return the associated file object
        const newJournal = {
          ...journal,
          ...data.payload.journal,
          file: journal.file,
        };
        onUpdate(newJournal);
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Failed to update journal", error);
    } finally {
      setIsSaving(false);
    }
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
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                    <DialogTitle
                      as="h3"
                      className="text-xl font-semibold text-gray-900"
                    >
                      {t("ocr.detail_title")}
                    </DialogTitle>
                    <button
                      type="button"
                      className="rounded-full bg-gray-100 p-2 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 focus:outline-none"
                      onClick={requestClose}
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="flex flex-1 overflow-hidden bg-gray-50">
                    {/* Left: Preview */}
                    <ZoomablePreview
                      hasContent={!!journal.file?.hash}
                      fallbackText={t("ocr.no_image") as string}
                    >
                      {journal.file?.hash && (
                        <FilePreview
                          file={{
                            filename: journal.file.fileName || "Unknown",
                          }}
                          fileId={journal.file.hash}
                          className="max-h-[70vh] max-w-full object-contain"
                        />
                      )}
                    </ZoomablePreview>

                    {/* Right: Text / Edit */}
                    <div className="flex w-1/2 flex-col bg-white p-6">
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="font-medium text-gray-700">
                          {t("ocr.journal")}
                        </h4>
                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditText(journal.text);
                                  setIsEditing(false);
                                }}
                                className="flex items-center gap-1 rounded bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
                              >
                                <UndoIcon size={14} />
                                {t("ocr.cancel")}
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveAttempt}
                                className="flex items-center gap-1 rounded bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600"
                              >
                                <SaveIcon size={14} />
                                {t("ocr.save")}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditText(journal.text);
                                setIsEditing(true);
                              }}
                              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <PencilIcon size={14} />
                              {t("ocr.edit")}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="w-full flex-1 overflow-y-auto">
                        {isEditing ? (
                          <textarea
                            aria-label={t("ocr.journal") as string}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="h-full w-full resize-none rounded-lg border border-orange-300 p-4 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                          />
                        ) : (
                          <div className="h-full w-full rounded-lg border border-gray-100 bg-gray-50 p-4 whitespace-pre-wrap text-gray-700">
                            {journal.text}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 ml-auto">
                        <button
                          type="button"
                          onClick={() => onDelete(journal)}
                          className="flex items-center gap-2 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-200"
                        >
                          <TrashIcon size={14} />
                          {t("ocr.delete")}
                        </button>
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

      {/* Confirm Save Modal */}
      <ConfirmModal
        isOpen={showConfirmSave}
        onClose={() => setShowConfirmSave(false)}
        title={t("ocr.confirm_save_title") as string}
        message={t("ocr.confirm_save_msg") as string}
        confirmText={t("ocr.save") as string}
        cancelText={t("ocr.cancel") as string}
        onConfirm={executeSave}
      />

      {/* Confirm Close Modal */}
      <ConfirmModal
        isOpen={showConfirmClose}
        onClose={() => setShowConfirmClose(false)}
        title={t("ocr.unsaved_changes_title") as string}
        message={t("ocr.unsaved_changes_msg") as string}
        confirmText={t("ocr.confirm_leave_title") as string}
        cancelText={t("ocr.cancel") as string}
        onConfirm={() => {
          setShowConfirmClose(false);
          setIsEditing(false);
          onClose();
        }}
      />
    </>
  );
}
