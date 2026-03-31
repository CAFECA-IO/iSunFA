"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

import { Filter, Printer, Download } from "lucide-react";
import EmbedGenerateModal from "@/components/user/financial_report/embed_generate_modal";
import BalanceSheetView from "@/components/user/financial_report/balance_sheet_view";
import CashFlowSheetView from "@/components/user/financial_report/cash_flow_statement_view";
import IncomeStatementView from "@/components/user/financial_report/income_statement_view";
import { numberWithCommas } from "@/lib/utils/common";
import { request } from "@/lib/utils/request";
import { downloadHtmlAsPdf } from "@/lib/utils/pdf";
import { ReportType, ReportPeriod } from "@/constants/financial_report";
export default function ReportView() {
  const params = useParams();
  const accountBookId = params.account_book_id as string;

  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState<boolean>(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>(
    ReportType.BALANCE_SHEET,
  );
  const [selectedReportPeriod, setSelectedReportPeriod] =
    useState<ReportPeriod>(ReportPeriod.ALL_YEAR);
  const [generatedConfig, setGeneratedConfig] = useState<{
    type: ReportType;
    period: ReportPeriod;
    currency: string;
  } | null>(null);
  const [countOfVerifiedVouchers, setCountOfVerifiedVouchers] =
    useState<number>(0);

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

  const handleDownload = async () => {
    // Info: (20260331 - Julian) 過濾掉需要隱藏的元素（例如工具列與重點指標 Tooltip）
    const filter = (node: HTMLElement) => {
      if (node?.hasAttribute && node.hasAttribute("data-html2canvas-ignore")) {
        return false;
      }
      return true;
    };

    // Info: (20260331 - Julian) 設定檔名
    const filename = `${getReportTitle(selectedReportType)}_${getReportPeriod(selectedReportPeriod)}.pdf`;
    
    // Info: (20260331 - Julian) 產出 PDF
    await downloadHtmlAsPdf("report-content-to-print", filename, {filter});
  };

  const handlePrint = () => {
    const element = document.getElementById("report-content-to-print");
    if (!element) return;

    // Create a special wrapper attached to the body to isolate printing
    const printWrapper = document.createElement("div");
    printWrapper.id = "print-report-wrapper";

    const clone = element.cloneNode(true) as HTMLElement;
    const toolbar = clone.querySelector('[data-html2canvas-ignore]');
    if (toolbar) toolbar.remove();

    printWrapper.appendChild(clone);
    document.body.appendChild(printWrapper);

    const style = document.createElement("style");
    style.innerHTML = `
      @media screen {
        #print-report-wrapper {
          display: none;
        }
      }
      @media print {
        body > *:not(#print-report-wrapper) {
          display: none !important;
        }
        #print-report-wrapper {
          display: block;
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);

    // window.print();

    // Clean up after print dialog finishes
    // setTimeout(() => {
    //   if (document.body.contains(printWrapper)) {
    //     document.body.removeChild(printWrapper);
    //   }
    //   if (document.head.contains(style)) {
    //     document.head.removeChild(style);
    //   }
    // }, 500);
  };

  // Info: (20260330 - Julian) 報表標題
  // ToDo: (20260330 - Julian) 翻譯檔
  const getReportTitle = (type: ReportType) => {
    switch (type) {
      case ReportType.BALANCE_SHEET:
        return "資產負債表";
      case ReportType.CASH_FLOW:
        return "現金流量表";
      case ReportType.INCOME_STATEMENT:
        return "綜合損益表";
      default:
        return "";
    }
  };

  // Info: (20260330 - Julian) 報表期間
  // ToDo: (20260330 - Julian) 計算區間與翻譯檔
  const getReportPeriod = (period: ReportPeriod) => {
    switch (period) {
      case ReportPeriod.ALL_YEAR:
        return "2025 全年度";
      case ReportPeriod.Q1:
        return "2025 第一季(Q1)";
      case ReportPeriod.Q2:
        return "2025 第二季(Q2)";
      case ReportPeriod.Q3:
        return "2025 第三季(Q3)";
      case ReportPeriod.Q4:
        return "2025 第四季(Q4)";
      default:
        return "";
    }
  };

  const reportData = generatedConfig
    ? {
        reportTitle: getReportTitle(generatedConfig.type),
        reportPeriod: getReportPeriod(generatedConfig.period),
        currency: generatedConfig.currency,
      }
    : null;

  // Info: (20260330 - Julian) 產出報表
  const handleGenerateReport = () => {
    setGeneratedConfig({
      type: selectedReportType,
      period: selectedReportPeriod,
      currency: "TWD",
    });
  };

  // Info: (20260330 - Julian) 關閉嵌入視窗
  const handleCloseModal = () => setIsEmbedModalOpen(false);

  // Info: (20260330 - Julian) 變更報表種類
  const handleReportTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedReportType(e.target.value as ReportType);
  };

  // Info: (20260330 - Julian) 變更報表期間
  const handleReportPeriodChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setSelectedReportPeriod(e.target.value as ReportPeriod);
  };

  const reportSelection = (
    <div className="flex flex-col space-y-2">
      <label htmlFor="report-type" className="text-sm font-bold text-slate-600">
        報表種類
      </label>
      <select
        id="report-type"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
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

  const periodSelection = (
    <div className="flex flex-col space-y-2">
      <label
        htmlFor="report-period"
        className="text-sm font-bold text-slate-600"
      >
        期間選擇
      </label>
      <select
        id="report-period"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
        value={selectedReportPeriod}
        onChange={handleReportPeriodChange}
      >
        {Object.values(ReportPeriod).map((period) => (
          <option key={period} value={period}>
            {getReportPeriod(period)}
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
        return <BalanceSheetView period={generatedConfig.period} />;
      case ReportType.CASH_FLOW:
        return <CashFlowSheetView period={generatedConfig.period} />;
      case ReportType.INCOME_STATEMENT:
        return <IncomeStatementView period={generatedConfig.period} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="mt-6 flex flex-col gap-8 lg:flex-row">
        {/* Info:(20260319 - Julian) 報表參數設定 */}
        <div className="flex h-fit w-full shrink-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:w-72 print:hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <Filter className="h-5 w-5 text-slate-800" strokeWidth={2.5} />
            <h2 className="text-base font-bold text-slate-800">報表參數設定</h2>
          </div>

          <div className="space-y-6">
            {reportSelection}
            {periodSelection}
            <button
              type="button"
              onClick={handleGenerateReport}
              className="mt-2 w-full rounded-md bg-slate-600 py-2 text-sm font-bold text-white transition-colors outline-none hover:bg-slate-800"
            >
              立即產出報表
            </button>

            {/* Info:(20260319 - Julian) 傳票核對數提示 */}
            <div className="rounded-xl border border-slate-200 bg-gray-50/50 p-4">
              <p className="text-xs leading-relaxed font-medium text-slate-600">
                系統將根據目前已核對的{" "}
                {numberWithCommas(countOfVerifiedVouchers)}{" "}
                筆傳票資訊進行即時彙整。
              </p>
            </div>
          </div>
        </div>

        {/* Info:(20260319 - Julian) 報表內容 */}
        <div
          id="report-content-to-print"
          className="flex w-full flex-col gap-4"
        >
          {!generatedConfig ? (
            <div className="flex h-full min-h-[500px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
              <Filter
                className="mb-4 h-12 w-12 text-slate-300"
                strokeWidth={1.5}
              />
              <h3 className="text-xl font-bold tracking-widest text-slate-700">
                尚未產出報表
              </h3>
              <p className="mt-2 text-sm font-medium">
                請設定需要的報表參數，iSunFA 馬上為您產出報表
              </p>
            </div>
          ) : (
            <>
              {/* Info: (20260331 - Julian) Toolbar */}
              <div data-html2canvas-ignore className="ml-auto flex items-center gap-2 print:hidden">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-lg bg-orange-400 p-3 text-slate-800 outline-none hover:bg-orange-500 active:bg-yellow-400"
                >
                  <Download size={20} />
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-lg bg-orange-400 p-3 text-slate-800 outline-none hover:bg-orange-500 active:bg-yellow-400"
                >
                  <Printer size={20} />
                </button>
              </div>

              {/* Info: (20260330 - Julian) 報表標題 */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-center text-slate-800 shadow-sm md:p-8">
                <div className="absolute top-0 left-0 h-1 w-full bg-amber-500"></div>
                <h2 className="text-2xl font-black tracking-[0.2em] md:text-3xl">
                  ISUNFA 智慧會計系統
                </h2>
                <h3 className="mt-2 text-xl font-bold tracking-widest text-slate-600">
                  {reportData?.reportTitle}
                </h3>
                <p className="mt-2 text-sm font-medium text-slate-400">
                  期間：{reportData?.reportPeriod} (單位：{reportData?.currency}
                  )
                </p>
              </div>

              {/* Info:(20260319 - Julian) 報表內容 */}
              {renderReportView()}
            </>
          )}
        </div>
      </div>

      {/* Info: (20260319 - Julian) Embed Generate Modal */}
      {isEmbedModalOpen && <EmbedGenerateModal onClose={handleCloseModal} />}
    </>
  );
}
