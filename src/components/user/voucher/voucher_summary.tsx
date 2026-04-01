"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cloud,
  Loader2,
  FileSpreadsheet,
  CircleDollarSign,
  CircleAlert,
  Zap,
} from "lucide-react";
import { useParams } from "next/navigation";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { IVoucherDashboardSummary } from "@/interfaces/voucher";
import { useTranslation } from "@/i18n/i18n_context";
import { numberWithCommas } from "@/lib/utils/common";

export default function VoucherSummary() {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [summaryData, setSummaryData] =
    useState<IVoucherDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Info: (20260316 - Julian) 新增傳票
  const createVoucher = async () => {
    // ToDo: (20260316 - Julian) 建立傳票邏輯
  };

  useEffect(() => {
    if (accountBookId) {
      const fetchSummary = async () => {
        try {
          setIsLoading(true);
          const res = await request<IApiResponse<IVoucherDashboardSummary>>(
            `/api/v1/user/account_book/${accountBookId}/voucher/summary`,
          );
          if (res.payload) {
            setSummaryData(res.payload);
          }
        } catch (error) {
          console.error("Failed to fetch voucher summary:", error);
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
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="flex h-72 w-full flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
        <Cloud className="mb-2 h-8 w-8 text-slate-300" />
        <span className="text-sm font-bold">
          {t("voucher.summary.empty_prefix")}
          <Link
            href="#"
            onClick={createVoucher}
            className="mx-1 text-blue-600 hover:underline"
          >
            {t("voucher.summary.empty_link")}
          </Link>
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      {/* Info: (20260316 - Julian) 今日產生傳票 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-blue-500 lg:px-4">
          <FileSpreadsheet size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-sm font-bold text-slate-700">
            {t("voucher.summary.today_count")}
          </p>
          <p className="text-lg font-bold text-black">
            <span>{summaryData.todayVoucherCount}</span>{" "}
            {t("voucher.summary.unit")}
          </p>
        </div>
      </div>

      {/* Info: (20260316 - Julian) 本月累計金額 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-green-500 lg:px-4">
          <CircleDollarSign size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-sm font-bold text-slate-700">
            {t("voucher.summary.month_total")}
          </p>
          <p className="text-lg font-bold text-black">
            $ <span>{numberWithCommas(summaryData.monthTotalAmount)}</span>
          </p>
        </div>
      </div>

      {/* Info: (20260316 - Julian) 待核對 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-orange-500 lg:px-4">
          <CircleAlert size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-sm font-bold text-slate-700">
            {t("voucher.summary.pending")}
          </p>
          <p className="text-lg font-bold text-amber-500">
            <span>{summaryData.pendingVoucherCount}</span>{" "}
            {t("voucher.summary.unit")}
          </p>
        </div>
      </div>

      {/* Info: (20260316 - Julian) AI 平均信心度 */}
      <div className="flex items-center rounded-2xl border border-slate-300 bg-white p-2 shadow-sm lg:p-4">
        <div className="shrink-0 px-2 text-purple-500 lg:px-4">
          <Zap size={24} />
        </div>
        <div className="flex flex-col px-2">
          <p className="text-sm font-bold text-slate-700">
            {t("voucher.summary.ai_confidence")}
          </p>
          <p className="text-lg font-bold text-black">
            <span>{numberWithCommas(summaryData.aiAverageConfidence)}</span> %
          </p>
        </div>
      </div>
    </div>
  );
}
