"use client";

import { useState, useEffect, ChangeEvent } from "react";

import { useParams } from "next/navigation";
import { Filter, AlertTriangle, Download } from "lucide-react";
import EmbedGenerateModal from "@/components/user/financial_report/embed_generate_modal";
import BalanceSheetView from "@/components/user/financial_report/balance_sheet_view";
import CashFlowSheetView from "@/components/user/financial_report/cash_flow_statement_view";
import IncomeStatementView from "@/components/user/financial_report/income_statement_view";
import EsgReportView from "@/components/user/financial_report/esg_report_view";
import { numberWithCommas } from "@/lib/utils/common";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { downloadHtmlAsPdf } from "@/lib/utils/pdf";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
import { useTranslation } from "@/i18n/i18n_context";
import { translateAiNote } from "@/utils/ai_note_translator";

export default function ReportView() {
  const { t } = useTranslation();
  const params = useParams();
  const accountBookId = params.account_book_id as string;

  const [accountbookName, setAccountbookName] = useState<string>("");
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState<boolean>(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(
    ReportType.BALANCE_SHEET,
  );
  const [selectedReportPeriod, setSelectedReportPeriod] =
    useState<ReportPeriod>(ReportPeriod.ALL_YEAR);
  const [selectedReportYear, setSelectedReportYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [generatedConfig, setGeneratedConfig] = useState<{
    type: ReportType;
    period: ReportPeriod;
    year: number;
    currency: string;
  } | null>(null);
  const [countOfVerifiedVouchers, setCountOfVerifiedVouchers] =
    useState<number>(0);
  const [unverifiedItems, setUnverifiedItems] = useState<
    { id: string; note: string; type: string }[]
  >([]);

  // Info: (20260401 - Julian) 從 API 取得「帳簿名稱」
  useEffect(() => {
    if (!accountBookId) return;
    request<IApiResponse<{ name: string }>>(
      `/api/v1/user/account_book/${accountBookId}`,
    )
      .then((res) => {
        if (res.payload?.name) {
          setAccountbookName(res.payload.name);
        }
      })
      .catch((error) => console.error("Failed to fetch account book:", error));
  }, [accountBookId]);

  // Info: (20260331 - Julian) 從 API 取得「已核對的傳票數目」
  useEffect(() => {
    const fetchCountOfVerifiedVouchers = async () => {
      const response = await request<{ payload: { count: number } }>(
        `/api/v1/user/account_book/${accountBookId}/report/verify_voucher`,
      );
      if (response.payload.count) {
        setCountOfVerifiedVouchers(response.payload.count);
      }
    };
    fetchCountOfVerifiedVouchers();
  }, [accountBookId]);

  // Info: (20260330 - Julian) 報表標題
  const getReportTitle = (type: ReportType) => {
    switch (type) {
      case ReportType.BALANCE_SHEET:
        return t("report_view.types.balance_sheet");
      case ReportType.CASH_FLOW:
        return t("report_view.types.cash_flow");
      case ReportType.INCOME_STATEMENT:
        return t("report_view.types.income_statement");
      case ReportType.ESG_REPORT:
        return t("report_view.types.esg_report");
      default:
        return "";
    }
  };

  // Info: (20260330 - Julian) 報表期間
  const getReportPeriod = (period: ReportPeriod, year: number) => {
    switch (period) {
      case ReportPeriod.ALL_YEAR:
        return `${year}_` + t("report_view.periods.allyear");
      case ReportPeriod.Q1:
        return `${year}_` + t("report_view.periods.q1");
      case ReportPeriod.Q2:
        return `${year}_` + t("report_view.periods.q2");
      case ReportPeriod.Q3:
        return `${year}_` + t("report_view.periods.q3");
      case ReportPeriod.Q4:
        return `${year}_` + t("report_view.periods.q4");
      default:
        return "";
    }
  };

  // Info: (20260331 - Julian) 設定下載/列印檔名
  const filename = `${getReportTitle(selectedReportType)}_${getReportPeriod(selectedReportPeriod, selectedReportYear)}.pdf`;

  // Info: (20260331 - Julian) 報表資料
  const reportData = generatedConfig
    ? {
        reportTitle: getReportTitle(generatedConfig.type),
        reportPeriod: getReportPeriod(
          generatedConfig.period,
          generatedConfig.year,
        ),
        currency: generatedConfig.currency,
      }
    : null;

  const handleDownload = async () => {
    try {
      // Info: (20260331 - Julian) 過濾掉需要隱藏的元素（例如工具列與重點指標 Tooltip）
      const filter = (node: HTMLElement) => {
        // Info: (20260401 - Julian) 隱藏 data-html2canvas-ignore 的元素
        if (
          node?.hasAttribute &&
          node.hasAttribute("data-html2canvas-ignore")
        ) {
          return false;
        }
        return true;
      };

      // Info: (20260401 - Julian) 暫時顯示需要印出的註解
      const noteElement = document.getElementById("report-print-note");
      if (noteElement) {
        noteElement.classList.remove("hidden");
        noteElement.classList.add("flex");
      }

      // Info: (20260331 - Julian) 產出 PDF
      await downloadHtmlAsPdf("report-content-to-print", filename, { filter });
    } catch (error) {
      // Info: (20260331 - Julian) 顯示錯誤訊息
      console.error("Error generating PDF:", error);
    }
  };

  // Info: (20260330 - Julian) 產出報表
  const handleGenerateReport = () => {
    setUnverifiedItems([]);
    setGeneratedConfig({
      type: selectedReportType,
      period: selectedReportPeriod,
      year: selectedReportYear,
      currency: selectedReportType === ReportType.ESG_REPORT ? "kgCO2e" : "TWD",
    });
  };

  // Info: (20260330 - Julian) 關閉嵌入視窗
  const handleCloseModal = () => setIsEmbedModalOpen(false);

  // Info: (20260330 - Julian) 變更報表種類
  const handleReportTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedReportType(e.target.value as ReportType);
  };

  // Info: (20260330 - Julian) 變更報表期間
  const handleReportPeriodChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedReportPeriod(e.target.value as ReportPeriod);
  };

  const handleReportYearChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedReportYear(parseInt(e.target.value, 10));
  };

  const reportSelection = (
    <div className="flex flex-col space-y-2">
      <label htmlFor="report-type" className="text-sm font-bold text-gray-600">
        {t("report_view.report_type")}
      </label>
      <select
        id="report-type"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
        value={selectedReportType}
        onChange={handleReportTypeChange}
      >
        {Object.values(ReportType).map((type) => (
          <option key={type} value={type}>
            {getReportTitle(type)}
          </option>
        ))}
      </select>
    </div>
  );

  const yearSelection = (
    <div className="flex flex-col space-y-2">
      <label htmlFor="report-year" className="text-sm font-bold text-gray-600">
        {t("report_view.year_selection")}
      </label>
      <select
        id="report-year"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
        value={selectedReportYear}
        onChange={handleReportYearChange}
      >
        {[...Array(5)].map((_, i) => {
          const y = new Date().getFullYear() - i;
          return (
            <option key={y} value={y}>
              {y}
            </option>
          );
        })}
      </select>
    </div>
  );

  const periodSelection = (
    <div className="flex flex-col space-y-2">
      <label
        htmlFor="report-period"
        className="text-sm font-bold text-gray-600"
      >
        {t("report_view.period_selection")}
      </label>
      <select
        id="report-period"
        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none"
        value={selectedReportPeriod}
        onChange={handleReportPeriodChange}
      >
        {Object.values(ReportPeriod).map((period) => (
          <option key={period} value={period}>
            {t(`report_view.periods.${period.toLowerCase()}`)}
          </option>
        ))}
      </select>
    </div>
  );

  // Info: (20260330 - Julian) 根據選擇渲染對應的報表
  const renderReportView = () => {
    if (!generatedConfig) return null;

    switch (generatedConfig.type) {
      case ReportType.BALANCE_SHEET:
        return (
          <BalanceSheetView
            period={generatedConfig.period}
            year={generatedConfig.year}
            onUnverifiedItemsChange={setUnverifiedItems}
          />
        );
      case ReportType.CASH_FLOW:
        return (
          <CashFlowSheetView
            period={generatedConfig.period}
            year={generatedConfig.year}
            onUnverifiedItemsChange={setUnverifiedItems}
          />
        );
      case ReportType.INCOME_STATEMENT:
        return (
          <IncomeStatementView
            period={generatedConfig.period}
            year={generatedConfig.year}
            onUnverifiedItemsChange={setUnverifiedItems}
          />
        );
      case ReportType.ESG_REPORT:
        return (
          <EsgReportView
            period={generatedConfig.period}
            year={generatedConfig.year}
            onUnverifiedItemsChange={setUnverifiedItems}
          />
        );
      default:
        return null;
    }
  };

  const displayAccountbookName = accountbookName ? (
    <h2 className="text-2xl font-black tracking-[0.2em] text-gray-800 md:text-3xl">
      {accountbookName}
    </h2>
  ) : (
    <h2 className="text-2xl font-black tracking-[0.2em] text-gray-300 md:text-3xl">
      {t("report_view.unknown_account_book")}
    </h2>
  );

  const reportContent = !generatedConfig ? (
    <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
      <Filter className="mb-4 h-12 w-12 text-gray-300" strokeWidth={1.5} />
      <h3 className="text-xl font-bold tracking-widest text-gray-700">
        {t("report_view.empty_report_title")}
      </h3>
      <p className="mt-2 text-sm font-medium">
        {t("report_view.empty_report_desc")}
      </p>
    </div>
  ) : (
    <>
      {/* Info: (20260331 - Julian) Toolbar */}
      <div
        data-html2canvas-ignore
        className="ml-auto flex items-center gap-2 print:hidden"
      >
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-xl border border-gray-200 bg-white p-3 text-gray-500 transition-colors outline-none hover:bg-gray-50 hover:text-gray-800 active:bg-gray-100"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Info: (20260330 - Julian) 報表標題 */}
      <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-6 text-center text-gray-800 md:p-8">
        <div className="absolute top-0 left-0 h-1 w-full bg-orange-500"></div>
        {displayAccountbookName}
        <h3 className="mt-2 text-xl font-bold tracking-widest text-gray-600">
          {reportData?.reportTitle}
        </h3>
        <p className="mt-2 text-sm font-medium text-gray-400">
          {reportData?.reportPeriod &&
            t("report_view.period_unit", {
              period: reportData.reportPeriod,
              currency: reportData.currency || "",
            })}
        </p>
      </div>

      {/* Info:(20260319 - Julian) 報表內容 */}
      {renderReportView()}
    </>
  );

  return (
    <>
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:gap-8">
        {/* Info:(20260319 - Julian) 報表參數設定 */}
        <div className="flex h-fit w-full shrink-0 flex-col gap-4 rounded-xl border border-gray-100 bg-white p-6 lg:w-72 print:hidden">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
            <Filter className="h-5 w-5 text-gray-800" strokeWidth={2.5} />
            <h2 className="text-base font-bold text-gray-800">
              {t("report_view.period_selection")}
            </h2>
          </div>

          <div className="space-y-2 lg:space-y-6">
            {reportSelection}
            {yearSelection}
            {periodSelection}
            <button
              type="button"
              onClick={handleGenerateReport}
              className="mt-2 w-full rounded-md bg-[#FA4A11] py-2.5 text-[15px] font-bold text-white transition-colors outline-none hover:bg-[#E5430F] focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 active:bg-[#CC3A0C]"
            >
              {t("report_view.generate_btn")}
            </button>

            {/* Info:(20260319 - Julian) 傳票核對數提示 */}
            <div className="flex flex-col gap-2">
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-2 lg:p-4">
                <p className="text-xs leading-relaxed font-medium text-gray-600">
                  {t("report_view.hint_verified_count", {
                    count: numberWithCommas(countOfVerifiedVouchers),
                  })}
                </p>
              </div>

              {unverifiedItems.length > 0 && generatedConfig && (
                <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 shadow-sm lg:p-4 print:hidden">
                  <div className="mb-2 flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 lg:h-5 lg:w-5" />
                    <p className="text-xs leading-relaxed font-bold text-red-600 lg:text-sm">
                      {t("report_view.unverified_warning", {
                        count: numberWithCommas(unverifiedItems.length),
                      })}
                    </p>
                  </div>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto border-t border-red-100 pt-2">
                    {unverifiedItems.map((item) => (
                      <li key={item.id}>
                        <a
                          href={`/user/account_book/${accountBookId}/${item.type === "esg" ? "esg" : "voucher"}?openId=${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-col text-[11px] font-medium text-red-500 no-underline hover:text-red-700"
                        >
                          <span className="truncate">{item.id}</span>
                          <span className="truncate font-normal text-red-400">
                            {translateAiNote(item.note, t)}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Info:(20260319 - Julian) 報表內容 */}
        <div
          id="report-content-to-print"
          className="flex w-full min-w-0 flex-1 flex-col gap-4 print:p-4"
        >
          {reportContent}
        </div>
      </div>

      {/* Info: (20260319 - Julian) Embed Generate Modal */}
      {isEmbedModalOpen && <EmbedGenerateModal onClose={handleCloseModal} />}
    </>
  );
}
