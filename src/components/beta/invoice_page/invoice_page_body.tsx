import React, { useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { LuDownload } from 'react-icons/lu';
import { BiPrinter } from 'react-icons/bi';
import { useReactToPrint } from 'react-to-print';
// import { jsPDF } from 'jspdf';
import { Button } from '@/components/button/button';
import InvoiceDetail from '@/components/beta/invoice_page/invoice_detail';
import { ITeamInvoice } from '@/interfaces/subscription';
import APIHandler from '@/lib/utils/api_handler';
import { APIName } from '@/constants/api_connection';

interface InvoicePageBodyProps {
  invoice: ITeamInvoice;
}

const InvoicePageBody: React.FC<InvoicePageBodyProps> = ({ invoice }) => {
  const { t } = useTranslation(['subscriptions', 'common']);
  const printRef = useRef<HTMLDivElement>(null);

  const { id: invoiceId } = invoice;

  const { trigger: sendEmail } = APIHandler<void>(APIName.EMAIL);

  // Info: (20250418 - Julian) 下載發票
  const downloadClickHandler = async () => {
    if (!invoiceId || !printRef.current) return;

    const now = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });

    // Info: (20250418 - Julian) 下載內容
    // eslint-disable-next-line new-cap
    // const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });

    // pdf.save(`${t('subscriptions:INVOICE_PAGE.INVOICE_TITLE')} ${invoiceId}.pdf`);

    sendEmail({
      header: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: {
        title: 'iSunFA Invoice',
        content: `<div><h3>發票編號: ${invoiceId}，請參考附件</h3><p>${now}<p></div>`,
        attachments: [
          {
            filename: `${t('subscriptions:INVOICE_PAGE.INVOICE_TITLE')} ${invoiceId}.pdf`,
            path: '/files/invoice_19.pdf',
          },
        ],
      },
    });

    // const html2pdf = await require('html2pdf.js');

    // // Info: (20250418 - Julian) 下載內容
    // html2pdf(printRef.current, {
    //   filename: `${t('subscriptions:INVOICE_PAGE.INVOICE_TITLE')} ${invoiceId}.pdf`,
    //   jsPDF: { format: 'a4', orientation: 'portrait' },
    //   margin: 20,
    // });
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
