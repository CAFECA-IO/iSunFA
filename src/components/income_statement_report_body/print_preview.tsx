import React from 'react';

import Image from 'next/image';
import { FinancialReport } from '@/interfaces/report';
import PrintCostRevRatio from '@/components/income_statement_report_body/print_cost_rev_ratio';
import { format } from 'date-fns';
import Rows from '@/components/income_statement_report_body/rows';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { useTranslation } from 'next-i18next';

interface FirstHeaderProps {
  financialReport: FinancialReport;
}
const FirstHeader = ({ financialReport }: FirstHeaderProps) => {
  const { t } = useTranslation(['reports']);
  const curDateFrom = new Date(financialReport.curDate.from * 1000);
  const curDateTo = new Date(financialReport.curDate.to * 1000);
  const formattedCurFromDate = format(curDateFrom, 'yyyy-MM-dd');
  const formattedCurToDate = format(curDateTo, 'yyyy-MM-dd');
  return (
    <header className="relative mb-100px">
      <div className="relative z-1 ml-20px h-210px w-180px bg-surface-brand-secondary px-14px">
        {financialReport && financialReport.company && (
          <>
            <h1 className="py-30px text-xl font-bold text-white">
              {financialReport.company.code} <br />
              {financialReport.company.name}
            </h1>
            <p className="pb-14px text-xs font-bold leading-5 text-white">
              {formattedCurFromDate} <br /> {t('reports:COMMON.TO')} {formattedCurToDate}
              <br />
              財務報告 - 損益表
            </p>
          </>
        )}
      </div>

      <h1 className="absolute right-0 top-0 z-1 mr-20px mt-24px text-xl font-bold text-surface-brand-secondary-soft">
        Income Statement
      </h1>
      <div className="absolute right-0 top-0 z-1 mt-60px h-10px w-212px bg-surface-brand-primary"></div>
      <div className="absolute right-0 top-0 z-1 mt-74px h-5px w-160px bg-surface-brand-secondary"></div>

      <Image
        className="absolute right-0 top-0 z-0 mt-80px bg-transparent"
        src="/logo/watermark_logo.svg"
        alt="isunfa logo"
        width={400}
        height={300}
      />
    </header>
  );
};

const NormalHeader = () => {
  return (
    <header className="relative h-105px">
      <div className="absolute left-0 top-0 mt-30px flex">
        <div className="h-10px w-170px bg-surface-brand-secondary"></div>
        <div className="h-10px w-35px bg-surface-brand-primary"></div>
      </div>
      <h1 className="absolute right-0 top-0 z-1 mr-20px mt-24px text-xl font-bold text-surface-brand-secondary-soft">
        Income Statement
      </h1>
      <div className="absolute right-0 top-0 z-1 mt-60px h-10px w-212px bg-surface-brand-primary"></div>
      <div className="absolute right-0 top-0 z-1 mt-74px h-5px w-160px bg-surface-brand-secondary"></div>
    </header>
  );
};

interface PrintPreviewProps {
  financialReport: FinancialReport;
  formattedCurFromDate: string;
  formattedCurToDate: string;
  formattedPreFromDate: string;
  formattedPreToDate: string;
}

const PrintPreview = React.forwardRef<HTMLDivElement, PrintPreviewProps>(
  (
    {
      financialReport,
      formattedCurFromDate,
      formattedCurToDate,
      formattedPreFromDate,
      formattedPreToDate,
    },
    ref
  ) => {
    const { t } = useTranslation(['reports']);
    // const [totalPagesForSummary, setTotalPagesForSummary] = useState<number>(0);

    const flattenAccounts = (accounts: IAccountReadyForFrontend[]): IAccountReadyForFrontend[] => {
      const result: IAccountReadyForFrontend[] = [];
      accounts.forEach((account) => {
        result.push(account);
        if (account.children && account.children.length > 0) {
          result.push(...flattenAccounts(account.children));
        }
      });
      return result;
    };

    const flattenGeneralAccounts = financialReport?.general
      ? flattenAccounts(financialReport.general)
      : [];
    const flattenDetailsAccounts = financialReport?.details
      ? flattenAccounts(financialReport.details)
      : [];

    const groupSize = 12;

    const groupedGeneral: IAccountReadyForFrontend[][] = [];
    flattenGeneralAccounts.forEach((account, index) => {
      if (index < 10) {
        if (groupedGeneral.length === 0) groupedGeneral.push([]);
        groupedGeneral[0].push(account);
      } else {
        const groupIndex = Math.floor((index - 10) / groupSize) + 1;
        if (!groupedGeneral[groupIndex]) groupedGeneral[groupIndex] = [];
        groupedGeneral[groupIndex].push(account);
      }
    });

    const totalPagesForSummary = groupedGeneral.length;

    const groupedDetails: IAccountReadyForFrontend[][] = [];
    flattenDetailsAccounts.forEach((account, index) => {
      if (index < 10) {
        if (groupedDetails.length === 0) groupedDetails.push([]);
        groupedDetails[0].push(account);
      } else {
        const groupIndex = Math.floor((index - 10) / groupSize) + 1;
        if (!groupedDetails[groupIndex]) groupedDetails[groupIndex] = [];
        groupedDetails[groupIndex].push(account);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const totalPagesForDetails = groupedDetails.length;

    return (
      <div ref={ref} className="">
        {
          // Print ItemSummary
          groupedGeneral.map((group, index) => (
            <div
              key={group[0].name + group[0].code}
              style={{
                breakBefore: 'page',
                breakAfter: 'page',
              }}
              className="relative h-screen overflow-hidden"
            >
              {index === 0 ? <FirstHeader financialReport={financialReport} /> : <NormalHeader />}

              <section className="relative px-20px text-text-neutral-secondary">
                <table className="w-full border-collapse text-xxs">
                  <thead>
                    <tr>
                      <th
                        colSpan={2}
                        className="text-left text-xs font-semibold leading-5 text-surface-brand-secondary"
                      >
                        {t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}
                      </th>
                      <th
                        colSpan={4}
                        className="whitespace-nowrap text-right text-xs font-semibold leading-5 text-surface-brand-secondary"
                      >
                        <span>{t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}</span>
                        <span className="pl-5">
                          {t('reports:REPORTS.EPS_UNIT')}
                        </span>
                      </th>
                    </tr>
                    <tr className="h-16px"></tr>

                    <tr>
                      <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                        {t('reports:TAX_REPORT.CODE_NUMBER')}
                      </th>
                      <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                        {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                      </th>
                      <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-3px text-end font-semibold">
                        {financialReport && financialReport.company && (
                          <p className="whitespace-nowrap text-center font-barlow font-semibold leading-5">
                            {formattedCurFromDate}
                            <br />
                            {t('reports:COMMON.TO')} {formattedCurToDate}
                          </p>
                        )}
                      </th>
                      <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                        %
                      </th>
                      <th
                        className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-3px text-end font-semibold"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {financialReport && financialReport.company && (
                          <p className="whitespace-nowrap text-center font-barlow font-semibold leading-5">
                            {formattedPreFromDate}
                            <br />
                            {t('reports:COMMON.TO')} {formattedPreToDate}
                          </p>
                        )}
                      </th>
                      <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                        %
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <Rows flattenAccounts={group} isPrint />
                  </tbody>
                </table>
              </section>

              <footer
                key={group[0].name + group[0].code + group[0].accountId}
                className="absolute bottom-0 left-0 right-0 z-1 flex items-center justify-between bg-surface-brand-secondary p-10px"
              >
                <p className="text-xs text-white">{index + 1}</p>
                <div className="text-base font-bold text-surface-brand-secondary">
                  <Image
                    width={80}
                    height={20}
                    src="/logo/white_isunfa_logo_light.svg"
                    alt="iSunFA Logo"
                  />
                </div>
              </footer>
            </div>
          ))
        }

        {
          // Print ItemDetail
          groupedDetails.map((group, index) => (
            <div
              key={group[0].name + group[0].code}
              style={{
                breakBefore: 'page',
                breakAfter: 'page',
              }}
              className="relative h-screen overflow-hidden"
            >
              <NormalHeader />
              <section className="relative px-20px text-text-neutral-secondary">
                <table className="w-full border-collapse text-xxs">
                  <thead>
                    <tr>
                      <th
                        colSpan={2}
                        className="text-left text-xs font-semibold leading-5 text-surface-brand-secondary"
                      >
                        {t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}
                      </th>
                      <th
                        colSpan={4}
                        className="whitespace-nowrap text-right text-xs font-semibold leading-5 text-surface-brand-secondary"
                      >
                        <span>{t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}</span>
                        <span className="pl-5">
                          {t('reports:REPORTS.EPS_UNIT')}
                        </span>
                      </th>
                    </tr>
                    <tr className="h-16px"></tr>

                    <tr>
                      <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                        {t('reports:TAX_REPORT.CODE_NUMBER')}
                      </th>
                      <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                        {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                      </th>
                      <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-3px text-end font-semibold">
                        {financialReport && financialReport.company && (
                          <p className="whitespace-nowrap text-center font-barlow font-semibold leading-5">
                            {formattedCurFromDate}
                            <br />
                            {t('reports:COMMON.TO')} {formattedCurToDate}
                          </p>
                        )}
                      </th>
                      <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                        %
                      </th>
                      <th
                        className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-3px text-end font-semibold"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {financialReport && financialReport.company && (
                          <p className="whitespace-nowrap text-center font-barlow font-semibold leading-5">
                            {formattedPreFromDate}
                            <br />
                            {t('reports:COMMON.TO')} {formattedPreToDate}
                          </p>
                        )}
                      </th>
                      <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                        %
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    <Rows flattenAccounts={group} isPrint />
                  </tbody>
                </table>
              </section>
              <footer
                key={group[0].name + group[0].code + group[0].accountId}
                className="absolute bottom-0 left-0 right-0 z-1 flex items-center justify-between bg-surface-brand-secondary p-10px"
              >
                <p className="text-xs text-white">{totalPagesForSummary + index + 1}</p>
                <div className="text-base font-bold text-surface-brand-secondary">
                  <Image
                    width={80}
                    height={20}
                    src="/logo/white_isunfa_logo_light.svg"
                    alt="iSunFA Logo"
                  />
                </div>
              </footer>
            </div>
          ))
        }

        <PrintCostRevRatio
          financialReport={financialReport}
          formattedCurFromDate={formattedCurFromDate}
          formattedCurToDate={formattedCurToDate}
          formattedPreFromDate={formattedPreFromDate}
          formattedPreToDate={formattedPreToDate}
          defaultPageNumber={totalPagesForSummary + totalPagesForDetails}
        />
      </div>
    );
  }
);

export default PrintPreview;
