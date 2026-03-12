"use client";

import { Fragment, useState, useEffect } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, CheckCircle2 } from "lucide-react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import ConfirmModal from "@/components/common/confirm_modal";
import {
  IEsgRecord,
  EsgScope,
  EsgStatus,
  EsgIntensity,
} from "@/interfaces/esg";
import { FilePreview } from "@/components/common/file_preview";

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

  const [formData, setFormData] = useState<IEsgRecord | null>(null);
  const [originalData, setOriginalData] = useState<IEsgRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);

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

  const handleAttemptSave = () => {
    setIsSaveModalOpen(true);
  };

  const handleSaveConfirmed = () => {
    if (formData) {
      // Info: (20260312 - Julian) Upon saving, the status becomes 'verified'
      onSave?.({ ...formData, status: EsgStatus.VERIFIED });
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
    const timestamp = new Date(dateString).getTime();
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
              <DialogPanel className="relative flex max-h-[90vh] w-full max-w-5xl transform flex-col rounded-2xl bg-[#F8FAFC] text-left shadow-2xl transition-all">
                {/* Info: (20260312 - Julian) Header */}
                <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-200 bg-white px-8 py-5">
                  <DialogTitle
                    as="h3"
                    className="text-xl font-bold text-slate-800"
                  >
                    人工核對碳排紀錄
                  </DialogTitle>
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
                <div className="flex w-full overflow-y-auto">
                  {/* Info: (20260312 - Julian) Left Side: File Preview */}
                  <div className="w-1/2 border-r border-slate-200 bg-slate-50 p-8">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-500">
                        憑證預覽
                      </h4>
                      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                        <span className="text-xs font-bold text-slate-500">
                          AI 信心度
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={`h-full rounded-full ${
                                formData.confidence >= 90
                                  ? "bg-emerald-400"
                                  : "bg-orange-500"
                              }`}
                              style={{ width: `${formData.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-black text-slate-700">
                            {formData.confidence}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      {formData.file ? (
                        <FilePreview
                          file={{
                            filename: formData.file.fileName || "Unknown",
                          }}
                          fileId={formData.file.hash}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-400">
                          無圖檔可預覽
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info: (20260312 - Julian) Right Side: Form */}
                  <div className="flex w-1/2 flex-col p-8">
                    <div className="grid flex-1 grid-cols-2 gap-4 space-y-5">
                      {/* Info: (20260312 - Julian) Date */}
                      <div>
                        <label
                          htmlFor="dateTimestamp"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          日期
                        </label>
                        <input
                          id="dateTimestamp"
                          aria-label="日期"
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
                          排放範疇
                        </label>
                        <select
                          id="scopeSelect"
                          aria-label="排放範疇"
                          value={formData.scope}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              scope: e.target.value as EsgScope,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value={EsgScope.SCOPE_1}>
                            範疇一 (直接排放)
                          </option>
                          <option value={EsgScope.SCOPE_2}>
                            範疇二 (能源間接排放)
                          </option>
                          <option value={EsgScope.SCOPE_3}>
                            範疇三 (其他間接排放)
                          </option>
                        </select>
                      </div>

                      {/* Info: (20260312 - Julian) Activity Type */}
                      <div className="col-span-2">
                        <label
                          htmlFor="activityType"
                          className="mb-1.5 block text-sm font-bold text-slate-500"
                        >
                          活動類型
                        </label>
                        <input
                          id="activityType"
                          aria-label="活動類型"
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
                          供應商名稱 / 排放對象
                        </label>
                        <input
                          id="vendorInput"
                          aria-label="供應商名稱 / 排放對象"
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
                          原始活動數據
                        </label>
                        <input
                          id="rawActivityData"
                          aria-label="原始活動數據"
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
                          單位
                        </label>
                        <input
                          id="unitInput"
                          aria-label="單位"
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
                          計算排放量 (kgCO2e)
                        </label>
                        <input
                          id="emissionsInput"
                          aria-label="計算排放量"
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
                          排放強度分級
                        </label>
                        <select
                          id="intensitySelect"
                          aria-label="排放強度分級"
                          value={formData.intensity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intensity: e.target.value as EsgIntensity,
                            })
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value={EsgIntensity.LOW}>低強度</option>
                          <option value={EsgIntensity.MEDIUM}>中強度</option>
                          <option value={EsgIntensity.HIGH}>高強度</option>
                        </select>
                      </div>
                    </div>

                    {/* Info: (20260312 - Julian) Actions */}
                    <div className="mt-8 flex justify-end gap-3 border-t border-slate-200 pt-6">
                      <button
                        type="button"
                        onClick={handleAttemptClose}
                        className="rounded-lg border border-slate-300 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleAttemptSave}
                        className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-orange-600"
                      >
                        <CheckCircle2 size={18} />
                        儲存並完成核對
                      </button>
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
      <ConfirmModal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="確認關閉？"
        message="您的變更尚未儲存，確認離開將會失去所有變更。確認要關閉嗎？"
        confirmText="確認離開"
        cancelText="取消"
        onConfirm={() => {
          setIsCloseModalOpen(false);
          onClose();
        }}
      />
      <ConfirmModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        title="確認儲存？"
        message="即將儲存您所做出的 ESG 紀錄核對變更。請確認資料是否無誤？"
        confirmText="確認儲存"
        cancelText="取消"
        onConfirm={handleSaveConfirmed}
      />
    </>
  );
}
