import Image from 'next/image';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { numberWithCommas } from '@/lib/utils/common';
import { FaDownload, FaUpload } from 'react-icons/fa';
import { VoucherType } from '@/constants/account';
import { FiRepeat } from 'react-icons/fi';

const APandARItem: React.FC = () => {
  // ToDo: (20240924 - Julian) dummy data
  const date: number = new Date().getTime() / 1000;
  const voucherType: VoucherType = VoucherType.EXPENSE;
  const voucherNo: string = '20240924-0001';
  const counterparty = {
    code: '59373022',
    name: 'PX Mart',
  };
  const issuer = {
    avatar: 'https://i.pinimg.com/originals/51/7d/4e/517d4ea58fa6c12aca4e035cdbf257b6.jpg',
    name: 'Julian',
  };
  const receivableAmount = 1000000;
  const receivedAmount = 500000;
  const remainAmount = 500000;
  const reverse = '240417-001';

  const displayedDate = (
    <div className="flex items-center justify-center">
      <CalendarIcon timestamp={date} />
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
      <p className="text-text-neutral-tertiary">{counterparty.code}</p>
      <p className="text-text-neutral-primary">{counterparty.name}</p>
    </div>
  );

  const displayedIssuer = (
    <div className="flex items-center justify-center gap-4px text-text-neutral-primary">
      <Image src={issuer.avatar} alt="avatar" width={14} height={14} className="rounded-full" />
      <p>{issuer.name}</p>
    </div>
  );

  const displayedReceivableAmount = (
    <div className="whitespace-nowrap text-right">
      {numberWithCommas(receivableAmount)} <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedReceivedAmount = (
    <div className="whitespace-nowrap text-right">
      {numberWithCommas(receivedAmount)} <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedRemainAmount = (
    <div className="whitespace-nowrap text-right">
      {numberWithCommas(remainAmount)} <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedReverse = <p className="text-center text-link-text-primary">{reverse}</p>;

  return (
    <div className="table-row font-medium hover:cursor-pointer hover:bg-surface-brand-primary-10">
      {/* Info: (20240924 - Julian) Issued Date */}
      <div className="table-cell py-10px text-center align-middle">{displayedDate}</div>
      {/* Info: (20240924 - Julian) Voucher No */}
      <div className="table-cell text-center align-middle">{displayedVoucherNo}</div>
      {/* Info: (20240924 - Julian) Counterparty */}
      <div className="table-cell align-middle">{displayedCounterparty}</div>
      {/* Info: (20240924 - Julian) Issuer */}
      <div className="table-cell align-middle">{displayedIssuer}</div>
      {/* Info: (20240924 - Julian) Receivable Amount */}
      <div className="table-cell align-middle">{displayedReceivableAmount}</div>
      {/* Info: (20240924 - Julian) Received Amount */}
      <div className="table-cell align-middle">{displayedReceivedAmount}</div>
      {/* Info: (20240924 - Julian) Remain Amount */}
      <div className="table-cell align-middle">{displayedRemainAmount}</div>
      {/* Info: (20240924 - Julian) Reverse */}
      <div className="table-cell align-middle">{displayedReverse}</div>
    </div>
  );
};

export default APandARItem;
