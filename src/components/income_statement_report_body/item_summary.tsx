import { useState } from 'react';
import Image from 'next/image';
import { FinancialReport } from '@/interfaces/report';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import CollapseButton from '@/components/button/collapse_button';
import Rows from '@/components/income_statement_report_body/rows';
import { useTranslation } from 'next-i18next';

interface ItemSummaryProps {
  financialReport: FinancialReport;
  formattedCurFromDate: string;
  formattedCurToDate: string;
  formattedPreFromDate: string;
  formattedPreToDate: string;
}
const ItemSummary = ({
  financialReport,
  formattedCurFromDate,
  formattedCurToDate,
  formattedPreFromDate,
  formattedPreToDate,
}: ItemSummaryProps) => {
  const { t } = useTranslation(['reports']);
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
  const toggleSummaryTable = () => {
    setIsSummaryCollapsed((prev) => !prev);
  };

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
    ? flattenAccounts(financialReport.general.slice(0, 10))
    : [];

  return (
    <div id="1" className="relative overflow-hidden">
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

      <section className="text-text-neutral-secondary">
        <div className="relative z-1 mb-16px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="font-bold leading-5">{t('reports:REPORTS.ITEM_SUMMARY_FORMAT')}</p>
            <CollapseButton onClick={toggleSummaryTable} isCollapsed={isSummaryCollapsed} />
          </div>
          <p className="font-bold leading-5">
            <span>單位：新台幣元</span>
            <span className="pl-5">每股盈餘單位：新台幣元</span>
          </p>
        </div>
        {!isSummaryCollapsed && (
          <table className="relative z-1 w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="w-77px whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                  {t('reports:TAX_REPORT.CODE_NUMBER')}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left text-sm font-semibold">
                  {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                </th>
                <th className="w-285px whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold">
                  {!isSummaryCollapsed && financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedCurFromDate}至{formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="w-50px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                  %
                </th>
                <th
                  className="w-285px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center text-sm font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedPreFromDate}至{formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="w-50px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                  %
                </th>
              </tr>
            </thead>

            <tbody>
              <Rows flattenAccounts={flattenGeneralAccounts} />
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default ItemSummary;
