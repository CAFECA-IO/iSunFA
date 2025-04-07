import React from 'react';
// import Image from 'next/image';
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

      <img
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

interface DownloadPreviewProps {
  financialReport: FinancialReport;
  formattedCurFromDate: string;
  formattedCurToDate: string;
  formattedPreFromDate: string;
  formattedPreToDate: string;
  className?: string;
}

const DownloadPreview = React.forwardRef<HTMLDivElement, DownloadPreviewProps>(
  (
    {
      financialReport,
      formattedCurFromDate,
      formattedCurToDate,
      formattedPreFromDate,
      formattedPreToDate,
      className,
    },
    ref
  ) => {
    const { t } = useTranslation(['reports']);

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

    const firstPageSize = 8; // Info: (20250214 - Anna) 第一頁最多顯示 8 項
    const groupSize = 12;

    // Info: (20250214 - Anna) 過濾掉沒有金額的項目
    const filteredAccounts = flattenGeneralAccounts.filter((account) => {
      const normalizeValue = (value: unknown) => {
        if (typeof value === 'number') return value; // Info: (20250214 - Anna) 若是數字，直接返回
        if (typeof value === 'string' && value.trim() === '-') return 0; // Info: (20250214 - Anna) 若是 "-"，當作 0 處理
        return Number(value) || 0; // Info: (20250214 - Anna) 若是其他可轉數字的字串，轉換為數字，否則當作 0
      };

      const curAmount = normalizeValue(account.curPeriodAmount);
      const curPercentage = normalizeValue(account.curPeriodPercentage);
      const preAmount = normalizeValue(account.prePeriodAmount);
      const prePercentage = normalizeValue(account.prePeriodPercentage);

      // Info: (20250214 - Anna) 判斷四個值是否全為 0
      const isAllZeroOrDash =
        curAmount === 0 && curPercentage === 0 && preAmount === 0 && prePercentage === 0;

      return !isAllZeroOrDash; // Info: (20250214 - Anna) 只有當四個值 都為0才過濾掉
    });

    // Info: (20250214 - Anna) 重新分組，確保沒有空白行或空白頁
    const groupedGeneral: IAccountReadyForFrontend[][] = [];
    let currentGroup: IAccountReadyForFrontend[] = [];
    let pageSize = firstPageSize; // Info: (20250214 - Anna) 第一頁是 10 項，之後變 12 項

    filteredAccounts.forEach((account) => {
      currentGroup.push(account);

      // Info: (20250214 - Anna) 如果當前分頁達到 `pageSize`，則放入 `groupedGeneral`，並重置 currentGroup
      if (currentGroup.length === pageSize) {
        groupedGeneral.push(currentGroup);
        currentGroup = [];
        pageSize = groupSize; // Info: (20250214 - Anna) 之後的頁面都固定為 12 筆
      }
    });

    // Info: (20250214 - Anna) 確保最後一頁不會遺漏數據
    if (currentGroup.length > 0) {
      groupedGeneral.push(currentGroup);
    }

    const totalPagesForSummary = groupedGeneral.length;

    // eslint-disable-next-line no-console
    console.log('🧩 DownloadPreview render 中，groupedGeneral.length:', groupedGeneral.length);
    return (
      // <div ref={ref} className={className} style={style}>
      <div ref={ref} className={className}>
        {
          // Print ItemSummary
          groupedGeneral.map((group, index) => (
            <div
              // Todo: (20250331 - Anna) 這個key好嗎
              key={group[0].name + group[0].code}
              style={{
                breakBefore: 'page',
                breakAfter: 'page',
              }}
              className="download-page relative h-screen overflow-hidden border border-stroke-neutral-quaternary"
            >
              {index === 0 ? <FirstHeader financialReport={financialReport} /> : <NormalHeader />}

              <section
                className={`relative px-20px text-text-neutral-secondary ${
                  index === 0 ? '-mt-16' : ''
                }`}
              >
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
                        <span className="pl-5">{t('reports:REPORTS.EPS_UNIT')}</span>
                      </th>
                    </tr>
                    <tr className="h-16px"></tr>

                    <tr>
                      <th className="whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left font-semibold">
                        {t('reports:TAX_REPORT.CODE_NUMBER')}
                      </th>
                      <th className="border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left font-semibold">
                        {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                      </th>
                      <th className="border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-3px text-end font-semibold">
                        {financialReport && financialReport.company && (
                          <p className="whitespace-nowrap pb-2 text-center font-barlow font-semibold leading-5">
                            {formattedCurFromDate}
                            <br />
                            {t('reports:COMMON.TO')} {formattedCurToDate}
                          </p>
                        )}
                      </th>
                      <th className="border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center font-semibold">
                        %
                      </th>
                      <th
                        className="border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-3px text-end font-semibold"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {financialReport && financialReport.company && (
                          <p className="whitespace-nowrap pb-2 text-center font-barlow font-semibold leading-5">
                            {formattedPreFromDate}
                            <br />
                            {t('reports:COMMON.TO')} {formattedPreToDate}
                          </p>
                        )}
                      </th>
                      <th className="border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center font-semibold">
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
                // Todo: (20250331 - Anna) 這個key好嗎
                key={group[0].name + group[0].code + group[0].accountId}
                className="absolute bottom-0 left-0 right-0 z-1 flex items-center justify-between bg-surface-brand-secondary p-10px"
              >
                <p className="text-xs text-white">{index + 1}</p>
                <div className="text-base font-bold text-surface-brand-secondary">
                  <img
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
        <div className="download-page border border-stroke-neutral-quaternary">
          <PrintCostRevRatio
            financialReport={financialReport}
            formattedCurFromDate={formattedCurFromDate}
            formattedCurToDate={formattedCurToDate}
            formattedPreFromDate={formattedPreFromDate}
            formattedPreToDate={formattedPreToDate}
            defaultPageNumber={totalPagesForSummary}
            useRawImg
          />
        </div>
      </div>
    );
  }
);

export default DownloadPreview;
