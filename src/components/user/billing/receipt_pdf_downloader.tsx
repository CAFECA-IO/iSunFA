"use client";

import { useState, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import { formatDate } from '@/lib/utils/date';

interface IReceiptPdfDownloaderProps {
  receiptNumber: string;
  date: string | Date;
  amount: number;
  sellerName?: string;
  sellerTaxId?: string;
  sellerAddress?: string;
  buyerName?: string;
  buyerTaxId?: string;
  buyerAddress?: string;
  itemName?: string;
  className?: string;
}

// Info: (20260410 - Luphia) A4 格式需符合中華民國電子發票規格
export default function ReceiptPdfDownloader({
  receiptNumber,
  date,
  amount,
  sellerName = '卡菲卡金融科技股份有限公司',
  sellerTaxId = '52650861',
  sellerAddress = '臺北市信義區基隆路 1 段 206 號 18 樓',
  buyerName,
  buyerTaxId,
  buyerAddress = '',
  itemName = 'iSunFA 點數',
  className
}: IReceiptPdfDownloaderProps) {
  const { t } = useTranslation();
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
        margin: 10,
        filename: `invoice_${receiptNumber.substring(0, 15)}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
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
  const formattedDateString = formatDate(invoiceDate, 'yyyy-MM-dd'); // Format: 2026-04-02
  const fakeInvoiceNumber = receiptNumber.length >= 10 ? receiptNumber.substring(0, 10).toUpperCase() : `ZM${receiptNumber.padEnd(8, '0').substring(0, 8).toUpperCase()}`;

  const tax = Math.round(amount - (amount / 1.05));
  const salesAmount = amount - tax;

  const numberToChinese = (num: number) => {
    let numValue = num;
    const fraction = ['角', '分'];
    const digit = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
    const unit = [['元', '萬', '億'], ['', '拾', '佰', '仟']];
    let s = '';
    for (let i = 0; i < fraction.length; i++) {
      s += (digit[Math.floor(numValue * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
    }
    s = s || '整';
    numValue = Math.floor(numValue);
    for (let i = 0; i < unit[0].length && numValue > 0; i++) {
      let p = '';
      for (let j = 0; j < unit[1].length && numValue > 0; j++) {
        p = digit[numValue % 10] + unit[1][j] + p;
        numValue = Math.floor(numValue / 10);
      }
      s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
    }
    return s.replace(/(零.)*零元/, '元');
  };

  const chineseAmount = numberToChinese(amount);

  return (
    <>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={className || "p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-1 text-sm"}
        title={t('billing.orders.download_receipt', { defaultValue: '下載電子發票 (PDF)' })}
      >
        {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </button>

      {/* Info: (20260410 - Luphia) A4 Format Container (hidden) */}
      <div ref={containerRef} className="absolute overflow-hidden w-0 h-0 opacity-0 pointer-events-none z-[-10]">
        <div
          className="invoice-content"
          style={{
            display: 'none',
            width: '794px', // Info: (20260410 - Luphia) A4 width at 96 DPI
            padding: '40px',
            background: 'white',
            color: 'black',
            fontFamily: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
        >
          {/* Info: (20260410 - Luphia) Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0', letterSpacing: '2px' }}>電子發票證明聯</h1>
            <h2 style={{ fontSize: '18px', fontWeight: 'normal', margin: '0' }}>{formattedDateString}</h2>
          </div>

          {/* Info: (20260410 - Luphia) Info Block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', marginBottom: '4px' }}>
                <span style={{ width: '80px', letterSpacing: '0px' }}>發票號碼：</span>
                <span>{fakeInvoiceNumber}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '4px' }}>
                <span style={{ width: '80px', letterSpacing: '4px' }}>買方：</span>
                <span>{buyerName || ''}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '4px' }}>
                <span style={{ width: '80px', letterSpacing: '0px' }}>統一編號：</span>
                <span>{buyerTaxId || ''}</span>
              </div>
              <div style={{ display: 'flex', marginBottom: '4px' }}>
                <span style={{ width: '80px', letterSpacing: '4px' }}>地址：</span>
                <span>{buyerAddress || ''}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ letterSpacing: '4px' }}>格式：</span>25
              </div>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ letterSpacing: '0px' }}>隨機碼：</span>{Math.floor(Math.random() * 9000 + 1000)}
              </div>
              <div>第1頁/共1頁</div>
            </div>
          </div>

          {/* Info: (20260410 - Luphia) Main Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '40%' }}>品名</th>
                <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '10%' }}>數量</th>
                <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '15%' }}>單價</th>
                <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '15%' }}>金額</th>
                <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '20%' }}>備註</th>
              </tr>
            </thead>
            <tbody>
              {/* Info: (20260410 - Luphia) Item Row */}
              <tr>
                <td style={{ border: '1px solid black', borderBottom: 'none', padding: '8px 8px 120px 8px', verticalAlign: 'top' }}>
                  {itemName}
                </td>
                <td style={{ border: '1px solid black', borderBottom: 'none', padding: '8px 8px 120px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                  1
                </td>
                <td style={{ border: '1px solid black', borderBottom: 'none', padding: '8px 8px 120px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                  {amount.toLocaleString()}
                </td>
                <td style={{ border: '1px solid black', borderBottom: 'none', padding: '8px 8px 120px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                  {amount.toLocaleString()}
                </td>
                <td style={{ border: '1px solid black', borderBottom: 'none', padding: '8px', verticalAlign: 'top' }}>
                  <span className="sr-only">備註</span>
                </td>
              </tr>
              {/* Info: (20260410 - Luphia) Spacer Row to force some height before totals if needed, handled by padding above */}

              {/* Info: (20260410 - Luphia) Totals - Row 1 */}
              <tr>
                <td colSpan={3} style={{ border: '1px solid black', padding: '8px' }}>
                  銷售額合計
                </td>
                <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>
                  {salesAmount.toLocaleString()}
                </td>
                {/* Info: (20260410 - Luphia) Seller Stamp Block */}
                <td rowSpan={4} style={{ border: '1px solid black', padding: '8px', fontSize: '12px', verticalAlign: 'top' }}>
                  <div style={{ marginBottom: '8px' }}>營業人蓋統一發票專用章</div>
                  <div style={{ color: '#666', fontSize: '10px', marginBottom: '15px' }}>(已條列營業人資料者得免蓋章)</div>

                  <div style={{ marginBottom: '4px' }}>賣方：{sellerName}</div>
                  <div style={{ marginBottom: '4px' }}>統一編號：{sellerTaxId}</div>
                  <div>地址：{sellerAddress}</div>
                </td>
              </tr>

              {/* Info: (20260410 - Luphia) Totals - Row 2 */}
              <tr>
                <td colSpan={3} style={{ border: '1px solid black', padding: '0' }}>
                  <span className="sr-only">TAX</span>
                  <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                    <div style={{ width: '25%', padding: '8px', borderRight: '1px solid black' }}>營業稅</div>
                    <div style={{ width: '20%', padding: '8px', borderRight: '1px solid black', textAlign: 'center' }}>應稅</div>
                    <div style={{ width: '15%', padding: '8px', borderRight: '1px solid black', textAlign: 'center' }}>V</div>
                    <div style={{ width: '20%', padding: '8px', borderRight: '1px solid black', textAlign: 'center' }}>零稅</div>
                    <div style={{ width: '20%', padding: '8px', textAlign: 'center' }}>免稅</div>
                  </div>
                </td>
                <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>
                  {tax.toLocaleString()}
                </td>
              </tr>

              {/* Info: (20260410 - Luphia) Totals - Row 3 */}
              <tr>
                <td colSpan={3} style={{ border: '1px solid black', padding: '8px' }}>
                  總計
                </td>
                <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>
                  {amount.toLocaleString()}
                </td>
              </tr>

              {/* Info: (20260410 - Luphia) Totals - Row 4 */}
              <tr>
                <td style={{ border: '1px solid black', padding: '8px', whiteSpace: 'nowrap', width: '15%' }}>
                  總計新臺幣<br />(中文大寫)
                </td>
                <td colSpan={3} style={{ border: '1px solid black', padding: '4px 8px', textAlign: 'center', verticalAlign: 'middle', letterSpacing: '4px' }}>
                  {chineseAmount}
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      </div>
    </>
  );
}
