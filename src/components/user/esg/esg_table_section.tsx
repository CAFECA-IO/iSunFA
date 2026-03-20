"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Info, ArrowDown, ArrowUp } from "lucide-react";
import { IEsgRecord, EsgScope, EsgIntensity } from "@/interfaces/esg";
import { EsgRow } from "@/components/user/esg/esg_row";
import EsgVerifyModal from "@/components/user/esg/esg_verify_modal";
import { request } from "@/lib/utils/request";
import { useParams } from "next/navigation";
import { IApiResponse } from "@/lib/utils/response";
import { useTranslation } from "@/i18n/i18n_context";

export default function EsgTableSection() {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [intensityFilter, setIntensityFilter] = useState<string>("ALL");
  const [scopeFilter, setScopeFilter] = useState<string>("ALL");
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [selectedEsgId, setSelectedEsgId] = useState<string | null>(null);
  const [records, setRecords] = useState<IEsgRecord[]>([]);
  const [recordCount, setRecordCount] = useState<number>(0);
  const [dateSort, setDateSort] = useState<"desc" | "asc">("desc");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchRecords = useCallback(async () => {
    if (!accountBookId) return;
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append("search", searchTerm);
      if (intensityFilter && intensityFilter !== "ALL")
        queryParams.append("intensity", intensityFilter);
      if (scopeFilter && scopeFilter !== "ALL")
        queryParams.append("scope", scopeFilter);
      queryParams.append("sort", dateSort);

      const queryString = queryParams.toString()
        ? `?${queryParams.toString()}`
        : "";

      const res = await request<
        IApiResponse<{ esgRecords: IEsgRecord[]; recordCount: number }>
      >(`/api/v1/user/account_book/${accountBookId}/esg${queryString}`);
      if (res.payload) {
        setRecords(res.payload.esgRecords);
        setRecordCount(res.payload.recordCount);
      }
    } catch (error) {
      console.error("Failed to fetch ESG records:", error);
    } finally {
      setIsLoading(false);
    }
  }, [accountBookId, searchTerm, intensityFilter, scopeFilter, dateSort]);

  // Info: (20260312 - Julian) 延遲 300ms 執行，避免過度請求
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRecords]);

  // Info: (20260320 - Assistant) 若目前列表有 PENDING 或 PROCESSING 的狀態，開啟輪詢
  useEffect(() => {
    const hasPendingTasks = records.some(
      (r) =>
        r.analysisStatus === "PENDING" || r.analysisStatus === "PROCESSING",
    );

    if (!hasPendingTasks) return;

    // Info: (20260320 - Assistant) 每 5 秒重新抓取一次最新狀態
    const intervalId = setInterval(() => {
      fetchRecords();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [records, fetchRecords]);

  const handleVerifyOpen = (record: IEsgRecord) => {
    setSelectedEsgId(record.id);
    setIsVerifyModalOpen(true);
  };

  const handleVerifySave = async (updatedRecord: IEsgRecord) => {
    try {
      if (accountBookId && updatedRecord.id) {
        const res = await request<IApiResponse<IEsgRecord>>(
          `/api/v1/user/account_book/${accountBookId}/esg/${updatedRecord.id}`,
          {
            method: "PUT",
            body: JSON.stringify(updatedRecord),
          },
        );
        if (res.payload) {
          // Info: (20260312 - Julian) Refresh local state list
          await fetchRecords();
        }
      }
    } catch (err) {
      console.error("Failed to update ESG record", err);
    } finally {
      setIsVerifyModalOpen(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Info: (20260312 - Julian) Toolbar */}
      <div className="flex flex-col items-center justify-between gap-2 border-b border-slate-200 p-4 lg:flex-row">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("esg_table.search_placeholder")}
            aria-label={t("esg_table.search_aria")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-orange-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs lg:text-sm">
          <select
            aria-label={t("esg_table.filter_intensity_aria")}
            value={intensityFilter}
            onChange={(e) => setIntensityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-bold text-slate-600 focus:outline-none"
          >
            <option value="ALL">{t("esg_table.filter_intensity_all")}</option>
            <option value={EsgIntensity.HIGH}>
              {t("esg_table.intensity.high")}
            </option>
            <option value={EsgIntensity.MEDIUM}>
              {t("esg_table.intensity.medium")}
            </option>
            <option value={EsgIntensity.LOW}>
              {t("esg_table.intensity.low")}
            </option>
          </select>
          <select
            aria-label={t("esg_table.filter_scope_aria")}
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-bold text-slate-600 focus:outline-none"
          >
            <option value="ALL">{t("esg_table.filter_scope_all")}</option>
            <option value={EsgScope.SCOPE_1}>
              {t("esg_table.scope.scope_1")}
            </option>
            <option value={EsgScope.SCOPE_2}>
              {t("esg_table.scope.scope_2")}
            </option>
            <option value={EsgScope.SCOPE_3}>
              {t("esg_table.scope.scope_3")}
            </option>
          </select>
          <button
            type="button"
            aria-label={t("esg_table.sort_date_aria")}
            onClick={() => setDateSort(dateSort === "desc" ? "asc" : "desc")}
            className="flex items-center rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            {dateSort === "desc"
              ? t("esg_table.sort_newest")
              : t("esg_table.sort_oldest")}
            {dateSort === "desc" ? (
              <ArrowDown className="ml-1 h-4 w-4" />
            ) : (
              <ArrowUp className="ml-1 h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            aria-label={t("esg_table.filter_btn")}
            onClick={fetchRecords}
            className="flex items-center rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Filter className="mr-2 h-4 w-4" />
            {t("esg_table.filter_btn")}
          </button>
        </div>
      </div>

      {/* Info: (20260312 - Julian) Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70">
              <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                {t("esg_table.header.voucher")}
              </th>
              <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                {t("esg_table.header.date")}
              </th>
              <th className="p-2 text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                {t("esg_table.header.activity_target")}
              </th>
              <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                {t("esg_table.header.raw_data")}
              </th>
              <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                {t("esg_table.header.emissions")}
              </th>
              <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                {t("esg_table.header.intensity_label")}
              </th>
              <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                {t("esg_table.header.ai_confidence")}
              </th>
              <th className="p-2 text-center text-xs font-black tracking-wider text-slate-500 uppercase lg:px-6 lg:py-4">
                {t("esg_table.header.status")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-2 text-center text-sm font-bold text-slate-500 lg:px-6 lg:py-4"
                >
                  {t("esg_table.loading")}
                </td>
              </tr>
            ) : records.length > 0 ? (
              records.map((record) => (
                <EsgRow
                  key={record.id}
                  record={record}
                  onVerifyClick={handleVerifyOpen}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="p-2 text-center text-sm font-bold text-slate-500 lg:px-6 lg:py-4"
                >
                  {t("esg_table.no_records")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info: (20260312 - Julian) Footer */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/50 px-4 py-3 lg:flex-row">
        <span className="text-xs font-bold text-slate-500">
          {t("esg_table.footer.record_count", { count: recordCount })}
        </span>
        <span className="flex items-center text-xs font-bold text-slate-500">
          <Info className="mr-1 h-3.5 w-3.5" />
          {t("esg_table.footer.data_citation")}
        </span>
      </div>

      <EsgVerifyModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        esgId={selectedEsgId}
        onSave={handleVerifySave}
      />
    </div>
  );
}
