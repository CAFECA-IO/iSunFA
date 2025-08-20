import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'next-i18next';
import { FaUpload, FaDownload } from 'react-icons/fa';
import { FiRepeat } from 'react-icons/fi';
import { HiCheck } from 'react-icons/hi';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { DecimalOperations } from '@/lib/utils/decimal_operations';
import { VoucherType } from '@/constants/account';
import { IVoucherUI } from '@/interfaces/voucher';

interface IVoucherItemProps {
  voucher: IVoucherUI;
  selectHandler: (id: number) => void;
  isCheckBoxOpen: boolean; // Info: (20241022 - Julian) checkbox 是否顯示
  selectedStartDate?: number;
  selectedEndDate?: number;
  selectedType?: string;
  keyword?: string;
  currentPage?: number;
  fullVoucherList: IVoucherUI[];
}

const VoucherItem: React.FC<IVoucherItemProps> = ({
  voucher,
  selectHandler,
  isCheckBoxOpen,
  selectedStartDate,
  selectedEndDate,
  selectedType,
  keyword,
  currentPage,
  fullVoucherList,
}) => {
  const { t } = useTranslation('common');

  const {
    voucherDate,
    voucherNo,
    voucherType,
    note,
    issuer,
    incomplete,
    lineItemsInfo,
    isSelected,
    deletedReverseVouchers,
    deletedAt,
  } = voucher;

  // Info: (20240920 - Julian) 借貸總和
  const total = lineItemsInfo.sum.amount ?? 0;

  // Info: (20241022 - Julian) checkbox click handler
  const checkboxHandler = () => selectHandler(voucher.id);

  const displayedDate = (
    <div className="relative mx-auto px-18px pt-12px text-center">
      <CalendarIcon timestamp={voucherDate} incomplete={incomplete} />
    </div>
  );

  // Info: (20250107 - Julian) 標記為已刪除的條件由 isReverseRelated 判斷
  // Info: (20250120 - Shirley) @Julian isReverseRelated===true 代表該傳票被刪除或反轉
  // Info: (20250206 - Tzuhan) @Shirley 傳票被反轉的話，不會顯示已刪除的標籤，所以改用 deleteAt 判斷
  const isDisplayDeleteTag = deletedAt ? (
    <div className="rounded-full bg-badge-surface-soft-primary px-8px py-4px text-hxs text-badge-text-primary-solid">
      {t('journal:VOUCHER.DELETED')}
    </div>
  ) : null;

  const displayedVoucherNo =
    voucherType === VoucherType.RECEIVE ? (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-success px-8px py-4px">
        <FaDownload size={14} className="text-surface-state-success-dark" />
        <p className="text-hxs text-text-state-success-solid">{voucherNo}</p>
      </div>
    ) : voucherType === VoucherType.EXPENSE ? (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-error px-8px py-4px">
        <FaUpload size={14} className="text-surface-state-error-dark" />
        <p className="text-hxs text-text-state-error-solid">{voucherNo}</p>
      </div>
    ) : (
      <div className="relative flex w-fit items-center gap-4px rounded-full bg-badge-surface-soft-secondary px-8px py-4px">
        <FiRepeat size={14} className="text-navy-blue-400" />
        <p className="text-hxs text-badge-text-secondary-solid">{voucherNo}</p>
      </div>
    );

  const displayedNote = (
    <div className="flex flex-col">
      {note && <p className="text-hxs text-text-neutral-primary">{note}</p>}
      {deletedReverseVouchers.length > 0 &&
        deletedReverseVouchers.map((deletedReverseVoucher) => {
          // Info: (20250325 - Anna) 多一個判斷條件，只有當Link的那個voucherId，有屬性deletedAt，才要顯示「因刪除...傳票生成的反轉分錄」
          const matchedVoucher = fullVoucherList.find((v) => v.id === deletedReverseVoucher.id);
          if (matchedVoucher?.deletedAt) {
            return (
              <p key={deletedReverseVoucher.id} className="text-hxs text-text-neutral-primary">
                {t('journal:VOUCHER_DETAIL_PAGE.DELETED_REVERSE_VOUCHER_1')}
                <Link
                  href={`/users/accounting/${deletedReverseVoucher.id}?voucherNo=${deletedReverseVoucher.voucherNo}`}
                  className="px-1 text-link-text-primary"
                >
                  {deletedReverseVoucher.voucherNo}
                </Link>
                {t('journal:VOUCHER_DETAIL_PAGE.DELETED_REVERSE_VOUCHER_2')}
                {/* <Trans
              i18nKey="journal:VOUCHER_DETAIL_PAGE.DELETED_REVERSE_VOUCHER"
              values={{ voucherNo: deletedReverseVoucher.voucherNo }}
              components={{
                link: (
                  <Link
                    href={`/users/accounting/${deletedReverseVoucher.id}?voucherNo=${deletedReverseVoucher.voucherNo}`}
                    className="text-link-text-primary"
                  />
                ),
              }}
            /> */}
              </p>
            );
          } else {
            // Info: (20250325 - Anna)：沒有 deletedAt 沖銷(正常收付款的沖銷)
            return (
              <p key={deletedReverseVoucher.id} className="text-hxs text-text-neutral-primary">
                {t('journal:VOUCHER.REVERSE')}
                <Link
                  href={`/users/accounting/${deletedReverseVoucher.id}?voucherNo=${deletedReverseVoucher.voucherNo}`}
                  className="px-1 text-link-text-primary"
                >
                  {deletedReverseVoucher.voucherNo}
                </Link>
              </p>
            );
          }
        })}
      {!note && deletedReverseVouchers.length === 0 && (
        <p className="text-hxs text-text-neutral-primary">-</p>
      )}
    </div>
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
    <div className="flex flex-col items-start gap-lv-1 text-hxs font-semibold text-text-neutral-tertiary">
      {accounting.map((account) => (
        <div key={account?.code} className="flex items-center">
          <p className="w-45px">{account?.code}</p>
          <div className="w-120px truncate">{account?.name}</div>
        </div>
      ))}
    </div>
  );

  const displayedDebit = (
    <>
      <div className="flex flex-col text-right text-hxs">
        {debit.map((de, index) => (
          <p
            // Deprecated: (20250221 - Julian) remove eslint-disable
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={de === 0 ? 'text-text-neutral-tertiary' : 'text-text-neutral-primary'}
          >
            {DecimalOperations.format(de)}
          </p>
        ))}
      </div>
      <hr className="my-10px border-divider-stroke-lv-1" />
    </>
  );

  const displayedCredit = (
    <>
      <div className="flex flex-col text-right text-hxs">
        {credit.map((cre, index) => (
          <p
            // Deprecated: (20250221 - Julian) remove eslint-disable
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className={cre === 0 ? 'text-text-neutral-tertiary' : 'text-text-neutral-primary'}
          >
            {DecimalOperations.format(cre)}
          </p>
        ))}
      </div>
      <hr className="my-10px border-divider-stroke-lv-1" />
      {/* Info: (20240920 - Julian) Total */}
      <p className="text-right text-hxs text-text-neutral-primary">{DecimalOperations.format(total)}</p>
    </>
  );

  // const displayedCounterparty = (
  //   <div className="relative top-20px flex flex-col items-center gap-4px">
  //     <p className="text-text-neutral-tertiary">{counterParty.companyId}</p>
  //     <p className="text-text-neutral-primary">{counterParty.name}</p>
  //   </div>
  // );

  const displayedIssuer = (
    <div className="flex items-center justify-center gap-4px text-hxs text-text-neutral-primary">
      <Image src={issuer.avatar} alt="avatar" width={14} height={14} className="rounded-full" />
      <p>{issuer.name}</p>
    </div>
  );

  const content = (
    <>
      {/* Info: (20240920 - Julian) Issued Date */}
      <div className="table-cell align-top">{displayedDate}</div>
      {/* Info: (20240920 - Julian) Voucher No */}
      <div className="table-cell px-lv-2 py-lv-5 text-center">
        <div className="flex flex-col items-start gap-10px">
          {displayedVoucherNo}
          {isDisplayDeleteTag}
        </div>
      </div>
      {/* Info: (20240920 - Julian) Note */}
      <div className="table-cell px-16px py-lv-5 text-left align-top">{displayedNote}</div>
      {/* Info: (20240920 - Julian) Accounting */}
      <div className="table-cell px-lv-2 py-lv-5">{displayedAccounting}</div>
      {/* Info: (20240920 - Julian) Debit */}
      <div className="table-cell py-lv-5 pl-lv-2">{displayedDebit}</div>
      {/* Info: (20240920 - Julian) Credit */}
      <div className="table-cell py-lv-5 pr-lv-2">{displayedCredit}</div>
      {/* Info: (20240920 - Julian) Counterparty */}
      {/* <div className="table-cell">{displayedCounterparty}</div> */}
      {/* Info: (20240920 - Julian) Issuer */}
      <div className="table-cell px-lv-2 py-lv-5">{displayedIssuer}</div>
    </>
  );

  return isCheckBoxOpen ? (
    <div
      onClick={checkboxHandler} // Info: (20241227 - Julian) 點擊整個 row 也能選取 checkbox
      className="table-row font-medium odd:bg-surface-neutral-surface-lv2 even:bg-surface-neutral-surface-lv1 hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {/* Info: (20240920 - Julian) Select */}
      <div className="table-cell text-center">
        <div className="relative px-lv-2 py-lv-5">
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
      href={{
        pathname: `/users/accounting/${voucher.id}`,
        query: {
          voucherNo,
          from: 'voucher_item', // Info: (20250324 - Anna) from=voucher_item 為了返回時能回到傳票清單頁面，並且保留篩選條件
          ...(selectedStartDate && { startDate: selectedStartDate }),
          ...(selectedEndDate && { endDate: selectedEndDate }),
          ...(selectedType && { type: selectedType }),
          ...(keyword && { keyword }),
          ...(currentPage && { page: currentPage }),
        },
      }}
      className="table-row font-medium odd:bg-surface-neutral-surface-lv2 even:bg-surface-neutral-surface-lv1 hover:cursor-pointer hover:bg-surface-brand-primary-10"
    >
      {content}
    </Link>
  );
};

export default VoucherItem;
