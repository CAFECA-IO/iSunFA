import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaUpload, FaDownload } from 'react-icons/fa';
import { FiRepeat } from 'react-icons/fi';
import { HiCheck } from 'react-icons/hi';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { numberWithCommas } from '@/lib/utils/common';
import { VoucherType } from '@/constants/account';
import { IVoucherUI } from '@/interfaces/voucher';

interface IVoucherItemProps {
  voucher: IVoucherUI;
  selectHandler: (id: number) => void;
  isCheckBoxOpen: boolean; // Info: (20241022 - Julian) checkbox 是否顯示
}

const VoucherItem: React.FC<IVoucherItemProps> = ({ voucher, selectHandler, isCheckBoxOpen }) => {
  const { t } = useTranslation('common');

  const {
    voucherDate,
    voucherNo,
    voucherType,
    note,
    issuer,
    unRead,
    lineItemsInfo,
    isSelected,
    isReverseRelated,
  } = voucher;

  // Info: (20240920 - Julian) 借貸總和
  const total = lineItemsInfo.sum.amount ?? 0;

  // Info: (20241022 - Julian) checkbox click handler
  const checkboxHandler = () => selectHandler(voucher.id);

  const displayedDate = (
    <div className="relative flex justify-center">
      <CalendarIcon timestamp={voucherDate} unRead={unRead} />
    </div>
  );

  // Info: (20250107 - Julian) 標記為已刪除的條件由 isReverseRelated 判斷
  // Info: (20250120 - Shirley) @Julian isReverseRelated===true 代表該傳票被刪除或反轉
  const isDisplayDeleteTag = isReverseRelated ? (
    <div className="rounded-full bg-badge-surface-soft-primary px-8px py-4px text-xs text-badge-text-primary-solid">
      {t('journal:VOUCHER.DELETED')}
    </div>
  ) : null;

  const displayedVoucherNo =
    voucherType === VoucherType.RECEIVE ? (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-success px-8px py-4px">
        <FaDownload size={14} className="text-surface-state-success-dark" />
        <p className="text-sm text-text-state-success-solid">{voucherNo}</p>
      </div>
    ) : voucherType === VoucherType.EXPENSE ? (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px">
        <FaUpload size={14} className="text-surface-state-error-dark" />
        <p className="text-sm text-text-state-error-solid">{voucherNo}</p>
      </div>
    ) : (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-secondary px-8px py-4px">
        <FiRepeat size={14} className="text-surface-brand-secondary" />
        <p className="text-sm text-badge-text-secondary-solid">{voucherNo}</p>
      </div>
    );

  const displayedNote = (
    <p className="text-xs text-text-neutral-primary">{note !== '' ? note : '-'}</p>
  );

  // Info: (20241220 - Julian) 借方排在前面，貸方排在後面
  const lineItems = lineItemsInfo.lineItems.sort((a, b) => {
    if (a.debit && !b.debit) return -1; // Info: (20241220 - Julian) 若 a 為借方，b 為貸方，把 a 排在前面
    if (!a.debit && b.debit) return 1; // Info: (20241220 - Julian) 若 a 為貸方，b 為借方，把 b 排在前面
    return 0; // Info: (20241220 - Julian) 若 a 與 b 同為借方或同為貸方，保持原本順序
  });

  //  Info: (20241220 - Julian) 會計科目
  const accounting = lineItems.map((item) => item.account);

  // Info: (20241220 - Julian) 借貸金額
  const credit = lineItems.map((item) => (item.debit ? 0 : item.amount));
  const debit = lineItems.map((item) => (item.debit ? item.amount : 0));

  const displayedAccounting = (
    <div className="flex flex-col items-start gap-4px px-8px py-24px text-xs font-semibold text-text-neutral-tertiary">
      {accounting.map((account) => (
        <p key={account?.code} className="w-160px truncate">
          {account?.code} - {account?.name}
        </p>
      ))}
    </div>
  );

  const displayedDebit = (
    <>
      <div className="flex flex-col text-right text-xs">
        {debit.map((de) => (
          <p
            key={de}
            className={de === 0 ? 'text-text-neutral-tertiary' : 'text-text-neutral-primary'}
          >
            {numberWithCommas(de)}
          </p>
        ))}
      </div>
      <hr className="my-10px border-divider-stroke-lv-1" />
    </>
  );

  const displayedCredit = (
    <>
      <div className="flex flex-col text-right text-xs">
        {credit.map((cre) => (
          <p
            key={cre}
            className={cre === 0 ? 'text-text-neutral-tertiary' : 'text-text-neutral-primary'}
          >
            {numberWithCommas(cre)}
          </p>
        ))}
      </div>
      <hr className="my-10px border-divider-stroke-lv-1" />
      {/* Info: (20240920 - Julian) Total */}
      <p className="text-right text-xs text-text-neutral-primary">{numberWithCommas(total)}</p>
    </>
  );

  // const displayedCounterparty = (
  //   <div className="relative top-20px flex flex-col items-center gap-4px">
  //     <p className="text-text-neutral-tertiary">{counterParty.companyId}</p>
  //     <p className="text-text-neutral-primary">{counterParty.name}</p>
  //   </div>
  // );

  const displayedIssuer = (
    <div className="flex items-center justify-center gap-4px px-8px text-xs text-text-neutral-primary">
      <Image src={issuer.avatar} alt="avatar" width={14} height={14} className="rounded-full" />
      <p>{issuer.name}</p>
    </div>
  );

  const content = (
    <>
      {/* Info: (20240920 - Julian) Issued Date */}
      <div className="table-cell text-center align-middle">{displayedDate}</div>
      {/* Info: (20240920 - Julian) Voucher No */}
      <div className="table-cell text-center align-middle">
        <div className="flex flex-col items-start gap-10px px-8px">
          {displayedVoucherNo}
          {isDisplayDeleteTag}
        </div>
      </div>
      {/* Info: (20240920 - Julian) Note */}
      <div className="table-cell text-left align-middle">{displayedNote}</div>
      {/* Info: (20240920 - Julian) Accounting */}
      <div className="table-cell">{displayedAccounting}</div>
      {/* Info: (20240920 - Julian) Debit */}
      <div className="table-cell">{displayedDebit}</div>
      {/* Info: (20240920 - Julian) Credit */}
      <div className="table-cell">{displayedCredit}</div>
      {/* Info: (20240920 - Julian) Counterparty */}
      {/* <div className="table-cell">{displayedCounterparty}</div> */}
      {/* Info: (20240920 - Julian) Issuer */}
      <div className="table-cell align-middle">{displayedIssuer}</div>
    </>
  );

  return isCheckBoxOpen ? (
    <div
      onClick={checkboxHandler} // Info: (20241227 - Julian) 點擊整個 row 也能選取 checkbox
      className="table-row font-medium odd:bg-surface-neutral-surface-lv2 even:bg-surface-neutral-surface-lv1 hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {/* Info: (20240920 - Julian) Select */}
      <div className="table-cell text-center">
        <div className="relative top-20px px-8px">
          <span className="mx-auto table h-16px w-16px table-fixed">
            <div
              className={`h-16px w-16px rounded-xxs border border-checkbox-stroke-unselected text-center ${isSelected ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
              onClick={checkboxHandler}
            >
              {isSelected && <HiCheck className="absolute text-neutral-white" />}
            </div>
          </span>
        </div>
      </div>
      {content}
    </div>
  ) : (
    <Link
      href={`/users/accounting/${voucher.id}?voucherNo=${voucherNo}`}
      className="table-row font-medium odd:bg-surface-neutral-surface-lv2 even:bg-surface-neutral-surface-lv1 hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {content}
    </Link>
  );
};

export default VoucherItem;
