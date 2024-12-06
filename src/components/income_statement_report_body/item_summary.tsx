import { useState } from 'react';
import Image from 'next/image';
import { FinancialReport } from '@/interfaces/report';
import { IAccountReadyForFrontend } from '@/interfaces/accounting_account';
import CollapseButton from '@/components/button/collapse_button';
import Rows from '@/components/income_statement_report_body/rows';

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
            <p className="font-bold leading-5">項目彙總格式</p>
            <CollapseButton onClick={toggleSummaryTable} isCollapsed={isSummaryCollapsed} />
          </div>
          <p className="font-bold leading-5">單位：新台幣元 每股盈餘單位：新台幣元</p>
        </div>
        {!isSummaryCollapsed && (
          <table className="relative z-1 w-full border-collapse bg-white">
            <thead>
              <tr>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                  代號
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-left font-semibold">
                  會計項目
                </th>
                <th className="whitespace-nowrap border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold">
                  {!isSummaryCollapsed && financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedCurFromDate}至{formattedCurToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
                  %
                </th>
                <th
                  className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-end font-semibold"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {financialReport && financialReport.company && (
                    <p className="text-center font-barlow font-semibold leading-5">
                      {formattedPreFromDate}至{formattedPreToDate}
                    </p>
                  )}
                </th>
                <th className="border border-stroke-brand-secondary-soft bg-surface-brand-primary-soft p-10px text-center font-semibold">
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
