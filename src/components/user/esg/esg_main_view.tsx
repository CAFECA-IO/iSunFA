"use client";

import { Leaf, Target } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import EsgSummary from "@/components/user/esg/esg_summary";
import EsgTableSection from "@/components/user/esg/esg_table_section";
import EsgTargetModal from "@/components/user/esg/esg_target_modal";

export default function EsgMainView() {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params?.account_book_id as string;

  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | "">("");

  const [startYear, setStartYear] = useState<number>(currentYear);
  const [startMonth, setStartMonth] = useState<number>(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accountBook, setAccountBook] = useState<any>(null);

  useEffect(() => {
    if (accountBookId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      request(`/api/v1/user/account_book/${accountBookId}`).then((res: any) => {
        if (res.payload) {
          setAccountBook(res.payload);
          if (res.payload.createdAt) {
            const createdAt = new Date(res.payload.createdAt);
            setStartYear(createdAt.getFullYear());
            setStartMonth(createdAt.getMonth() + 1);
          }
        }
      }).catch(err => console.error(err));
    }
  }, [accountBookId]);

  const yearsLength = Math.max(1, currentYear - startYear + 1);
  const years = Array.from({ length: yearsLength }, (_, i) => currentYear - i);

  let months = Array.from({ length: 12 }, (_, i) => i + 1);
  if (selectedYear === currentYear) {
    months = months.filter(m => m <= currentMonth);
  }
  if (selectedYear === startYear) {
    months = months.filter(m => m >= startMonth);
  }


  return (
    <div className="flex max-w-[calc(100vw-30px)] flex-col space-y-6 px-0 md:px-12">
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
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} {t("esg_main.year")}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value ? Number(e.target.value) : "")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
            className="flex items-center rounded-lg bg-[#FF5A1F] px-5 py-2 text-sm font-medium text-white hover:bg-[#E04914] transition-all focus:outline-none"
          >
            <Target className="mr-2 h-4 w-4" />
            {t("esg_target.btn")}
          </button>

        </div>
      </div>

      {/* Info: (20260312 - Julian) Summary */}
      <EsgSummary year={selectedYear} month={selectedMonth} />

      {/* Info: (20260312 - Julian) Table Section */}
      <EsgTableSection year={selectedYear} month={selectedMonth} />

      {/* Info: (20260321 - Luphia) Target Modal */}
      <EsgTargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        accountBookId={accountBookId}
        esgIndustryId={accountBook?.esgIndustryId || null}
      />
    </div>
  );
}
