"use client";

import { useState, useRef, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import QRCode from 'react-qr-code';
import { formatDate } from '@/lib/utils/date';

interface IReceiptPdfDownloaderProps {
  receiptNumber: string;
  date: string | Date;
  amount: number;
  sellerName?: string;
  sellerTaxId?: string;
  buyerName?: string;
  buyerTaxId?: string;
  itemName?: string;
  className?: string;
}

// Info: (20260410 - Luphia) 格式需符合中華民國電子發票規格，不需要翻譯
export default function ReceiptPdfDownloader({
  receiptNumber,
  date,
  amount,
  sellerName = '卡菲卡金融科技股份有限公司',
  sellerTaxId = '52650861',
  buyerName,
  buyerTaxId,
  itemName = 'iSunFA 點數購買',
  className
}: IReceiptPdfDownloaderProps) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.getElementById('libre-barcode-39')) {
      const link = document.createElement('link');
      link.id = 'libre-barcode-39';
      link.href = 'https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading || !containerRef.current) return;
    setIsDownloading(true);

    try {
      const html2pdf = (await import('html2pdf.js')).default;

      const element = containerRef.current.querySelector('.invoice-content') as HTMLElement;
      if (!element) return;

      element.style.display = 'block';
      const opt = {
        margin: 0,
        filename: `invoice_${receiptNumber.substring(0, 15)}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: [57, 160] as [number, number], orientation: 'portrait' as const }
      };

      await html2pdf().set(opt).from(element).save();

      element.style.display = 'none';

    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert(t('billing.orders.download_failed', { defaultValue: '下載失敗，請稍後再試。' }));
    } finally {
      setIsDownloading(false);
    }
  };

  const invoiceDate = new Date(date);
  const rocYear = invoiceDate.getFullYear() - 1911;
  const isEvenMonth = invoiceDate.getMonth() % 2 !== 0;
  const startMonthNum = isEvenMonth ? invoiceDate.getMonth() : (invoiceDate.getMonth() + 1);
  const startMonthStr = startMonthNum.toString().padStart(2, '0');
  const endMonthStr = (startMonthNum + 1).toString().padStart(2, '0');
  const formattedTime = formatDate(invoiceDate, 'yyyy-MM-dd HH:mm:ss');

  const code39Number = receiptNumber.length >= 10 ? receiptNumber.substring(0, 10).toUpperCase() : `AA${receiptNumber.padEnd(8, '0').substring(0, 8).toUpperCase()}`;
  const tax = Math.round(amount - (amount / 1.05));
  const salesAmount = amount - tax;

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={className || "p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-1 text-sm"}
        title={t('billing.orders.download_receipt', { defaultValue: '下載單據 (PDF)' })}
      >
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </button>

      <div ref={containerRef} className="absolute overflow-hidden w-0 h-0 opacity-0 pointer-events-none z-[-10]">
        <div className="invoice-content" style={{ display: 'none', width: '210px', padding: '10px', background: 'white', color: 'black', fontFamily: 'monospace' }}>

          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0' }}>{sellerName}</h2>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0' }}>電子發票證明聯</h1>
            <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0' }}>
              {rocYear}年{startMonthStr}-{endMonthStr}月
            </p>
            <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}>
              {code39Number}
            </p>
          </div>

          <div style={{ fontSize: '10px', marginBottom: '8px' }}>
            <div style={{ marginBottom: '4px' }}>
              <span style={{ display: 'inline-block', width: '25px' }}>格式</span>
              <span>25</span>
            </div>
            <div>{formattedTime}</div>
            <div>隨機碼: {Math.floor(Math.random() * 9000 + 1000)} &nbsp;&nbsp;&nbsp; 總計: {amount}</div>
            <div>
              <span style={{ display: 'inline-block', width: '50px' }}>賣方統編:</span>
              <span>{sellerTaxId}</span>
            </div>
            {buyerTaxId && (
              <div>
                <span style={{ display: 'inline-block', width: '50px' }}>買方統編:</span>
                <span>{buyerTaxId}</span>
              </div>
            )}
            {buyerName && !buyerTaxId && (
              <div>
                <span style={{ display: 'inline-block', width: '50px' }}>買方名稱:</span>
                <span>{buyerName}</span>
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', margin: '14px 0', overflow: 'hidden' }}>
            <div style={{ fontFamily: "'Libre Barcode 39 Text', cursive", fontSize: '32px', lineHeight: '32px', whiteSpace: 'nowrap' }}>
              *{code39Number}*
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ width: '48%', display: 'flex', justifyContent: 'flex-start' }}>
              <QRCode value={`**${code39Number}:CAFECA:${amount}`} size={85} />
            </div>
            <div style={{ width: '48%', display: 'flex', justifyContent: 'flex-end' }}>
              <QRCode value={`*${code39Number}:ItemBlock:*`} size={85} />
            </div>
          </div>

          <div style={{ fontSize: '10px', borderTop: '1px dashed #000', paddingTop: '8px', paddingBottom: '8px', borderBottom: '1px dashed #000', marginBottom: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ width: '50%', fontWeight: 'normal' }}>品名</th>
                  <th style={{ width: '15%', fontWeight: 'normal' }}>數量</th>
                  <th style={{ width: '35%', textAlign: 'right', fontWeight: 'normal' }}>金額</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ paddingTop: '4px', wordBreak: 'break-all' }}>{itemName}</td>
                  <td style={{ paddingTop: '4px' }}>1</td>
                  <td style={{ textAlign: 'right', paddingTop: '4px' }}>{amount}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: '10px', paddingBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={{ paddingBottom: '2px' }}>銷售額</td>
                  <td style={{ textAlign: 'right', paddingBottom: '2px' }}>{salesAmount}</td>
                </tr>
                <tr>
                  <td style={{ paddingBottom: '2px' }}>稅額(應稅)</td>
                  <td style={{ textAlign: 'right', paddingBottom: '2px' }}>{tax}</td>
                </tr>
                <tr>
                  <td style={{ paddingTop: '4px', borderTop: '1px solid #000', fontWeight: 'bold' }}>總計金額</td>
                  <td style={{ textAlign: 'right', paddingTop: '4px', borderTop: '1px solid #000', fontWeight: 'bold' }}>{amount}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </>
  );
}
