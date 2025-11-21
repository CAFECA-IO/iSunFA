import React from 'react';
import Image from 'next/image';
import { CiImageOn } from 'react-icons/ci';
import { FiTrash2 } from 'react-icons/fi';
import { RxReload } from 'react-icons/rx';
import { IoWarningOutline } from 'react-icons/io5';
import { IInvoiceData } from '@/interfaces/invoice_edit_area';
import { useModalContext } from '@/contexts/modal_context';
import { checkboxStyle } from '@/constants/display';
import { MessageType } from '@/interfaces/message_modal';
import { APIName } from '@/constants/api_connection';
import APIHandler from '@/lib/utils/api_handler';
import { ToastType } from '@/interfaces/toastify';

interface IInvoiceItemProps {
  invoice: IInvoiceData;
  isActive: boolean;
  clickHandler: () => void;
  isSelected: boolean;
  isSelectedMode: boolean;
  selectHandler: () => void;
}

// ToDo: (20251014 - Julian) during development
const InvoiceItem: React.FC<IInvoiceItemProps> = ({
  invoice,
  isActive,
  clickHandler,
  isSelected,
  isSelectedMode,
  selectHandler,
}) => {
  const { id, unread, imageUrl } = invoice;
  const { messageModalDataHandler, messageModalVisibilityHandler, toastHandler } =
    useModalContext();

  // ToDo: (20251121 - Julian) 目前先用固定的 sessionId
  const params = { sessionId: '123', certificateId: id };

  const { trigger: deleteById, isLoading } = APIHandler(
    APIName.DELETE_CERTIFICATE_BY_ID_IN_FAITH_SESSION,
    { params }
  );

  // ToDo: (20251015 - Julian) mock state for UI test
  const unfinished = true;
  const isError = false;
  const disabled = false;

  const enableStyle = isActive
    ? 'bg-surface-brand-primary-lv3 border-stroke-brand-primary'
    : 'border-stroke-neutral-quaternary hover:border-stroke-brand-primary hover:bg-surface-brand-primary-30 hover:cursor-pointer';

  const disabledStyle =
    'bg-surface-neutral-mute border-stroke-neutral-quaternary hover:cursor-not-allowed';

  const itemStyle = disabled ? disabledStyle : enableStyle;

  const deleteInvoice = async () => {
    try {
      // ToDo: (20251121 - Julian) 須確認 body 格式
      const body = { id };
      const { success } = await deleteById({ params, body });

      if (success) {
        toastHandler({
          id: `delete_invoice_${id}_success`,
          type: ToastType.SUCCESS,
          content: `Invoice ${id} has been removed from your draft.`,
          closeable: true,
          autoClose: 3000,
        });
      } else {
        toastHandler({
          id: `delete_invoice_${id}_failed`,
          type: ToastType.ERROR,
          content: `Failed to remove invoice ${id}. Please try again.`,
          closeable: true,
        });
      }
    } catch (err) {
      toastHandler({
        id: `delete_invoice_${id}_error`,
        type: ToastType.ERROR,
        content: `Error message: ${(err as Error).message}`,
        closeable: true,
      });
    }
  };

  const deleteHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
    // Info: (20251015 - Julian) disabled 狀態下不執行任何動作
    if (disabled) return;

    event.stopPropagation(); // Info: (20251119 - Julian) 阻止事件冒泡，避免觸發 clickItem

    messageModalDataHandler({
      messageType: MessageType.WARNING,
      title: 'Remove Invoice',
      content: `Are you sure you want to remove ${id} from your draft?`,
      backBtnStr: 'No, Cancel',
      backBtnFunction: messageModalVisibilityHandler,
      submitBtnStr: 'Yes. Remove it.',
      submitBtnFunction: deleteInvoice,
      submitBtnVariant: 'default',
    });
    messageModalVisibilityHandler();
  };

  const clickItem = () => {
    if (isSelectedMode) {
      selectHandler();
    } else {
      clickHandler();
    }
  };

  // Info: (20251015 - Julian) =========== Loading 樣式 ===========
  const LoadingItem = (
    <div className="flex items-center gap-8px rounded-xs border border-stroke-neutral-quaternary p-8px">
      {/* Info: (20251015 - Julian) Thumbnail */}
      <div className="h-48px w-48px rounded-xs border border-stroke-neutral-quaternary bg-stroke-neutral-quaternary opacity-50"></div>
      {/* Info: (20251015 - Julian) Id */}
      <div className="flex flex-1 items-center gap-4px opacity-50">
        <p className="text-sm font-medium text-text-neutral-primary">Scanning ...</p>
      </div>
      {/* Info: (20251015 - Julian) Delete Button */}
      <Image src="/animations/yellow_loading.gif" width={24} height={24} alt="loading" />
    </div>
  );

  // Info: (20251015 - Julian) =========== Error 樣式 ===========
  const ErrorItem = (
    <div className="flex items-center gap-8px rounded-xs border border-stroke-state-error p-8px text-text-state-error">
      {/* Info: (20251015 - Julian) Thumbnail */}
      <CiImageOn size={32} />
      {/* Info: (20251015 - Julian) Id */}
      <div className="flex-1 text-xs font-medium">
        File too large.
        <br /> Need to be &#060; 30 MB.
      </div>
      {/* Info: (20251015 - Julian) Delete & Reload button */}
      <div className="flex items-center">
        <button type="button" className="p-8px">
          <FiTrash2 size={20} />
        </button>
        <button type="button" className="p-8px">
          <RxReload size={20} />
        </button>
      </div>
    </div>
  );

  const deleteBtn = disabled ? null : (
    <button
      type="button"
      onClick={deleteHandler}
      className="p-8px text-icon-surface-single-color-primary"
    >
      <FiTrash2 size={20} />
    </button>
  );

  const selectCheckbox = isSelectedMode ? (
    <div className="w-20px">
      <input type="checkbox" checked={isSelected} className={checkboxStyle} />
    </div>
  ) : (
    unread && (
      <Image src="/icons/unread_indicator.svg" width={10} height={10} alt="unread_indicator" />
    )
  );

  if (isLoading) return LoadingItem;
  if (isError) return ErrorItem;

  return (
    <div
      onClick={clickItem}
      className={`${itemStyle} flex items-center gap-8px rounded-xs border p-8px`}
    >
      {/* Info: (20251014 - Julian) Unread icon / Select Checkbox */}
      {selectCheckbox}
      {/* Info: (20251014 - Julian) Thumbnail */}
      <div className="relative h-48px w-48px shrink-0 rounded-xs border border-stroke-neutral-quaternary">
        <Image src={imageUrl} fill objectFit="contain" alt="invoice_thumbnail" />
      </div>
      {/* Info: (20251014 - Julian) Id */}
      <div className="flex flex-1 items-center gap-4px">
        <p className="max-w-60px truncate text-sm font-medium text-text-neutral-primary">{id}</p>
        {unfinished && <IoWarningOutline size={16} className="shrink-0 text-icon-surface-error" />}
      </div>
      {/* Info: (20251014 - Julian) Delete Button */}
      {deleteBtn}
    </div>
  );
};

export default InvoiceItem;
