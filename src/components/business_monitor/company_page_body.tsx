"use client";

import { FC, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Building2,
  ChevronLeft,
  LoaderCircle,
} from "lucide-react";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import { IBusinessMonitorCompanyProfile } from "@/interfaces/business_monitor";
import { formatAdDate } from "@/lib/business_monitor/format";
import RegistrationCard from "@/components/business_monitor/registration_card";
import FinancialCard from "@/components/business_monitor/financial_card";
import EmissionCard from "@/components/business_monitor/emission_card";
import ReportLibrary from "@/components/business_monitor/report_library";
import CompanyAskBox from "@/components/business_monitor/company_ask_box";
import MonitorToast, {
  useMonitorToast,
} from "@/components/business_monitor/monitor_toast";

/**
 * Info: (20261022 - Luphia) 公司頁：它是誰（基本資料與最新登記）、它揭露了什麼（依資料年度分組的報告庫）、
 * 問問這家公司（範疇固定為本公司的 AI 諮詢）。
 */
const CompanyPageBody: FC = () => {
  const { stock_id: stockId } = useParams<{ stock_id: string }>();
  const { t } = useTranslation();
  const { toast, showToast } = useMonitorToast();
  const [profile, setProfile] = useState<IBusinessMonitorCompanyProfile | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!stockId) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await request<{ payload: IBusinessMonitorCompanyProfile }>(
          `/api/v1/business_monitor/companies/${encodeURIComponent(stockId)}`,
        );
        setProfile(res?.payload ?? null);
      } catch (error) {
        console.error("Company profile failed", error);
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [stockId]);

  const company = profile?.company;
  const companyLabel = company ? (company.abbreviation ?? company.name) : "";

  return (
    <main className="min-h-screen bg-gray-50/50 pt-8 pb-20">
      <div className="mx-auto flex max-w-5xl flex-col gap-y-6 px-4 md:px-8">
        <Link
          href="/business_monitor"
          className="flex w-fit items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-600"
        >
          <ChevronLeft size={16} />
          {t("business_monitor.company.back")}
        </Link>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <LoaderCircle className="animate-spin text-orange-500" size={32} />
          </div>
        ) : !profile || !company ? (
          <div className="flex flex-col items-center gap-4 py-20 text-slate-500">
            <AlertCircle size={48} className="text-slate-300" />
            <p>{t("business_monitor.company.not_found")}</p>
          </div>
        ) : (
          <>
            <header className="flex flex-col gap-2">
              <h1 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl font-black text-slate-900 md:text-3xl">
                <span className="flex items-center gap-2">
                  <Building2 size={26} className="shrink-0 text-orange-500" />
                  {company.name}
                </span>
                <span className="text-lg font-bold text-slate-400">
                  {company.stockId}
                  {company.abbreviation && `・${company.abbreviation}`}
                </span>
              </h1>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">
                  {t(`business_monitor.market.${company.marketType}`)}
                </span>
                {company.industryName && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {company.industryName}
                  </span>
                )}
                {company.listingDate && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {t("business_monitor.company.listing_date", {
                      date: formatAdDate(company.listingDate),
                    })}
                  </span>
                )}
                {company.taxId && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {t("business_monitor.company.tax_id", {
                      taxId: company.taxId,
                    })}
                  </span>
                )}
              </div>
            </header>

            <CompanyAskBox
              stockId={company.stockId}
              companyLabel={companyLabel}
              onShowToast={showToast}
            />
            <RegistrationCard registration={profile.registration} />
            <FinancialCard periods={profile.financials} />
            <EmissionCard emissions={profile.emissions} />
            <ReportLibrary
              library={profile.library}
              companyName={company.name}
              onShowToast={showToast}
            />
          </>
        )}
      </div>
      <MonitorToast toast={toast} />
    </main>
  );
};

export default CompanyPageBody;
