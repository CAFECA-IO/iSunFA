import React, { useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import puppeteer from 'puppeteer';
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
  const router = useRouter();

  const { id: invoiceId } = invoice;

  // Info: (20250418 - Julian) 下載發票
  const downloadClickHandler = async () => {
    if (!invoiceId || !printRef.current) return;

    // Info: (20250418 - Julian) invoice print page URL
    const targetUrl = `${router.asPath}/print`;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    await page.goto(targetUrl, { waitUntil: 'networkidle0' });

    // Info: (20250418 - Julian) 設定 viewport 大小
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      // margin: {
      //   top: '20px',
      //   bottom: '20px',
      //   left: '10px',
      //   right: '10px',
      // },
    });

    // Info: (20250418 - Julian) 下載 PDF
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'voucher.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Info: (20250418 - Julian) 釋放 URL 物件
    URL.revokeObjectURL(url);
    await browser.close();
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
