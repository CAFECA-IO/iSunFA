"use client";

import { useState, useRef } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';
import { formatDate } from '@/lib/utils/date';
import QRCode from 'react-qr-code';
import Barcode from 'react-barcode';
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
  const [realReceiptId, setRealReceiptId] = useState<string>('');
  const [realRandomCode, setRealRandomCode] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDownloading || !containerRef.current) return;
    setIsDownloading(true);

    try {
      // Info: (20260410 - Luphia) Fetch authentic Receipt ID, silently generating if missing.
      const res = await fetch(`/api/v1/user/order/${receiptNumber}/receipt`);
      const payload = await res.json();

      const officialReceiptId = payload?.data?.id || receiptNumber;

      const deterministicHashFallback = Math.abs(officialReceiptId.split('').reduce((hash: number, char: string) => char.charCodeAt(0) + ((hash << 5) - hash), 0) % 9000) + 1000;
      const officialRandomCode = payload?.data?.data?.randomCode || deterministicHashFallback.toString();

      setRealReceiptId(officialReceiptId);
      setRealRandomCode(officialRandomCode);

      // Info: (20260410 - Luphia) Wait for React state to propagate targetId to DOM
      await new Promise(resolve => setTimeout(resolve, 50));

      const html2pdf = (await import('html2pdf.js')).default;

      const isB2B = !!buyerTaxId;
      const targetSelector = isB2B ? '.invoice-content-a4' : '.invoice-content-thermal';
      const element = containerRef.current.querySelector(targetSelector) as HTMLElement;
      if (!element) return;

      element.style.display = 'block';

      const fileDate = formatDate(new Date(date), 'yyyyMMdd');
      const invoiceNum = `ZM${officialReceiptId.replace(/\D/g, '').padEnd(8, '0').substring(0, 8)}`;

      let opt;
      if (isB2B) {
        opt = {
          margin: 0,
          filename: `iSunFA_B2B_${fileDate}_${invoiceNum}.pdf`,
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
          jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
      } else {
        const rawHeightPx = element.scrollHeight;
        const mmHeight = Math.max(120, Math.ceil(rawHeightPx * 0.264583) + 10);
        
        // Info: (20260410 - Luphia) Explicitly define format tuples to prevent TS falling back to loose number[]
        const marginConfig: [number, number, number, number] = [2, 0, 2, 0];
        const formatConfig: [number, number] = [57, mmHeight];
        
        opt = {
          margin: marginConfig,
          filename: `iSunFA_B2C_${fileDate}_${invoiceNum}.pdf`,
          image: { type: 'jpeg' as const, quality: 1.0 },
          html2canvas: { scale: 3, useCORS: true, logging: false, windowWidth: 215 },
          jsPDF: { unit: 'mm' as const, format: formatConfig, orientation: 'portrait' as const }
        };
      }

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
  const formattedDateString = formatDate(invoiceDate, 'yyyy-MM-dd'); // Info: (20260410 - Luphia) Format: 2026-04-02

  const minguoYear = invoiceDate.getFullYear() - 1911;
  const month = invoiceDate.getMonth() + 1;
  const startMonth = month % 2 === 0 ? month - 1 : month;
  const endMonth = startMonth + 1;
  const displayInvoiceTerm = `${Math.max(0, minguoYear).toString().padStart(3, '0')}年${startMonth.toString().padStart(2, '0')}-${endMonth.toString().padStart(2, '0')}月`;

  const targetId = realReceiptId || receiptNumber;
  const digits = targetId.replace(/\D/g, '');
  const numericPart = digits.padEnd(8, '0').substring(0, 8);
  const displayReceiptNumber = `ZM${numericPart}`;

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

  // Info: (20260410 - Luphia) Fallback or derived values strictly for layout showcase.
  const rcode = realRandomCode || Math.abs(targetId.split('').reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0) % 9000).toString().padStart(4, '0') + 1000;

  // Info: (20260410 - Luphia) 1D Barcode relies on Code39: Year (3 digits) + Month (2) + InvoiceNum (10) + Random (4)
  const barcodeValue = `${minguoYear.toString().padStart(3, '0')}${endMonth.toString().padStart(2, '0')}${displayReceiptNumber}${rcode}`;

  // Info: (20260410 - Luphia) Placeholder QR structures as standard API responses
  const qr1 = `InvNum:${displayReceiptNumber}|Date:${formattedDateString}|Amount:${amount}|Seller:${sellerTaxId}|Buyer:${buyerTaxId || '00000000'}`;
  const qr2 = `**Items** ${invoiceItems.map(i => `${i.name}:${i.quantity}`).join(', ')}`;

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

      {/* Info: (20260410 - Luphia) Wrapper to prevent capturing visually on screen */}
      <div ref={containerRef} className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none -z-10">

        {/* Info: (20260410 - Luphia) B2C Layout: 57mm Thermal Roll */}
        <div
          className="invoice-content-thermal"
          style={{
            display: 'none',
            width: '215px', // Info: (20260410 - Luphia) 57mm at 96 DPI
            padding: '10px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontFamily: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
            fontSize: '9px', // Info: (20260410 - Luphia) >= 0.2cm (approx 7.5px) requirement met
            lineHeight: '1.4'
          }}
        >
          {/* Info: (20260410 - Luphia) UPPER FIXED HEIGHT SECTION (≤ 90mm | ~340px) */}
          <div style={{ minHeight: '300px', maxHeight: '340px', overflow: 'hidden', paddingBottom: '10px' }}>
            {/* Info: (20260410 - Luphia) Header branding */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 'bold' }}>{sellerName}</div>

              {/* Info: (20260410 - Luphia) Type Title: Bold, min 0.5cm (~19px) */}
              <div style={{ fontSize: '19px', fontWeight: 'bold', letterSpacing: '1px' }}>電子發票證明聯</div>
              {/* Info: (20260410 - Luphia) Period: Bold, min 0.5cm */}
              <div style={{ fontSize: '19px', fontWeight: 'bold' }}>{displayInvoiceTerm}</div>
              {/* Info: (20260410 - Luphia) Invoice Num: Bold, min 0.5cm */}
              <div style={{ fontSize: '19px', fontWeight: 'bold', marginBottom: '4px' }}>{displayReceiptNumber}</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '9px', marginBottom: '2px' }}>
                <span>{formattedDateString}</span>
                <span>{buyerTaxId ? '格式：25' : ''}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '9px', marginBottom: '2px' }}>
                <span>隨機碼：{rcode}</span>
                <span>總計：{amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '9px', marginBottom: '6px' }}>
                <span>賣方：{sellerTaxId}</span>
                <span>買方：{buyerTaxId || '00000000'}</span>
              </div>
            </div>

            {/* Info: (20260410 - Luphia) 1D Barcode: 0.5cm height required (~19px min) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <Barcode value={barcodeValue} format="CODE39" height={22} width={1} displayValue={false} margin={0} background="#ffffff" lineColor="#000000" />
            </div>

            {/* Info: (20260410 - Luphia) 2D Barcodes: Two horizonal */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              <QRCode value={qr1} size={65} level="M" />
              <QRCode value={qr2} size={65} level="M" />
            </div>
          </div>

          {/* Info: (20260410 - Luphia) CUT LINE LOGIC - Exclusively separated for B2C */}
          {!buyerTaxId && (
            <div style={{
              width: '100%',
              height: '0px',
              borderTop: '2px dashed #000',
              margin: '4px 0',
              position: 'relative'
            }}>
              <span style={{ position: 'absolute', top: '-6px', right: '0', backgroundColor: '#fff', fontSize: '8px', paddingLeft: '4px' }}>✂</span>
            </div>
          )}

          {/* Info: (20260410 - Luphia) TRANSACTION DETAILS (Unrestricted length) */}
          <div style={{ marginTop: '8px', fontSize: '9px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', textAlign: 'center' }}>** 交易明細 **</div>

            <div style={{ display: 'flex', borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '4px', fontWeight: 'bold' }}>
              <div style={{ flex: '1' }}>品名</div>
              <div style={{ width: '20px', textAlign: 'center' }}>數量</div>
              <div style={{ width: '40px', textAlign: 'right' }}>金額</div>
            </div>

            {invoiceItems.map((item, index) => (
              <div key={`item-${index}`} style={{ display: 'flex', marginBottom: '2px', alignItems: 'flex-start' }}>
                <div style={{ flex: '1', wordBreak: 'break-word' }}>{item.name}</div>
                <div style={{ width: '20px', textAlign: 'center' }}>{item.quantity}</div>
                <div style={{ width: '40px', textAlign: 'right' }}>{typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}</div>
              </div>
            ))}

            <div style={{ borderTop: '1px solid #000', marginTop: '6px', paddingTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>銷售額合計</span>
                <span>{salesAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span>營業稅</span>
                <span>{tax.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '11px', marginTop: '4px' }}>
                <span>總計金額</span>
                <span>${amount.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '8px', color: '#666' }}>
              謝謝光臨，祝您中獎！
            </div>
          </div>
        </div>

        {/* Info: (20260410 - Luphia) B2B Layout: A4 Format */}
        <div
          className="invoice-content-a4"
          style={{
            display: 'none',
            width: '794px', // Info: (20260410 - Luphia) A4 width at 96 DPI
            padding: '40px',
            backgroundColor: '#ffffff',
            color: '#374151',
            fontFamily: '"Noto Sans TC", "Microsoft JhengHei", sans-serif',
            fontSize: '14px',
            lineHeight: '1.5'
          }}
        >
          {/* Info: (20260410 - Luphia) Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <Image src="/isunfa_logo_color.svg" alt="iSunFA Logo" width={140} height={40} style={{ height: '40px', width: 'auto' }} unoptimized priority />
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: '0 0 8px 0', letterSpacing: '4px', color: '#ea580c' }}>電子發票證明聯</h1>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', margin: '0 0 10px 0', color: '#1f2937' }}>{displayInvoiceTerm}</h2>
            <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '3px', margin: '0 0 10px 0', color: '#1f2937' }}>{displayReceiptNumber}</h2>
            <h3 style={{ fontSize: '14px', fontWeight: '500', margin: '0', color: '#6b7280', letterSpacing: '1px' }}>開立日期：{formattedDateString}</h3>
          </div>

          {/* Info: (20260410 - Luphia) Info Block */}
          <div style={{ padding: '24px', backgroundColor: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '24px', position: 'relative' }}>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '16px', textTransform: 'uppercase' }}>買方資訊 (Buyer Info)</div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>
                   {buyerName || '散客交易'}
                </div>
                {buyerTaxId && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', padding: '2px 6px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>統編</span>
                    <span style={{ fontSize: '15px', fontWeight: '600', color: '#374151', letterSpacing: '1px' }}>{buyerTaxId}</span>
                  </div>
                )}
                {buyerAddress && (
                   <div style={{ fontSize: '14px', color: '#4b5563', marginTop: '4px' }}>{buyerAddress}</div>
                )}
              </div>
              
              <div style={{ flex: '0 0 auto', textAlign: 'right', borderLeft: '1px solid #e5e7eb', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '160px' }}>
                {buyerTaxId ? (
                   <div style={{ fontSize: '13px', color: '#6b7280' }}>
                     格式 <span style={{ fontWeight: 'bold', color: '#ea580c', marginLeft: '8px', fontSize: '14px' }}>25 進項發票</span>
                   </div>
                ) : (
                   <div style={{ fontSize: '13px', color: '#6b7280' }}>
                     隨機碼 <span style={{ fontWeight: 'bold', color: '#111827', marginLeft: '8px', fontSize: '14px' }}>{rcode}</span>
                   </div>
                )}
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>第 1 頁 / 共 1 頁</div>
              </div>
            </div>
          </div>

          {/* Info: (20260410 - Luphia) Main Item List */}
          <div style={{ marginTop: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ display: 'flex', backgroundColor: '#fff7ed', borderBottom: '1px solid #e5e7eb', color: '#ea580c', fontWeight: 'bold', padding: '14px 20px', fontSize: '13px', letterSpacing: '1px' }}>
              <div style={{ flex: '0 0 35%' }}>品名</div>
              <div style={{ flex: '0 0 10%', textAlign: 'center' }}>數量</div>
              <div style={{ flex: '0 0 15%', textAlign: 'right' }}>單價</div>
              <div style={{ flex: '0 0 15%', textAlign: 'right' }}>金額</div>
              <div style={{ flex: '1', textAlign: 'right' }}>備註</div>
            </div>
            <div style={{ minHeight: '160px' }}>
              {invoiceItems.map((item, index) => (
                <div key={`item-${index}`} style={{ display: 'flex', padding: '16px 20px', borderBottom: index === invoiceItems.length - 1 ? 'none' : '1px solid #f3f4f6', color: '#374151' }}>
                  <div style={{ flex: '0 0 35%', fontWeight: '500' }}>{item.name}</div>
                  <div style={{ flex: '0 0 10%', textAlign: 'center' }}>{item.quantity}</div>
                  <div style={{ flex: '0 0 15%', textAlign: 'right' }}>{typeof item.unitPrice === 'number' ? item.unitPrice.toLocaleString() : item.unitPrice}</div>
                  <div style={{ flex: '0 0 15%', textAlign: 'right' }}>{typeof item.amount === 'number' ? item.amount.toLocaleString() : item.amount}</div>
                  <div style={{ flex: '1', textAlign: 'right', color: '#6b7280', fontSize: '13px' }}>{item.remark || ''}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Info: (20260410 - Luphia) Totals Section */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '24px', alignItems: 'stretch' }}>
            <div style={{ flex: 1, border: '1px solid #f3f4f6', borderRadius: '12px', padding: '24px', backgroundColor: '#f9fafb' }}>
              <div style={{ color: '#1f2937', fontSize: '14px', marginBottom: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '14px', backgroundColor: '#ea580c', borderRadius: '2px' }}></div>
                稅別判定 (TAX)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed #e5e7eb' }}>
                <span style={{ color: '#4b5563', fontSize: '14px' }}>應稅</span>
                <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', height: '24px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', lineHeight: 1 }}>5%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px dashed #e5e7eb' }}>
                <span style={{ color: '#4b5563', fontSize: '14px' }}>零稅</span>
                <span style={{ color: '#d1d5db', fontSize: '14px' }}>-</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px' }}>
                <span style={{ color: '#4b5563', fontSize: '14px' }}>免稅</span>
                <span style={{ color: '#d1d5db', fontSize: '14px' }}>-</span>
              </div>
            </div>

            <div style={{ flex: 1, border: '1px solid #f3f4f6', borderRadius: '12px', padding: '24px', backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px dashed #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>銷售額合計</span>
                <span style={{ color: '#374151', fontWeight: '600' }}>{salesAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>營業稅</span>
                <span style={{ color: '#374151', fontWeight: '600' }}>{tax.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '20px', paddingBottom: '16px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>總計金額</span>
                <span style={{ fontWeight: 'bold', fontSize: '26px', lineHeight: '1', color: '#ea580c' }}>${amount.toLocaleString()}</span>
              </div>

              <div style={{ backgroundColor: '#fff7ed', padding: '16px', borderRadius: '8px', marginTop: 'auto', textAlign: 'center', border: '1px solid #ffedd5' }}>
                <div style={{ fontSize: '12px', color: '#fb923c', marginBottom: '6px' }}>總計新臺幣 (中文大寫)</div>
                <div style={{ letterSpacing: '4px', fontWeight: 'bold', fontSize: '18px', color: '#ea580c' }}>{chineseAmount}</div>
              </div>
            </div>
          </div>

          {/* Info: (20260410 - Luphia) Seller Details Footer */}
          <div style={{ marginTop: '50px', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#6b7280', letterSpacing: '2px', marginBottom: '16px' }}>賣方資訊</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ flex: '0 0 auto', borderRight: '1px solid #e5e7eb', paddingRight: '24px' }}>
                <div style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '16px', letterSpacing: '2px', marginBottom: '6px' }}>{sellerName}</div>
                <div style={{ display: 'flex', alignItems: 'center', color: '#ea580c', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1px' }}>
                  統一編號：<span style={{ fontSize: '16px', letterSpacing: '2px' }}>{sellerTaxId}</span>
                </div>
              </div>
              <div style={{ flex: '1', fontSize: '13px', color: '#4b5563', lineHeight: '1.6' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#9ca3af', minWidth: '40px', letterSpacing: '4px' }}>地址</span>
                  <span style={{ color: '#374151', wordBreak: 'break-word', paddingRight: '16px' }}>{sellerAddress}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
