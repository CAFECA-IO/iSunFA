import { APIName } from '@/constants/api_connection';
import { useUserCtx } from '@/contexts/user_context';
import { FinancialReport } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { FinancialReportTypesKey } from '@/interfaces/report_type';
import { IDatePeriod } from '@/interfaces/date_period';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { useGlobalCtx } from '@/contexts/global_context';
import PrintPreview from '@/components/income_statement_report_body/print_preview';
import { useReactToPrint } from 'react-to-print';
import NoData from '@/components/income_statement_report_body/no_data';
import Loading from '@/components/income_statement_report_body/loading';
import ItemSummary from '@/components/income_statement_report_body/item_summary';
// Todo: (20250115 - Anna) 目前 ItemSummary 資訊已足夠，暫時不需要 ItemDetail
// import ItemDetail from '@/components/income_statement_report_body/item_detail';
import CostRevRatio from '@/components/income_statement_report_body/cost_rev_ratio';
import { useTranslation } from 'next-i18next';

interface FilterBarProps {
  printFn: () => void;
  isChinese: boolean; // Info: (20250108 - Anna) 添加 isChinese 屬性
}
const FilterBar = ({ printFn, isChinese }: FilterBarProps) => {
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();
  return (
    <div className="mb-16px flex items-center justify-between px-px max-md:flex-wrap print:hidden">
      <div className="ml-auto flex items-center gap-24px">
        <DownloadButton onClick={exportVoucherModalVisibilityHandler} disabled />
        <PrintButton onClick={() => printFn()} disabled={!isChinese} />
      </div>
    </div>
  );
};

interface IncomeStatementListProps {
  selectedDateRange: IDatePeriod | null;
}
const IncomeStatementList = ({ selectedDateRange }: IncomeStatementListProps) => {
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const prevSelectedDateRange = useRef<IDatePeriod | null>(null);
  const { isAuthLoading, connectedAccountBook } = useUserCtx();
  const hasCompanyId = isAuthLoading === false && !!connectedAccountBook?.id;
  const [isGetReportAPILoading, setIsGetReportAPILoading] = useState<boolean>(false);
  const [isGetReportAPISuccess, setIsGetReportAPISuccess] = useState<boolean>(false);
  const [reportAPICode, setReportAPICode] = useState<string>('');
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const { trigger: getReportAPI } = APIHandler<FinancialReport>(APIName.REPORT_GET_V2);

  // Info: (20250108 - Anna) 判斷當前語言是否為繁體或簡體中文
  const { i18n } = useTranslation('reports');
  const isChinese = i18n.language === 'tw' || i18n.language === 'cn';

  const printRef = useRef<HTMLDivElement>(null);

  const printFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Income_Statement Report',
  });

  useEffect(() => {
    if (!selectedDateRange) return;

    const getIncomeStatementReport = async () => {
      if (!hasCompanyId || !selectedDateRange || selectedDateRange.endTimeStamp === 0) return;
      if (
        prevSelectedDateRange.current &&
        prevSelectedDateRange.current.startTimeStamp === selectedDateRange.startTimeStamp &&
        prevSelectedDateRange.current.endTimeStamp === selectedDateRange.endTimeStamp
      ) {
        return;
      }
      setIsGetReportAPILoading(true);

      try {
        const { success, data, code } = await getReportAPI({
          params: {
            companyId: connectedAccountBook?.id,
          },
          query: {
            startDate: selectedDateRange.startTimeStamp,
            endDate: selectedDateRange.endTimeStamp,
            language: 'en',
            reportType: FinancialReportTypesKey.comprehensive_income_statement,
          },
        });
        setIsGetReportAPISuccess(success);
        setReportAPICode(code);

        if (success && data) {
          setHasFetchedOnce(true); // Info: (20241024 - Anna) 設定已成功請求過 API
          prevSelectedDateRange.current = selectedDateRange; // Info: (20241024 - Anna) 更新日期範圍
          setFinancialReport(data);
          // Deprecated: (20241204 - Liz)
          // eslint-disable-next-line no-console
          console.log('IncomeStatementList received data:', data);
        }
      } catch (error) {
        // (() => {})(); // Info: (20241024 - Anna) Empty function, does nothing
        // Deprecated: (20241204 - Liz)
        // eslint-disable-next-line no-console
        console.log('Error:', error);
      } finally {
        setIsGetReportAPILoading(false);
      }
    };

    getIncomeStatementReport();
  }, [hasCompanyId, connectedAccountBook?.id, selectedDateRange]);

  if (!hasFetchedOnce && !isGetReportAPILoading) {
    return <NoData />;
  } else if (isGetReportAPILoading) {
    return <Loading />;
  } else if (
    !isGetReportAPISuccess ||
    !financialReport ||
    !Object.prototype.hasOwnProperty.call(financialReport, 'otherInfo') ||
    !financialReport.otherInfo ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'revenueAndExpenseRatio') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'revenueToRD')
  ) {
    return <div>Error: {reportAPICode}</div>;
  }

  // Info: (20240730 - Anna) 轉換和格式化日期
  const curDateFrom = new Date(financialReport.curDate.from * 1000);
  const curDateTo = new Date(financialReport.curDate.to * 1000);
  const preDateFrom = new Date(financialReport.preDate.from * 1000);
  const preDateTo = new Date(financialReport.preDate.to * 1000);
  const formattedCurFromDate = format(curDateFrom, 'yyyy-MM-dd');
  const formattedCurToDate = format(curDateTo, 'yyyy-MM-dd');
  const formattedPreFromDate = format(preDateFrom, 'yyyy-MM-dd');
  const formattedPreToDate = format(preDateTo, 'yyyy-MM-dd');

  return (
    <div className={`relative mx-auto w-full origin-top overflow-x-auto`}>
      {/* Info: (20250108 - Anna) 傳遞 isChinese 給 FilterBar */}
      <FilterBar printFn={printFn} isChinese={isChinese} />
      <div>
        <ItemSummary
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        />
        {/* Todo: (20250115 - Anna) 目前 ItemSummary 資訊已足夠，暫時不需要 ItemDetail */}
        {/* <ItemDetail
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        /> */}
        <CostRevRatio
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        />
      </div>
      <div className="hidden">
        <PrintPreview
          ref={printRef}
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
        />
      </div>
    </div>
  );
};

export default IncomeStatementList;
