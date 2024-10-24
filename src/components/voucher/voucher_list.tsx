import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { MdOutlineFileDownload } from 'react-icons/md';
import { FaRegTrashAlt } from 'react-icons/fa';
import { Button } from '@/components/button/button';
import VoucherItem from '@/components/voucher/voucher_item';
import SortingButton from '@/components/voucher/sorting_button';
import { checkboxStyle } from '@/constants/display';
import { SortOrder } from '@/constants/sort';
import { useModalContext } from '@/contexts/modal_context';
import { useGlobalCtx } from '@/contexts/global_context';
import { IVoucherBeta, IVoucherUI } from '@/interfaces/voucher';
import { MessageType } from '@/interfaces/message_modal';

interface IVoucherListProps {
  voucherList: IVoucherBeta[];
  creditSort: null | SortOrder;
  setCreditSort: React.Dispatch<React.SetStateAction<null | SortOrder>>;
  debitSort: null | SortOrder;
  setDebitSort: React.Dispatch<React.SetStateAction<null | SortOrder>>;
  dateSort: null | SortOrder;
  setDateSort: React.Dispatch<React.SetStateAction<null | SortOrder>>;
}

const VoucherList: React.FC<IVoucherListProps> = ({
  voucherList,
  creditSort,
  setCreditSort,
  debitSort,
  setDebitSort,
  dateSort,
  setDateSort,
}) => {
  const { t } = useTranslation('common');
  const { messageModalDataHandler, messageModalVisibilityHandler } = useModalContext();
  const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  const defaultVoucherList: IVoucherUI[] = voucherList.map((voucher) => {
    return {
      ...voucher,
      isSelected: false,
    };
  });

  // Info: (20241022 - Julian) checkbox 是否開啟
  const [isCheckBoxOpen, setIsCheckBoxOpen] = useState(false);
  // Info: (20241022 - Julian) IVoucherBeta[] 轉換成 IVoucherUI[]
  const [uiVoucherList, setUiVoucherList] = useState<IVoucherUI[]>(defaultVoucherList);
  // Info: (20241022 - Julian) 全選狀態
  const [isSelectedAll, setIsSelectedAll] = useState(false);
  // Info: (20241022 - Julian) 被選中的 voucher
  const [selectedVoucherList, setSelectedVoucherList] = useState<IVoucherUI[]>([]);

  // Info: (20240920 - Julian) 排序狀態
  // const [dateSort, setDateSort] = useState<null | SortOrder>(null);
  // const [creditSort, setCreditSort] = useState<null | SortOrder>(null);
  // const [debitSort, setDebitSort] = useState<null | SortOrder>(null);

  // Info: (20240920 - Julian) css string
  const tableCellStyles = 'table-cell text-center align-middle';
  const sideBorderStyles = 'border-r border-b border-stroke-neutral-quaternary';
  const checkStyle = `${isCheckBoxOpen ? 'table-cell' : 'hidden'} text-center align-middle border-r border-stroke-neutral-quaternary`;

  const selectToggleHandler = () => setIsCheckBoxOpen((prev) => !prev);

  const selectAllHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    // Info: (20241022 - Julian) 切換全選狀態
    setIsSelectedAll(!isSelectedAll);
    // Info: (20241022 - Julian) 切換所有 voucher 的選取狀態
    setUiVoucherList((prev) => {
      return prev.map((voucher) => {
        return {
          ...voucher,
          isSelected: isChecked,
        };
      });
    });
  };

  const selectHandler = (id: number) => {
    setUiVoucherList((prev) => {
      return prev.map((voucher) => {
        if (voucher.id === id) {
          return {
            ...voucher,
            isSelected: !voucher.isSelected,
          };
        }
        return voucher;
      });
    });
  };

  useEffect(() => {
    // Info: (20241022 - Julian) 更新被選中的 voucher
    setSelectedVoucherList(uiVoucherList.filter((voucher) => voucher.isSelected === true));
  }, [uiVoucherList]);

  // ToDo: (20241022 - Julian) 刪除功能
  const removeVoucherHandler = () => {
    if (selectedVoucherList.length === 0) {
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: 'Warning',
        content: 'Please select at least one voucher to delete',
        submitBtnStr: t('common:COMMON.OK'),
        submitBtnFunction: () => messageModalVisibilityHandler(),
      });
      messageModalVisibilityHandler();
    } else {
      // eslint-disable-next-line no-console
      console.log(
        'remove voucher:\n',
        selectedVoucherList.map((voucher) => voucher.id)
      );
    }
  };

  // Info: (20240920 - Julian) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
  });

  // Info: (20240920 - Julian) credit 排序按鈕
  const displayedCredit = SortingButton({
    string: t('journal:VOUCHER.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
  });

  // Info: (20240920 - Julian) debit 排序按鈕
  const displayedDebit = SortingButton({
    string: t('journal:VOUCHER.DEBIT'),
    sortOrder: debitSort,
    setSortOrder: setDebitSort,
  });

  const displayedSelectArea = (
    <div className="ml-auto flex items-center gap-24px">
      {/* Info: (20240920 - Julian) Export Voucher button */}
      <Button type="button" variant="tertiaryOutline" onClick={exportVoucherModalVisibilityHandler}>
        <MdOutlineFileDownload />
        <p>{t('journal:VOUCHER.EXPORT_VOUCHER')}</p>
      </Button>
      {/* Info: (20240920 - Julian) Delete button */}
      <div className={isCheckBoxOpen ? 'block' : 'hidden'}>
        <Button
          type="button"
          variant="tertiary"
          className="h-44px w-44px p-0"
          onClick={removeVoucherHandler}
        >
          <FaRegTrashAlt />
        </Button>
      </div>
      {/* Info: (20240920 - Julian) Select All & Cancel button */}
      <button
        type="button"
        className={`${isCheckBoxOpen ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        {t('common:COMMON.SELECT_ALL')}
      </button>
      {/* Info: (20240920 - Julian) Cancel selecting button */}
      <button
        type="button"
        onClick={selectToggleHandler}
        className={`${isCheckBoxOpen ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        {t('common:COMMON.CANCEL')}
      </button>
      {/* Info: (20240920 - Julian) Select toggle button */}
      <button
        type="button"
        onClick={selectToggleHandler}
        className={`${isCheckBoxOpen ? 'hidden' : 'block'} font-semibold text-link-text-primary hover:opacity-70`}
      >
        {t('common:COMMON.SELECT')}
      </button>
    </div>
  );

  const displayedVoucherList = uiVoucherList.map((voucher) => {
    return (
      <VoucherItem
        key={voucher.id}
        voucher={voucher}
        selectHandler={selectHandler}
        isCheckBoxOpen={isCheckBoxOpen}
      />
    );
  });

  return (
    <div className="flex flex-col gap-40px">
      {/* Info: (20240920 - Julian) export & select button */}
      {displayedSelectArea}

      {/* Info: (20240920 - Julian) Table */}
      <div className="table overflow-hidden rounded-lg bg-surface-neutral-surface-lv2">
        {/* Info: (20240920 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group h-60px border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row">
            <div className={`${checkStyle} border-b border-stroke-neutral-quaternary`}>
              <input type="checkbox" className={checkboxStyle} onChange={selectAllHandler} />
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDate}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.VOUCHER_NO')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.NOTE')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.ACCOUNTING')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedCredit}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>{displayedDebit}</div>
            <div className={`${tableCellStyles} ${sideBorderStyles}`}>
              {t('journal:VOUCHER.COUNTRYPARTY')}
            </div>
            <div className={`${tableCellStyles} border-b border-stroke-neutral-quaternary`}>
              {t('journal:VOUCHER.ISSUER')}
            </div>
          </div>
        </div>

        {/* Info: (20240920 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedVoucherList}</div>

        {/* Info: (20240920 - Julian) ---------------- Table Footer ---------------- */}
        <div className="table-footer-group h-20px border-t bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary"></div>
      </div>
    </div>
  );
};

export default VoucherList;
