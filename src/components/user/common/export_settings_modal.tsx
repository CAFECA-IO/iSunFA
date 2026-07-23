"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { X, Info, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import DateRangePicker from "@/components/common/date_range_picker";

enum ExportType {
  VOUCHER = "voucher",
  ESG = "esg",
}

interface IExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountBookId: string;
  type: ExportType;
}

export default function ExportSettingsModal({
  isOpen,
  onClose,
  accountBookId,
  type,
}: IExportSettingsModalProps) {
  const { t } = useTranslation();

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [includeUnverified, setIncludeUnverified] = useState<boolean>(false);
  const [count, setCount] = useState<number>(0);
  const [isCounting, setIsCounting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Info: (20260617 - Julian) 計算中 / 匯出中 / 筆數為 0 則無法提交
  const isSubmitDisabled = isCounting || isExporting || count === 0;

  // Info: (20260617 - Julian) 依所選時間區間及核對狀態篩選，向後端查詢符合條件的總筆數，未選擇區間則顯示全部
  const fetchCount = useCallback(async () => {
    if (!accountBookId || !isOpen) return;

    setIsCounting(true);
    try {
      const searchParams = new URLSearchParams();

      if (startDate) {
        const [sy, sm, sd] = startDate.split("-").map(Number);
        const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
        searchParams.append("startDate", start.toISOString());
      }

      if (endDate) {
        const [ey, em, ed] = endDate.split("-").map(Number);
        const end = new Date(ey, em - 1, ed, 23, 59, 59, 999);
        searchParams.append("endDate", end.toISOString());
      }

      if (includeUnverified) {
        searchParams.append("includeUnverified", "true");
      }

      const endpoint =
        type === ExportType.VOUCHER
          ? `/api/v1/user/account_book/${accountBookId}/voucher/export/count?${searchParams.toString()}`
          : `/api/v1/user/account_book/${accountBookId}/esg/export/count?${searchParams.toString()}`;

      const res = await request<IApiResponse<{ count: number }>>(endpoint);
      if (res.payload) {
        setCount(res.payload.count);
      }
    } catch (error) {
      console.error(`Failed to fetch export ${type} count:`, error);
    } finally {
      setIsCounting(false);
    }
  }, [accountBookId, isOpen, startDate, endDate, type, includeUnverified]);

  // Info: (20260617 - Julian) 當時間區間或核對狀態篩選改變，重新計算總數
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Info: (20260617 - Julian) 執行匯出 CSV，呼叫後端 API 取得 CSV 並下載
  const handleExport = async () => {
    if (!accountBookId || count === 0) return;
    setIsExporting(true);
    try {
      const searchParams = new URLSearchParams();
      if (startDate) {
        const [y, m, d] = startDate.split("-").map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        searchParams.append("startDate", start.toISOString());
      }
      if (endDate) {
        const [y, m, d] = endDate.split("-").map(Number);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        searchParams.append("endDate", end.toISOString());
      }
      if (includeUnverified) {
        searchParams.append("includeUnverified", "true");
      }

      const endpoint =
        type === ExportType.VOUCHER
          ? `/api/v1/user/account_book/${accountBookId}/voucher/export?${searchParams.toString()}`
          : `/api/v1/user/account_book/${accountBookId}/esg/export?${searchParams.toString()}`;

      const token =
        typeof window !== "undefined" ? localStorage.getItem("dewt") : null;

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const dateSuffix = new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "");
      const fileName =
        type === ExportType.VOUCHER
          ? `vouchers_${dateSuffix}.csv`
          : `esg_records_${dateSuffix}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onClose();
    } catch (error) {
      console.error(`Failed to export ${type}:`, error);
      alert(
        type === ExportType.VOUCHER
          ? t("common.export_settings.failed_voucher")
          : t("common.export_settings.failed_esg"),
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Info: (20260617 - Julian) 依據類型顯示不同 UI 語系或字句
  const titleText =
    type === ExportType.VOUCHER
      ? t("common.export_settings.title_voucher")
      : t("common.export_settings.title_esg");

  const descriptionText =
    type === ExportType.VOUCHER
      ? t("common.export_settings.desc_voucher")
      : t("common.export_settings.desc_esg");

  const statText =
    type === ExportType.VOUCHER
      ? t("common.export_settings.stat_title_voucher")
      : t("common.export_settings.stat_title_esg");
  const statUnit =
    type === ExportType.VOUCHER
      ? t("common.export_settings.unit_voucher")
      : t("common.export_settings.unit_esg");

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-300" onClose={onClose}>
        {/* Info: (20260617 - Julian) 背景遮罩及毛玻璃效果 */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" />
        </TransitionChild>

        <div className="fixed inset-0 z-301 w-screen overflow-y-auto">
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
              <DialogPanel className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-2xl transition-all">
                {/* Info: (20260617 - Julian) 關閉按鈕 */}
                <div className="absolute top-4 right-4">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="size-5 shrink-0" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Info: (20260617 - Julian) 標題 */}
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-orange-500/10 p-2 text-orange-600">
                      <Download className="size-5 shrink-0" />
                    </div>
                    <DialogTitle
                      as="h3"
                      className="text-lg leading-6 font-bold text-slate-800"
                    >
                      {titleText}
                    </DialogTitle>
                  </div>

                  {/* Info: (20260617 - Julian) 時間區間選擇 */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-black tracking-wider text-slate-500 uppercase">
                      {t("common.export_settings.select_range")}
                    </span>
                    <DateRangePicker
                      startDate={startDate}
                      endDate={endDate}
                      setStartDate={setStartDate}
                      setEndDate={setEndDate}
                      className="flex w-full items-center justify-between gap-2 text-slate-400"
                    />
                  </div>

                  {/* Info: (20260617 - Julian) 選擇是否包含未核對資料 */}
                  <div className="group flex items-center gap-2">
                    <input
                      id="include-unverified-checkbox"
                      type="checkbox"
                      checked={includeUnverified}
                      onChange={(e) => setIncludeUnverified(e.target.checked)}
                      className="flex size-4 cursor-pointer appearance-none items-center justify-center rounded border border-orange-500 bg-white group-hover:bg-orange-100 checked:bg-orange-500 checked:after:font-[system-ui] checked:after:text-sm checked:after:font-black checked:after:text-white checked:after:content-['✓']"
                    />
                    <label
                      htmlFor="include-unverified-checkbox"
                      className="cursor-pointer text-sm font-bold text-slate-700 select-none"
                    >
                      {type === ExportType.VOUCHER
                        ? t("common.export_settings.include_unverified_voucher")
                        : t("common.export_settings.include_unverified_esg")}
                    </label>
                  </div>

                  {/* Info: (20260617 - Julian) 傳票數/紀錄數統計 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="size-5 shrink-0 text-orange-600" />
                      <p className="text-sm font-black tracking-wider text-slate-700">
                        {statText}
                      </p>
                    </div>
                    <div className="flex items-center">
                      {isCounting ? (
                        <Loader2 className="size-6 shrink-0 animate-spin text-orange-500" />
                      ) : (
                        <span className="font-mono text-2xl font-black text-orange-600">
                          {count}
                          <span className="ml-1 font-sans text-xs font-bold text-slate-500">
                            {statUnit}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info: (20260617 - Julian) 說明區塊 */}
                  <div className="flex gap-3 rounded-xl border border-orange-100 bg-linear-to-br from-orange-50/70 to-amber-50/40 p-4 text-slate-700">
                    <Info className="mt-0.5 size-5 shrink-0 text-orange-500" />
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs leading-relaxed text-orange-900">
                        {descriptionText}
                      </span>
                    </div>
                  </div>

                  {/* Info: (20260617 - Julian) 按鈕列 */}
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 active:scale-95"
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitDisabled}
                      onClick={handleExport}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="size-4 shrink-0 animate-spin" />
                          <span>{t("common.export_settings.exporting")}</span>
                        </>
                      ) : (
                        <>
                          <Download className="size-4 shrink-0" />
                          <span>
                            {t("common.export_settings.start_export")}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
