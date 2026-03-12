"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Info,
  CheckCircle2,
  Zap,
  Truck,
  Cloud,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import {
  IEsgRecord,
  EsgScope,
  EsgIntensity,
  EsgStatus,
} from "@/interfaces/esg";
import { FilePreview } from "@/components/common/file_preview";
import EsgVerifyModal from "@/components/user/esg/esg_verify_modal";
import { request } from "@/lib/utils/request";
import { useParams } from "next/navigation";
import { IApiResponse } from "@/lib/utils/response";
import { useTranslation } from "@/i18n/i18n_context";

const EsgRow = ({
  record,
  onVerifyClick,
}: {
  record: IEsgRecord;
  onVerifyClick: (record: IEsgRecord) => void;
}) => {
  const { t } = useTranslation();

  const handleVerifyClick = () => {
    onVerifyClick(record);
  };

  const renderIntensity = (intensity: EsgIntensity) => {
    switch (intensity) {
      case EsgIntensity.HIGH:
        return {
          text: t("esg_table.intensity.high"),
          style: "border-red-300 bg-red-100 text-red-600",
        };
      case EsgIntensity.MEDIUM:
        return {
          text: t("esg_table.intensity.medium"),
          style: "border-amber-300 bg-amber-100 text-amber-600",
        };
      case EsgIntensity.LOW:
        return {
          text: t("esg_table.intensity.low"),
          style: "border-green-300 bg-green-100 text-green-600",
        };
      default:
        return {
          text: "",
          style: "",
        };
    }
  };

  const renderScope = (scope: EsgScope) => {
    switch (scope) {
      case EsgScope.SCOPE_1:
        return {
          text: t("esg_table.scope.scope_1"),
          icon: <Zap className="mr-1.5 h-4 w-4 text-amber-500" />,
        };
      case EsgScope.SCOPE_2:
        return {
          text: t("esg_table.scope.scope_2"),
          icon: <Truck className="mr-1.5 h-4 w-4 text-blue-500" />,
        };
      case EsgScope.SCOPE_3:
        return {
          text: t("esg_table.scope.scope_3"),
          icon: <Cloud className="mr-1.5 h-4 w-4 text-green-500" />,
        };
      default:
        return {
          text: "",
          icon: null,
        };
    }
  };

  return (
    <tr>
      <td className="px-6 py-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50 p-1 sm:h-20 sm:w-20">
          {/* Info: (20260312 - Julian) File Preview */}
          {record.file ? (
            <FilePreview
              file={{ filename: record.file.fileName || "Unknown" }}
              fileId={record.file.hash}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center bg-gray-50 p-1 sm:h-20 sm:w-20">
              <span className="text-xs font-bold text-slate-500">{t("esg_table.no_file")}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4 text-center text-sm font-bold whitespace-nowrap text-slate-800">
        {timestampToString(record.dateTimestamp).dateWithDash}
      </td>
      <td className="px-6 py-4">
        <div className="mb-1 flex items-center text-sm font-bold text-slate-800">
          <div className="shrink-0">{renderScope(record.scope).icon}</div>
          {renderScope(record.scope).text}：{record.activityType}
        </div>
        <div className="text-xs font-medium text-slate-500">
          {record.vendor}
        </div>
      </td>
      <td className="px-6 py-4 text-center whitespace-nowrap">
        <span className="text-[15px] font-bold text-slate-800">
          {record.rawActivityData}{" "}
        </span>
        <span className="text-xs font-bold text-slate-500">{record.unit}</span>
      </td>
      <td className="px-6 py-4 text-center text-[15px] font-bold whitespace-nowrap text-slate-800">
        {record.emissions}
      </td>
      <td className="px-6 py-4 text-center">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors ${renderIntensity(record.intensity).style}`}
        >
          {renderIntensity(record.intensity).text}
        </span>
      </td>
      <td aria-label="準確度" className="px-6 py-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${record.confidence >= 90 ? "bg-emerald-400" : "bg-orange-500"}`}
              style={{ width: `${record.confidence}%` }}
            ></div>
          </div>
          <span className="text-sm font-black whitespace-nowrap text-slate-700">
            {record.confidence}%
          </span>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        {record.status === EsgStatus.VERIFIED ? (
          <div className="flex flex-col items-center justify-center gap-1 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-bold">{t("esg_table.verified")}</span>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              type="button"
              aria-label={t("esg_table.manual_verify")}
              onClick={handleVerifyClick}
              className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-4 py-1.5 text-sm font-bold whitespace-nowrap text-white shadow-sm hover:bg-orange-600"
            >
              {t("esg_table.manual_verify")}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default function EsgTableSection() {
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
  const { t } = useTranslation();

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
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
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
        <div className="flex items-center gap-3">
          <select
            aria-label={t("esg_table.filter_intensity_aria")}
            value={intensityFilter}
            onChange={(e) => setIntensityFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 focus:outline-none"
          >
            <option value="ALL">{t("esg_table.filter_intensity_all")}</option>
            <option value={EsgIntensity.HIGH}>{t("esg_table.intensity.high")}</option>
            <option value={EsgIntensity.MEDIUM}>{t("esg_table.intensity.medium")}</option>
            <option value={EsgIntensity.LOW}>{t("esg_table.intensity.low")}</option>
          </select>
          <select
            aria-label={t("esg_table.filter_scope_aria")}
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-600 focus:outline-none"
          >
            <option value="ALL">{t("esg_table.filter_scope_all")}</option>
            <option value={EsgScope.SCOPE_1}>{t("esg_table.scope.scope_1")}</option>
            <option value={EsgScope.SCOPE_2}>{t("esg_table.scope.scope_2")}</option>
            <option value={EsgScope.SCOPE_3}>{t("esg_table.scope.scope_3")}</option>
          </select>
          <button
            type="button"
            aria-label={t("esg_table.sort_date_aria")}
            onClick={() => setDateSort(dateSort === "desc" ? "asc" : "desc")}
            className="flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
          >
            {dateSort === "desc" ? t("esg_table.sort_newest") : t("esg_table.sort_oldest")}
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
            className="flex items-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
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
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                {t("esg_table.header.voucher")}
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                {t("esg_table.header.date")}
              </th>
              <th className="px-6 py-4 text-xs font-black tracking-wider text-slate-500 uppercase">
                {t("esg_table.header.activity_target")}
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                {t("esg_table.header.raw_data")}
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                {t("esg_table.header.emissions")}
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                {t("esg_table.header.intensity_label")}
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                {t("esg_table.header.ai_confidence")}
              </th>
              <th className="px-6 py-4 text-center text-xs font-black tracking-wider text-slate-500 uppercase">
                {t("esg_table.header.status")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-4 text-center text-sm font-bold text-slate-500"
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
                  className="px-6 py-4 text-center text-sm font-bold text-slate-500"
                >
                  {t("esg_table.no_records")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Info: (20260312 - Julian) Footer */}
      <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/50 px-4 py-3">
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
