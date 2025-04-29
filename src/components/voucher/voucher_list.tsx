import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
// import { MdOutlineFileDownload } from 'react-icons/md';
import { FaRegTrashAlt } from 'react-icons/fa';
import { Button } from '@/components/button/button';
import VoucherItem from '@/components/voucher/voucher_item';
import SortingButton from '@/components/voucher/sorting_button';
import { SortOrder } from '@/constants/sort';
import { useModalContext } from '@/contexts/modal_context';
import { useAccountingCtx } from '@/contexts/accounting_context';
// import { useGlobalCtx } from '@/contexts/global_context';
import { useUserCtx } from '@/contexts/user_context';
import { IVoucherUI } from '@/interfaces/voucher';
import { MessageType } from '@/interfaces/message_modal';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ToastType } from '@/interfaces/toastify';
import { HiCheck } from 'react-icons/hi';
import Toggle from '@/components/toggle/toggle';

interface IVoucherListProps {
  voucherList: IVoucherUI[];
  creditSort: null | SortOrder;
  setCreditSort: React.Dispatch<React.SetStateAction<null | SortOrder>>;
  debitSort: null | SortOrder;
  setDebitSort: React.Dispatch<React.SetStateAction<null | SortOrder>>;
  dateSort: null | SortOrder;
  setDateSort: React.Dispatch<React.SetStateAction<null | SortOrder>>;
  isHideReversals: boolean;
  hideReversalsToggleHandler: () => void;
  selectedStartDate?: number;
  selectedEndDate?: number;
  selectedType?: string;
  keyword?: string;
  currentPage?: number;
}

const VoucherList: React.FC<IVoucherListProps> = ({
  voucherList,
  creditSort,
  setCreditSort,
  debitSort,
  setDebitSort,
  dateSort,
  setDateSort,
  isHideReversals,
  hideReversalsToggleHandler,
  selectedStartDate,
  selectedEndDate,
  selectedType,
  keyword,
  currentPage,
}) => {
  const { t } = useTranslation('common');
  const { connectedAccountBook } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();
  const { refreshVoucherListHandler } = useAccountingCtx();
  // const { exportVoucherModalVisibilityHandler } = useGlobalCtx();

  // Info: (20241022 - Julian) checkbox 是否開啟
  const [isCheckBoxOpen, setIsCheckBoxOpen] = useState(false);
  // Info: (20241022 - Julian) IVoucherBeta[] 轉換成 IVoucherUI[]
  const [uiVoucherList, setUiVoucherList] = useState<IVoucherUI[]>(voucherList);
  // Info: (20241022 - Julian) 全選狀態
  const [isSelectedAll, setIsSelectedAll] = useState(false);
  // Info: (20241022 - Julian) 被選中的 voucher
  const [selectedVoucherList, setSelectedVoucherList] = useState<IVoucherUI[]>([]);
  // Info: (20241022 - Julian) 暫存選中的 voucher，用於刪除後的還原
  const [stashedVoucherList, setStashedVoucherList] = useState<IVoucherUI[]>([]);

  // Info: (20240920 - Julian) css string
  const tableCellStyles = 'table-cell text-xs text-center align-middle';
  const sideBorderStyles = 'border-b border-stroke-neutral-quaternary';
  const checkStyle = `${isCheckBoxOpen ? 'table-cell' : 'hidden'} text-center align-middle border-r border-stroke-neutral-quaternary`;

  // Info: (20250203 - Julian) 根據 voucher 的數量決定底色：奇數白色、偶數灰色
  const bottomColor =
    voucherList.length % 2 === 0
      ? 'bg-surface-neutral-surface-lv1'
      : 'bg-surface-neutral-surface-lv2';

  // Info: (20241029 - Julian) Delete voucher API
  const {
    trigger: deleteVoucher,
    isLoading: isDeleting,
    success: deleteSuccess,
    error: deleteError,
  } = APIHandler(APIName.VOUCHER_DELETE_V2);

  // Info: (20250221 - Julian) Restore voucher API
  const {
    trigger: restoreVoucher,
    isLoading: isRestoring,
    success: restoreSuccess,
    error: restoreError,
  } = APIHandler(APIName.VOUCHER_RESTORE_V2);

  const selectToggleHandler = () => setIsCheckBoxOpen((prev) => !prev);

  // Info: (20241105 - Julian) 勾選全部
  const checkAllHandler = () => {
    // Info: (20241022 - Julian) 切換所有 voucher 的選取狀態
    setUiVoucherList((prev) => {
      return prev.map((voucher) => {
        return {
          ...voucher,
          isSelected: !isSelectedAll,
        };
      });
    });
    // Info: (20241022 - Julian) 切換全選狀態
    setIsSelectedAll(!isSelectedAll);
  };

  // Info: (20241105 - Julian) 選擇全部（文字按鈕）
  const selectAllHandler = () => {
    setIsSelectedAll(!isSelectedAll);
    setUiVoucherList((prev) => {
      return prev.map((voucher) => {
        return {
          ...voucher,
          isSelected: !isSelectedAll,
        };
      });
    });
  };

  // Info: (20241105 - Julian) 單一勾選
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

  // Info: (20250221 - Julian) 恢復刪除的傳票
  const undoDeleteVoucher = async () => {
    if (!isRestoring) {
      stashedVoucherList.forEach((voucher) => {
        restoreVoucher({
          params: { accountBookId: connectedAccountBook?.id, voucherId: voucher.id },
        });
      });
    }
  };

  // Info: (20241220 - Julian) 刪除功能
  const removeVoucher = async () => {
    // Info: (20241220 - Julian) 避免重複送出
    if (!isDeleting) {
      selectedVoucherList.forEach((voucher) => {
        deleteVoucher({
          params: { companyId: connectedAccountBook?.id, voucherId: voucher.id },
        });
      });

      // Info: (20250107 - Julian) 刪除傳票後，先將被刪除的 voucher 暫存，再關閉 modal 和清空選取
      setStashedVoucherList(selectedVoucherList);
      setIsSelectedAll(false);
      setIsCheckBoxOpen(false);
      messageModalVisibilityHandler();
    }
  };

  // Info: (20241220 - Julian) 刪除按鈕
  const removeVoucherHandler = () => {
    if (selectedVoucherList.length === 0) {
      // Info: (20241220 - Julian) 未選擇 voucher 警告
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('journal:VOUCHER.WARNING_MODAL_TITLE'),
        content: t('journal:VOUCHER.AT_LEAST_ONE_VOUCHER_CONTENT'),
        submitBtnStr: t('common:COMMON.OK'),
        submitBtnFunction: messageModalVisibilityHandler,
      });
      messageModalVisibilityHandler();
    } else if (selectedVoucherList.length > 1) {
      // Info: (20250107 - Julian) 一次刪除多筆傳票
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('journal:VOUCHER.DELETE_MULTIPLE_VOUCHER_TITLE').replace(
          `{{count}}`,
          `${selectedVoucherList.length}`
        ),
        content: t('journal:VOUCHER.DELETE_MULTIPLE_VOUCHER_CONTENT'),
        subMsg: `*${t('journal:VOUCHER.DELETE_MULTIPLE_VOUCHER_WARNING')}`,
        submitBtnStr: t('journal:VOUCHER.DELETE_MULTIPLE_VOUCHER_SUBMIT_BTN'),
        submitBtnFunction: removeVoucher,
      });
      messageModalVisibilityHandler();
    } else {
      // Info: (20250107 - Julian) 刪除單筆傳票
      messageModalDataHandler({
        messageType: MessageType.WARNING,
        title: t('journal:VOUCHER.DELETE_ONE_VOUCHER_TITLE').replace(
          `{{voucherNo}}`,
          `${selectedVoucherList[0].voucherNo}`
        ),
        content: t('journal:VOUCHER.DELETE_ONE_VOUCHER_CONTENT'),
        subMsg: `*${t('journal:VOUCHER.DELETE_ONE_VOUCHER_WARNING')}`,
        submitBtnStr: t('journal:VOUCHER.DELETE_ONE_VOUCHER_SUBMIT_BTN'),
        submitBtnFunction: removeVoucher,
      });
      messageModalVisibilityHandler();
    }
  };

  // Info: (20241220 - Julian) 更新 voucherList
  useEffect(() => {
    setUiVoucherList(voucherList);
  }, [voucherList]);

  // Info: (20250221 - Julian) 關閉選擇狀態後，清空選取的 voucher
  useEffect(() => {
    if (!isCheckBoxOpen) {
      setUiVoucherList((prev) => {
        return prev.map((voucher) => {
          return {
            ...voucher,
            isSelected: false,
          };
        });
      });
    }
  }, [isCheckBoxOpen]);

  useEffect(() => {
    // Info: (20241022 - Julian) 更新被選中的 voucher
    setSelectedVoucherList(uiVoucherList.filter((voucher) => voucher.isSelected === true));

    // Info: (20241022 - Julian) 判斷是否全選
    const selectedCount = uiVoucherList.filter((voucher) => voucher.isSelected === true).length;
    const totalCount = uiVoucherList.length;
    setIsSelectedAll(selectedCount === totalCount);
  }, [uiVoucherList]);

  // Info: (20250221 - Julian) 刪除後的事件
  useEffect(() => {
    if (deleteSuccess) {
      // Info: (20241220 - Julian) 刪除成功
      toastHandler({
        id: 'delete-voucher-success',
        type: ToastType.SUCCESS,
        content: (
          <div className="flex w-full items-center justify-between">
            <p className="text-text-neutral-primary">
              {t('journal:VOUCHER.DELETE_VOUCHERS_SUCCESSFULLY')}
            </p>
            <button
              type="button"
              onClick={undoDeleteVoucher}
              disabled={isRestoring}
              className="font-semibold text-link-text-success"
            >
              {t('journal:COMMON.UNDO')}
            </button>
          </div>
        ),
        closeable: true,
      });
      // Info: (20250221 - Julian) 刪除成功後，重新整理頁面
      refreshVoucherListHandler();
    } else if (deleteError) {
      // Info: (20241220 - Julian) 刪除失敗
      toastHandler({
        id: 'delete-voucher-error',
        type: ToastType.ERROR,
        content: t('journal:VOUCHER.DELETE_VOUCHERS_FAILED'),
        closeable: true,
      });
    }
  }, [deleteSuccess, deleteError]);

  // Info: (20250221 - Julian) 恢復後的事件
  useEffect(() => {
    if (restoreSuccess) {
      toastHandler({
        id: 'restore-voucher-toast',
        type: ToastType.SUCCESS,
        content: t('journal:COMMON.RESTORE_SUCCESS_TOAST'),
        closeable: true,
      });
      // Info: (20250221 - Julian) 恢復成功後，重新整理頁面
      refreshVoucherListHandler();
    } else if (restoreError) {
      toastHandler({
        id: 'restore-voucher-toast',
        type: ToastType.ERROR,
        content: t('journal:COMMON.RESTORE_FAIL_TOAST'),
        closeable: true,
      });
    }
  }, [restoreSuccess]);

  // Info: (20240920 - Julian) 日期排序按鈕
  const displayedDate = SortingButton({
    string: t('journal:VOUCHER.VOUCHER_DATE'),
    sortOrder: dateSort,
    setSortOrder: setDateSort,
    handleReset: () => {
      setCreditSort(null);
      setDebitSort(null);
    },
  });

  // Info: (20240920 - Julian) credit 排序按鈕
  const displayedCredit = SortingButton({
    string: t('journal:VOUCHER.CREDIT'),
    sortOrder: creditSort,
    setSortOrder: setCreditSort,
    handleReset: () => {
      setDateSort(null);
      setDebitSort(null);
    },
  });

  // Info: (20240920 - Julian) debit 排序按鈕
  const displayedDebit = SortingButton({
    string: t('journal:VOUCHER.DEBIT'),
    sortOrder: debitSort,
    setSortOrder: setDebitSort,
    handleReset: () => {
      setDateSort(null);
      setCreditSort(null);
    },
  });

  const displayedSelectArea = (
    <div className="flex items-center justify-between">
      {/* Info: (20250107 - Julian) hidden delete voucher & reversals toggle */}
      <div className="flex items-center gap-16px">
        <Toggle
          id="hide-reversals-toggle"
          initialToggleState={isHideReversals}
          getToggledState={hideReversalsToggleHandler}
          toggleStateFromParent={isHideReversals}
          lockedToOpen={false}
        />
        <div
          onClick={hideReversalsToggleHandler}
          className="text-switch-text-primary hover:cursor-pointer"
        >
          {t('journal:VOUCHER.HIDE_VOUCHER_TOGGLE')}
        </div>
      </div>

      {/* Info: (20250107 - Julian) export & select button */}
      <div className="flex h-50px items-center gap-24px">
        {/* Info: (20240920 - Julian) Export Voucher button */}
        {/* <Button
          type="button"
          variant="tertiaryOutline"
          className={isCheckBoxOpen ? 'hidden' : 'flex'}
          onClick={exportVoucherModalVisibilityHandler}
        >
          <MdOutlineFileDownload />
          <p>{t('journal:VOUCHER.EXPORT_VOUCHER')}</p>
        </Button> */}
        {/* Info: (20240920 - Julian) Delete button */}
        <div className={isCheckBoxOpen ? 'block' : 'hidden'}>
          <Button
            type="button"
            variant="tertiary"
            size={'defaultSquare'}
            onClick={removeVoucherHandler}
          >
            <FaRegTrashAlt />
          </Button>
        </div>
        {/* Info: (20240920 - Julian) Select All & Cancel button */}
        <button
          type="button"
          className={`${isCheckBoxOpen ? 'block' : 'hidden'} font-semibold text-link-text-primary hover:opacity-70`}
          onClick={selectAllHandler}
        >
          {isSelectedAll ? t('journal:VOUCHER.UNSELECT_ALL') : t('journal:VOUCHER.SELECT_ALL')}
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
          {t('journal:VOUCHER.SELECT')}
        </button>
      </div>
    </div>
  );

  const displayedVoucherList = uiVoucherList.map((voucher) => {
    return (
      <VoucherItem
        key={voucher.id}
        voucher={voucher}
        selectHandler={selectHandler}
        isCheckBoxOpen={isCheckBoxOpen}
        selectedStartDate={selectedStartDate}
        selectedEndDate={selectedEndDate}
        selectedType={selectedType}
        keyword={keyword}
        currentPage={currentPage}
        fullVoucherList={uiVoucherList}
      />
    );
  });

  return (
    <div className="flex flex-col gap-lv-4">
      {displayedSelectArea}

      <p className="ml-auto text-xs font-semibold uppercase text-text-neutral-tertiary">
        {t('journal:VOUCHER.CURRENCY')}: TWD
      </p>

      {/* Info: (20240920 - Julian) Table */}
      <div className={`table overflow-hidden rounded-lg ${bottomColor}`}>
        {/* Info: (20240920 - Julian) ---------------- Table Header ---------------- */}
        <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-sm text-text-neutral-tertiary">
          <div className="table-row">
            <div className={`${checkStyle} w-20px border-b border-stroke-neutral-quaternary`}>
              <span className="mx-auto table h-16px w-16px table-fixed">
                <div
                  className={`relative h-16px w-16px rounded-xxs border border-checkbox-stroke-unselected text-center ${isSelectedAll ? 'bg-checkbox-surface-selected' : 'bg-checkbox-surface-unselected'}`}
                  onClick={checkAllHandler}
                >
                  {isSelectedAll && <HiCheck className="absolute text-neutral-white" />}
                </div>
              </span>
            </div>
            <div
              className={`${tableCellStyles} ${sideBorderStyles} h-60px w-90px min-w-90px border-r`}
            >
              {displayedDate}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles} w-1/8 min-w-90px border-r`}>
              {t('journal:VOUCHER.VOUCHER_NO')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles} w-1/3 min-w-90px border-r`}>
              {t('journal:VOUCHER.NOTE')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles} w-1/6 min-w-180px border-r`}>
              {t('journal:VOUCHER.ACCOUNTING')}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles} w-1/8 min-w-90px border-r`}>
              {displayedDebit}
            </div>
            <div className={`${tableCellStyles} ${sideBorderStyles} w-1/8 min-w-90px border-r`}>
              {displayedCredit}
            </div>
            <div
              className={`${tableCellStyles} ${sideBorderStyles} w-1/8 min-w-120px border-b border-stroke-neutral-quaternary`}
            >
              {t('journal:VOUCHER.ISSUER')}
            </div>
          </div>
        </div>

        {/* Info: (20240920 - Julian) ---------------- Table Body ---------------- */}
        <div className="table-row-group">{displayedVoucherList}</div>

        {/* Info: (20240920 - Julian) ---------------- Table Footer ---------------- */}
        <div className="table-footer-group h-20px"></div>
      </div>
    </div>
  );
};

export default VoucherList;
