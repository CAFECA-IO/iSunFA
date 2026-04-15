"use client";

import { useState, useEffect } from "react";

import { X, CheckCircle2, Save } from "lucide-react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import ConfirmModal from "@/components/common/confirm_modal";
import { IEsgRecord, EsgScope, EsgIntensity } from "@/interfaces/esg";
import FilePreviewModal from "@/components/common/file_preview_modal";
import AiConfidence from "@/components/common/ai_confidence";
import { useTranslation } from "@/i18n/i18n_context";

interface IEsgDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  esgId: string | null;
  onSave?: (record: IEsgRecord) => void;
}

export default function EsgDetailModal({
  isOpen,
  onClose,
  esgId,
  onSave,
}: IEsgDetailModalProps) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [formData, setFormData] = useState<IEsgRecord | null>(null);
  const [originalData, setOriginalData] = useState<IEsgRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const handleAttemptSave = (isVerified: boolean) => {
    setTargetVerified(isVerified);
    setIsSaveModalOpen(true);
  };

  const executeSave = async (isVerifiedState: boolean) => {
    if (!formData) return;
    setIsLoading(true);
    try {
      const formPayload = { ...formData, isVerified: isVerifiedState };
      const res = await request<IApiResponse<IEsgRecord>>(
        `/api/v1/user/account_book/${accountBookId}/esg/${formData.id}`,
        {
          method: "PUT",
          body: JSON.stringify(formPayload),
        },
      );
      if (res.payload) {
        onSave?.(res.payload);
        onClose();
      }
    } catch (err) {
      console.error("Failed to update ESG record", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnverifyConfirmed = () => {
    setIsUnverifyModalOpen(false);
    executeSave(false);
  };

  const handleSaveConfirmed = () => {
    setIsSaveModalOpen(false);
    executeSave(targetVerified);
  };

  if (esgId && (!formData || isLoading)) {
    return (
      <div className="flex h-full min-h-[50vh] flex-col items-center justify-center p-10 text-slate-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (!formData) return null;

  const handleDateChange = (dateString: string) => {
    setFormData({ ...formData, tradingDate: dateString });
  };

  const EsgContent = (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Info: (20260312 - Julian) Header (Removed for embedded) */}

      {/* Info: (20260326 - Julian) Body */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-[10px]">
        <div className="flex shrink-0 flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h4 className="text-base font-bold text-slate-500">
              {t("verify.type.esg")}
            </h4>
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
          </div>
          <div className="ml-auto">
            <AiConfidence
              confidence={formData.confidence}
              note={formData.aiNote}
            />
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4 px-6 py-4">
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
              value={formData.tradingDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
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
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
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
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
            />
          </div>

          {/* Info: (20260312 - Julian) Vendor / Object */}
          <div className="col-span-2">
            <label
              htmlFor="vendorInput"
              className="mb-1.5 block text-sm font-bold text-slate-500"
            >
              {t("esg_verify.form.vendor")} /{" "}
              {t("esg_verify.form.activity_object")}
            </label>
            <input
              id="vendorInput"
              aria-label={
                t("esg_verify.form.vendor") +
                " / " +
                t("esg_verify.form.activity_object")
              }
              type="text"
              value={formData.vendor}
              onChange={(e) =>
                setFormData({ ...formData, vendor: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
            />
          </div>

          {/* Info: (20260320 - Julian) 碳排放與強度計算區域 */}
          <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="mb-4 text-sm font-bold text-slate-700">
              {t("esg_verify.emissions.title")}
            </h4>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2 lg:gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">
                  {t("esg_verify.emissions.raw_data")} /{" "}
                  {t("esg_verify.emissions.unit")}
                </label>
                <div className="flex gap-2">
                  <input
                    aria-label={t("esg_verify.emissions.raw_data")}
                    type="text"
                    value={formData.rawActivityData || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rawActivityData: e.target.value,
                      })
                    }
                    className="w-2/3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
                  />
                  <div className="relative w-1/3">
                    <input
                      aria-label={t("esg_verify.emissions.unit")}
                      type="text"
                      value={formData.unit || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          unit: e.target.value,
                        })
                      }
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500">
                  {t("esg_verify.emissions.total")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    aria-label={t("esg_verify.emissions.total")}
                    type="text"
                    value={formData.emissions || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emissions: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
                  />
                  <span className="text-xs font-bold whitespace-nowrap text-slate-500">
                    kg CO₂e
                  </span>
                </div>
              </div>
              <div className="col-span-1 lg:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-500">
                  {t("esg_verify.emissions.intensity")}
                </label>
                <select
                  aria-label={t("esg_verify.emissions.intensity")}
                  value={formData.intensity || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intensity: e.target.value as EsgIntensity,
                    })
                  }
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
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
              {/* Info: (20260406 - Luphia) 碳排放係數紀錄 */}
              {formData.coefficient && (
                <div className="col-span-1 mt-2 rounded-lg bg-orange-50 p-3 ring-1 ring-orange-100 ring-inset lg:col-span-2">
                  <div className="mb-1 text-[10px] font-bold text-orange-600">
                    {t("esg_verify.emissions.coefficient")}
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <div className="text-sm font-bold text-slate-700">
                      {formData.coefficient}
                    </div>
                    {formData.coefficientSource && (
                      <div className="text-xs font-medium text-slate-500">
                        ({formData.coefficientSource})
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Info: (20260312 - Julian) Note */}
          <div className="col-span-2">
            <label
              htmlFor="noteTextarea"
              className="mb-1.5 block text-sm font-bold text-slate-500"
            >
              {t("common.note")}
            </label>
            <textarea
              id="noteTextarea"
              aria-label={t("common.note")}
              value={formData.aiNote}
              onChange={(e) =>
                setFormData({ ...formData, aiNote: e.target.value })
              }
              rows={4}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-xs leading-relaxed text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none lg:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Info: (20260312 - Julian) Action Buttons */}
      <div className="flex shrink-0 flex-col-reverse justify-end gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-6">
        {checkHasChanges() && (
          <button
            type="button"
            onClick={() => setIsCancelModalOpen(true)}
            className="mr-auto text-sm font-bold text-slate-500 transition-colors hover:text-slate-700"
          >
            {t("common.cancel_edit_title")}
          </button>
        )}
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:gap-3">
          {formData.isVerified ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setIsUnverifyModalOpen(true)}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-red-400 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[120px] sm:flex-none sm:px-6 sm:text-sm"
            >
              <X size={16} className="stroke-[2.5]" />
              {t("verify.button.unverify")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAttemptSave(true)}
              disabled={isLoading}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[120px] sm:flex-none sm:px-6 sm:text-sm"
            >
              <CheckCircle2 size={16} className="stroke-[2.5]" />
              {t("verify.button.verify")}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleAttemptSave(formData.isVerified)}
            disabled={isLoading}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:min-w-[120px] sm:flex-none sm:px-6 sm:text-sm"
          >
            <Save size={16} className="stroke-[2.5]" />
            {t("voucher.detail_modal.actions.save_only")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {EsgContent}
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
      {/* Info: (20260325 - Julian) 取消修改視窗 */}

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
