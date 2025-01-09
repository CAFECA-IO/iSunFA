import Image from 'next/image';
import Link from 'next/link';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { numberWithCommas } from '@/lib/utils/common';
import { FaDownload, FaUpload } from 'react-icons/fa';
import { VoucherType } from '@/constants/account';
import { FiRepeat } from 'react-icons/fi';
import { IVoucherBeta } from '@/interfaces/voucher';
import { PayableReceivableTabs } from '@/constants/voucher';

interface IPayableReceivableVoucherItemProps {
  activeTab: PayableReceivableTabs;
  voucherData: IVoucherBeta;
}

const PayableReceivableVoucherItem: React.FC<IPayableReceivableVoucherItemProps> = ({
  // Info: (20241122 - Julian) 由於 Typescript 已經定義了 IVoucherBeta 的 interface，所以這邊不需要再用 PropTypes 定義 props 的型別
  // eslint-disable-next-line react/prop-types
  activeTab,
  // eslint-disable-next-line react/prop-types
  voucherData,
}) => {
  const {
    // eslint-disable-next-line react/prop-types
    id: voucherId,
    // eslint-disable-next-line react/prop-types
    voucherDate,
    // eslint-disable-next-line react/prop-types
    voucherType,
    // eslint-disable-next-line react/prop-types
    voucherNo,
    // eslint-disable-next-line react/prop-types
    counterParty,
    // eslint-disable-next-line react/prop-types
    issuer,
    // eslint-disable-next-line react/prop-types
    receivingInfo,
    // eslint-disable-next-line react/prop-types
    payableInfo,
    // eslint-disable-next-line react/prop-types
    reverseVouchers,
  } = voucherData;

  const {
    total: totalAmount,
    alreadyHappened: alreadyHappenedAmount,
    remain: remainAmount,
  } = activeTab === PayableReceivableTabs.RECEIVING ? receivingInfo : payableInfo;

  const displayedDate = (
    <div className="flex items-center justify-center">
      <CalendarIcon timestamp={voucherDate} />
    </div>
  );

  const displayedVoucherNo =
    voucherType === VoucherType.EXPENSE ? (
      <div className="mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-success px-8px py-4px">
        <FaUpload size={14} className="text-surface-state-success-dark" />
        <p className="text-sm text-text-state-success-solid">{voucherNo}</p>
      </div>
    ) : voucherType === VoucherType.RECEIVE ? (
      <div className="mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px">
        <FaDownload size={14} className="text-surface-state-error-dark" />
        <p className="text-sm text-text-state-error-solid">{voucherNo}</p>
      </div>
    ) : (
      <div className="mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-secondary px-8px py-4px">
        <FiRepeat size={14} className="text-surface-brand-secondary" />
        <p className="text-sm text-badge-text-secondary-solid">{voucherNo}</p>
      </div>
    );

  const displayedCounterparty = (
    <div className="flex flex-col items-start gap-4px px-16px">
      {/* eslint-disable-next-line react/prop-types */}
      <p className="text-text-neutral-tertiary">{counterParty.companyId}</p>
      {/* eslint-disable-next-line react/prop-types */}
      <p className="text-text-neutral-primary">{counterParty.name}</p>
    </div>
  );

  const displayedIssuer = (
    <div className="flex items-center justify-center gap-4px px-16px text-text-neutral-primary">
      {/* eslint-disable-next-line react/prop-types */}
      <Image src={issuer.avatar} alt="avatar" width={14} height={14} className="rounded-full" />
      {/* eslint-disable-next-line react/prop-types */}
      <p>{issuer.name}</p>
    </div>
  );

  const displayedTotalAmount = (
    <div className="whitespace-nowrap px-8px text-right">
      {numberWithCommas(totalAmount)} <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedAlreadyHappenedAmount = (
    <div className="whitespace-nowrap px-8px text-right">
      {numberWithCommas(alreadyHappenedAmount)}{' '}
      <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedRemainAmount = (
    <div className="whitespace-nowrap px-8px text-right">
      {numberWithCommas(remainAmount)} <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedReverse = (
    <div className="flex flex-col px-16px text-sm">
      {/* eslint-disable-next-line react/prop-types */}
      {reverseVouchers && reverseVouchers.length > 0 ? (
        // eslint-disable-next-line react/prop-types
        reverseVouchers.map((voucher) => (
          <Link
            href={`/users/accounting/${voucher.id}?voucherNo=${voucherNo}`}
            className="text-center text-link-text-primary hover:underline"
          >
            {/* eslint-disable-next-line react/prop-types */}
            {voucher.voucherNo}
          </Link>
        ))
      ) : (
        <p className="text-center text-link-text-primary">-</p>
      )}
    </div>
  );

  return (
    <Link
      href={`/users/accounting/${voucherId}?voucherNo=${voucherNo}`}
      className="table-row text-xs font-medium odd:bg-surface-neutral-surface-lv2 even:bg-surface-neutral-surface-lv1 hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {/* Info: (20240924 - Julian) Issued Date */}
      <div className="table-cell py-10px text-center align-middle">{displayedDate}</div>
      {/* Info: (20240924 - Julian) Voucher No */}
      <div className="table-cell px-8px text-center align-middle">{displayedVoucherNo}</div>
      {/* Info: (20240924 - Julian) Counterparty */}
      <div className="table-cell align-middle">{displayedCounterparty}</div>
      {/* Info: (20240924 - Julian) Issuer */}
      <div className="table-cell align-middle">{displayedIssuer}</div>
      {/* Info: (20240924 - Julian) Total Amount */}
      <div className="table-cell align-middle">{displayedTotalAmount}</div>
      {/* Info: (20240924 - Julian) Already Happened Amount */}
      <div className="table-cell align-middle">{displayedAlreadyHappenedAmount}</div>
      {/* Info: (20240924 - Julian) Remain Amount */}
      <div className="table-cell align-middle">{displayedRemainAmount}</div>
      {/* Info: (20240924 - Julian) Reverse */}
      <div className="table-cell align-middle">{displayedReverse}</div>
    </Link>
  );
};

export default PayableReceivableVoucherItem;
