"use client";

import { useState, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import { formatDate } from '@/lib/utils/date';
import Image from 'next/image';

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
  items?: { name: string; quantity: number | string; unitPrice: number | string; amount: number | string; remark?: string }[];
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
  items,
  className
}: IReceiptPdfDownloaderProps) {
  const { t } = useTranslation();

  const invoiceItems = items && items.length > 0 ? items : [];
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
            color: '#374151',
            fontFamily: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
        >
          {/* Info: (20260410 - Luphia) Header */}
          <div style={{ textAlign: 'center', marginBottom: '20px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Image src="/isunfa_logo_color.svg" alt="iSunFA Logo" width={110} height={32} style={{ height: '32px', width: 'auto' }} unoptimized priority />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0', letterSpacing: '2px', color: '#ea580c' }}>電子發票證明聯</h1>
            <h2 style={{ fontSize: '18px', fontWeight: 'normal', margin: '0', color: '#6b7280' }}>{formattedDateString}</h2>
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
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb', color: '#374151' }}>
            <thead>
              <tr style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}>
                <th style={{ border: '1px solid #e5e7eb', padding: '12px 8px', textAlign: 'center', width: '40%' }}>品名</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '12px 8px', textAlign: 'center', width: '10%' }}>數量</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '12px 8px', textAlign: 'center', width: '15%' }}>單價</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '12px 8px', textAlign: 'center', width: '15%' }}>金額</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '12px 8px', textAlign: 'center', width: '20%' }}>備註</th>
              </tr>
            </thead>
            <tbody>
              {/* Info: (20260410 - Luphia) Item Rows mapped cleanly vertically */}
              {invoiceItems.map((item, index) => (
                <tr key={`item-${index}`}>
                  <td style={{ border: '1px solid #e5e7eb', borderBottom: 'none', padding: '12px 8px 120px 8px', verticalAlign: 'top' }}>
                    {item.name}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', borderBottom: 'none', padding: '12px 8px 120px 8px', textAlign: 'center', verticalAlign: 'top' }}>
                    {item.quantity}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', borderBottom: 'none', padding: '12px 8px 120px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                    {typeof item.unitPrice === 'number' ? item.unitPrice.toLocaleString() : item.unitPrice}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', borderBottom: 'none', padding: '12px 8px 120px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                    {typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', borderBottom: 'none', padding: '12px 8px 120px 8px', verticalAlign: 'top', color: '#6b7280', fontSize: '12px' }}>
                    {item.remark || <span className="sr-only">備註</span>}
                  </td>
                </tr>
              ))}
              {/* Info: (20260410 - Luphia) Spacer Row to force some height before totals if needed, handled by padding above */}

              {/* Info: (20260410 - Luphia) Totals - Row 1 */}
              <tr>
                <td colSpan={3} style={{ border: '1px solid #e5e7eb', padding: '12px 8px' }}>
                  銷售額合計
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '12px 8px', textAlign: 'right' }}>
                  {salesAmount.toLocaleString()}
                </td>
                {/* Info: (20260410 - Luphia) Seller Stamp Block */}
                <td rowSpan={4} style={{ border: '1px solid #e5e7eb', padding: '12px 8px', fontSize: '12px', verticalAlign: 'top', backgroundColor: '#f9fafb' }}>
                  <div style={{ marginBottom: '8px', color: '#ea580c', fontWeight: 'bold' }}>營業人蓋統一發票專用章</div>
                  <div style={{ color: '#9ca3af', fontSize: '10px', marginBottom: '15px' }}>(已條列營業人資料者得免蓋章)</div>

                  <div style={{ marginBottom: '4px' }}>賣方：{sellerName}</div>
                  <div style={{ marginBottom: '4px' }}>統一編號：{sellerTaxId}</div>
                  <div>地址：{sellerAddress}</div>
                </td>
              </tr>

              {/* Info: (20260410 - Luphia) Totals - Row 2 */}
              <tr>
                <td colSpan={3} style={{ border: '1px solid #e5e7eb', padding: '0' }}>
                  <span className="sr-only">TAX</span>
                  <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: 'none' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '25%', padding: '12px 8px', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>營業稅</td>
                        <td style={{ width: '20%', padding: '12px 8px', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>應稅</td>
                        <td style={{ width: '15%', padding: '12px 8px', borderRight: '1px solid #e5e7eb', textAlign: 'center', color: '#ea580c', fontWeight: 'bold' }}>V</td>
                        <td style={{ width: '20%', padding: '12px 8px', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>零稅</td>
                        <td style={{ width: '20%', padding: '12px 8px', textAlign: 'center' }}>免稅</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '12px 8px', textAlign: 'right' }}>
                  {tax.toLocaleString()}
                </td>
              </tr>

              {/* Info: (20260410 - Luphia) Totals - Row 3 */}
              <tr>
                <td colSpan={3} style={{ border: '1px solid #e5e7eb', padding: '12px 8px', fontWeight: 'bold' }}>
                  總計
                </td>
                <td style={{ border: '1px solid #e5e7eb', padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#ea580c' }}>
                  {amount.toLocaleString()}
                </td>
              </tr>

              {/* Info: (20260410 - Luphia) Totals - Row 4 */}
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <td style={{ border: '1px solid #e5e7eb', padding: '12px 8px', whiteSpace: 'nowrap', width: '15%' }}>
                  總計新臺幣<br />(中文大寫)
                </td>
                <td colSpan={3} style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', verticalAlign: 'middle', letterSpacing: '4px', fontWeight: 'bold', fontSize: '16px', color: '#ea580c' }}>
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
