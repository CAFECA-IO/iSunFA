"use client";

import { useState, useEffect } from "react";
import {
  Cloud,
  Loader2,
  FileSpreadsheet,
  CircleAlert,
  Zap,
} from "lucide-react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IJournalDashboardSummary } from "@/interfaces/journal";
import { useTranslation } from "@/i18n/i18n_context";

export default function JournalSummary() {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [summaryData, setSummaryData] =
    useState<IJournalDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          setIsLoading(true);
          const res = await request<IApiResponse<IJournalDashboardSummary>>(
            `/api/v1/user/account_book/${accountBookId}/journal/summary`,
          );
          if (res.payload) {
            setSummaryData(res.payload);
          }
        } catch (error) {
          console.error("Failed to fetch journal summary:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSummary();
    } else {
      setIsLoading(false);
    }
  }, [accountBookId]);

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
        <span className="text-sm font-bold">{t("journal.summary.empty")}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-4">
      {/* Info: (20260324 - Julian) 今日產生日記帳 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-blue-500 lg:px-4">
          <FileSpreadsheet size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-[10px] font-bold text-slate-700 sm:text-sm">
            {t("journal.summary.today_count")}
          </p>
          <p className="text-base font-bold text-black sm:text-lg">
            <span>{summaryData.todayJournalCount}</span>{" "}
            {t("journal.summary.unit")}
          </p>
        </div>
      </div>

      {/* Info: (20260324 - Julian) 待核對 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-orange-500 lg:px-4">
          <CircleAlert size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-[10px] font-bold text-slate-700 sm:text-sm">
            {t("journal.summary.pending")}
          </p>
          <p className="text-base font-bold text-amber-500 sm:text-lg">
            <span>{summaryData.pendingJournalCount}</span>{" "}
            {t("journal.summary.unit")}
          </p>
        </div>
      </div>

      {/* Info: (20260324 - Julian) AI 平均信心度 */}
      <div className="col-span-2 flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:col-span-1 lg:p-4">
        <div className="shrink-0 px-2 text-purple-500 lg:px-4">
          <Zap size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-[10px] font-bold text-slate-700 sm:text-sm">
            {t("journal.summary.ai_confidence")}
          </p>
          <p className="text-base font-bold text-black sm:text-lg">
            <span>{summaryData.aiAverageConfidence.toFixed(1)}</span> %
          </p>
        </div>
      </div>
    </div>
  );
}
