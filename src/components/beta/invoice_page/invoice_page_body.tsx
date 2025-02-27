import React, { useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { LuDownload } from 'react-icons/lu';
import { BiPrinter } from 'react-icons/bi';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/button/button';
import InvoiceDetail from '@/components/beta/invoice_page/invoice_detail';
import { ITeamInvoice } from '@/interfaces/subscription';

interface InvoicePageBodyProps {
  invoice: ITeamInvoice;
}

const InvoicePageBody: React.FC<InvoicePageBodyProps> = ({ invoice }) => {
  const { t } = useTranslation(['subscriptions', 'common']);
  const printRef = useRef<HTMLDivElement>(null);

  const { id: invoiceId } = invoice;

  // ToDo: (20250115 - Julian) 下載發票
  const downloadClickHandler = () => {
    // Deprecated: (20250116 - Julian) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('Download invoice ', invoiceId);
  };

  // Info: (20250115 - Julian) 列印發票
  const handlePrint = useReactToPrint({
    contentRef: printRef, // Info: (20250117 - Julian) 指定需要打印的內容 Ref
    documentTitle: `${t('subscriptions:INVOICE_PAGE.INVOICE_TITLE')} ${invoiceId}`,
    onBeforePrint: async () => {
      return Promise.resolve(); // Info: (20250117 - Julian) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      return Promise.resolve(); // Info: (20250117 - Julian) 確保回傳一個 Promise
    },
  });

  const printClickHandler = () => handlePrint();

  return (
    <main className="flex w-full flex-col gap-40px p-40px">
      {/* Info: (20250115 - Julian) Buttons */}
      <div className="ml-auto flex items-center gap-16px">
        <Button
          type="button"
          variant="secondaryOutline"
          size="defaultSquare"
          onClick={downloadClickHandler}
        >
          <LuDownload size={16} />
        </Button>
        <Button
          type="button"
          variant="secondaryOutline"
          size="defaultSquare"
          onClick={printClickHandler}
        >
          <BiPrinter size={16} />
        </Button>
      </div>

      {/* Info: (20250115 - Julian) Invoice Detail */}
      <InvoiceDetail invoice={invoice} printRef={printRef} />
    </main>
  );
};

export default InvoicePageBody;
