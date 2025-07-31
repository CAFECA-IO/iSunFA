import { useState } from 'react';
import Rows from '@/components/income_statement_report_body/rows';
import CollapseButton from '@/components/button/collapse_button';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { FinancialReport } from '@/interfaces/report';
import { useTranslation } from 'next-i18next';
import { useCurrencyCtx } from '@/contexts/currency_context';

interface ItemDetailProps {
  financialReport: FinancialReport;
  formattedCurFromDate: string;
  formattedCurToDate: string;
  formattedPreFromDate: string;
  formattedPreToDate: string;
}
const ItemDetail = ({
  financialReport,
  formattedCurFromDate,
  formattedCurToDate,
  formattedPreFromDate,
  formattedPreToDate,
}: ItemDetailProps) => {
  const { t } = useTranslation(['reports']);
  const { currency } = useCurrencyCtx();
  const [isDetailCollapsed, setIsDetailCollapsed] = useState(false);
  const toggleDetailTable = () => {
    setIsDetailCollapsed((prev) => !prev);
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

  const flattenDetailsAccounts = financialReport?.details
    ? // Info: (20250113 - Anna) 把原本限制只顯示 15 筆的資料改為全部顯示
      flattenAccounts(financialReport.details)
    : [];

  return (
    <div id="2" className="relative overflow-hidden">
      <section className="text-text-neutral-secondary">
        <div className="mb-16px mt-32px flex justify-between font-semibold text-surface-brand-secondary">
          <div className="flex items-center">
            <p className="font-bold leading-5">
              {t('reports:REPORTS.DETAILED_CLASSIFICATION_FORMAT')}
            </p>
            <CollapseButton onClick={toggleDetailTable} isCollapsed={isDetailCollapsed} />
          </div>
          <p className="text-xs font-semibold leading-5">
            <span>
              {t('reports:REPORTS.UNIT_NEW_TAIWAN_DOLLARS')}
              {currency}
            </span>
          </p>
        </div>
        {!isDetailCollapsed && (
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="w-77px whitespace-nowrap border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                  {t('reports:REPORTS.CODE_NUMBER')}
                </th>
                <th className="w-530px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-left text-sm font-semibold">
                  {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                </th>
                <th
                  className="w-285px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {!isDetailCollapsed && financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedCurFromDate} {t('reports:COMMON.TO')} {formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center font-semibold">
                  %
                </th>
                <th
                  className="w-285px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center text-sm font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedPreFromDate} {t('reports:COMMON.TO')} {formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="w-50px border border-stroke-neutral-quaternary bg-surface-brand-primary-50 p-10px text-center font-semibold">
                  %
                </th>
              </tr>
            </thead>
            <tbody>
              {/* {financialReport?.details && renderRows(financialReport.details.slice(0, 15))} */}
              {/* // ToDo: (20241205 - Liz)  */}
              <Rows flattenAccounts={flattenDetailsAccounts} />
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default ItemDetail;
