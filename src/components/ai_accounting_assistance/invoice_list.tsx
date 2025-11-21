import React, { useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { PiSliders } from 'react-icons/pi';
import useOuterClick from '@/lib/hooks/use_outer_click';
import Toggle from '@/components/toggle/toggle';
import InvoiceItem from '@/components/ai_accounting_assistance/invoice_item';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { Button } from '@/components/button/button';
import { numberWithCommas } from '@/lib/utils/common';
import { useUserCtx } from '@/contexts/user_context';
import { useModalContext } from '@/contexts/modal_context';
import { IDatePeriod } from '@/interfaces/date_period';
import { IInvoiceData } from '@/interfaces/invoice_edit_area';
import { MessageType } from '@/interfaces/message_modal';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ToastType } from '@/interfaces/toastify';

// ToDo: (20251021 - Julian) 目前先用 string 儲存排序選項，之後再改成其他更合適的型別
export const SORT_BY_OPTIONS = [
  'Invoice Date: New →Old',
  'Invoice Date: Old →New',
  'Upload Date: New →Old',
  'Upload Date: Old →New',
];

const InvoiceList: React.FC<{
  invoiceData: IInvoiceData[];
  sortBy: string;
  setSortBy: React.Dispatch<React.SetStateAction<string>>;
  selectedPeriod: IDatePeriod;
  setSelectedPeriod: React.Dispatch<React.SetStateAction<IDatePeriod>>;
  activeInvoiceId: string;
  clickInvoiceHandler: (invoiceId: string) => void;
}> = ({
  invoiceData,
  sortBy,
  setSortBy,
  selectedPeriod,
  setSelectedPeriod,
  activeInvoiceId,
  clickInvoiceHandler,
}) => {
  const { isSignIn } = useUserCtx();
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  const { trigger: deleteCertificates, isLoading: isDeleting } = APIHandler(
    APIName.DELETE_CERTIFICATE_BY_ID_IN_FAITH_SESSION
  );

  const invoiceCount = numberWithCommas(invoiceData.length);

  const linkStyle =
    'text-sm font-semibold text-link-text-primary hover:text-link-text-primary-hover';

  const [isShownOnlyIncomplete, setIsShownOnlyIncomplete] = useState<boolean>(false);
  const [isSelectingMode, setIsSelectingMode] = useState<boolean>(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  const isNotSelecting = selectedInvoiceIds.length === 0;

  const openSelectingMode = () => {
    setIsSelectingMode(true);
    clickInvoiceHandler(''); // Info: (20251119 - Julian) 進入選取模式時，清除 activeInvoiceId
  };
  const closeSelectingMode = () => {
    setIsSelectingMode(false);
    setSelectedInvoiceIds([]); // Info: (20251119 - Julian) 關閉選取模式時，連帶清空 selectedInvoiceIds
  };

  const selectAllInvoices = () => {
    const allInvoiceIds = invoiceData.map((invoice) => invoice.id);
    setSelectedInvoiceIds(allInvoiceIds);
  };

  const clearAllInvoices = () => {
    setSelectedInvoiceIds([]);
  };

  const deleteInvoices = async () => {
    try {
      // ToDo: (20251121 - Julian) 目前先用固定的 sessionId
      const params = { sessionId: '123', certificateId: {} };
      // ToDo: (20251121 - Julian) 須確認 body 格式
      const body = {
        certificateIds: selectedInvoiceIds,
      };

      const { success } = await deleteCertificates({ params, body });
      if (success) {
        toastHandler({
          id: `delete_invoices_success`,
          type: ToastType.SUCCESS,
          content: `${selectedInvoiceIds.length} invoices have been removed from your draft.`,
          closeable: true,
          autoClose: 3000,
        });
      } else {
        toastHandler({
          id: `delete_invoices_failed`,
          type: ToastType.ERROR,
          content: `Failed to remove selected invoices. Please try again.`,
          closeable: true,
        });
      }
    } catch (err) {
      toastHandler({
        id: `delete_invoices_error`,
        type: ToastType.ERROR,
        content: `Error message: ${(err as Error).message}`,
        closeable: true,
      });
    }
  };

  const deleteHandler = () => {
    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: 'Delete Invoices',
      content: `Are you sure you want to remove ${selectedInvoiceIds.length} selected invoices from your draft?`,
      backBtnStr: 'No, Cancel',
      backBtnFunction: messageModalVisibilityHandler,
      submitBtnStr: 'Yes. Remove it.',
      submitBtnFunction: deleteInvoices,
    });
    messageModalVisibilityHandler();
  };

  const selectInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((prevSelected) => {
      if (prevSelected.includes(invoiceId)) {
        // Info: (20251119 - Julian) 取消選取：從 selectedInvoiceIds 移除
        return prevSelected.filter((id) => id !== invoiceId);
      }
      // Info: (20251119 - Julian) 選取：加入 selectedInvoiceIds
      return [...prevSelected, invoiceId];
    });
  };

  const displayedInvoices = invoiceData.map((invoice) => {
    const isActive = invoice.id === activeInvoiceId;
    const isSelected = selectedInvoiceIds.includes(invoice.id);

    const clickHandler = () => clickInvoiceHandler(invoice.id);
    const selectHandler = () => selectInvoice(invoice.id);

    return (
      <InvoiceItem
        key={invoice.id}
        invoice={invoice}
        isActive={isActive}
        clickHandler={clickHandler}
        isSelected={isSelected}
        isSelectedMode={isSelectingMode}
        selectHandler={selectHandler}
      />
    );
  });

  const {
    targetRef: sortRef,
    componentVisible: isSortOpen,
    setComponentVisible: setIsSortOpen,
  } = useOuterClick<HTMLDivElement>(false);

  const toggleSortDropdown = () => setIsSortOpen((prev) => !prev);
  const toggleShownOnlyIncomplete = () => setIsShownOnlyIncomplete((prev) => !prev);

  const displayedSortOptions = SORT_BY_OPTIONS.map((option) => {
    const isActive = sortBy === option;
    const clickHandler = () => {
      setSortBy(option);
      setIsSortOpen(false);
    };
    return (
      <button
        key={option}
        type="button"
        onClick={clickHandler}
        className={`${isActive ? 'text-tabs-text-active' : 'text-dropdown-text-primary hover:bg-dropdown-surface-item-hover'} px-12px py-8px text-left text-sm font-medium`}
      >
        {option}
      </button>
    );
  });

  const displayedSortDropdown = isSortOpen && (
    <div
      ref={sortRef}
      className="absolute right-0 top-50px z-10 flex w-full flex-col rounded-sm border border-dropdown-stroke-menu bg-dropdown-surface-menu-background-primary p-8px shadow-Dropshadow_M"
    >
      <p className="px-12px py-8px text-xs font-semibold uppercase text-dropdown-text-head">
        Sort by
      </p>
      {displayedSortOptions}
      <hr className="m-8px border-t border-divider-stroke-lv-4" />
      <div className="flex items-center justify-between gap-8px px-12px py-8px text-xs font-medium text-switch-text-primary">
        <p>Show Incomplete Only</p>
        <Toggle
          id="show_incomplete_only_toggle"
          toggleStateFromParent={isShownOnlyIncomplete}
          getToggledState={toggleShownOnlyIncomplete}
        />
      </div>
    </div>
  );

  const displayedFilter = isSelectingMode ? (
    <div className="flex items-center justify-between gap-4px">
      <Button type="button" className="w-170px" disabled={isDeleting || isNotSelecting}>
        Import to iSunFA ({selectedInvoiceIds.length})
      </Button>
      <Button
        type="button"
        variant="secondaryOutline"
        size="defaultSquare"
        disabled={isDeleting || isNotSelecting}
        onClick={deleteHandler}
      >
        <FiTrash2 size={20} />
      </Button>
    </div>
  ) : (
    <div className="relative flex items-center gap-4px">
      <DatePicker
        type={DatePickerType.TEXT_PERIOD}
        period={selectedPeriod}
        setFilteredPeriod={setSelectedPeriod}
        calenderClassName="scale-75 w-250px md:scale-60 origin-top-left"
        buttonStyleAfterDateSelected="w-100px truncate"
      />
      <button
        type="button"
        onClick={toggleSortDropdown}
        className="p-12px text-button-text-secondary hover:text-button-text-secondary-hover"
      >
        <PiSliders size={24} />
      </button>

      {displayedSortDropdown}
    </div>
  );

  const displayedSelectBtn = isSelectingMode ? (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-16px">
        <button type="button" onClick={selectAllInvoices} className={linkStyle}>
          Select All
        </button>
        <button type="button" onClick={clearAllInvoices} className={linkStyle}>
          Clear All
        </button>
      </div>
      <button type="button" onClick={closeSelectingMode} className={linkStyle}>
        Cancel
      </button>
    </div>
  ) : (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-text-neutral-tertiary">{invoiceCount} Certificates</p>
      {isSignIn && (
        <button type="button" onClick={openSelectingMode} className={linkStyle}>
          Select
        </button>
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col gap-8px">
      {/* Info: (20251021 - Julian) Develop Filter section */}
      {displayedFilter}
      {displayedSelectBtn}
      {/* Info: (20251015 - Julian) Invoice List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-8px">{displayedInvoices}</div>
      </div>
    </div>
  );
};

export default InvoiceList;
