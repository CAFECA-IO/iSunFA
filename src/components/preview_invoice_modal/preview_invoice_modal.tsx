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
  const { t } = useTranslation('common');
  const { date, imgStr } = previewInvoiceModalData;
  const { messageModalVisibilityHandler, messageModalDataHandler, toastHandler } = useGlobalCtx();

  // Info: (20240508 - Julian) 關閉 modal
  const closeClickHandler = () => modalVisibilityHandler();

  // Info: (20240508 - Julian) 下載
  const downloadClickHandler = () => {
    messageModalDataHandler({
      title: 'Download Selected Voucher',
      content: 'Are you sure you want to download the selected items?',
      messageType: MessageType.INFO,
      submitBtnStr: t('JOURNAL.DOWNLOAD'),
      // ToDo: [Beta] (20240508 - Julian) 下載功能
      submitBtnFunction: () => {
        modalVisibilityHandler();
      },
    });
    messageModalVisibilityHandler();
  };

  const isDisplayModal = isModalVisible ? (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div
        className={`relative flex h-700px w-90vw flex-col gap-16px rounded-xs bg-white py-16px md:w-700px`}
      >
        <button
          type="button"
          onClick={modalVisibilityHandler}
          className="absolute right-12px top-12px text-lightGray5"
        >
          <RxCross2 size={20} />
        </button>
        <div className="flex h-full w-full flex-col items-center divide-y divide-lightGray6">
          {/* Info: (20240508 - Julian) Title */}
          <div className="flex flex-col items-center pb-16px">
            <h1 className="text-xl font-bold text-navyBlue2">{t('JOURNAL.PREVIEW_INVOICE')}</h1>
            <p className="text-xs text-lightGray5">{timestampToString(date).date}</p>
          </div>
          {/* Info: (20240508 - Julian) Function Buttons */}
          <div className="flex w-full items-center justify-end gap-16px p-16px">
            {/* Info: (20240508 - Julian) Download Button */}
            <button
              type="button"
              onClick={downloadClickHandler}
              className="rounded-xs bg-navyBlue2 p-12px text-white hover:bg-primaryYellow disabled:bg-lightGray5"
            >
              <MdOutlineFileDownload size={20} />
            </button>
            {/* ToDo: [Beta] (20240508 - Julian) Share Button */}
            <button
              type="button"
              className="rounded-xs bg-navyBlue2 p-12px text-white hover:bg-primaryYellow disabled:bg-lightGray5"
            >
              <PiShareFat size={20} />
            </button>
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
            <Button type="button" onClick={closeClickHandler} className="bg-navyBlue2 text-white">
              {t('COMMON.CLOSE')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return isDisplayModal;
};

export default PreviewInvoiceModal;
