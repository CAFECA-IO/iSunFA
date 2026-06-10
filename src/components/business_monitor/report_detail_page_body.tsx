"use client";

import {
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
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none"
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
          <div className="flex flex-col gap-8 md:flex-row">
            {/* Info: (20260610 - Julian) Left Sidebar Card */}
            <div className="w-full shrink-0 md:w-80">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Info: (20260610 - Julian) Card Header */}
                <div className="border-b border-orange-100 bg-orange-50 px-6 py-5">
                  <h2 className="mb-1 text-xl font-bold text-orange-900">
                    {report.company}
                  </h2>
                  <p className="text-sm font-medium text-orange-700">
                    {report.title}
                  </p>
                </div>

                {/* Info: (20260610 - Julian) Metadata List */}
                <div className="flex flex-col gap-y-3 p-6">
                  <div className="flex items-center">
                    <Calendar className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        報告年度：
                      </span>
                      <span>{report.reportYear}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <CalendarRange className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        揭露期間：
                      </span>
                      <span>{report.period}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Globe className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">產業別：</span>
                      <span>{report.industry}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Info className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        資本額區間：
                      </span>
                      <span>{report.capital}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Landmark className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        查證機構：
                      </span>
                      <span>{report.verificationAgency || "無"}</span>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Shield className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm leading-relaxed text-slate-600">
                      <span className="font-bold text-slate-700">
                        查證採用標準：
                      </span>
                      <span>{report.verificationStandards || "無"}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Landmark className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        確信機構：
                      </span>
                      <span>{report.assuranceAgency || "無"}</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Shield className="mt-0.5 mr-3 size-5 shrink-0 text-slate-400" />
                    <div className="text-sm text-slate-600">
                      <span className="font-bold text-slate-700">
                        確信採用標準：
                      </span>
                      <span>{report.assuranceStandards || "無"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info: (20260610 - Julian) Right Main Content */}
            <div className="flex-1">
              {/* Info: (20260610 - Julian) Title & Buttons */}
              <div className="flex items-center justify-between">
                <h1 className="mb-6 flex items-center text-base font-bold text-slate-800 lg:text-2xl">
                  <Building2
                    size={24}
                    className="mr-2 shrink-0 text-orange-500"
                    strokeWidth={2.5}
                  />
                  歷年報告書
                </h1>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-orange-600 transition-colors outline-none hover:bg-orange-100 hover:text-orange-700 active:bg-orange-200"
                  >
                    <CloudDownload size={20} className="shrink-0" />
                    <span className="text-sm font-bold whitespace-nowrap">
                      下載
                    </span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-500 transition-colors outline-none hover:bg-gray-50 hover:text-gray-800 active:bg-gray-100"
                  >
                    <Share2 size={20} className="shrink-0" />
                    <span className="text-sm font-bold whitespace-nowrap">
                      分享
                    </span>
                  </button>
                </div>
              </div>

              {/* Info: (20260610 - Julian) Year Selection */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 font-bold text-slate-700">永續報告書</h3>
                <hr className="mb-4 border-slate-100" />
                <button
                  type="button"
                  className="rounded-lg bg-orange-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-orange-700"
                >
                  {report.reportYear}
                </button>
              </div>

              {/* Info: (20260610 - Julian) PDF Placeholder */}
              <div className="flex h-[600px] w-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white shadow-sm">
                <div className="text-center text-slate-400">
                  <div className="mb-4 flex justify-center">
                    <Building2
                      size={60}
                      className="shrink-0 text-slate-300"
                      strokeWidth={1.5}
                    />
                  </div>
                  <p className="mb-2 text-xl font-bold tracking-wide">
                    我是報告
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default ReportDetailPageBody;
