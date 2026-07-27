"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { LabelType } from "@/constants/ledger";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { numberWithCommas } from "@/lib/utils/common";
import { MoneyUtil } from "@/lib/utils/money";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { ITrialBalance, ITrialBalanceItem } from "@/interfaces/trial_balance";
import { buildTrialBalanceCsv } from "@/lib/report/trial_balance_csv";
import { Download } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import {
  ReportLoadingPlaceholder,
  ReportErrorPlaceholder,
} from "@/components/user/financial_report/report_placeholders";

// Info: (20260727 - Julian) 金額為 0 顯示破折號，否則加千分位
function amountCell(value: string): string {
  return MoneyUtil.toDecimal(value).isZero() ? "—" : numberWithCommas(value);
}

// Info: (20260727 - Julian) 將樹狀科目以深度優先展平為列（含層級，供縮排呈現）
function flattenItems(
  items: ITrialBalanceItem[],
  level = 0,
): { item: ITrialBalanceItem; level: number }[] {
  const result: { item: ITrialBalanceItem; level: number }[] = [];
  items.forEach((item) => {
    result.push({ item, level });
    if (item.subAccounts.length > 0) {
      result.push(...flattenItems(item.subAccounts, level + 1));
    }
  });
  return result;
}

export default function TrialBalanceView({
  period,
  year,
  onUnverifiedItemsChange = () => {},
}: {
  period: ReportPeriod;
  year: number;
  onUnverifiedItemsChange?: (
    items: { id: string; note: string; type: string }[],
  ) => void;
}) {
  const params = useParams();
  const accountBookId = params?.account_book_id as string;
  const { t } = useTranslation();

  const [reportData, setReportData] = useState<ITrialBalance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!accountBookId) {
      setIsLoading(false);
      return;
    }
    const fetchReport = async () => {
      try {
        setIsLoading(true);
        const res = await request<
          IApiResponse<{
            report: ITrialBalance;
            unverifiedItems?: { id: string; note: string; type: string }[];
          }>
        >(
          `/api/v1/user/account_book/${accountBookId}/report?reportType=${ReportType.TRIAL_BALANCE}&period=${period}&year=${year}`,
        );
        if (res.payload) {
          setReportData(res.payload.report);
          if (res.payload.unverifiedItems !== undefined) {
            onUnverifiedItemsChange(res.payload.unverifiedItems);
          }
        }
      } catch (error) {
        console.error("Failed to fetch trial balance:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [accountBookId, period, year, onUnverifiedItemsChange]);

  if (isLoading) {
    return (
      <ReportLoadingPlaceholder
        title={t("trial_balance_view.loading_title")}
        description={t("trial_balance_view.loading_desc")}
      />
    );
  }

  if (!reportData || reportData.items.length === 0) {
    return (
      <ReportErrorPlaceholder
        title={t("trial_balance_view.no_data")}
        description=""
      />
    );
  }

  const rows = flattenItems(reportData.items);
  const { total } = reportData;

  // Info: (20260727 - Julian) 由已取得的報表資料於前端產生 CSV 並下載（含 UTF-8 BOM，防 Excel 中文亂碼）
  const handleExportCsv = () => {
    const csv = "\uFEFF" + buildTrialBalanceCsv(reportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    link.href = url;
    link.download = `trial_balance_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const numberCellClass =
    "px-2 py-2 text-right font-mono text-xs text-gray-700 lg:px-4 lg:text-sm print:text-xs";
  const headerCellClass =
    "px-2 py-2 text-right text-xs font-bold text-gray-500 lg:px-4";

  return (
    <div className="flex flex-col gap-2">
      {/* Info: (20260727 - Julian) 匯出 CSV（列印/PDF 時排除） */}
      <div data-html2canvas-ignore className="flex justify-end print:hidden">
        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-800"
        >
          <Download size={18} />
          {t("trial_balance_view.export_csv")}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white p-2 lg:p-4">
        <table className="w-full border-collapse text-sm print:text-xs">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <th
                rowSpan={2}
                className="px-2 py-2 text-left text-xs font-bold text-gray-500 lg:px-4"
              >
                {t("trial_balance_view.headers.account")}
              </th>
              <th
                colSpan={2}
                className="border-l border-gray-200 px-2 py-1 text-center text-xs font-bold text-gray-500"
              >
                {t("trial_balance_view.headers.beginning")}
              </th>
              <th
                colSpan={2}
                className="border-l border-gray-200 px-2 py-1 text-center text-xs font-bold text-gray-500"
              >
                {t("trial_balance_view.headers.midterm")}
              </th>
              <th
                colSpan={2}
                className="border-l border-gray-200 px-2 py-1 text-center text-xs font-bold text-gray-500"
              >
                {t("trial_balance_view.headers.ending")}
              </th>
            </tr>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-400">
              <th className={`${headerCellClass} border-l border-gray-200`}>
                {t("trial_balance_view.headers.debit")}
              </th>
              <th className={headerCellClass}>
                {t("trial_balance_view.headers.credit")}
              </th>
              <th className={`${headerCellClass} border-l border-gray-200`}>
                {t("trial_balance_view.headers.debit")}
              </th>
              <th className={headerCellClass}>
                {t("trial_balance_view.headers.credit")}
              </th>
              <th className={`${headerCellClass} border-l border-gray-200`}>
                {t("trial_balance_view.headers.debit")}
              </th>
              <th className={headerCellClass}>
                {t("trial_balance_view.headers.credit")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ item, level }) => {
              // Info: (20260727 - Julian) 明確科目編號(全數字)→ &code=；集計根(含 X 等非數字，如 1XXX/11XX)→ &accountType=
              const isConcreteCode = /^\d+$/.test(item.code);
              const ledgerHref =
                isConcreteCode || !item.accountType
                  ? `/user/account_book/${accountBookId}/voucher?tab=ledger&code=${encodeURIComponent(
                      item.code,
                    )}&labelType=${
                      item.subAccounts.length > 0
                        ? LabelType.GENERAL
                        : LabelType.ALL
                    }`
                  : `/user/account_book/${accountBookId}/voucher?tab=ledger&accountType=${encodeURIComponent(
                      item.accountType,
                    )}`;
              return (
                <tr
                  key={item.code}
                  className="border-b border-gray-50 print:break-inside-avoid"
                >
                  <td
                    className="px-2 py-2 lg:px-4"
                    style={{ paddingLeft: `${0.5 + level * 1.25}rem` }}
                  >
                    {/* Info: (20260727 - Julian) 點擊科目跳轉至分類帳（drill-down）；父科目以總帳(上捲)呈現 */}
                    <Link
                      href={ledgerHref}
                      title={t("trial_balance_view.view_ledger", {
                        code: item.code,
                      })}
                      className="group inline-flex items-center gap-2 rounded transition-colors"
                    >
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-700 transition-colors group-hover:bg-orange-100 group-hover:text-orange-700">
                        {item.code}
                      </span>
                      <span
                        className={`text-xs whitespace-nowrap underline-offset-2 transition-colors group-hover:text-orange-700 group-hover:underline lg:text-sm ${level === 0 ? "font-bold text-gray-800" : "text-gray-600"}`}
                      >
                        {item.name}
                      </span>
                    </Link>
                  </td>
                  <td className={`${numberCellClass} border-l border-gray-100`}>
                    {amountCell(item.beginningDebit)}
                  </td>
                  <td className={numberCellClass}>
                    {amountCell(item.beginningCredit)}
                  </td>
                  <td className={`${numberCellClass} border-l border-gray-100`}>
                    {amountCell(item.midtermDebit)}
                  </td>
                  <td className={numberCellClass}>
                    {amountCell(item.midtermCredit)}
                  </td>
                  <td className={`${numberCellClass} border-l border-gray-100`}>
                    {amountCell(item.endingDebit)}
                  </td>
                  <td className={numberCellClass}>
                    {amountCell(item.endingCredit)}
                  </td>
                </tr>
              );
            })}
            {/* Info: (20260727 - Julian) 合計 */}
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-gray-800">
              <td className="px-2 py-2 lg:px-4">
                {t("trial_balance_view.total")}
              </td>
              <td className={`${numberCellClass} border-l border-gray-100`}>
                {numberWithCommas(total.beginningDebit)}
              </td>
              <td className={numberCellClass}>
                {numberWithCommas(total.beginningCredit)}
              </td>
              <td className={`${numberCellClass} border-l border-gray-100`}>
                {numberWithCommas(total.midtermDebit)}
              </td>
              <td className={numberCellClass}>
                {numberWithCommas(total.midtermCredit)}
              </td>
              <td className={`${numberCellClass} border-l border-gray-100`}>
                {numberWithCommas(total.endingDebit)}
              </td>
              <td className={numberCellClass}>
                {numberWithCommas(total.endingCredit)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
