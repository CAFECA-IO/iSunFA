import { SkeletonList } from '@/components/skeleton/skeleton';
import { useUserCtx } from '@/contexts/user_context';
import { APIName } from '@/constants/api_connection';
import { NON_EXISTING_REPORT_ID } from '@/constants/config';
import { DEFAULT_SKELETON_COUNT_FOR_PAGE } from '@/constants/display';
import { FinancialReport, IncomeStatementOtherInfo } from '@/interfaces/report';
import APIHandler from '@/lib/utils/api_handler';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import CollapseButton from '@/components/button/collapse_button';
import { numberBeDashIfFalsy } from '@/lib/utils/common';
import IncomeStatementReportTableRow from '@/components/income_statement_report_body/income_statement_report_table_row';
import { useTranslation } from 'next-i18next';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

interface IIncomeStatementReportBodyAllProps {
  reportId: string;
}

const IncomeStatementReportBodyAll = ({ reportId }: IIncomeStatementReportBodyAllProps) => {
  const { t } = useTranslation('reports');
  const { connectedAccountBook } = useUserCtx();
  // Info: (20241001 - Anna) 管理表格摺疊狀態
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  // Info: (20241001 - Anna) 切換摺疊狀態
  const toggleSummaryTable = () => {
    setIsSummaryCollapsed(!isSummaryCollapsed);
  };

  const toggleDetailTable = () => {
    setIsDetailCollapsed(!isDetailCollapsed);
  };

  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGetFinancialReportSuccess, setIsGetFinancialReportSuccess] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<string>('');

  const { trigger: getFinancialReportAPI } = APIHandler<FinancialReport>(APIName.REPORT_GET_BY_ID);

  useEffect(() => {
    if (isLoading) return;
    setIsLoading(true);

    const getFinancialReport = async () => {
      try {
        const {
          data: report,
          code: getFRCode,
          success: getFRSuccess,
        } = await getFinancialReportAPI({
          params: {
            companyId: 1,
            reportId: reportId ?? NON_EXISTING_REPORT_ID,
            accountBookId: connectedAccountBook?.id,
          },
        });

        if (!getFRSuccess) {
          return;
        }

        // Info: (20250217 - Anna) 篩選 general 和 details，只保留四個數據不為 0 的項目
        if (report) {
          const filteredGeneral =
            report.general?.filter(
              (item) =>
                !(
                  // Info: (20250217 - Anna) 如果 item. 是 null 或 undefined，則轉為 0 再進行判斷
                  (
                    DecimalOperations.isZero(item.curPeriodAmount ?? '0') &&
                    DecimalOperations.isZero(item.curPeriodPercentage ?? '0') &&
                    DecimalOperations.isZero(item.prePeriodAmount ?? '0') &&
                    DecimalOperations.isZero(item.prePeriodPercentage ?? '0')
                  )
                )
            ) ?? [];

          const filteredDetails =
            report.details?.filter(
              (item) =>
                !(
                  DecimalOperations.isZero(item.curPeriodAmount ?? '0') &&
                  DecimalOperations.isZero(item.curPeriodPercentage ?? '0') &&
                  DecimalOperations.isZero(item.prePeriodAmount ?? '0') &&
                  DecimalOperations.isZero(item.prePeriodPercentage ?? '0')
                )
            ) ?? [];

          setFinancialReport({
            ...report, // Info: (20250217 - Anna) 保留原有數據
            general: filteredGeneral, // Info: (20250217 - Anna) 更新 general
            details: filteredDetails, // Info: (20250217 - Anna) 更新 details
          });
        }
        setIsGetFinancialReportSuccess(getFRSuccess);
        setErrorCode(getFRCode);
      } catch (error) {
        // console.log('error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getFinancialReport();
  }, [reportId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={DEFAULT_SKELETON_COUNT_FOR_PAGE} />
      </div>
    );
  } else if (
    !isGetFinancialReportSuccess ||
    !financialReport ||
    !Object.prototype.hasOwnProperty.call(financialReport, 'otherInfo') ||
    !financialReport.otherInfo ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'revenueAndExpenseRatio') ||
    !Object.prototype.hasOwnProperty.call(financialReport.otherInfo, 'revenueToRD')
  ) {
    return <div>錯誤 {errorCode}</div>;
  }
  const renderedFooter = (pageNumber: number) => (
    <footer className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-between bg-surface-brand-secondary p-10px">
      <p className="text-xs text-white">{pageNumber}</p>
      <div className="text-base font-bold text-surface-brand-secondary">
        <Image width={80} height={20} src="/logo/white_isunfa_logo_light.svg" alt="iSunFA Logo" />
      </div>
    </footer>
  );
  const otherInfo = financialReport?.otherInfo as IncomeStatementOtherInfo;

  /* Info: (20240730 - Anna) 計算 totalCost 和 salesExpense 的 curPeriodAmount 和 prePeriodAmount 的總和 */
  const curPeriodTotal = numberBeDashIfFalsy(
    parseFloat(DecimalOperations.add(
      DecimalOperations.add(
        otherInfo?.revenueAndExpenseRatio.totalCost?.curPeriodAmount || '0',
        otherInfo?.revenueAndExpenseRatio.salesExpense?.curPeriodAmount || '0'
      ),
      otherInfo?.revenueAndExpenseRatio.administrativeExpense?.curPeriodAmount || '0'
    ))
  ); // Info: (20241021 - Murky) @Anna, add administrativeExpense
  const prePeriodTotal = numberBeDashIfFalsy(
    parseFloat(DecimalOperations.add(
      DecimalOperations.add(
        otherInfo?.revenueAndExpenseRatio.totalCost?.prePeriodAmount || '0',
        otherInfo?.revenueAndExpenseRatio.salesExpense?.prePeriodAmount || '0'
      ),
      otherInfo?.revenueAndExpenseRatio.administrativeExpense?.prePeriodAmount || '0'
    ))
  ); // Info: (20241021 - Murky) @Anna, add administrativeExpense

  /* Info: (20240730 - Anna) 提取 curRatio 、 preRatio 、revenueToRD */
  const curRatio = otherInfo?.revenueAndExpenseRatio.ratio.curRatio || 0;
  const preRatio = otherInfo?.revenueAndExpenseRatio.ratio.preRatio || 0;
  const revenueToRD = otherInfo?.revenueToRD;
  /* Info: (20240730 - Anna) 格式化數字為千分位 */
  // const formatNumber = (num: number) => num.toLocaleString();
  /* Info: (20240730 - Anna) 轉換和格式化日期 */
  const curDateFrom = new Date(financialReport.curDate.from * 1000);
  const curDateTo = new Date(financialReport.curDate.to * 1000);
  const preDateFrom = new Date(financialReport.preDate.from * 1000);
  const preDateTo = new Date(financialReport.preDate.to * 1000);
  const formattedCurFromDate = format(curDateFrom, 'yyyy-MM-dd');
  const formattedCurToDate = format(curDateTo, 'yyyy-MM-dd');
  const formattedPreFromDate = format(preDateFrom, 'yyyy-MM-dd');
  const formattedPreToDate = format(preDateTo, 'yyyy-MM-dd');

  const page1 = (
    <div id="1" className="relative h-a4-height overflow-hidden">
      {/* Info: (20240723 - Anna) watermark logo */}
      <div className="relative right-0 top-16 z-0">
        <Image
          className="absolute right-0 top-0"
          src="/logo/watermark_logo.svg"
          alt="isunfa logo"
          width={400}
          height={300}
        />
      </div>
      <header className="mb-50px flex justify-between text-white">
        <div className="w-30% bg-surface-brand-secondary pb-14px pl-10px pr-14px pt-40px font-bold">
          <div className="">
            {financialReport && financialReport.company && (
              <>
                <h1 className="mb-30px text-h6">
                  {financialReport.company.code} <br />
                  {financialReport.company.name}
                </h1>
                <p className="text-left text-xs font-bold leading-5">
                  <span>
                    {formattedCurFromDate} <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </span>
                  <br />
                  <span className="mt-3 block">財務報告 - 綜合損益表</span>
                </p>
              </>
            )}
          </div>
        </div>
        <div className="box-border w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="text-xs font-bold leading-5">
              {t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}
            </p>
            <CollapseButton onClick={toggleSummaryTable} isCollapsed={isSummaryCollapsed} />
          </div>
          <p className="text-xs font-bold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {financialReport.company.accountingSetting?.currency}
            </span>
          </p>
        </div>
        {!isSummaryCollapsed && (
          <table className="relative z-1 w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                  {t('reports:TAX_REPORT.CODE_NUMBER')}
                </th>
                <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                  {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                </th>
                <th className="w-120px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                  {!isSummaryCollapsed && financialReport && financialReport.company && (
                    <p className="text-center font-barlow text-xs font-semibold leading-5">
                      {formattedCurFromDate}
                      <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                  %
                </th>
                <th
                  className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {financialReport && financialReport.company && (
                    <p className="text-center font-barlow text-xs font-semibold leading-5">
                      {formattedPreFromDate}
                      <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {financialReport &&
                financialReport.general &&
                financialReport.general
                  .slice(0, 10)
                  .map((value, index) => (
                    <IncomeStatementReportTableRow {...value} key={`${'general' + index}`} />
                  ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
  const page2 = (
    <div id="2" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
          <p className="text-xs font-bold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {financialReport.company.accountingSetting?.currency}
            </span>
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate} <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate} <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.general &&
              financialReport.general
                .slice(10, 24)
                .map((value, index) => (
                  <IncomeStatementReportTableRow {...value} key={`${'general' + index}`} />
                ))}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page3 = (
    <div id="3" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
          <p className="text-xs font-bold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {financialReport.company.accountingSetting?.currency}
            </span>
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate}
                    <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate}
                    <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.general &&
              financialReport.general
                .slice(24, 33)
                .map((value, index) => (
                  <IncomeStatementReportTableRow {...value} key={`${'general' + index}`} />
                ))}
          </tbody>
          <tbody>
            {financialReport &&
              financialReport.general &&
              financialReport.general
                .slice(33, 36)
                .map((value, index) => (
                  <IncomeStatementReportTableRow {...value} key={`${'general' + index}`} />
                ))}
          </tbody>
        </table>
        <div className="relative mt-6">
          <Image
            className="absolute -bottom-100px right-0 h-auto w-auto opacity-5"
            src="/logo/watermark_logo.svg"
            alt="iSunFA"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page4 = (
    <div id="4" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="text-xs font-bold leading-5">
              {t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}
            </p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p className="text-xs font-bold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {financialReport.company.accountingSetting?.currency}
            </span>
          </p>
        </div>
        {!isDetailCollapsed && (
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                  {t('reports:TAX_REPORT.CODE_NUMBER')}
                </th>
                <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                  {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                </th>
                <th
                  className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {!isDetailCollapsed && financialReport && financialReport.company && (
                    <p className="text-center font-barlow text-xs font-semibold leading-5">
                      {formattedCurFromDate}
                      <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                  %
                </th>
                <th
                  className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {financialReport && financialReport.company && (
                    <p className="text-center font-barlow text-xs font-semibold leading-5">
                      {formattedPreFromDate}
                      <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {financialReport &&
                financialReport.details &&
                financialReport.details
                  .slice(0, 14)
                  .map((value, index) => (
                    <IncomeStatementReportTableRow {...value} key={`${'details' + index}`} />
                  ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
  const page5 = (
    <div id="5" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">
            {t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}
          </p>
          <p className="text-xs font-bold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {financialReport.company.accountingSetting?.currency}
            </span>
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate}
                    <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate}
                    <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              financialReport.details
                .slice(14, 28)
                .map((value, index) => (
                  <IncomeStatementReportTableRow {...value} key={`${'details' + index}`} />
                ))}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page6 = (
    <div id="6" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">
            {t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}
          </p>
          <p className="text-xs font-bold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {financialReport.company.accountingSetting?.currency}
            </span>
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate}
                    <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate}
                    <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              financialReport.details
                .slice(28, 39)
                .map((value, index) => (
                  <IncomeStatementReportTableRow {...value} key={`${'details' + index}`} />
                ))}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page7 = (
    <div id="7" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">
            {t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}
          </p>
          <p className="text-xs font-bold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {financialReport.company.accountingSetting?.currency}
            </span>
          </p>
        </div>
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate} <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate} <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              financialReport.details
                .slice(39, 49)
                .map((value, index) => (
                  <IncomeStatementReportTableRow {...value} key={`${'details' + index}`} />
                ))}
          </tbody>
        </table>
      </section>
    </div>
  );
  const page8 = (
    <div id="8" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">
            {t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}
          </p>
          <p className="text-xs font-bold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {financialReport.company.accountingSetting?.currency}
            </span>
          </p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate}
                    <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate}
                    <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                  </p>
                )}
              </th>
              <th className="w-45px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-xs font-semibold">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {financialReport &&
              financialReport.details &&
              financialReport.details
                .slice(49, 58)
                .map((value, index) => (
                  <IncomeStatementReportTableRow {...value} key={`${'details' + index}`} />
                ))}
          </tbody>
          <tbody>
            {financialReport &&
              financialReport.details &&
              financialReport.details.slice(58, 62).map((value, index) => (
                <tr key={`${value.code + index}`} className="h-40px">
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {value.code}
                  </td>
                  <td className="w-177px border border-stroke-neutral-quaternary p-10px text-xs">
                    {value.name}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {DecimalOperations.isZero(value.curPeriodAmount ?? '0') ? '-' : value.curPeriodAmount}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
                    &nbsp;
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {DecimalOperations.isZero(value.prePeriodAmount ?? '0') ? '-' : value.prePeriodAmount}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-center text-xs">
                    &nbsp;
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {/* Info: (20240724 - Anna) watermark logo */}
        <div className="relative right-0 -z-10" style={{ top: '-280px' }}>
          <Image
            className="absolute right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );
  const page9 = (
    <div id="9" className="relative h-a4-height overflow-hidden">
      <header className="flex justify-between text-white">
        <div className="mt-30px flex w-28%">
          <div className="h-10px w-82.5% bg-surface-brand-secondary"></div>
          <div className="h-10px w-17.5% bg-surface-brand-primary"></div>
        </div>
        <div className="flex flex-col">
          <div className="h-1 bg-surface-brand-secondary"></div>
          <div className="mt-1 h-1 bg-surface-brand-primary"></div>
        </div>
        <div className="w-35% text-right">
          <h2 className="relative border-b-6px border-b-surface-brand-primary pr-5 pt-6 text-h6 font-bold text-surface-brand-secondary-soft">
            Income Statement
            <span className="absolute -bottom-20px right-0 h-5px w-75% bg-surface-brand-secondary"></span>
          </h2>
        </div>
      </header>
      <section className="relative text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">
            三、{t('reports:REPORTS.RELATIONSHIP_BETWEEN_EXPENSES_COSTS_REVENUE')}
          </p>
          <p className="text-xs font-bold leading-5">
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="relative z-10 w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate} <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </p>
                )}
              </th>
              <th
                className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold"
                style={{ whiteSpace: 'nowrap' }}
              >
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate} <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                  </p>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.revenue && (
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.revenue.code}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t(
                      `reports:ACCOUNTING_ACCOUNT.${otherInfo.revenueAndExpenseRatio.revenue.name}`
                    )}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.revenue.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.revenue.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            <tr>
              <td className="border border-stroke-neutral-quaternary p-10px text-xs">&nbsp;</td>
              <td className="border border-stroke-neutral-quaternary p-10px text-xs">&nbsp;</td>
              <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                &nbsp;
              </td>
              <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                &nbsp;
              </td>
            </tr>
          </tbody>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.totalCost && (
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.totalCost.code}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t(
                      `reports:ACCOUNTING_ACCOUNT.${otherInfo.revenueAndExpenseRatio.totalCost.name}`
                    )}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.totalCost.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.totalCost.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.salesExpense && (
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.code}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t(
                      `reports:ACCOUNTING_ACCOUNT.${otherInfo.revenueAndExpenseRatio.salesExpense.name}`
                    )}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.salesExpense.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            {otherInfo &&
              otherInfo.revenueAndExpenseRatio &&
              otherInfo.revenueAndExpenseRatio.administrativeExpense && (
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.code}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t(
                      `reports:ACCOUNTING_ACCOUNT.${otherInfo.revenueAndExpenseRatio.administrativeExpense.name}`
                    )}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {otherInfo.revenueAndExpenseRatio.administrativeExpense.prePeriodAmountString}
                  </td>
                </tr>
              )}
          </tbody>
          <tbody>
            <tr className="font-semibold">
              <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                &nbsp;
              </td>
              <td className="border border-stroke-neutral-quaternary p-10px text-start text-xs">
                {t(`reports:REPORTS.TOTAL_EXPENSES_AND_COSTS`)}
              </td>
              <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                {curPeriodTotal}
              </td>
              <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                {prePeriodTotal}
              </td>
            </tr>
          </tbody>
        </table>
        {financialReport && financialReport.company && (
          <p className="mt-4 text-xs">
            <span>
              {formattedCurFromDate} {t('reports:COMMON.TO')} {formattedCurToDate}
            </span>
            <span className="ml-2">
              {t('reports:REPORTS.REVENUE_RATIO', { ratio: parseFloat(curRatio.toString()).toFixed(2) })}
            </span>
          </p>
        )}
        {financialReport && financialReport.company && (
          <p className="mt-4 text-xs">
            <span>
              {formattedPreFromDate} {t('reports:COMMON.TO')} {formattedPreToDate}
            </span>
            <span className="ml-2">
              {t('reports:REPORTS.REVENUE_RATIO', { ratio: parseFloat(preRatio.toString()).toFixed(2) })}
            </span>
          </p>
        )}
        <div className="mb-4 mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <p className="text-xs font-bold leading-5">四、{t('reports:REPORTS.REVENUE_TO_RD')}</p>
          <p className="text-xs font-bold leading-5">
            {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
            {financialReport.company.accountingSetting?.currency}
          </p>
        </div>
        <table className="relative z-10 mb-75px w-full border-collapse bg-white">
          <thead>
            <tr>
              <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:TAX_REPORT.CODE_NUMBER')}
              </th>
              <th className="w-250px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-xs font-semibold">
                {t('reports:REPORTS.ACCOUNTING_ITEMS')}
              </th>
              <th className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedCurFromDate} <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
                  </p>
                )}
              </th>
              <th className="w-120px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-end text-xs font-semibold">
                {financialReport && financialReport.company && (
                  <p className="text-center font-barlow text-xs font-semibold leading-5">
                    {formattedPreFromDate} <br /> {t('reports:COMMON.TO')} {formattedPreToDate}
                  </p>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {revenueToRD && (
              <>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {revenueToRD.revenue.code}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t(`reports:ACCOUNTING_ACCOUNT.${revenueToRD.revenue.name}`)}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {revenueToRD.revenue.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {revenueToRD.revenue.prePeriodAmountString}
                  </td>
                </tr>
                <tr>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {revenueToRD.researchAndDevelopmentExpense.code}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-xs">
                    {t(
                      `reports:ACCOUNTING_ACCOUNT.${revenueToRD.researchAndDevelopmentExpense.name}`
                    )}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {revenueToRD.researchAndDevelopmentExpense.curPeriodAmountString}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {revenueToRD.researchAndDevelopmentExpense.prePeriodAmountString}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    &nbsp;
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-start text-xs">
                    {t('reports:REPORTS.REVENUE_TO_RD')}
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {/* Info: (20240724 - Anna) 保留兩位小數 */}
                    {parseFloat(revenueToRD.ratio.curRatio.toString()).toFixed(2)}%
                  </td>
                  <td className="border border-stroke-neutral-quaternary p-10px text-end text-xs">
                    {parseFloat(revenueToRD.ratio.preRatio.toString()).toFixed(2)}%
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        {/* Info: (20240724 - Anna) watermark logo */}
        <div className="relative right-0 -z-10" style={{ top: '-350px' }}>
          <Image
            className="absolute right-0"
            src="/logo/watermark_logo.svg"
            alt="isunfa logo"
            width={450}
            height={300}
          />
        </div>
      </section>
    </div>
  );

  // Info: (20250217 - Anna) 取得 general 和 details 的資料筆數，用於判斷是否要顯示對應頁面
  const generalLength = financialReport?.general?.length || 0;
  const detailsLength = financialReport?.details?.length || 0;

  // Info: (20250217 - Anna) 第一部分：Summary (彙總)
  const hasPage1 = generalLength > 0;
  const hasPage2 = generalLength > 10; // Info: (20250217 - Anna) (page1 -> slice(0, 10))
  const hasPage3 = generalLength > 24; // Info: (20250217 - Anna) (page2 -> slice(10, 24))

  // Info: (20250217 - Anna) 第二部分：Details (細項)
  const hasPage4 = detailsLength > 0;
  const hasPage5 = detailsLength > 14; // Info: (20250217 - Anna) (page4 -> slice(0, 14))
  const hasPage6 = detailsLength > 28; // Info: (20250217 - Anna) (page5 -> slice(14, 28))
  const hasPage7 = detailsLength > 39; // Info: (20250217 - Anna) (page6 -> slice(28, 39))
  const hasPage8 = detailsLength > 49; // Info: (20250217 - Anna) (page7 -> slice(39, 49))

  const pages: { component: React.ReactElement; pageNumber: number }[] = [];
  let currentPageNumber = 1; // Info: (20250217 - Anna) 追蹤實際的顯示頁碼

  // Info: (20250217 - Anna) 第一部分：Summary (彙總)
  if (hasPage1) {
    pages.push({ component: page1, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage2) {
    pages.push({ component: page2, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage3) {
    pages.push({ component: page3, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }

  // Info: (20250217 - Anna) 第二部分：Details (細項)
  if (hasPage4) {
    pages.push({ component: page4, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage5) {
    pages.push({ component: page5, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage6) {
    pages.push({ component: page6, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage7) {
    pages.push({ component: page7, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }
  if (hasPage8) {
    pages.push({ component: page8, pageNumber: currentPageNumber });
    currentPageNumber += 1;
  }

  // Info: (20250217 - Anna) 第三部分：固定的圖表頁 (不受資料長度影響)
  pages.push({ component: page9, pageNumber: currentPageNumber });

  // Info: (20250217 - Anna) 依據資料長度，動態 render 頁面
  return (
    <div className="mx-auto w-a4-width origin-top overflow-x-auto">
      {pages.map(({ component, pageNumber }, index) => (
        <React.Fragment key={`page-${index + 1}`}>
          {index !== 0 && <hr className="break-before-page" />}
          {/* Info: (20250217 - Anna) 原本 component（ page1, page2 ...）沒有 renderedFooter(pageNumber)，所以透過 React.cloneElement() 動態新增到 component 的 children 裡 */}
          {React.cloneElement(component, {
            children: [...component.props.children, renderedFooter(pageNumber)],
          })}
        </React.Fragment>
      ))}
    </div>
  );
};

export default IncomeStatementReportBodyAll;
