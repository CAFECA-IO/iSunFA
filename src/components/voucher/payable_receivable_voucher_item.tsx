import Image from 'next/image';
import Link from 'next/link';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
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
  // Deprecated: (20250206 - Tzuhan) remove eslint-disable
  // eslint-disable-next-line react/prop-types
  activeTab,
  // Deprecated: (20250206 - Tzuhan) remove eslint-disable
  // eslint-disable-next-line react/prop-types
  voucherData,
}) => {
  const {
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    id: voucherId,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    voucherDate,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    voucherType,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    voucherNo,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    counterParty,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    issuer,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    receivingInfo,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    payableInfo,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    reverseVouchers,
    // Deprecated: (20250206 - Tzuhan) remove eslint-disable
    // eslint-disable-next-line react/prop-types
    incomplete,
  } = voucherData;

  const {
    total: totalAmount,
    alreadyHappened: alreadyHappenedAmount,
    remain: remainAmount,
  } = activeTab === PayableReceivableTabs.RECEIVING ? receivingInfo : payableInfo;

  const displayedDate = (
    <div className="relative mx-auto px-18px pt-12px text-center">
      <CalendarIcon timestamp={voucherDate} incomplete={incomplete} />
    </div>
  );

  const displayedVoucherNo =
    voucherType === VoucherType.EXPENSE ? (
      <div className="mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-success px-8px py-4px">
        <FaUpload size={14} className="text-surface-state-success-dark" />
        <p className="text-hxs text-text-state-success-solid">{voucherNo}</p>
      </div>
    ) : voucherType === VoucherType.RECEIVE ? (
      <div className="mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px">
        <FaDownload size={14} className="text-surface-state-error-dark" />
        <p className="text-hxs text-text-state-error-solid">{voucherNo}</p>
      </div>
    ) : (
      <div className="mx-auto flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-secondary px-8px py-4px">
        <FiRepeat size={14} className="text-navy-blue-400" />
        <p className="text-hxs text-badge-text-secondary-solid">{voucherNo}</p>
      </div>
    );

  const displayedCounterparty = (
    <div className="flex flex-col items-start gap-4px text-hxs">
      {/* eslint-disable-next-line react/prop-types */}
      <p className="text-text-neutral-tertiary">{counterParty?.taxId || ''}</p>
      {/* eslint-disable-next-line react/prop-types */}
      <p className="text-text-neutral-primary">{counterParty?.name || '-'}</p>
    </div>
  );

  const displayedIssuer = (
    <div className="flex items-center justify-center gap-4px text-text-neutral-primary">
      {/* eslint-disable-next-line react/prop-types */}
      <Image src={issuer.avatar} alt="avatar" width={14} height={14} className="rounded-full" />
      {/* eslint-disable-next-line react/prop-types */}
      <p>{issuer.name}</p>
    </div>
  );

  const displayedTotalAmount = (
    <div className="whitespace-nowrap text-right">
      {DecimalOperations.format(totalAmount)}{' '}
      <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedAlreadyHappenedAmount = (
    <div className="whitespace-nowrap text-right">
      {DecimalOperations.format(alreadyHappenedAmount)}{' '}
      <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedRemainAmount = (
    <div className="whitespace-nowrap text-right">
      {DecimalOperations.format(remainAmount)}{' '}
      <span className="text-text-neutral-tertiary">TWD</span>
    </div>
  );

  const displayedReverse = (
    <div className="flex flex-col text-sm">
      {/* eslint-disable-next-line react/prop-types */}
      {reverseVouchers && reverseVouchers.length > 0 ? (
        // eslint-disable-next-line react/prop-types
        reverseVouchers.map((voucher) => (
          <Link
            key={voucher.id}
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
      href={`/users/accounting/${voucherId}?voucherNo=${voucherNo}&from=ARandAP`}
      className="table-row text-xs font-medium odd:bg-surface-neutral-surface-lv2 even:bg-surface-neutral-surface-lv1 hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {/* Info: (20240924 - Julian) Issued Date */}
      <div className="table-cell align-top">{displayedDate}</div>
      {/* Info: (20240924 - Julian) Voucher No */}
      <div className="table-cell px-lv-2 py-lv-5 text-center">{displayedVoucherNo}</div>
      {/* Info: (20240924 - Julian) Counterparty */}
      <div className="table-cell px-lv-4 py-lv-5">{displayedCounterparty}</div>
      {/* Info: (20240924 - Julian) Issuer */}
      <div className="table-cell px-lv-4 py-lv-5">{displayedIssuer}</div>
      {/* Info: (20240924 - Julian) Total Amount */}
      <div className="table-cell px-lv-2 py-lv-5">{displayedTotalAmount}</div>
      {/* Info: (20240924 - Julian) Already Happened Amount */}
      <div className="table-cell px-lv-2 py-lv-5">{displayedAlreadyHappenedAmount}</div>
      {/* Info: (20240924 - Julian) Remain Amount */}
      <div className="table-cell px-lv-2 py-lv-5">{displayedRemainAmount}</div>
      {/* Info: (20240924 - Julian) Reverse */}
      <div className="table-cell px-lv-5 py-lv-5">{displayedReverse}</div>
    </Link>
  );
};

export default PayableReceivableVoucherItem;
