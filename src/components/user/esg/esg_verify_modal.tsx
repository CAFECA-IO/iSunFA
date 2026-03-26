"use client";

import { Fragment, useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, CheckCircle2, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import ConfirmModal from "@/components/common/confirm_modal";
import { IEsgRecord, EsgScope, EsgIntensity } from "@/interfaces/esg";
import FilePreviewModal from "@/components/common/file_preview_modal";
import AiConfidence from "@/components/common/ai_confidence";
import { useTranslation } from "@/i18n/i18n_context";

interface IEsgVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  esgId: string | null;
  onSave?: (record: IEsgRecord) => void;
}

export default function EsgVerifyModal({
  isOpen,
  onClose,
  esgId,
  onSave,
}: IEsgVerifyModalProps) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [formData, setFormData] = useState<IEsgRecord | null>(null);
  const [originalData, setOriginalData] = useState<IEsgRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);
  const [isUnverifyModalOpen, setIsUnverifyModalOpen] =
    useState<boolean>(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [targetVerified, setTargetVerified] = useState<boolean>(true);

  // Info: (20260325 - Julian) Preview Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && esgId && accountBookId) {
      const fetchEsgRecord = async () => {
        setIsLoading(true);
        try {
          const res = await request<IApiResponse<IEsgRecord>>(
            `/api/v1/user/account_book/${accountBookId}/esg/${esgId}`,
          );
          if (res.payload) {
            setFormData(res.payload);
            setOriginalData(res.payload);
          }
        } catch (error) {
          console.error("Failed to fetch esg record:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchEsgRecord();
    }
  }, [isOpen, esgId, accountBookId]);

  const checkHasChanges = () => {
    if (!formData || !originalData) return false;
    return JSON.stringify(formData) !== JSON.stringify(originalData);
  };

  const handleAttemptClose = () => {
    if (checkHasChanges()) {
      setIsCloseModalOpen(true);
    } else {
      onClose();
    }
  };

  const handleAttemptSave = (isVerified: boolean) => {
    setTargetVerified(isVerified);
    setIsSaveModalOpen(true);
  };

  const handleUnverifyConfirmed = () => {
    if (formData) {
      onSave?.({ ...formData, isVerified: false });
    }
    setIsUnverifyModalOpen(false);
    onClose();
  };

  const handleSaveConfirmed = () => {
    if (formData) {
      onSave?.({ ...formData, isVerified: targetVerified });
    }
    setIsSaveModalOpen(false);
    onClose();
  };

  if (esgId && (!formData || isLoading)) {
    return (
      <Transition show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-100" onClose={() => {}}>
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          <div className="fixed inset-0 z-101 flex items-center justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          </div>
        </Dialog>
      </Transition>
    );
  }

  if (!formData) return null;

  const handleDateChange = (dateString: string) => {
    const timestamp = new Date(dateString).getTime() / 1000;
    if (!isNaN(timestamp)) {
      setFormData({ ...formData, dateTimestamp: timestamp });
    }
  };

  return (
    <>
      <Transition show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-100"
          onClose={handleAttemptClose}
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
          </TransitionChild>

          <div className="fixed inset-0 z-101 flex w-screen items-center justify-center p-4 sm:p-6">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <DialogPanel className="relative flex max-h-[90vh] w-full max-w-2xl transform flex-col rounded-2xl bg-[#F8FAFC] text-left shadow-2xl transition-all">
                {/* Info: (20260312 - Julian) Header */}
                <div className="flex items-start justify-between rounded-t-2xl border-b border-slate-200 bg-white px-4 py-4 sm:items-center sm:px-8 sm:py-5">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <DialogTitle
                      as="h3"
                      className="text-xl font-bold text-slate-800"
                    >
                      {t("esg_verify.title")}
                    </DialogTitle>
                    {/* Info: (20260324 - Julian) 顯示狀態 */}
                    {formData.isVerified ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-600">
                        {t("verify.status.verified")}
                      </span>
                    ) : (
                      <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
                        {t("verify.status.unverified")}
                      </span>
                    )}

                    {/* Info: (20260325 - Julian) 開啟憑證檔案預覽 */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600 transition-colors enabled:hover:bg-blue-100 enabled:hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
                      disabled={!formData.file?.hash}
                    >
                      {t("ocr.view_file")}
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={handleAttemptClose}
                    className="rounded-full bg-slate-100 p-2 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
                  >
                    <X size={20} className="stroke-[2.5]" />
                  </button>
                </div>

                {/* Info: (20260312 - Julian) Body */}
                <div className="flex overflow-hidden">
                  {/* Info: (20260312 - Julian) Right Side: Form */}
                  <div className="flex w-full flex-col p-4 sm:p-6">
                    <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                      <h4 className="text-base font-bold text-slate-500">
                        {t("verify.type.esg")}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <AiConfidence
                          confidence={formData.confidence}
                          note={formData.aiNote}
                        />
                      </div>
                    </div>

                    <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto">
                      {/* Info: (20260312 - Julian) Date */}
                      <div>
                        <label
                          htmlFor="dateTimestamp"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          {t("esg_verify.form.date")}
                        </label>
                        <input
                          id="dateTimestamp"
                          aria-label={t("esg_verify.form.date")}
                          type="date"
                          value={
                            new Date(formData.dateTimestamp * 1000)
                              .toISOString()
                              .split("T")[0]
                          }
                          onChange={(e) => handleDateChange(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      {/* Info: (20260312 - Julian) Scope */}
                      <div>
                        <label
                          htmlFor="scopeSelect"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          {t("esg_verify.form.scope")}
                        </label>
                        <select
                          id="scopeSelect"
                          aria-label={t("esg_verify.form.scope")}
                          value={formData.scope || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              scope: e.target.value as EsgScope,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value={EsgScope.SCOPE_1}>
                            {t("esg_verify.form.scope_1")}
                          </option>
                          <option value={EsgScope.SCOPE_2}>
                            {t("esg_verify.form.scope_2")}
                          </option>
                          <option value={EsgScope.SCOPE_3}>
                            {t("esg_verify.form.scope_3")}
                          </option>
                        </select>
                      </div>

                      {/* Info: (20260312 - Julian) Activity Type */}
                      <div className="col-span-2">
                        <label
                          htmlFor="activityType"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          {t("esg_verify.form.activity_type")}
                        </label>
                        <input
                          id="activityType"
                          aria-label={t("esg_verify.form.activity_type")}
                          type="text"
                          value={formData.activityType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              activityType: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      {/* Info: (20260312 - Julian) Vendor / Object */}
                      <div className="col-span-2">
                        <label
                          htmlFor="vendorInput"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          {t("esg_verify.form.vendor")}
                        </label>
                        <input
                          id="vendorInput"
                          aria-label={t("esg_verify.form.vendor")}
                          type="text"
                          value={formData.vendor}
                          onChange={(e) =>
                            setFormData({ ...formData, vendor: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                      {/* Info: (20260312 - Julian) Raw Activity Data */}
                      <div>
                        <label
                          htmlFor="rawActivityData"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          {t("esg_verify.form.raw_data")}
                        </label>
                        <input
                          id="rawActivityData"
                          aria-label={t("esg_verify.form.raw_data")}
                          type="text"
                          value={formData.rawActivityData}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rawActivityData: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      {/* Info: (20260312 - Julian) Unit */}
                      <div>
                        <label
                          htmlFor="unitInput"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          {t("esg_verify.form.unit")}
                        </label>
                        <input
                          id="unitInput"
                          aria-label={t("esg_verify.form.unit")}
                          type="text"
                          value={formData.unit}
                          onChange={(e) =>
                            setFormData({ ...formData, unit: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      {/* Info: (20260312 - Julian) Emissions */}
                      <div>
                        <label
                          htmlFor="emissionsInput"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          {t("esg_verify.form.emissions")}
                        </label>
                        <input
                          id="emissionsInput"
                          aria-label={t("esg_verify.form.emissions")}
                          type="text"
                          value={formData.emissions}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              emissions: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      {/* Info: (20260312 - Julian) Intensity */}
                      <div>
                        <label
                          htmlFor="intensitySelect"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          {t("esg_verify.form.intensity")}
                        </label>
                        <select
                          id="intensitySelect"
                          aria-label={t("esg_verify.form.intensity")}
                          value={formData.intensity || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intensity: e.target.value as EsgIntensity,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value={EsgIntensity.LOW}>
                            {t("esg_verify.form.intensity_low")}
                          </option>
                          <option value={EsgIntensity.MEDIUM}>
                            {t("esg_verify.form.intensity_medium")}
                          </option>
                          <option value={EsgIntensity.HIGH}>
                            {t("esg_verify.form.intensity_high")}
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* Info: (20260312 - Julian) Actions */}
                    <div className="mt-4 flex flex-col-reverse justify-end gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center">
                      {checkHasChanges() && (
                        <button
                          type="button"
                          onClick={() => setIsCancelModalOpen(true)}
                          className="mr-auto text-sm font-bold text-slate-500 transition-colors hover:text-slate-700 sm:m-0"
                        >
                          {t("esg_verify.actions.cancel_edit")}
                        </button>
                      )}
                      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:gap-3">
                        {originalData?.isVerified ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setIsUnverifyModalOpen(true)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-400 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-500 sm:flex-none sm:px-6 sm:py-2.5 sm:text-sm"
                            >
                              <X size={18} className="stroke-[2.5]" />
                              {t("verify.button.unverify")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAttemptSave(true)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-orange-600 sm:flex-none sm:px-6 sm:py-2.5 sm:text-sm"
                            >
                              <Save size={18} />
                              {t("esg_verify.actions.save_only")}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleAttemptSave(true)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-600 sm:flex-none sm:px-6 sm:py-2.5 sm:text-sm"
                            >
                              <CheckCircle2 size={18} />
                              {t("verify.button.verify")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAttemptSave(false)}
                              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-orange-600 sm:flex-none sm:px-6 sm:py-2.5 sm:text-sm"
                            >
                              <Save size={18} />
                              {t("esg_verify.actions.save_only")}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      {/* Info: (20260325 - Julian) 取消修改視窗 */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title={t("common.cancel_edit_title")}
        message={t("common.cancel_edit_message")}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={() => {
          setFormData(originalData);
          setIsCancelModalOpen(false);
        }}
      />

      {/* Info: (20260323 - Julian) 未儲存變更視窗 */}
      <ConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title={t("esg_verify.close_confirm.title")}
        message={t("esg_verify.close_confirm.message")}
        confirmText={t("esg_verify.close_confirm.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={() => {
          setIsCloseModalOpen(false);
          onClose();
        }}
      />

      {/* Info: (20260323 - Julian) 確認儲存視窗 */}
      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title={t("verify.verify_modal.title")}
        message={t("verify.verify_modal.message", {
          type: t("verify.type.esg"),
        })}
        confirmText={t("verify.verify_modal.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={handleSaveConfirmed}
      />

      {/* Info: (20260323 - Julian) 退回未核對視窗 */}
      <ConfirmModal
        isOpen={isUnverifyModalOpen}
        onClose={() => setIsUnverifyModalOpen(false)}
        title={t("verify.unverify_modal.title")}
        message={t("verify.unverify_modal.message", {
          type: t("verify.type.esg"),
        })}
        confirmText={t("verify.unverify_modal.confirm")}
        cancelText={t("common.cancel")}
        onConfirm={handleUnverifyConfirmed}
      />

      {/* Info: (20260325 - Julian) File Preview Modal */}
      <FilePreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        file={formData?.file}
        title={t("esg_verify.preview")}
      />
    </>
  );
}
