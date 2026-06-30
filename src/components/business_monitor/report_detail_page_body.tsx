"use client";

import {
  BookmarkCheck,
  ChevronLeft,
  CloudDownload,
  Share2,
  Calendar,
  Info,
  Building2,
  LoaderCircle,
  AlertCircle,
  Clock,
  DollarSign,
  ShieldCheck,
  BookOpenCheck,
  Award,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IMockReport,
  IReportDetailPayload,
} from "@/interfaces/business_monitor";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

const ReportDetailPageBody = () => {
  const params = useParams<{ report_id: string }>();
  const { report_id: reportId } = params;
  const { t } = useTranslation();

  const [payload, setPayload] = useState<IReportDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      setIsLoading(true);
      try {
        const res = await request<{ payload: IReportDetailPayload }>(
          `/api/v1/business_monitor/reports/${reportId}`,
        );
        if (res?.payload) {
          setPayload(res.payload);
        }
      } catch (err) {
        console.error("Failed to fetch report details", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const report = payload?.report;
  const companyReports = payload?.companyReports || [];
  const industryReports = payload?.industryReports || [];

  const handleDownload = (targetReport: IMockReport) => {
    // Info: (20260610 - Julian) 模擬產生檔案 Blob 並觸發瀏覽器下載
    const dummyContent = `Mock Report Content for ${targetReport.company}\nReport Year: ${targetReport.reportYear}\nPeriod: ${targetReport.period}\nIndustry: ${targetReport.industry}`;
    const blob = new Blob([dummyContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${targetReport.company}_${targetReport.reportYear}${t("business_monitor.detail.report_file_suffix")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gray-50/50 pt-8 pb-20">
      <div className="mx-auto flex max-w-6xl flex-col gap-y-4 px-4 md:px-8 lg:max-w-[calc(100vw-30px)] lg:gap-y-6 lg:px-12">
        <Link
          href="/business_monitor"
          className="flex w-fit items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-orange-600 focus:outline-none"
        >
          <ChevronLeft size={16} />
          {t("business_monitor.detail.back_to_list")}
        </Link>

        {isLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={32} />
          </div>
        ) : !report ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-slate-500">
            <AlertCircle size={48} className="text-slate-300" />
            <p>{t("business_monitor.detail.report_not_found")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 lg:gap-12">
            <div className="flex flex-col gap-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-col gap-5 border-b border-orange-100 bg-orange-50 px-6 py-8 md:px-10 md:py-10">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                    <Building2 size={14} />
                    {report.industry}
                  </span>
                  {report.isVerifiedByThirdParty && (
                    <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      <BookmarkCheck size={14} />
                      {t(
                        "business_monitor.reports.item.verified_by_third_party",
                      )}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <h1 className="text-2xl font-black text-slate-900 md:text-4xl">
                    {report.company}
                  </h1>
                  <h2 className="text-xl font-bold text-slate-600 md:text-2xl">
                    {report.title}
                  </h2>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDownload(report)}
                    className="flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-700 focus:outline-none"
                  >
                    <CloudDownload size={18} />
                    {t("business_monitor.detail.download")} {report.title}
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
                  >
                    <Share2 size={18} />
                    {t("business_monitor.detail.share")}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-6 px-6 pb-8 md:px-10">
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Info size={20} className="text-orange-500" />
                  {t("business_monitor.detail.report_details")}
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-12">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Calendar size={16} />
                        <span className="text-sm font-medium">
                          {t("business_monitor.reports.item.report_year")}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.reportYear}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock size={16} />
                        <span className="text-sm font-medium">
                          {t("business_monitor.reports.item.disclosure_period")}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.period}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <DollarSign size={16} />
                        <span className="text-sm font-medium">
                          {t("business_monitor.reports.item.capital_range")}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.capital}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <ShieldCheck size={16} />
                        <span className="text-sm font-medium">
                          {t(
                            "business_monitor.reports.item.verification_agency",
                          )}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.verificationAgency || "無"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <BookOpenCheck size={16} />
                        <span className="text-sm font-medium">
                          {t(
                            "business_monitor.reports.item.verification_standards",
                          )}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.verificationStandards || "無"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Award size={16} />
                        <span className="text-sm font-medium">
                          {t("business_monitor.reports.item.assurance_agency")}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {report.assuranceAgency || "無"}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 pb-3">
                      <div className="flex items-center gap-2 text-slate-500">
                        <FileCheck size={16} />
                        <span className="text-sm font-medium">
                          {t(
                            "business_monitor.reports.item.assurance_standards",
                          )}
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

            {companyReports.length > 0 && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {t("business_monitor.detail.all_company_reports")}
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  {companyReports.map((compReport) => (
                    <button
                      key={compReport.id}
                      type="button"
                      onClick={() => handleDownload(compReport)}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 focus:outline-none"
                    >
                      <CloudDownload size={16} />
                      {t("business_monitor.detail.download")} {compReport.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info: (20260610 - Julian) Section 3: 同產業報告書 */}
            {industryReports.length > 0 && (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-bold text-slate-800">
                  {t("business_monitor.detail.industry_reports")}
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {industryReports.map((indReport) => (
                    <div
                      key={indReport.id}
                      className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div>
                        <h4 className="mb-1 text-base font-bold text-slate-800">
                          {indReport.company}
                        </h4>
                        <p className="text-sm font-medium text-slate-500">
                          {t("business_monitor.detail.year_report", {
                            year: indReport.reportYear,
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownload(indReport)}
                        className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-600 transition-colors hover:bg-orange-100 focus:outline-none"
                      >
                        <CloudDownload size={16} />
                        {t("business_monitor.detail.download_report")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
};

export default ReportDetailPageBody;
