import Skeleton from '@/components/skeleton/skeleton';
import { APIName } from '@/constants/api_connection';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { useUserCtx } from '@/contexts/user_context';
import { TaxReport401Content } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'next-i18next';
import { IDatePeriod } from '@/interfaces/date_period';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { ReportLanguagesKey } from '@/interfaces/report_language';
import { ReportType } from '@/constants/report';
import Image from 'next/image';
import DownloadButton from '@/components/button/download_button';
import PrintButton from '@/components/button/print_button';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/button/button';
import { TiExport } from 'react-icons/ti';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import loggerFront from '@/lib/utils/logger_front';

interface BusinessTaxListProps {
  selectedDateRange: IDatePeriod | null; // Info: (20241024 - Anna) 接收來自上層的日期範圍
  selectedReportLanguage: ReportLanguagesKey; // Info: (20241203 - Anna) 接收語言選擇
}
const BusinessTaxList: React.FC<BusinessTaxListProps> = ({
  selectedDateRange,
  selectedReportLanguage,
}) => {
  const { t } = useTranslation(['reports']);
  const { isAuthLoading, connectedAccountBook } = useUserCtx();

  const printRef = useRef<HTMLDivElement>(null); // Info: (20241204 - Anna) 定義需要列印內容的 ref

  const handlePrint = useReactToPrint({
    contentRef: printRef, // Info: (20241203 - Anna) 指定需要打印的內容 Ref
    documentTitle: `營業稅申報書`,
    onBeforePrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
  });

  // Info: (20250624 - Anna) 下載狀態
  const [isDownloading, setIsDownloading] = useState(false);

  // Info: (20250326 - Anna) 定義 handleDownload
  const handleDownload = async () => {
    setIsDownloading(true);
    if (!printRef.current) {
      return;
    }

    // Info: (20250326 - Anna) 等待 0.5 秒，DOM 完全渲染，再執行之後的程式碼
    await new Promise<void>((resolve) => {
      setTimeout(() => resolve(), 500);
    });

    const downloadPages = printRef.current.querySelectorAll('.download-401-report');
    if (downloadPages.length === 0) {
      return;
    }

    // Info: (20250326 - Anna) jsPDF 是類別，但命名為小寫，需關閉 eslint new-cap
    // eslint-disable-next-line new-cap
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

    // Info: (20250326 - Anna) 逐頁擷取 `.download-401-report` 並添加到 PDF
    const canvasPromises = Array.from(downloadPages, async (page, index) => {
      const canvas = await html2canvas(page as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: true, // Info: (20250326 - Anna) 「顯示除錯訊息」到 console
      });

      const imgData = canvas.toDataURL('image/png');

      if (index === 0) {
        pdf.addImage(imgData, 'PNG', 10, 10, 270, 190);
      } else {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 10, 270, 190);
      }

      return imgData;
    });

    await Promise.all(canvasPromises);

    // Info: (20250326 - Anna) 下載 PDF
    pdf.save('Business_Tax_Report.pdf');
    setIsDownloading(false);
  };

  const displayedSelectArea = () => {
    return (
      <div className="mb-16px flex items-center justify-between px-px max-md:flex-wrap print:hidden">
        <div className="ml-auto flex items-center gap-16px">
          <Button type="button" variant="tertiary" className="h-36px" disabled>
            <p>{t('reports:REPORTS.EXPORT_TAX_FILING_FILE')}</p>
            <TiExport />
          </Button>
          <DownloadButton onClick={handleDownload} />
          <PrintButton onClick={handlePrint} disabled={false} />
        </div>
      </div>
    );
  };

  //  Info: (20241204 - Anna) 新增 isReportGenerated 狀態
  const [isReportGenerated, setIsReportGenerated] = useState<boolean>(false);

  const { trigger: generateFinancialReport } = APIHandler<number | null>(APIName.REPORT_GENERATE);

  const [reportId, setReportId] = useState<string | null>(null); // Info: (20241204 - Anna) 替換 defaultReportId
  const [financialReport, setFinancialReport] = useState<TaxReport401Content | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const downloadReport = `${isDownloading ? 'download-401-report' : ''}`;

  const { trigger: getFinancialReportAPI } = APIHandler<TaxReport401Content>(
    APIName.REPORT_GET_BY_ID
  );

  // Info: (20241204 - Anna) 新增 handleGenerateReport 方法 generate report
  const handleGenerateReport = async () => {
    if (!selectedDateRange || !connectedAccountBook?.id) return;

    const { startTimeStamp, endTimeStamp } = selectedDateRange;

    // Info: (20241204 - Anna) 如果日期範圍的值為 0，直接返回，不執行後續邏輯
    if (startTimeStamp === 0 || endTimeStamp === 0) {
      return;
    }

    try {
      const response = await generateFinancialReport({
        params: { accountBookId: connectedAccountBook.id },
        body: {
          type: FinancialReportTypesKey.report_401,
          reportLanguage: selectedReportLanguage,
          from: startTimeStamp,
          to: endTimeStamp,
          reportType: ReportType.FINANCIAL,
        },
      });

      if (response.success && response.data) {
        setReportId(String(response.data)); // Info: (20241204 - Anna) 保存報告 ID
      }

      // Info: (20241204 - Anna) 設定 isReportGenerated 為 true
      setIsReportGenerated(true);
    } catch (error) {
      loggerFront.error('Error generating report:', error);
    }
  };

  // Info: (20241204 - Anna) 根據報告 ID 加載報告內容
  const getFinancialReport = async () => {
    setIsLoading(true);
    try {
      const { data: report, success: getFRSuccess } = await getFinancialReportAPI({
        params: {
          companyId: connectedAccountBook?.id,
          reportId: reportId ?? NON_EXISTING_REPORT_ID,
        },
      });

      if (!getFRSuccess) {
        return null; // Info: (20241204 - Anna) 添加返回值，避免報錯
      }
      setFinancialReport(report);
      return report; // Info: (20241204 - Anna) 成功時返回獲取的報告
    } catch (error) {
      return null; // Info: (20241204 - Anna) 異常時返回 null
    } finally {
      setIsLoading(false);
    }
  };

  // Info: (20241204 - Anna)  監聽 reportId，觸發報告加載 get report by id
  useEffect(() => {
    if (isAuthLoading || !connectedAccountBook || !reportId || isLoading) return;
    if (isReportGenerated && !isLoading && reportId) {
      setIsLoading(true);
    }
    getFinancialReport();
  }, [isAuthLoading, connectedAccountBook, reportId]);

  // Info: (20241204 - Anna) 在 useEffect 中監聽 selectedDateRange
  useEffect(() => {
    if (!selectedDateRange || !connectedAccountBook?.id) return;

    const { startTimeStamp, endTimeStamp } = selectedDateRange;

    // Info: (20241204 - Anna) 如果日期範圍無效，不生成報告
    if (startTimeStamp === 0 || endTimeStamp === 0) {
      return;
    }

    const generateReport = async () => {
      try {
        await handleGenerateReport();
      } catch (error) {
        loggerFront.error('Error in auto-generating report:', error);
      }
    };

    generateReport();
  }, [selectedDateRange, connectedAccountBook?.id]);

  // Info: (20240730 - Anna) 格式化數字為千分位 - Updated for decimal accounting
  const formatNumber = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    return numValue.toLocaleString();
  };

  // Info: (20240816 - Anna) 轉換和格式化日期
  const createdAt = financialReport?.createdAt ? new Date(financialReport.createdAt * 1000) : null;
  const updatedAt = financialReport?.updatedAt ? new Date(financialReport.updatedAt * 1000) : null;

  const formatToTaiwanDate = (timestamp: number | null) => {
    // Info: (20240816 - Anna) 如果 timestamp 為 null，返回 'N/A'
    if (timestamp === null) return 'N/A';
    const date = new Date(timestamp);
    const taiwanYear = date.getFullYear() - 1911;
    const yearTranslation = t('reports:TAX_REPORT.Y');
    const monthTranslation = t('reports:TAX_REPORT.M');
    const dayTranslation = t('reports:TAX_REPORT.DAY');
    return `${taiwanYear}${yearTranslation} ${format(date, `MM'${monthTranslation}'dd'${dayTranslation}'`)}`;
  };

  const createdTaiwanDate = createdAt ? formatToTaiwanDate(createdAt.getTime()) : 'N/A';
  const updatedTaiwanDate = updatedAt ? formatToTaiwanDate(updatedAt.getTime()) : 'N/A';

  const page1 = isLoading ? (
    <div className="mt-5">
      <Skeleton width={80} height={20} />
    </div>
  ) : (
    <div id="1" className={`${downloadReport} relative overflow-y-hidden bg-white`}>
      <header className="flex w-full justify-between">
        <table className="border-collapse border border-black text-8px">
          <tbody>
            <tr>
              <td className="border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 統一編號 */}
                {t('reports:TAX_REPORT.BUSINESS_ID_NUMBER')}
              </td>
              <td className="border border-black px-1 py-0">
                {financialReport?.content.basicInfo.uniformNumber ?? 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 營業人名稱 */}
                {t('reports:TAX_REPORT.NAME_OF_BUSINESS_ENTITY')}
              </td>
              <td className="border border-black px-1 py-0">
                {financialReport?.content.basicInfo.businessName ?? 'N/A'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 稅籍編號 */}
                {t('reports:TAX_REPORT.TAX_SERIAL_NUMBER')}
              </td>
              <td className="border border-black px-1 py-0">
                {financialReport?.content.basicInfo.taxSerialNumber ?? 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="flex flex-col text-center">
          <h1 className="text-sm font-bold">
            <span>
              {/* Info: (20240814 - Anna) 財政部 */}
              {t('reports:TAX_REPORT.MINISTRY_OF_FINANCE')}
            </span>
            <span>
              {/* Info: (20240814 - Anna) 北區 */}
              {t('reports:TAX_REPORT.NORTH_DISTRICT')}
            </span>
            <span>
              {/* Info: (20240814 - Anna) 國稅局營業人銷售額與稅額申報書(401) */}
              {t('reports:TAX_REPORT.IRS')}
              {t('reports:TAX_REPORT.REPORT_401')}
            </span>
          </h1>
          <p className="text-xs">
            ({/* Info: (20240814 - Anna) 一般稅額計算-專營應稅營業人使用 */}
            {t('reports:TAX_REPORT.GENERAL_TAX_COMPUTATION')})
          </p>
          <div className="flex justify-between text-xs">
            <p className="flex-1 text-center">
              {/* Info: (20240814 - Anna) 所屬年月份: */}
              {t('reports:TAX_REPORT.CURRENT_PERIOD')}
              {financialReport?.content.basicInfo.currentYear ?? 'N/A'}
              {/* Info: (20240814 - Anna) 年 */}
              {t('reports:TAX_REPORT.Y')}
              {financialReport?.content.basicInfo.startMonth ?? 'N/A'}-
              {financialReport?.content.basicInfo.endMonth ?? 'N/A'}
              {/* Info: (20240814 - Anna) 月 */}
              {t('reports:TAX_REPORT.M')}
            </p>
            <p className="text-right">
              {/* Info: (20240814 - Anna) 金額單位:新臺幣元 */}
              {t('reports:TAX_REPORT.CURRENCY_UNIT_NTD')}
            </p>
          </div>
        </div>
        <table className="border-collapse border border-black text-8px">
          <tbody>
            <tr>
              <td
                className="text-nowrap border-l border-r border-t border-black px-1 py-0"
                rowSpan={3}
              >
                {/* Info: (20240814 - Anna) 註記欄 */}
                {t('reports:TAX_REPORT.MARK')}
              </td>
              <td className="border-b border-l border-t border-black px-1 py-0" colSpan={2}>
                {/* Info: (20240814 - Anna) 核准按月申報 */}
                {t('reports:TAX_REPORT.APPROVED_MONTHLY_FILING')}
              </td>
              <td className="w-1/8 border border-black px-1 py-0"></td>
            </tr>
            <tr>
              <td
                className="text-nowrap border-l border-r border-t border-black px-1 py-0"
                rowSpan={2}
              >
                {/* Info: (20240814 - Anna) 核准合併 */}
                {t('reports:TAX_REPORT.APPROVED')}
                <br />
                {/* Info: (20240814 - Anna) 總繳單位 */}
                {t('reports:TAX_REPORT.CONSOLIDATED_FILING')}
              </td>
              <td className="text-nowrap border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 總機構彙總申報 */}
                {t('reports:TAX_REPORT.CONSOLIDATED_FILING_OF_HEAD_OFFICE')}
              </td>
              <td className="w-1/8 border border-black px-1 py-0"></td>
            </tr>
            <tr>
              <td className="text-nowrap border border-black px-1 py-0">
                {/* Info: (20240814 - Anna) 各單位分別申報 */}
                {t('reports:TAX_REPORT.INDIVIDUAL_FILING')}
              </td>
              <td className="w-1/8 border border-black px-1 py-0">V</td>
            </tr>
          </tbody>
        </table>
      </header>
      <table className="w-full border-collapse border border-black text-8px">
        <tbody>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 負責人姓名 */}
              <p>{t('reports:TAX_REPORT.NAME_OF_RESPONSIBLE_PERSON')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>{financialReport?.content.basicInfo.personInCharge ?? 'N/A'}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 營業地址 */}
              <p>{t('reports:TAX_REPORT.BUSINESS_ADDRESS')}</p>
            </td>
            <td className="border border-black px-1 py-0" colSpan={9}>
              <p>{financialReport?.content.basicInfo.businessAddress ?? 'N/A'}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 使用發票份數 */}
              <p>{t('reports:TAX_REPORT.NUMBER_OF_USED_INVOICES')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                <span>
                  {financialReport?.content.basicInfo.usedInvoiceCount !== undefined &&
                  financialReport?.content.basicInfo.usedInvoiceCount !== null
                    ? formatNumber(financialReport.content.basicInfo.usedInvoiceCount)
                    : 'N/A'}
                </span>
                {/* Info: (20240814 - Anna) 份 */}
                <span>{t('reports:TAX_REPORT.COPIES')}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" rowSpan={10}>
              {/* Info: (20240814 - Anna) 銷項 */}
              <p>{t('reports:TAX_REPORT.OUTPUT')}</p>
            </td>
            <td className="border-b border-l border-t border-black px-1 py-0" rowSpan={2}>
              {/* Info: (20240814 - Anna) 項目 */}
              <p>{t('reports:TAX_REPORT.ITEMS')}</p>
            </td>
            <td className="border-b border-r border-t border-black px-1 py-0" rowSpan={2}>
              {/* Info: (20240814 - Anna) 區分 */}
              <p>{t('reports:TAX_REPORT.DISTINGUISHMENT')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={4}>
              {/* Info: (20240814 - Anna) 應稅 */}
              <p>{t('reports:TAX_REPORT.TAXABLE')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={2}>
              {/* Info: (20240814 - Anna) 零稅率銷售額 */}
              <p>{t('reports:TAX_REPORT.ZERO_TAX_RATE_SALES_AMOUNT')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={10}>
              {/* Info: (20240814 - Anna) 稅額 */}
              <p>{t('reports:TAX_REPORT.TAX')}</p>
              {/* Info: (20240814 - Anna) 計算 */}
              <p>{t('reports:TAX_REPORT.CALCULATION')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 代號 */}
              <p>{t('reports:TAX_REPORT.CODE_NUMBER')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 項目 */}
              <p> {t('reports:TAX_REPORT.ITEMS')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 稅額 */}
              <p>{t('reports:TAX_REPORT.TAX')}</p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 銷售額 */}
              <p>{t('reports:TAX_REPORT.SALES_AMOUNT')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 稅額 */}
              <p> {t('reports:TAX_REPORT.TAX')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>1</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)銷項稅額合計 */}
              <p>{t('reports:TAX_REPORT.TOTAL_OUTPUT_TAX')}</p>
            </td>
            <td className="w-8% border border-black px-1 py-0">
              <p>② 101</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.outputTax !== undefined &&
                financialReport?.content.taxCalculation.outputTax !== null
                  ? formatNumber(financialReport?.content.taxCalculation.outputTax)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 三聯式發票、電子計算機發票 */}
              <p>{t('reports:TAX_REPORT.TRIPLICATE_UNIFORM_INVOICE')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>1</p>
            </td>
            <td className="w-8% border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.triplicateAndElectronic.sales !==
                  undefined &&
                financialReport?.content.sales.breakdown.triplicateAndElectronic.sales !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.triplicateAndElectronic.sales
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>2</p>
            </td>
            <td className="w-8% border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.triplicateAndElectronic.tax !==
                  undefined &&
                financialReport?.content.sales.breakdown.triplicateAndElectronic.tax !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.triplicateAndElectronic.tax
                    )
                  : 'N/A'}
              </p>
            </td>
            <td
              className="w-8% justify-between border border-black px-1 py-0 text-right"
              colSpan={2}
            >
              <p className="flex justify-between">
                <span>3</span>
                <span>
                  {financialReport?.content.sales.breakdown.triplicateAndElectronic.zeroTax !==
                    undefined &&
                  financialReport?.content.sales.breakdown.triplicateAndElectronic.zeroTax !== null
                    ? formatNumber(
                        financialReport?.content.sales.breakdown.triplicateAndElectronic.zeroTax
                      )
                    : 'N/A'}
                </span>
                {/* Info: (20240814 - Anna) 非經海關出口應附證明文件者 */}
                <span>
                  ({t('reports:TAX_REPORT.EXPORT_NOT_THROUGH_CUSTOMS_EVIDENCE_REQUIRED')})
                </span>
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>7</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 得扣抵進項稅額合計 */}
              <p>{t('reports:TAX_REPORT.TOTAL_DEDUCTIBLE_INPUT_TAX')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>⑨+⑩ 107</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.deductibleInputTax !== undefined &&
                financialReport?.content.taxCalculation.deductibleInputTax !== null
                  ? formatNumber(financialReport?.content.taxCalculation.deductibleInputTax)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 收銀機發票(三聯式)及電子發票 */}
              <p> {t('reports:TAX_REPORT.CASH_REGISTER_UNIFORM_INVOICE')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>5</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.cashRegisterTriplicate.sales !==
                  undefined &&
                financialReport?.content.sales.breakdown.cashRegisterTriplicate.sales !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.cashRegisterTriplicate.sales
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>6</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.cashRegisterTriplicate.tax !==
                  undefined &&
                financialReport?.content.sales.breakdown.cashRegisterTriplicate.tax !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.cashRegisterTriplicate.tax
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>7</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.cashRegisterTriplicate.zeroTax !==
                  undefined &&
                financialReport?.content.sales.breakdown.cashRegisterTriplicate.zeroTax !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.cashRegisterTriplicate.zeroTax
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>8</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 上期(月)累積留抵稅額 */}
              <p> {t('reports:TAX_REPORT.BUSINESS_TAX_PAYABLE')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>108</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.previousPeriodOffset !== undefined &&
                financialReport?.content.taxCalculation.previousPeriodOffset !== null
                  ? formatNumber(financialReport?.content.taxCalculation.previousPeriodOffset)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 二聯式發票、收銀機發票(二聯式) */}
              <p>{t('reports:TAX_REPORT.DUPLICATE_UNIFORM_INVOICE')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>9</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.duplicateAndCashRegister.sales !==
                  undefined &&
                financialReport?.content.sales.breakdown.duplicateAndCashRegister.sales !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.duplicateAndCashRegister.sales
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>10</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.duplicateAndCashRegister.tax !==
                  undefined &&
                financialReport?.content.sales.breakdown.duplicateAndCashRegister.tax !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.duplicateAndCashRegister.tax
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="justify-between border border-black px-1 py-0" colSpan={2}>
              <p className="flex justify-between">
                <span>11</span>
                <span>
                  {financialReport?.content.sales.breakdown.duplicateAndCashRegister.zeroTax !==
                    undefined &&
                  financialReport?.content.sales.breakdown.duplicateAndCashRegister.zeroTax !== null
                    ? formatNumber(
                        financialReport?.content.sales.breakdown.duplicateAndCashRegister.zeroTax
                      )
                    : 'N/A'}
                </span>
                {/* Info: (20240814 - Anna) 經海關出口免附證明文件者 */}
                <span>({t('reports:TAX_REPORT.EXPORT_THROUGH_CUSTOMS')})</span>
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>10</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 小計 */}
              <p>
                <span>{t('reports:TAX_REPORT.SUBTOTAL')}</span>
                <span>(7+8)</span>
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>110</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.subtotal !== undefined &&
                financialReport?.content.taxCalculation.subtotal !== null
                  ? formatNumber(financialReport?.content.taxCalculation.subtotal)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 免用發票 */}
              <p>{t('reports:TAX_REPORT.EXEMPTION_OF_UNIFORM_INVOICE')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>13</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.invoiceExempt.sales !== undefined &&
                financialReport?.content.sales.breakdown.invoiceExempt.sales !== null
                  ? formatNumber(financialReport?.content.sales.breakdown.invoiceExempt.sales)
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>14</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.invoiceExempt.tax !== undefined &&
                financialReport?.content.sales.breakdown.invoiceExempt.tax !== null
                  ? formatNumber(financialReport?.content.sales.breakdown.invoiceExempt.tax)
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>15</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.invoiceExempt.zeroTax !== undefined &&
                financialReport?.content.sales.breakdown.invoiceExempt.zeroTax !== null
                  ? formatNumber(financialReport?.content.sales.breakdown.invoiceExempt.zeroTax)
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>11</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)應實繳稅額 */}
              <p>
                <span> {t('reports:TAX_REPORT.TAX_PAYABLE_FOR_CURRENT_PERIOD')}</span>
                <span>(1-10)</span>
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>111</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.currentPeriodTaxPayable !== undefined &&
                financialReport?.content.taxCalculation.currentPeriodTaxPayable !== null
                  ? formatNumber(financialReport?.content.taxCalculation.currentPeriodTaxPayable)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 減:退回及折讓 */}
              <p>{t('reports:TAX_REPORT.LESS_SALES_RETURN_AND_ALLOWANCE')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>17</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.returnsAndAllowances.sales !==
                  undefined &&
                financialReport?.content.sales.breakdown.returnsAndAllowances.sales !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.returnsAndAllowances.sales
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>18</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.returnsAndAllowances.tax !== undefined &&
                financialReport?.content.sales.breakdown.returnsAndAllowances.tax !== null
                  ? formatNumber(financialReport?.content.sales.breakdown.returnsAndAllowances.tax)
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>19</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.returnsAndAllowances.zeroTax !==
                  undefined &&
                financialReport?.content.sales.breakdown.returnsAndAllowances.zeroTax !== null
                  ? formatNumber(
                      financialReport?.content.sales.breakdown.returnsAndAllowances.zeroTax
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>12</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)申報留抵稅額 */}
              <p>
                <span>{t('reports:TAX_REPORT.FILING_OFFSET_AGAINST')}</span>
                <span>(10-1)</span>
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>112</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.currentPeriodFilingOffset !== undefined &&
                financialReport?.content.taxCalculation.currentPeriodFilingOffset !== null
                  ? formatNumber(financialReport?.content.taxCalculation.currentPeriodFilingOffset)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2}>
              {/* Info: (20240814 - Anna) 合計 */}
              <p>{t('reports:TAX_REPORT.TOTAL')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>21①</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.total.sales !== undefined &&
                financialReport?.content.sales.breakdown.total.sales !== null
                  ? formatNumber(financialReport?.content.sales.breakdown.total.sales)
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>22②</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.total.tax !== undefined &&
                financialReport?.content.sales.breakdown.total.tax !== null
                  ? formatNumber(financialReport?.content.sales.breakdown.total.tax)
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>23③</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.sales.breakdown.total.zeroTax !== undefined &&
                financialReport?.content.sales.breakdown.total.zeroTax !== null
                  ? formatNumber(financialReport?.content.sales.breakdown.total.zeroTax)
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>13</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 得退稅限額合計 */}
              <p>{t('reports:TAX_REPORT.CEILING_OF_REFUND')}</p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>③×5%+⑩ 113</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.refundCeiling !== undefined &&
                financialReport?.content.taxCalculation.refundCeiling !== null
                  ? formatNumber(financialReport?.content.taxCalculation.refundCeiling)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0" colSpan={2} rowSpan={2}>
              {/* Info: (20240814 - Anna) 銷售額總計 */}
              {t('reports:TAX_REPORT.TOTAL_SALES_AMOUNT')}
              <br />
              ①+③
            </td>
            <td className="border border-black px-1 py-0" rowSpan={2}>
              25⑦
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={5} rowSpan={2}>
              <div className="flex items-center">
                {financialReport?.content.sales.totalTaxableAmount !== undefined &&
                financialReport?.content.sales.totalTaxableAmount !== null
                  ? formatNumber(financialReport?.content.sales.totalTaxableAmount)
                  : 'N/A'}
                {/* Info: (20240814 - Anna) 元 */}
                {t('reports:TAX_REPORT.NTD')}(
                <div>
                  <span>
                    {/* Info: (20240814 - Anna) 內含銷售 */}
                    {t('reports:TAX_REPORT.INCLUDING_SALES')}
                  </span>
                  <br />
                  <span>
                    {/* Info: (20240814 - Anna) 固定資產 */}
                    {t('reports:TAX_REPORT.OF_FIXED_ASSETS')}
                  </span>
                </div>
                ㉗
                {financialReport?.content.sales.includeFixedAsset !== undefined &&
                financialReport?.content.sales.includeFixedAsset !== null
                  ? formatNumber(financialReport?.content.sales.includeFixedAsset)
                  : 'N/A'}
                {/* Info: (20240814 - Anna) 元 */}
                {t('reports:TAX_REPORT.NTD')})
              </div>
            </td>
            <td className="border border-black px-1 py-0">14</td>
            <td className="flex items-center text-nowrap border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)應退稅額 */}
              {/* Info: (20240814 - Anna) 如 */}
              <p>
                {t('reports:TAX_REPORT.REFUNDABLE_TAX')}({t('reports:TAX_REPORT.IF')}
              </p>
              <p>
                <span>12&gt;13</span>
                <br />
                <span>13&gt;12</span>
              </p>
              {/* Info: (20240814 - Anna) 則為 */}
              <p> {t('reports:TAX_REPORT.THEN')}</p>
              <p>
                <span>13</span>
                <br />
                <span>12</span>
              </p>
              )
            </td>
            <td className="border border-black px-1 py-0">
              <p>114</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.currentPeriodRefundableTax !== undefined &&
                financialReport?.content.taxCalculation.currentPeriodRefundableTax !== null
                  ? formatNumber(financialReport?.content.taxCalculation.currentPeriodRefundableTax)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0">
              <p>15</p>
            </td>
            <td className="border border-black px-1 py-0">
              {/* Info: (20240814 - Anna) 本期(月)累積留抵稅額 */}
              <p>
                <span>{t('reports:TAX_REPORT.ACCUMULATED_OFFSET_AGAINST')}</span>
                <span>(12-14)</span>
              </p>
            </td>
            <td className="border border-black px-1 py-0">
              <p>115</p>
            </td>
            <td className="border border-black px-1 py-0 text-right">
              <p>
                {financialReport?.content.taxCalculation.currentPeriodAccumulatedOffset !==
                  undefined &&
                financialReport?.content.taxCalculation.currentPeriodAccumulatedOffset !== null
                  ? formatNumber(
                      financialReport?.content.taxCalculation.currentPeriodAccumulatedOffset
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" rowSpan={16}>
              {/* Info: (20240814 - Anna) 進項 */}
              <p>{t('reports:TAX_REPORT.INPUT')}</p>
            </td>
            <td className="border-b border-l border-t border-black px-1 py-0" rowSpan={2}>
              {/* Info: (20240814 - Anna) 項目 */}
              <p> {t('reports:TAX_REPORT.ITEMS')}</p>
            </td>
            <td className="border-b border-r border-t border-black px-1 py-0" rowSpan={2}>
              {/* Info: (20240814 - Anna) 區分 */}
              <p>{t('reports:TAX_REPORT.DISTINGUISHMENT')}</p>
            </td>
            <td
              className="border-b border-r border-t border-black px-1 py-0 text-center"
              colSpan={6}
            >
              {/* Info: (20240814 - Anna) 得扣抵進項稅額 */}
              <p>{t('reports:TAX_REPORT.DEDUCTIBLE_INPUT_TAX')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={3}>
              {/* Info: (20240814 - Anna) 本期(月)應退稅額處理方式 */}
              <p>{t('reports:TAX_REPORT.WAY_TO_RECEIVE_REFUND')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              <div className="flex flex-nowrap items-center gap-1">
                <input type="checkbox" className="h-2 w-2" />
                <p className="text-nowrap">
                  {/* Info: (20240814 - Anna) 利用存款帳戶劃撥 */}
                  {t('reports:TAX_REPORT.REMITTANCE_TRANSFER')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* Info: (20240814 - Anna) 金額 */}
              <p>{t('reports:TAX_REPORT.AMOUNT')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* Info: (20240814 - Anna) 稅額 */}
              <p>{t('reports:TAX_REPORT.TAX')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              <div className="flex flex-nowrap items-center gap-1">
                <input type="checkbox" className="h-2 w-2" />
                <p className="text-nowrap">
                  {/* Info: (20240814 - Anna) 領取退稅支票 */}
                  {t('reports:TAX_REPORT.TAX_REFUND_CHECK')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              <div className="flex w-full justify-between">
                <div className="flex w-full justify-between">
                  <p>
                    {/* Info: (20240814 - Anna) 統一發票扣抵聯 */}
                    {t('reports:TAX_REPORT.DEDUCTION_COPY_OF_UNIFORM_INVOICE')}
                    <br />
                    {/* Info: (20240814 - Anna) 包括一般稅額計算之電子計算機發票扣抵聯 */}(
                    {t('reports:TAX_REPORT.INCLUDING_COMPUTER_UNIFORM_INVOICE')})
                  </p>
                </div>
              </div>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              <p>{t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>28</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                  .amount !== undefined &&
                financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                  .amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                        .amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>29</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                  .tax !== undefined &&
                financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases.tax !==
                  null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.uniformInvoice.generalPurchases
                        .tax
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={3}>
              {/* Info: (20240814 - Anna) 保稅區營業人按進口報關程序銷售貨物至我國 */}
              <p>{t('reports:TAX_REPORT.SOLD_BY_A_BONDED_ZONE')}</p>
              {/* Info: (20240814 - Anna) 境內課稅區之免開立統一發票銷售額 */}
              <p>{t('reports:TAX_REPORT.TO_A_TAXABLE_ZONE')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" rowSpan={2} colSpan={2}>
              <div className="flex justify-between">
                <p>82</p>
                <p>
                  {financialReport?.content.bondedAreaSalesToTaxArea !== undefined &&
                  financialReport?.content.bondedAreaSalesToTaxArea !== null
                    ? formatNumber(financialReport?.content.bondedAreaSalesToTaxArea)
                    : 'N/A'}
                  {/* Info: (20240814 - Anna) 元 */}
                  {t('reports:TAX_REPORT.NTD')}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              <p>{t('reports:TAX_REPORT.FIXED_ASSETS')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>30</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount !==
                  undefined &&
                financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount !==
                  null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>31</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax !==
                  undefined &&
                financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.uniformInvoice.fixedAssets.tax
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 三聯式收銀機發票扣抵聯 */}
              <p>{t('reports:TAX_REPORT.DEDUCTION_COPY_OF_CASH_REGISTER_UNIFORM_INVOICE')}</p>
              {/* Info: (20240814 - Anna) 及一般稅額計算之電子發票 */}
              <p>{t('reports:TAX_REPORT.ELECTRONIC_INVOICE')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              <p>{t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>32</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                  .generalPurchases.amount !== undefined &&
                financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                  .generalPurchases.amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                        .generalPurchases.amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>33</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                  .generalPurchases.tax !== undefined &&
                financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                  .generalPurchases.tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                        .generalPurchases.tax
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={3}>
              {/* Info: (20240814 - Anna) 申報單位蓋章處(統一發票專用章) */}
              <p>{t('reports:TAX_REPORT.UNIQUE_UNIFORM_INVOICE_CHOP')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 核收機關及人員蓋章處 */}
              <p>{t('reports:TAX_REPORT.STAMP_OF_TAX_AUTHORITY')}</p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              <p>{t('reports:TAX_REPORT.FIXED_ASSETS')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>34</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                  .amount !== undefined &&
                financialReport?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                  .amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                        .fixedAssets.amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>35</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                  .tax !== undefined &&
                financialReport?.content.purchases.breakdown.cashRegisterAndElectronic.fixedAssets
                  .tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.cashRegisterAndElectronic
                        .fixedAssets.tax
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-left" rowSpan={9} colSpan={3}>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 附 1.統一發票明細表 */}
                  {t('reports:TAX_REPORT.ATTACHMENT_LIST_OF_UNIFORM_INVOICE')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 2.進項憑證 */}
                  {t('reports:TAX_REPORT.INPUT_DOCUMENTS')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 冊 */}
                  {t('reports:TAX_REPORT.VOLUMES')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 3.海關代徵營業稅繳納證 */}
                  {t('reports:TAX_REPORT.CERTIFICATE_BY_CUSTOMS')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 4.退回(出)及折讓證明單、海關退還溢繳營業稅申報單 */}
                  {t('reports:TAX_REPORT.CERTIFICATE_OF_RETURN_AND_ALLOWANCE')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 5.營業稅繳款書申報聯 */}
                  {t('reports:TAX_REPORT.BUSINESS_TAX_PAYMENT_NOTICE')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 6.零稅率銷售額清單 */}
                  {t('reports:TAX_REPORT.LIST_OF_ZERO_TAX_RATE_SALES_AMOUNT')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 7.營業稅一次性移轉訂價調整聲明書 */}
                  {t('reports:TAX_REPORT.ONE_TIME_TRANSFER_PRICING_ADJUSTMENT_STATEMENT')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                <span>
                  {/* Info: (20240814 - Anna) 8.營業稅聲明事項表 */}
                  {t('reports:TAX_REPORT.BUSINESS_TAX_DECLARATION_STATEMENT_FORM')}
                </span>
                <span>
                  {/* Info: (20240814 - Anna) 份 */}
                  {t('reports:TAX_REPORT.COPIES')}
                </span>
              </p>
              <p>
                {/* Info: (20240814 - Anna) 申報日期： */}
                {t('reports:TAX_REPORT.FILING_DATE')}
                {createdTaiwanDate ?? 'N/A'}
              </p>
            </td>
            <td
              className="border border-black px-1 py-0 text-center align-bottom"
              rowSpan={9}
              colSpan={2}
            >
              <p>
                {/* Info: (20240814 - Anna) 核收日期： */}
                {t('reports:TAX_REPORT.RECEIVED_DATE')}
                {updatedTaiwanDate ?? 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 載有稅額之其他憑證 */}
              <p> {t('reports:TAX_REPORT.OTHER_VOUCHERS')}</p>
              {/* Info: (20240814 - Anna) 包括二聯式收銀機發票 */}
              <p>({t('reports:TAX_REPORT.INCLUDING_CASH_REGISTER')})</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              <p> {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>36</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                  .amount !== undefined &&
                financialReport?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                  .amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.otherTaxableVouchers
                        .generalPurchases.amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>37</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                  .tax !== undefined &&
                financialReport?.content.purchases.breakdown.otherTaxableVouchers.generalPurchases
                  .tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.otherTaxableVouchers
                        .generalPurchases.tax
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              <p>{t('reports:TAX_REPORT.FIXED_ASSETS')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>38</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                  .amount !== undefined &&
                financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                  .amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                        .amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>39</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                  .tax !== undefined &&
                financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                  .tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.otherTaxableVouchers.fixedAssets
                        .tax
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 海關代徵營業稅繳納證扣抵聯 */}
              <p>{t('reports:TAX_REPORT.CERTIFICATE_OF_PAYMENT_BY_CUSTOMS')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              <p>{t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>78</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                  .amount !== undefined &&
                financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                  .amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.customsDutyPayment
                        .generalPurchases.amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>79</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                  .tax !== undefined &&
                financialReport?.content.purchases.breakdown.customsDutyPayment.generalPurchases
                  .tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.customsDutyPayment
                        .generalPurchases.tax
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              <p>{t('reports:TAX_REPORT.FIXED_ASSETS')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>80</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets
                  .amount !== undefined &&
                financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets
                  .amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets
                        .amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>81</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax !==
                  undefined &&
                financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets.tax !==
                  null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.customsDutyPayment.fixedAssets
                        .tax
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 減 :退出、折讓及海關退還 */}
              <p>{t('reports:TAX_REPORT.DEDUCTION_COPY_OF_CERTIFICATE_OF_PAYMENT')}</p>
              {/* Info: (20240814 - Anna) 溢繳稅款 */}
              <p>{t('reports:TAX_REPORT.FOR_BUSINESS_TAX_COLLECTED_BY_CUSTOMS')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              <p>{t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>40</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                  .amount !== undefined &&
                financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                  .amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.returnsAndAllowances
                        .generalPurchases.amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>41</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {' '}
                {financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                  .tax !== undefined &&
                financialReport?.content.purchases.breakdown.returnsAndAllowances.generalPurchases
                  .tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.returnsAndAllowances
                        .generalPurchases.tax
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              <p>{t('reports:TAX_REPORT.FIXED_ASSETS')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>42</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                  .amount !== undefined &&
                financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                  .amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                        .amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>43</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                  .tax !== undefined &&
                financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                  .tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.returnsAndAllowances.fixedAssets
                        .tax
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-start" rowSpan={2}>
              {/* Info: (20240814 - Anna) 合計 */}
              <p>{t('reports:TAX_REPORT.TOTAL')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              <p> {t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>44</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.total.generalPurchases.amount !==
                  undefined &&
                financialReport?.content.purchases.breakdown.total.generalPurchases.amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.total.generalPurchases.amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>45⑨</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.total.generalPurchases.tax !==
                  undefined &&
                financialReport?.content.purchases.breakdown.total.generalPurchases.tax !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.total.generalPurchases.tax
                    )
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              <p>{t('reports:TAX_REPORT.FIXED_ASSETS')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>46</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.total.fixedAssets.amount !==
                  undefined &&
                financialReport?.content.purchases.breakdown.total.fixedAssets.amount !== null
                  ? formatNumber(
                      financialReport?.content.purchases.breakdown.total.fixedAssets.amount
                    )
                  : 'N/A'}
              </p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>47⑩</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={2}>
              <p>
                {financialReport?.content.purchases.breakdown.total.fixedAssets.tax !== undefined &&
                financialReport?.content.purchases.breakdown.total.fixedAssets.tax !== null
                  ? formatNumber(financialReport?.content.purchases.breakdown.total.fixedAssets.tax)
                  : 'N/A'}
              </p>
            </td>
          </tr>
          <tr>
            <td
              className="items-center text-nowrap border border-black px-1 py-0 text-start"
              rowSpan={2}
            >
              <p>
                {/* Info: (20240814 - Anna) 進項總金額 (包括不得扣抵憑證及普通收據) */}
                {t('reports:TAX_REPORT.TOTAL_INPUT_AMOUNT')}
              </p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 進貨及費用 */}
              <p>{t('reports:TAX_REPORT.PURCHASE_AND_EXPENDITURES')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>48</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={5}>
              <p>
                <span>
                  {financialReport?.content.purchases.totalWithNonDeductible.generalPurchases !==
                    undefined &&
                  financialReport?.content.purchases.totalWithNonDeductible.generalPurchases !==
                    null
                    ? formatNumber(
                        financialReport?.content.purchases.totalWithNonDeductible.generalPurchases
                      )
                    : 'N/A'}
                </span>
                {/* Info: (20240814 - Anna) 元 */}
                <span>{t('reports:TAX_REPORT.NTD')}</span>
              </p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 申辦情形 */}
              <p>{t('reports:TAX_REPORT.FILING_STATUS')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 姓名 */}
              <p>{t('reports:TAX_REPORT.NAME')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 身分證統一編號 */}
              <p>{t('reports:TAX_REPORT.ID_NUMBER')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 電話 */}
              <p>{t('reports:TAX_REPORT.TELEPHONE_NUMBER')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center" rowSpan={2}>
              {/* Info: (20240814 - Anna) 登錄文(字)號 */}
              <p>{t('reports:TAX_REPORT.LOGIN_NUMBER')}</p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 固定資產 */}
              <p>{t('reports:TAX_REPORT.FIXED_ASSETS')}</p>
            </td>
            <td className="border border-black px-1 py-0 text-center">
              <p>49</p>
            </td>
            <td className="border border-black px-1 py-0 text-right" colSpan={5}>
              <p>
                <span>
                  {' '}
                  {financialReport?.content.purchases.totalWithNonDeductible.fixedAssets !==
                    undefined &&
                  financialReport?.content.purchases.totalWithNonDeductible.fixedAssets !== null
                    ? formatNumber(
                        financialReport?.content.purchases.totalWithNonDeductible.fixedAssets
                      )
                    : 'N/A'}
                </span>
                {/* Info: (20240814 - Anna) 元 */}
                <span>{t('reports:TAX_REPORT.NTD')}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 進口免稅貨物 */}
              <p> {t('reports:TAX_REPORT.IMPORTATION_OF_TAX_EXEMPTED_GOODS')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p>73</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-end" colSpan={6}>
              <p>
                <span>
                  {financialReport?.content.imports.taxExemptGoods !== undefined &&
                  financialReport?.content.imports.taxExemptGoods !== null
                    ? formatNumber(financialReport?.content.imports.taxExemptGoods)
                    : 'N/A'}
                </span>
                {/* Info: (20240814 - Anna) 元 */}
                <span>{t('reports:TAX_REPORT.NTD')}</span>
              </p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 自行申報 */}
              <p> {t('reports:TAX_REPORT.SELF_FILING')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p></p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p></p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p></p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p></p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center" colSpan={2}>
              {/* Info: (20240814 - Anna) 購買國外勞務 */}
              <p>{t('reports:TAX_REPORT.PURCHASE_OF_FOREIGN_SERVICES')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p>74</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-end" colSpan={6}>
              <p>
                <span>
                  {financialReport?.content.imports.foreignServices !== undefined &&
                  financialReport?.content.imports.foreignServices !== null
                    ? formatNumber(financialReport?.content.imports.foreignServices)
                    : 'N/A'}
                </span>
                {/* Info: (20240814 - Anna) 元 */}
                <span>{t('reports:TAX_REPORT.NTD')}</span>
              </p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 委任申報 */}
              <p>{t('reports:TAX_REPORT.FILING_BY_AGENT')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p></p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p></p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p></p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              <p></p>
            </td>
          </tr>
          <tr>
            <td className="text-nowrap border border-black px-1 py-0 text-center">
              {/* Info: (20240814 - Anna) 說明 */}
              <p>{t('reports:TAX_REPORT.REMARKS')}</p>
            </td>
            <td className="text-nowrap border border-black px-1 py-0 text-start" colSpan={13}>
              <p>
                {/* Info: (20240814 - Anna) 一、 本申報書適用專營應稅及零稅率之營業人填報。 */}
                <p>{t('reports:TAX_REPORT.REMARKS_1')}</p>
              </p>
              <p>
                {/* Info: (20240814 - Anna) 二、
                如營業人申報當期(月)之銷售額包括有免稅、特種稅額計算銷售額者，請改用(403)申報書申報。 */}
                <p>{t('reports:TAX_REPORT.REMARKS_2')}</p>
              </p>
              <p>
                {/* Info: (20240814 - Anna) 三、
                營業人如有依財政部108年11月15日台財稅字第10804629000號令規定進行一次性移轉訂價調整申報營業稅，除跨境受控交易為進口貨物外，請另填報「營業稅一次性移轉訂價調整聲明書」並檢附相關證明文件，併 */}
                <p>{t('reports:TAX_REPORT.REMARKS_3')}</p>
                {/* Info: (20240814 - Anna) 同會計年度最後一期營業稅申報。 */}
                <p>{t('reports:TAX_REPORT.REMARKS_3_1')}</p>
              </p>
              <p>
                {/* Info: (20240814 - Anna) 四、
                納稅者如有依納稅者權利保護法第7條第8項但書規定，為重要事項陳述者，請另填報「營業稅聲明事項表」並檢附相關證明文件。 */}
                <p>{t('reports:TAX_REPORT.REMARKS_4')}</p>
              </p>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="my-auto flex justify-end py-2">
        <p className="text-8px font-bold">
          {/* Info: (20240814 - Anna) 紙張尺度(297 ×210)公厘 ods檔案格式 */}
          {t('reports:TAX_REPORT.PAPER_SIZE')}
        </p>
      </div>
    </div>
  );

  if (!reportId) {
    return (
      <div className="flex h-screen flex-col items-center justify-center">
        <Image src="/images/empty.svg" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('reports:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('reports:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {displayedSelectArea()}
      <div className="mx-auto w-a4-height origin-top overflow-x-auto" ref={printRef}>
        {page1}
      </div>
    </div>
  );
};

export default BusinessTaxList;
