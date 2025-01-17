import { ITeamInvoice } from '@/interfaces/subscription';
import { formatTimestampWithHyphen } from '@/constants/time';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import React, { useEffect, useState } from 'react'; // Info: (20250116 - Anna)
import APIHandler from '@/lib/utils/api_handler'; // Info: (20250116 - Anna)
import { APIName } from '@/constants/api_connection'; // Info: (20250116 - Anna)
import { useRouter } from 'next/router'; // Info: (20250116 - Anna)

interface InvoiceListProps {
  invoiceList: ITeamInvoice[];
}

const InvoiceList = ({ invoiceList }: InvoiceListProps) => {
  const { t } = useTranslation(['subscriptions']);
  const router = useRouter(); // Info: (20250116 - Anna)
  const { teamId } = router.query; // Info: (20250116 - Anna)
  const [invoices, setInvoices] = useState<ITeamInvoice[]>([]); // Info: (20250116 - Anna) state 來儲存發票列表
  const teamIdString = teamId ? (Array.isArray(teamId) ? teamId[0] : teamId) : ''; // Info: (20250116 - Anna) teamId

  // Info: (20250116 - Anna) 初始化 APIHandler
  const { trigger: getInvoiceList } = APIHandler<{ data: ITeamInvoice[] }>(
    APIName.LIST_TEAM_INVOICE
  );

  // Info: (20250116 - Anna) fetchInvoiceData 函數
  const fetchInvoiceData = async () => {
    try {
      const response = await getInvoiceList({
        params: {
          teamId: teamIdString,
        },
        query: {
          page: 1,
          pageSize: 10,
          // plan: 'professional',
          // status: true,
          // startDate: 1672531200,
          // endDate: 1704067200,
          // searchQuery: 'John',
        },
      });

      if (response.success && response.data) {
        const newInvoices = response.data.data ?? [];
        setInvoices(newInvoices);
        // eslint-disable-next-line no-console
        console.log('成功取得發票列表:', newInvoices);
      } else {
        // eslint-disable-next-line no-console
        console.error('取得發票列表失敗:', response.error || `API 錯誤碼: ${response.code}`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('發票 API 呼叫發生錯誤:', error);
    }
  };

  // Info: (20250116 - Anna) 使用 useEffect 呼叫 fetchInvoiceData
  useEffect(() => {
    if (teamIdString) {
      fetchInvoiceData();
    }
  }, [teamIdString]);

  // Todo: (20250116 - Anna) 暫時在這使用invoices以防報錯
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('invoices state:', invoices);
  }, [invoices]);

  return (
    <section className="flex flex-col gap-12px">
      <section className="flex divide-x divide-stroke-neutral-quaternary border-b border-stroke-neutral-quaternary bg-surface-neutral-surface-lv1 py-8px">
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Invoice ID</p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Billing Date</p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Plan</p>
        </div>
        <div className="flex w-180px items-center justify-center px-16px">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Amount</p>
        </div>
        <div className="flex flex-auto items-center justify-center">
          <p className="text-xs font-semibold text-text-neutral-tertiary">Status</p>
        </div>
      </section>

      {invoiceList.map((invoice) => {
        const billingDate = formatTimestampWithHyphen(invoice.issuedTimestamp);
        return (
          <section key={invoice.id} className="flex h-72px bg-surface-neutral-surface-lv2">
            <div className="flex w-180px items-center justify-center px-16px">
              <p className="text-xs font-semibold text-text-neutral-tertiary">{`#${invoice.id}`}</p>
            </div>

            <div className="flex w-180px items-center justify-center px-16px">
              <p className="text-xs font-medium text-text-neutral-primary">{billingDate}</p>
            </div>

            <div className="flex w-180px items-center justify-center px-8px">
              <p className="text-xs font-medium text-text-neutral-primary">
                {t(`subscriptions:SUBSCRIPTIONS_PAGE.${invoice.planId.toUpperCase()}`)}
              </p>
            </div>

            <div className="flex w-180px items-center justify-center px-8px">
              <p className="text-xs font-semibold text-text-neutral-primary">
                {`$ ${invoice.amountDue} `}
                <span className="text-text-neutral-tertiary">TWD</span>
              </p>
            </div>

            <div className="flex flex-auto items-center justify-center">
              {invoice.status ? (
                <div className="flex min-w-22px items-center justify-center gap-1px rounded-full bg-badge-surface-soft-success px-15px py-1px">
                  <Image src="/icons/paid_check.svg" alt="check" width={14} height={14} />
                  <span className="px-2.5px text-xs font-medium leading-5 text-badge-text-success-solid">
                    Paid
                  </span>
                </div>
              ) : (
                <div className="flex min-w-22px items-center justify-center gap-1px rounded-full bg-surface-state-error-soft px-15px py-1px">
                  <Image
                    src="/icons/alert_triangle.svg"
                    alt="alert_triangle"
                    width={14}
                    height={14}
                  />
                  <span className="px-2.5px text-xs font-medium leading-5 text-text-state-error-solid">
                    Failed
                  </span>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </section>
  );
};

export default InvoiceList;
