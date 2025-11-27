import React from 'react';
import { DecimalOperations } from '@/lib/utils/decimal_operations';

interface IVoucherInfo {
  lineItems: {
    account: {
      name: string;
      code: string;
    };
    description: string;
    debit: boolean;
    amount: number;
  }[];
  sum: {
    debit: boolean;
    amount: number;
  };
}

const VoucherItem: React.FC<IVoucherInfo> = ({ lineItems, sum }) => {
  // Info: (20251117 - Julian) 借貸總和
  const total = sum.amount ?? 0;

  // Info: (20251117 - Julian) 借方排在前面，貸方排在後面
  const lineItemInfos = lineItems.sort((a, b) => {
    if (a.debit && !b.debit) return -1; // Info: (20251117 - Julian) 若 a 為借方，b 為貸方，把 a 排在前面
    if (!a.debit && b.debit) return 1; // Info: (20251117 - Julian) 若 a 為貸方，b 為借方，把 b 排在前面
    return 0; // Info: (20251117 - Julian) 若 a 與 b 同為借方或同為貸方，保持原本順序
  });

  // Info: (20251117 - Julian) 摘要
  const particular = lineItemInfos.map((item) => item.description);
  // Info: (20251117 - Julian) 會計科目
  const accounting = lineItemInfos.map((item) => item.account);

  // Info: (20251117 - Julian) 借貸金額
  const credit = lineItemInfos.map((item) => (item.debit ? 0 : item.amount));
  const debit = lineItemInfos.map((item) => (item.debit ? item.amount : 0));

  // Info: (20251117 - Julian) ===== Particular UI =====
  const displayedParticular =
    particular.length > 0 ? particular.map((desc) => <p key={desc}>{desc}</p>) : <p>-</p>;

  // Info: (20251117 - Julian) ===== Accounting UI =====
  const displayedAccounting =
    accounting.length > 0 ? (
      accounting.map((acc) => {
        const str = acc ? `${acc.code} ${acc.name}` : '-';
        return (
          <div key={acc.name} className="flex items-center gap-4px whitespace-nowrap">
            <p>{str}</p>
          </div>
        );
      })
    ) : (
      <p>-</p>
    );

  // Info: (20251117 - Julian) ===== Debit UI =====
  const displayedDebit = (
    <>
      <div className="flex flex-col text-right text-hxs">
        {debit.map((de, index) => (
          <p
            // Deprecated: (20251117 - Julian) remove eslint-disable
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={de === 0 ? 'text-text-neutral-tertiary' : 'text-text-neutral-primary'}
          >
            {DecimalOperations.format(de)}
          </p>
        ))}
      </div>
      <hr className="my-10px border-divider-stroke-lv-1" />
      {/* Info: (20251117 - Julian) Total */}
      <p className="text-right text-hxs text-text-neutral-primary">
        {DecimalOperations.format(total)}
      </p>
    </>
  );

  // Info: (20251117 - Julian) ===== Credit UI =====
  const displayedCredit = (
    <>
      <div className="flex flex-col text-right text-hxs">
        {credit.map((cre, index) => (
          <p
            // Deprecated: (20251117 - Julian) remove eslint-disable
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={cre === 0 ? 'text-text-neutral-tertiary' : 'text-text-neutral-primary'}
          >
            {DecimalOperations.format(cre)}
          </p>
        ))}
      </div>
      <hr className="my-10px border-divider-stroke-lv-1" />
    </>
  );

  return (
    <div className="table-row">
      {/* Info: (20251117 - Julian) Particular */}
      <div className="table-cell px-16px py-24px text-text-neutral-primary">
        <div className="flex flex-col gap-4px text-xxs">{displayedParticular}</div>
      </div>
      <div className="table-cell px-16px py-24px text-xxs font-semibold text-text-neutral-tertiary">
        <div className="flex flex-col gap-4px">{displayedAccounting}</div>
      </div>
      <div className="table-cell w-80px py-24px pl-16px text-xs font-medium">
        <div className="flex flex-col text-right">{displayedCredit}</div>
      </div>
      <div className="table-cell w-80px py-24px pr-16px text-xs font-medium">
        <div className="flex flex-col text-right">{displayedDebit}</div>
      </div>
    </div>
  );
};

const InvoiceEditVoucherTab: React.FC<IVoucherInfo> = ({ lineItems, sum }) => {
  // ToDo: (20251121 - Julian) Get data from props or API
  const currency: string = 'TWD';

  const displayedLineItems =
    lineItems.length > 0 ? (
      <VoucherItem lineItems={lineItems} sum={sum} />
    ) : (
      <p className="p-16px text-center text-text-neutral-tertiary">No line items available.</p>
    );

  return (
    <div className="flex flex-col gap-8px">
      <p className="ml-auto text-xs font-semibold uppercase text-text-neutral-tertiary">
        Currency: {currency}
      </p>
      <div className="max-h-250px overflow-y-auto">
        <div className="table w-full overflow-hidden rounded-sm border border-stroke-neutral-quaternary bg-surface-neutral-main-background">
          {/* Info: (20251114 - Julian) Table Header */}
          <div className="table-header-group text-center text-xs font-medium text-text-neutral-tertiary">
            <div className="table-row">
              <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-8px align-middle">
                Particulars
              </div>
              <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-8px align-middle">
                Accounting
              </div>
              <div className="table-cell border-b border-r border-stroke-neutral-quaternary p-8px align-middle">
                Credit
              </div>
              <div className="table-cell border-b border-stroke-neutral-quaternary p-8px align-middle">
                Debit
              </div>
            </div>
          </div>
          {/* Info: (20251114 - Julian) Table Content */}
          <div className="table-row-group text-xs font-medium">{displayedLineItems}</div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceEditVoucherTab;
