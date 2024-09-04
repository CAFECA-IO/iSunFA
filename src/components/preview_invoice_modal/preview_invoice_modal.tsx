import Image from 'next/image';
import { MdOutlineFileDownload } from 'react-icons/md';
import { RxCross2 } from 'react-icons/rx';
import { PiShareFat } from 'react-icons/pi';
import { timestampToString } from '@/lib/utils/common';
import { IPreviewInvoiceModal } from '@/interfaces/preview_invoice_modal';
import { Button } from '@/components/button/button';
// eslint-disable-next-line import/no-cycle
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import { ToastType } from '@/interfaces/toastify';

interface IPreviewInvoiceModalProps {
  isModalVisible: boolean;
  modalVisibilityHandler: () => void;
  previewInvoiceModalData: IPreviewInvoiceModal;
}

const PreviewInvoiceModal = ({
  isModalVisible,
  modalVisibilityHandler,
  previewInvoiceModalData,
}: IPreviewInvoiceModalProps) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const { date, imgStr } = previewInvoiceModalData;
  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } = useGlobalCtx();

  // Info: (20240508 - Julian) 關閉 modal
  const closeClickHandler = () => modalVisibilityHandler();

  // Info: (20240508 - Julian) 下載
  const downloadClickHandler = () => {
    messageModalDataHandler({
      title: t('journal:JOURNAL.DOWNLOAD_SELECTED_VOUCHER'),
      content: t('journal:JOURNAL.DOWNLOAD_SELECTED_ITEMS'),
      messageType: MessageType.INFO,
      submitBtnStr: t('journal:JOURNAL.DOWNLOAD'),
      // ToDo: (20240508 - Julian) [Beta] 下載功能
      submitBtnFunction: () => {
        modalVisibilityHandler();
      },
    });
    messageModalVisibilityHandler();
  };

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div
        className={`relative flex h-700px w-90vw flex-col gap-16px rounded-xs bg-card-surface-primary py-16px md:w-700px`}
      >
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-icon-surface-single-color-primary"
        >
          <RxCross2 size={20} />
        </button>
        <div className="flex h-full w-full flex-col items-center divide-y divide-stroke-neutral-quaternary">
          {/* Info: (20240508 - Julian) Title */}
          <div className="flex flex-col items-center pb-16px">
            <h1 className="text-xl font-bold text-card-text-primary">
              {t('journal:JOURNAL.PREVIEW_INVOICE')}
            </h1>
            <p className="text-xs text-card-text-secondary">{timestampToString(date).date}</p>
          </div>
          {/* Info: (20240508 - Julian) Function Buttons */}
          <div className="flex w-full items-center justify-end gap-16px p-16px">
            {/* Info: (20240508 - Julian) Download Button */}
            <Button
              type="button"
              onClick={downloadClickHandler}
              variant="tertiary"
              className="h-44px w-44px p-0"
            >
              <MdOutlineFileDownload size={20} />
            </Button>
            {/* ToDo: (20240508 - Julian) [Beta] Share Button */}
            <Button type="button" variant="tertiary" className="h-44px w-44px p-0">
              <PiShareFat size={20} />
            </Button>
          </div>
          {/* Info: (20240508 - Julian) Invoice Preview */}
          <div className="h-full w-full flex-1 overflow-x-auto p-16px">
            <Image
              src={imgStr}
              width={500}
              height={300}
              alt="invoice_preview"
              style={{ objectFit: 'contain' }}
              onError={() => {
                modalVisibilityHandler();
                toastHandler({
                  id: 'no-invoice-preview',
                  type: ToastType.WARNING,
                  content: 'No invoice preview',
                  closeable: true,
                });
              }}
            />
          </div>
          {/* Info: (20240508 - Julian) Close Button */}
          <div className="flex w-full justify-end px-16px pt-16px">
            <Button type="button" onClick={closeClickHandler} variant="tertiary">
              {t('common:COMMON.CLOSE')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default PreviewInvoiceModal;
