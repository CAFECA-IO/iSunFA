import React, { useRef } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { LuDownload } from 'react-icons/lu';
import { BiPrinter } from 'react-icons/bi';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/button/button';
import InvoiceDetail from '@/components/beta/invoice_page/invoice_detail';
import { ITeamInvoice } from '@/interfaces/subscription';
import { TbArrowBackUp } from 'react-icons/tb';
import { ISUNFA_ROUTE } from '@/constants/url';

interface InvoicePageBodyProps {
  invoice: ITeamInvoice;
}

const InvoicePageBody: React.FC<InvoicePageBodyProps> = ({ invoice }) => {
  const { t } = useTranslation(['subscriptions', 'common']);
  const printRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { id: invoiceId } = invoice;

  // Info: (20250418 - Julian) 下載發票
  const downloadClickHandler = async () => {
    if (!invoiceId || !printRef.current) return;

    // Info: (20250418 - Julian) 下載內容： A4 直式
    // eslint-disable-next-line new-cap
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Info: (20250418 - Julian) 設定畫布
    const canvas = await html2canvas(printRef.current, {
      scale: 2,
      useCORS: true,
      logging: true, // Info: (20250418 - Julian) 「顯示除錯訊息」到 console
    });
    const imgData = canvas.toDataURL('image/png');

    // Info: (20250418 - Julian) 隱藏/顯示 element
    const hiddenElement = printRef.current.querySelector('.hidden-print');
    if (hiddenElement) {
      hiddenElement.classList.remove('hidden-print');
    }
    const visibleElement = printRef.current.querySelector('.visible-print');
    if (visibleElement) {
      visibleElement.classList.add('hidden-print');
    }

    // Info: (20250418 - Julian) 圖片大小
    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = pdf.internal.pageSize.getHeight();

    // Info: (20250418 - Julian) 紙張大小
    const pageWidth = canvas.width;
    const pageHeight = canvas.height;

    // Info: (20250418 - Julian) 計算比例
    const widthRatio = imgWidth / pageWidth;
    const heightRatio = imgHeight / pageHeight;

    // Info: (20250418 - Julian) 計算縮放比例
    const scaleRatio = Math.min(widthRatio, heightRatio);
    const scaledWidth = pageWidth * scaleRatio;
    const scaledHeight = pageHeight * scaleRatio;

    // Info: (20250418 - Julian) 將圖片加入 PDF
    pdf.addImage(imgData, 'PNG', 0, 0, scaledWidth, scaledHeight);
    pdf.save(`${t('subscriptions:INVOICE_PAGE.INVOICE_TITLE')} ${invoiceId}.pdf`);
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
  const goBack = () => router.push(ISUNFA_ROUTE.SUBSCRIPTIONS);

  return (
    <main className="flex w-full flex-col gap-lv-6 tablet:gap-40px tablet:p-40px">
      {/* Info: (20250526 - Julian) Mobile back button */}
      <div className="flex items-center gap-lv-2 tablet:hidden">
        <Button variant="secondaryBorderless" size="defaultSquare" onClick={goBack}>
          <TbArrowBackUp size={24} />
        </Button>
        <p className="text-base font-semibold text-text-neutral-secondary">
          {t('subscriptions:INVOICE_PAGE.PAGE_TITLE')} # {invoiceId}
        </p>
      </div>
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
      <div className="overflow-x-auto tablet:overflow-hidden">
        <InvoiceDetail invoice={invoice} printRef={printRef} />
      </div>
    </main>
  );
};

export default InvoicePageBody;
