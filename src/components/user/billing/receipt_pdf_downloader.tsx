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

      const element = containerRef.current.querySelector('.invoice-content') as HTMLElement;
      if (!element) return;

      element.style.display = 'block';

      const fileDate = formatDate(new Date(date), 'yyyy-MM-dd');
      const invoiceNum = `ZM${officialReceiptId.replace(/\D/g, '').padEnd(8, '0').substring(0, 8)}`;

      const opt = {
        margin: 0,
        filename: `iSunFA_${fileDate}_${invoiceNum}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
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

      {/* Info: (20260410 - Luphia) A4 Format Container (hidden but unrestricted width for canvas capture) */}
      <div ref={containerRef} className="fixed -left-[9999px] top-0 opacity-0 pointer-events-none -z-10">
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
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '1px', margin: '0 0 5px 0', color: '#1f2937' }}>{displayInvoiceTerm}</h2>
            <h3 style={{ fontSize: '14px', fontWeight: 'normal', margin: '0', color: '#6b7280' }}>開立日期：{formattedDateString}</h3>
          </div>

          {/* Info: (20260410 - Luphia) Info Block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', marginBottom: '4px' }}>
                <span style={{ width: '80px', letterSpacing: '0px' }}>發票號碼：</span>
                <span>{displayReceiptNumber}</span>
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
              {buyerTaxId ? (
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ letterSpacing: '4px' }}>格式：</span>25 進項發票
                </div>
              ) : (
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ letterSpacing: '0px' }}>隨機碼：</span>{
                    // Info: (20260410 - Luphia) Deterministic Random Code derived from API/DB Receipt payload.
                    realRandomCode || Math.abs(targetId.split('').reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0) % 9000) + 1000
                  }
                </div>
              )}
              <div>第 1 頁 / 共 1 頁</div>
            </div>
          </div>

          {/* Info: (20260410 - Luphia) Main Item List */}
          <div style={{ marginTop: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            {/* Info: (20260410 - Luphia) Header */}
            <div style={{ display: 'flex', backgroundColor: '#fff7ed', borderBottom: '1px solid #e5e7eb', color: '#ea580c', fontWeight: 'bold', padding: '14px 20px', fontSize: '13px', letterSpacing: '1px' }}>
              <div style={{ flex: '0 0 35%' }}>品名</div>
              <div style={{ flex: '0 0 10%', textAlign: 'center' }}>數量</div>
              <div style={{ flex: '0 0 15%', textAlign: 'right' }}>單價</div>
              <div style={{ flex: '0 0 15%', textAlign: 'right' }}>金額</div>
              <div style={{ flex: '1', textAlign: 'right' }}>備註</div>
            </div>

            {/* Info: (20260410 - Luphia) Rows */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', alignItems: 'flex-start' }}>
            {/* Info: (20260410 - Luphia) Tax Info Block (Left side) */}
            <div style={{ border: '1px solid #f3f4f6', borderRadius: '12px', padding: '20px', width: '280px', backgroundColor: '#ffffff' }}>
              <div style={{ color: '#1f2937', fontSize: '14px', marginBottom: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '14px', backgroundColor: '#ea580c', borderRadius: '2px' }}></div>
                稅別判定 (TAX)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #f3f4f6' }}>
                <span style={{ color: '#4b5563', fontSize: '13px' }}>應稅</span>
                <span style={{ backgroundColor: '#ffedd5', color: '#ea580c', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 10px', height: '22px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', lineHeight: 1 }}>5%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px dashed #f3f4f6' }}>
                <span style={{ color: '#4b5563', fontSize: '13px' }}>零稅</span>
                <span style={{ color: '#d1d5db', fontSize: '13px' }}>-</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px' }}>
                <span style={{ color: '#4b5563', fontSize: '13px' }}>免稅</span>
                <span style={{ color: '#d1d5db', fontSize: '13px' }}>-</span>
              </div>
            </div>

            {/* Info: (20260410 - Luphia) Price Summary Block (Right side) */}
            <div style={{ width: '320px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px dashed #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>銷售額合計</span>
                <span style={{ color: '#374151', fontWeight: '500' }}>{salesAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>營業稅</span>
                <span style={{ color: '#374151', fontWeight: '500' }}>{tax.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '20px', paddingBottom: '12px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111827' }}>總計金額</span>
                <span style={{ fontWeight: 'bold', fontSize: '24px', lineHeight: '1', color: '#ea580c' }}>${amount.toLocaleString()}</span>
              </div>

              <div style={{ backgroundColor: '#fff7ed', padding: '16px', borderRadius: '12px', marginTop: '8px', textAlign: 'center', border: '1px solid #ffedd5' }}>
                <div style={{ fontSize: '12px', color: '#fb923c', marginBottom: '6px' }}>總計新臺幣 (中文大寫)</div>
                <div style={{ letterSpacing: '6px', fontWeight: 'bold', fontSize: '18px', color: '#ea580c' }}>{chineseAmount}</div>
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
