"use client";

import { Leaf, Target } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  useParams,
  useSearchParams,
  useRouter,
  usePathname,
} from "next/navigation";
import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import CoefficientManagementTab from "@/components/user/esg/coefficient_management_tab";
import EsgSummary from "@/components/user/esg/esg_summary";
import EsgTableSection from "@/components/user/esg/esg_table_section";
import EsgTargetModal from "@/components/user/esg/esg_target_modal";
import { IApiResponse } from "@/lib/utils/response";

enum EsgTab {
  RECORDS = "records",
  COEFFICIENT = "coefficient",
}

export default function EsgMainView() {
  const { t } = useTranslation();

  // Info: (20260416 - Julian) 取得 URL 參數中的 accountBookId
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  // Info: (20260416 - Julian) 取得 URL 參數中的 tab
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Info: (20260416 - Julian) 從 URL 參數取得 tab
  const tabParams = useSearchParams().get("tab");
  const activeTab =
    tabParams === "coefficient" ? EsgTab.COEFFICIENT : EsgTab.RECORDS;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [isTargetModalOpen, setIsTargetModalOpen] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "">("");
  const [startYear, setStartYear] = useState<number>(currentYear);
  const [startMonth, setStartMonth] = useState<number>(1);
  const [accountBook, setAccountBook] = useState<{
    esgIndustryId: string;
  } | null>(null);

  const handleTabChange = (tab: EsgTab) => {
    // Info: (20260416 - Julian) 複製目前的 URLSearchParams，再把 tab 的參數加上去
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set("tab", tab);

    // Info: (20260416 - Julian) 更新 URL，並指定 scroll: false
    router.replace(`${pathname}?${newSearchParams.toString()}`, {
      scroll: false,
    });
  };

  useEffect(() => {
    if (accountBookId) {
      const fetchAccountBook = async () => {
        try {
          const res = await request<
            IApiResponse<{ esgIndustryId: string; createdAt: string }>
          >(`/api/v1/user/account_book/${accountBookId}`);
          if (res.payload) {
            setAccountBook(res.payload);
            if (res.payload.createdAt) {
              const createdAt = new Date(res.payload.createdAt);
              setStartYear(createdAt.getFullYear());
              setStartMonth(createdAt.getMonth() + 1);
            }
          }
        } catch (error) {
          console.error("Failed to fetch cash flow statement:", error);
        }
      };
      fetchAccountBook();
    }
  }, [accountBookId]);

  const yearsLength = Math.max(1, currentYear - startYear + 1);
  const years = Array.from({ length: yearsLength }, (_, i) => currentYear - i);

  let months = Array.from({ length: 12 }, (_, i) => i + 1);
  if (selectedYear === currentYear) {
    months = months.filter((m) => m <= currentMonth);
  }
  if (selectedYear === startYear) {
    months = months.filter((m) => m >= startMonth);
  }

  const recordTab = (
    <>
      {/* Info: (20260312 - Julian) Summary */}
      <EsgSummary year={selectedYear} month={selectedMonth} />

      {/* Info: (20260312 - Julian) Table Section */}
      <EsgTableSection year={selectedYear} month={selectedMonth} />

      {/* Info: (20260321 - Luphia) Target Modal */}
      <EsgTargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        accountBookId={accountBookId}
        esgIndustryId={Number(accountBook?.esgIndustryId) || null}
      />
    </>
  );

  const tabContent =
    activeTab === EsgTab.RECORDS ? recordTab : <CoefficientManagementTab />;

  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col gap-y-4 px-0 lg:gap-y-6 lg:px-12">
      {/* Info: (20260312 - Julian) Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="flex items-center text-base font-bold text-slate-800 lg:text-2xl">
            <Leaf className="mr-2 h-6 w-6 text-green-500" strokeWidth={2.5} />
            {t("esg_main.title")}
          </h1>
          <p className="text-xs font-medium text-slate-500 lg:text-sm">
            {t("esg_main.description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-end">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} {t("esg_main.year")}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) =>
              setSelectedMonth(e.target.value ? Number(e.target.value) : "")
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
          >
            <option value="">{t("esg_main.all_year")}</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {m} {t("esg_main.month")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsTargetModalOpen(true)}
            className="flex items-center rounded-lg bg-orange-500 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-orange-600 focus:outline-none"
          >
            <Target className="mr-2 size-4" />
            {t("esg_target.btn")}
          </button>
        </div>
      </div>

      {/* Info: (20260413 - Julian) Tab Switch */}
      <div className="grid grid-cols-2 space-x-1 rounded-xl border border-gray-200 bg-gray-100 p-1.5 md:ml-auto">
        {/* <button
          title={t("esg_main.tab.records")}
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 lg:px-4 lg:py-2.5 lg:text-sm ${
            activeTab === EsgTab.RECORDS
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
          }`}
          onClick={() => {
            setActiveTab(EsgTab.RECORDS)
            // Info: (20260416 - Julian) 寫入 URL 參數
          }}
        >
          {t("esg_main.tab.records")}
        </button>
        <button
          title={t("esg_main.tab.coefficient")}
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 lg:px-4 lg:py-2.5 lg:text-sm ${
            activeTab === EsgTab.COEFFICIENT
              ? "bg-white text-orange-600 shadow-sm"
              : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab(EsgTab.COEFFICIENT)}
        >
          {t("esg_main.tab.coefficient")}
        </button> */}
        {Object.values(EsgTab).map((tab) => (
          <button
            key={tab}
            title={t(`esg_main.tab.${tab.toLowerCase()}`)}
            type="button"
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium transition-all duration-200 lg:px-4 lg:py-2.5 lg:text-sm ${
              activeTab === tab
                ? "bg-white text-orange-600 shadow-sm"
                : "text-gray-600 hover:bg-gray-200/50 hover:text-gray-900"
            }`}
            onClick={() => handleTabChange(tab)}
          >
            {t(`esg_main.tab.${tab.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {/* Info: (20260413 - Julian) Tab Content */}
      {tabContent}
    </div>
  );
}
