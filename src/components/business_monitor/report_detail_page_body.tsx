"use client";

import {
  BookmarkCheck,
  ChevronLeft,
  CloudDownload,
  Share2,
  Calendar,
  CalendarRange,
  Globe,
  Info,
  Landmark,
  Shield,
  Building2,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { IMockReport } from "@/interfaces/business_monitor";
import { request } from "@/lib/utils/request";

const ReportDetailPageBody = () => {
  const params = useParams<{ report_id: string }>();
  const { report_id: reportId } = params;

  const [report, setReport] = useState<IMockReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await request<{ payload: IMockReport }>(
          `/api/v1/mock/reports/${reportId}`,
        );
        if (res?.payload) {
          setReport(res.payload);
        }
      } catch (err) {
        console.error("Failed to fetch report details", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  return (
    <main className="min-h-screen bg-gray-50/50 pt-8 pb-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-y-4 px-4 md:px-8 lg:max-w-[calc(100vw-30px)] lg:gap-y-6 lg:px-12">
        {/* Info: (20260610 - Julian) Header */}
        <div>
          <Link
            href="/business_monitor"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:text-orange-400 focus:outline-none"
          >
            <ChevronLeft size={16} />
            回上一頁
          </Link>
        </div>

        {isLoading ? (
          <div className="flex h-[600px] flex-col items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white shadow-sm">
            <LoaderCircle size={40} className="animate-spin text-orange-500" />
            <p className="font-bold text-slate-500">載入報告資料中...</p>
          </div>
        ) : !report ? (
          <div className="flex h-[600px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
            <Building2 size={60} className="text-slate-300" strokeWidth={1.5} />
            <p className="font-bold text-slate-400">找不到相關報告</p>
          </div>
        ) : (
          <div className="flex flex-col gap-y-12">
            {/* Info: (20260610 - Julian) Section 1: 主要報告書焦點區 */}
            <div className="flex flex-col gap-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-bold text-slate-800 lg:text-3xl">
                    {report.company}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-lg font-bold text-slate-700">
                      {report.title}
                    </span>
                    {report.isVerifiedByThirdParty && (
                      <span className="flex items-center gap-1 rounded-md border border-green-200 bg-green-50 px-2.5 py-1 text-sm font-bold text-green-700">
                        <BookmarkCheck size={16} /> 已通過第三方查證
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 focus:outline-none"
                  >
                    <CloudDownload size={18} />
                    下載 {report.reportYear} 報告書
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
                  >
                    <Share2 size={18} />
                    分享
                  </button>
                </div>
              </div>

              <hr className="border-slate-200" />

              <div className="flex flex-col gap-4">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Building2 size={20} className="text-orange-500" />
                  主要報告書詳細資訊
                </h3>
                <div className="grid grid-cols-1 gap-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 md:p-8">
                  {/* Left Column */}
                  <div className="flex flex-col gap-4 md:border-r md:border-slate-100 md:pr-8">
                    <h4 className="mb-2 border-b border-slate-100 pb-3 font-bold text-slate-700">
                      報告基本資訊
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={18} />
                        <span className="text-sm font-medium">報告年度</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.reportYear}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarRange size={18} />
                        <span className="text-sm font-medium">揭露期間</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.period}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Globe size={18} />
                        <span className="text-sm font-medium">產業別</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.industry}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Info size={18} />
                        <span className="text-sm font-medium">資本額區間</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.capital}
                      </span>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="flex flex-col gap-4">
                    <h4 className="mb-2 border-b border-slate-100 pb-3 font-bold text-slate-700">
                      查證與確信資訊
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Landmark size={18} />
                        <span className="text-sm font-medium">查證機構</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.verificationAgency || "無"}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-2 text-slate-500 sm:shrink-0">
                        <Shield size={18} />
                        <span className="text-sm font-medium">
                          查證採用標準
                        </span>
                      </div>
                      <span className="text-sm leading-relaxed font-bold text-slate-800 sm:text-right">
                        {report.verificationStandards || "無"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Landmark size={18} />
                        <span className="text-sm font-medium">確信機構</span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.assuranceAgency || "無"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Shield size={18} />
                        <span className="text-sm font-medium">
                          確信採用標準
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.assuranceStandards || "無"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20260610 - Julian) Section 2: 歷年報告書 */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-800">歷年報告書</h3>
              <div className="flex flex-wrap items-center gap-3">
                {["2023", "2022", "2021", "2020", "2019", "2018"].map(
                  (year) => (
                    <button
                      key={year}
                      type="button"
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus:outline-none"
                    >
                      <CloudDownload size={16} />
                      下載 {year}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Info: (20260610 - Julian) Section 3: 同產業報告書 */}
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-bold text-slate-800">同產業報告書</h3>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[
                  "智冠科技股份有限公司",
                  "華義國際數位娛樂股份有限公司",
                  "智崴資訊科技股份有限公司",
                  "鑫傳國際多媒體科技股份有限公司",
                  "鈊象電子股份有限公司",
                  "樂意傳播股份有限公司",
                ].map((company) => (
                  <div
                    key={company}
                    className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div>
                      <h4 className="mb-1 text-base font-bold text-slate-800">
                        {company}
                      </h4>
                      <p className="text-sm font-medium text-slate-500">
                        2024 年永續報告書
                      </p>
                    </div>
                    <button
                      type="button"
                      className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-600 transition-colors hover:bg-orange-100 focus:outline-none"
                    >
                      <CloudDownload size={16} />
                      下載報告書
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ReportDetailPageBody;
