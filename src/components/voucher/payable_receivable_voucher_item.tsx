import Image from 'next/image';
import Link from 'next/link';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { numberWithCommas } from '@/lib/utils/common';
import { FaDownload, FaUpload } from 'react-icons/fa';
import { VoucherType } from '@/constants/account';
import { FiRepeat } from 'react-icons/fi';
// import { IVoucherBeta } from '@/interfaces/voucher';
import { VoucherListTabV2 } from '@/constants/voucher';

interface IPayableReceivableVoucherItemProps {
  // activeTab: VoucherListTabV2;
  //  voucherData: IVoucherBeta;
}

const PayableReceivableVoucherItem: React.FC<IPayableReceivableVoucherItemProps> = () => {
  const {
    id: voucherId,
    voucherDate,
    voucherType,
    voucherNo,
    counterParty,
    issuer,
    receivingInfo,
    payableInfo,
    reverseVouchers,
  } =
    // voucherData;
    {
      id: 1,
      voucherDate: 1,
      voucherType: VoucherType.EXPENSE,
      voucherNo: 1,
      counterParty: {
        companyId: 1,
        name: 'name',
      },
      issuer: {
        avatar: 'avatar',
        name: 'name',
      },
      receivingInfo: {
        total: 1,
        alreadyHappened: 1,
        remain: 1,
      },
      payableInfo: {
        total: 1,
        alreadyHappened: 1,
        remain: 1,
      },
      reverseVouchers: [
        {
          id: 1,
          voucherNo: 1,
        },
      ],
    };

  const activeTab = VoucherListTabV2.RECEIVING;

  const {
    total: totalAmount,
    alreadyHappened: alreadyHappenedAmount,
    remain: remainAmount,
  } = activeTab === VoucherListTabV2.RECEIVING ? receivingInfo : payableInfo;

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
    <div className="flex flex-col items-center gap-4px">
      <p className="text-text-neutral-tertiary">{counterParty.companyId}</p>
      <p className="text-text-neutral-primary">{counterParty.name}</p>
    </div>
  );

  const displayedIssuer = (
    <div className="flex items-center justify-center gap-4px text-text-neutral-primary">
      <Image src={issuer.avatar} alt="avatar" width={14} height={14} className="rounded-full" />
      <p>{issuer.name}</p>
    </div>
  );

  const displayedTotalAmount = (
    <div className="whitespace-nowrap text-right">
      {numberWithCommas(totalAmount)} <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedAlreadyHappenedAmount = (
    <div className="whitespace-nowrap text-right">
      {numberWithCommas(alreadyHappenedAmount)}{' '}
      <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedRemainAmount = (
    <div className="whitespace-nowrap text-right">
      {numberWithCommas(remainAmount)} <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedReverse = (
    <div className="flex flex-col">
      {reverseVouchers && reverseVouchers.length > 0 ? (
        reverseVouchers.map((voucher) => (
          <Link
            href={`/users/accounting/${voucher.id}`}
            className="text-center text-link-text-primary"
          >
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
      href={`/users/accounting/${voucherId}`}
      className="table-row font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {/* Info: (20240924 - Julian) Issued Date */}
      <div className="table-cell py-10px text-center align-middle">{displayedDate}</div>
      {/* Info: (20240924 - Julian) Voucher No */}
      <div className="table-cell text-center align-middle">{displayedVoucherNo}</div>
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
