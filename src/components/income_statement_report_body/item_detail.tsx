import { useState } from 'react';
import Rows from '@/components/income_statement_report_body/rows';
import CollapseButton from '@/components/button/collapse_button';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import { FinancialReport } from '@/interfaces/report';
import { useTranslation } from 'next-i18next';

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
    ? flattenAccounts(financialReport.details.slice(0, 15))
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
          <p className="font-bold leading-5">
            <span>單位：新台幣元</span>
            <span className="pl-5">每股盈餘單位：新台幣元</span>
          </p>
        </div>
        {!isDetailCollapsed && (
          <table className="w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="w-77px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                  {t('reports:TAX_REPORT.CODE_NUMBER')}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                  {t('reports:REPORTS.ACCOUNTING_ITEMS')}
                </th>
                <th
                  className="w-285px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {!isDetailCollapsed && financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedCurFromDate}至{formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="w-50px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                  %
                </th>
                <th
                  className="w-285px border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
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
