"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cloud, Loader2, FileSpreadsheet, Sparkles, CircleAlert, Zap, } from "lucide-react";
import { IEsgDashboardSummary } from "@/interfaces/esg";
import { useParams, usePathname } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { useTranslation } from "@/i18n/i18n_context";

interface IEsgSummaryProps {
  year?: number;
  month?: number | "";
}

export default function EsgSummary({ year, month }: IEsgSummaryProps) {
  const params = useParams();
  const pathname = usePathname();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [summaryData, setSummaryData] = useState<IEsgDashboardSummary | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Info: (20260312 - Julian) 連接到 Journal
  const journalLink = pathname.replace("esg", "journal");

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          setIsLoading(true);
          const res = await request<IApiResponse<IEsgDashboardSummary>>(
            `/api/v1/user/account_book/${accountBookId}/esg/summary`
          );
          if (res.payload) {
            setSummaryData(res.payload);
          }
        } catch (error) {
          console.error("Failed to fetch ESG summary:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSummary();
    } else {
      setIsLoading(false);
    }
  }, [accountBookId, year, month]);

  if (isLoading) {
    return (
      <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Loader2 className="size-6 shrink-0 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
        <Cloud className="mb-2 size-8 shrink-0 text-slate-300" />
        <span className="text-sm font-bold">
          {t("esg_summary.no_data_prefix")}
          <Link
            href={journalLink}
            className="mx-1 text-blue-600 hover:underline"
          >
            {t("esg_summary.upload_link")}
          </Link>
          {t("esg_summary.no_data_suffix")}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
      {/* Info: (20260410 - Julian) 今日產生碳排 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-blue-500 lg:px-4">
          <FileSpreadsheet size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-[10px] font-bold text-slate-700 sm:text-sm">
            {t("今日產生碳排紀錄")}
          </p>
          <p className="text-base font-bold text-black sm:text-lg">
            <span>{summaryData.todayEsgRecordCount}</span>{" "}
            {t("筆")}
          </p>
        </div>
      </div>

      {/* Info: (20260410 - Julian) 平均 DQI 評分 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-emerald-500 lg:px-4">
          <Sparkles size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-[10px] font-bold text-slate-700 sm:text-sm">
            {t("平均 DQI 評分")}
          </p>
          <p className="text-base font-bold text-black sm:text-lg">
            <span>{summaryData.dqiAverage.toFixed(1)}</span>
          </p>
        </div>
      </div>

      {/* Info: (20260410 - Julian) 待核對 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-orange-500 lg:px-4">
          <CircleAlert size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-[10px] font-bold text-slate-700 sm:text-sm">
            {t("待核對")}
          </p>
          <p className="text-base font-bold text-amber-500 sm:text-lg">
            <span>{summaryData.pendingEsgRecordCount}</span>{" "}
            {t("筆")}
          </p>
        </div>
      </div>

      {/* Info: (20260410 - Julian) AI 平均信心度 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-purple-500 lg:px-4">
          <Zap size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-[10px] font-bold text-slate-700 sm:text-sm">
            {t("AI 平均信心度")}
          </p>
          <p className="text-base font-bold text-black sm:text-lg">
            <span>{summaryData.aiAverageConfidence.toFixed(1)}</span> % 
          </p>
        </div>
      </div>
    </div>
  );
}
