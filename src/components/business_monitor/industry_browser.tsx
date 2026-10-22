"use client";

import { FC, useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import Pagination from "@/components/common/pagination";
import CompanyRow from "@/components/business_monitor/company_row";
import { request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";
import {
  IBusinessMonitorCompanyList,
  IBusinessMonitorIndustry,
} from "@/interfaces/business_monitor";
import { BUSINESS_MONITOR_COMPANY_PAGE_SIZE } from "@/constants/business_monitor";

/**
 * Info: (20261022 - Luphia) 依產業瀏覽：產業清單由資料產生（證交所產業別 × 追蹤中的公司數），
 * 點選後列出該產業的公司——它回答的是「這個產業有哪些公司」，不是篩選報告。
 */
const IndustryBrowser: FC = () => {
  const { t } = useTranslation();
  const [industries, setIndustries] = useState<IBusinessMonitorIndustry[]>([]);
  const [selected, setSelected] = useState<IBusinessMonitorIndustry | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [list, setList] = useState<IBusinessMonitorCompanyList | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    request<{ payload: { industries: IBusinessMonitorIndustry[] } }>(
      "/api/v1/business_monitor/industries",
    )
      .then((res) => setIndustries(res?.payload?.industries ?? []))
      .catch((error) => console.error("Industries failed", error));
  }, []);

  useEffect(() => {
    if (!selected) return;
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          industry: selected.code,
          page: String(page),
          pageSize: String(BUSINESS_MONITOR_COMPANY_PAGE_SIZE),
        });
        const res = await request<{ payload: IBusinessMonitorCompanyList }>(
          `/api/v1/business_monitor/companies?${params.toString()}`,
        );
        setList(res?.payload ?? null);
      } catch (error) {
        console.error("Industry companies failed", error);
        setList(null);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [selected, page]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-bold text-slate-800 lg:text-lg">
        {t("business_monitor.home.browse_by_industry")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {industries.map((industry) => {
          const isSelected = selected?.code === industry.code;
          return (
            <button
              key={industry.code}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setSelected(isSelected ? null : industry);
                setPage(1);
              }}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                isSelected
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              {industry.name}
              <span
                className={`ml-1.5 text-xs ${isSelected ? "text-orange-100" : "text-slate-400"}`}
              >
                {industry.companyCount}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-slate-600">
            {t("business_monitor.home.industry_companies", {
              industry: selected.name,
              count: list?.total ?? selected.companyCount,
            })}
          </p>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <LoaderCircle className="animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {list?.companies.map((company) => (
                <CompanyRow key={company.stockId} company={company} />
              ))}
            </div>
          )}
          {list && list.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={list.totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </section>
  );
};

export default IndustryBrowser;
