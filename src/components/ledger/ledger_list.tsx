import React, { useRef } from 'react';
import { useTranslation } from 'next-i18next';
import LedgerItem from '@/components/ledger/ledger_item';
import PrintButton from '@/components/button/print_button';
import DownloadButton from '@/components/button/download_button';
import { ILedgerPayload, ILedgerNote } from '@/interfaces/ledger';
import Image from 'next/image';
import { SkeletonList } from '@/components/skeleton/skeleton';
import { useReactToPrint } from 'react-to-print';
import { useUserCtx } from '@/contexts/user_context';
import { CurrencyType } from '@/constants/currency';
import loggerFront from '@/lib/utils/logger_front';

interface LedgerListProps {
  ledgerData: ILedgerPayload | null; // Info: (20241118 - Anna) 接收 API 數據
  loading: boolean; // Info: (20241118 - Anna) 接收父组件傳遞的loading狀態
  selectedDateRange: { startTimeStamp: number; endTimeStamp: number }; // Info: (20241218 - Anna) 從父組件傳來的日期範圍
  labelType: string; // Info: (20241218 - Anna) 從父組件傳來的 labelType
  selectedStartAccountNo: string;
  selectedEndAccountNo: string;
}

const LedgerList: React.FunctionComponent<LedgerListProps> = ({
  ledgerData,
  loading,
  selectedDateRange,
  labelType,
  selectedStartAccountNo,
  selectedEndAccountNo,
}) => {
  const { connectedAccountBook } = useUserCtx();
  const accountBookId = connectedAccountBook?.id;
  const { t } = useTranslation(['journal', 'date_picker', 'reports']);
  const printRef = useRef<HTMLDivElement>(null); // Info: (20241203 - Anna) 引用列印內容

  // Info: (20241118 - Anna) 確保 ledgerItemsData 是一個有效的陣列
  const ledgerItemsData = Array.isArray(ledgerData?.data) ? ledgerData.data : [];

  // Info: (20250214 - Shirley) @Anna 解析 note 字串，並提供預設值
  const parseNote = (noteString: string | undefined): ILedgerNote => {
    try {
      if (!noteString) {
        throw new Error('Note string is empty');
      }
      return JSON.parse(noteString) as ILedgerNote;
    } catch (error) {
      // Info: (20250214 - Shirley) 如果note為空字串、其他原因造成解析失敗，返回預設值
      return {
        currencyAlias: CurrencyType.TWD,
        total: {
          totalDebitAmount: '0',
          totalCreditAmount: '0',
          createdAt: 0,
          updatedAt: 0,
        },
      };
    }
  };

  const { total } = parseNote(ledgerData?.note);

  // Info: (20240920 - Julian) css string
  const tableCellStyles = 'text-center align-middle';
  const sideBorderStyles = 'border-r border-b border-stroke-neutral-quaternary';

  const handlePrint = useReactToPrint({
    contentRef: printRef, // Info: (20241203 - Anna) 指定需要打印的內容 Ref
    documentTitle: `分類帳`,
    onBeforePrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
    onAfterPrint: async () => {
      return Promise.resolve(); // Info: (20241203 - Anna) 確保回傳一個 Promise
    },
  });

  // Info: (20241218 - Anna) 匯出csv
  const handleDownload = async () => {
    const body = {
      fileType: 'csv',
      filters: {
        startDate: selectedDateRange.startTimeStamp,
        endDate: selectedDateRange.endTimeStamp,
        labelType,
      },
      options: {
        language: 'zh-TW',
        timezone: '+0800',
      },
    };

    try {
      // Info: (20241218 - Anna) 使用 fetch 直接調用 API，處理非 JSON 格式的回應、解析 headers
      // Info: (20241218 - Anna) 因為 APIHandler 將所有回應解析為 JSON，當遇到非 JSON 內容（ 如csv ），會SyntaxError，導致 response.data 為 null。
      const response = await fetch(`/api/v2/account_book/${accountBookId}/ledger/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Error: ${response.statusText}`);

      // Info: (20241218 - Anna) 獲取 Blob 內容
      const blob = await response.blob();

      const contentDisposition = response.headers.get('content-disposition'); // Info: (20241218 - Anna) 從 headers 提取檔名
      const fileNameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const fileName = fileNameMatch ? fileNameMatch[1] : 'ledger_export.csv';

      // Info: (20241218 - Anna) 創建下載連結並觸發下載
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url); // Info: (20241218 - Anna) 釋放 URL 資源
      link.parentNode?.removeChild(link);
    } catch (error) {
      loggerFront.error('Download failed:', error);
    }
  };

  const displayedSelectArea = (
    <div className="ml-auto flex items-center gap-16px laptop:gap-24px print:hidden">
      {/* Info: (20241004 - Anna) Export button */}
      <DownloadButton onClick={handleDownload} disabled={false} />
      {/* Info: (20241004 - Anna) PrintButton */}
      <PrintButton onClick={handlePrint} disabled={false} />
    </div>
  );

  // Info: (20241101 - Anna) 根據狀態來渲染不同的內容
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-neutral-main-background">
        <SkeletonList count={5} />
      </div>
    );
  } else if (!loading && (!ledgerItemsData || ledgerItemsData.length === 0)) {
    return (
      <div className="-mt-40 flex h-screen flex-col items-center justify-center">
        <Image src="/images/empty.svg" alt="No data image" width={120} height={135} />
        <div>
          <p className="text-neutral-300">{t('reports:REPORT.NO_DATA_AVAILABLE')}</p>
          <p className="text-neutral-300">{t('reports:REPORT.PLEASE_SELECT_PERIOD')}</p>
        </div>
      </div>
    );
  }

  // Info: (20241118 - Anna) 渲染有效的憑證數據列表
  const displayedLedgerList = ledgerItemsData.map((ledger) => {
    const {
      id = '',
      creditAmount = 0,
      debitAmount = 0,
      balance = 0,
      voucherId = '',
    } = ledger || {};
    return (
      <LedgerItem
        key={id}
        ledger={{
          ...ledger,
          creditAmount: creditAmount || '0',
          debitAmount: debitAmount || '0',
          balance: balance || '0',
          // Info: (20241224 - Anna) 將字串轉換為整數
          voucherId: typeof voucherId === 'string' ? parseInt(voucherId, 10) : voucherId,
        }}
        selectedDateRange={selectedDateRange}
        selectedStartAccountNo={selectedStartAccountNo}
        selectedEndAccountNo={selectedEndAccountNo}
        selectedReportType={labelType}
      />
    );
  });

  return (
    <div className="flex flex-col text-xs tablet:text-sm" ref={printRef}>
      {/* Info: (20240920 - Julian) export & select button */}
      {displayedSelectArea}
      <div className="hide-scrollbar overflow-x-auto">
        <div className="min-w-900px print:min-w-0">
          <div className="mb-4 mt-10 table w-full table-fixed overflow-hidden rounded-lg bg-surface-neutral-surface-lv2 print:mt-0 print:bg-neutral-50">
            {/* Info: (20240920 - Julian) ---------------- Table Header ---------------- */}
            <div className="table-header-group border-b bg-surface-neutral-surface-lv1 text-xs text-text-neutral-tertiary tablet:text-sm">
              <div className="table-row h-60px">
                <div
                  className={`table-cell ${tableCellStyles} ${sideBorderStyles} whitespace-nowrap print:bg-neutral-50`}
                >
                  {t('journal:VOUCHER.VOUCHER_DATE')}
                </div>
                <div
                  className={`table-cell ${tableCellStyles} ${sideBorderStyles} whitespace-nowrap print:bg-neutral-50`}
                >
                  {t('reports:REPORTS.CODE')}
                </div>
                <div
                  className={`table-cell ${tableCellStyles} ${sideBorderStyles} print:hidden print:bg-neutral-50`}
                >
                  {t('journal:VOUCHER_LINE_BLOCK.ACCOUNTING')}
                </div>
                <div
                  className={`table-cell whitespace-nowrap ${tableCellStyles} ${sideBorderStyles} print:bg-neutral-50`}
                >
                  {t('journal:VOUCHER.VOUCHER_NO')}
                </div>
                <div
                  className={`table-cell ${tableCellStyles} ${sideBorderStyles} whitespace-nowrap print:bg-neutral-50`}
                >
                  {t('journal:VOUCHER.NOTE')}
                </div>
                <div
                  className={`table-cell ${tableCellStyles} ${sideBorderStyles} print:bg-neutral-50`}
                >
                  {t('journal:JOURNAL.DEBIT')}
                </div>

                <div
                  className={`table-cell ${tableCellStyles} ${sideBorderStyles} print:bg-neutral-50`}
                >
                  {t('journal:JOURNAL.CREDIT')}
                </div>

                <div
                  className={`table-cell ${tableCellStyles} ${sideBorderStyles.replace('border-r', '')} print:bg-neutral-50`}
                >
                  {t('journal:VOUCHER.BALANCE')}
                </div>
              </div>
            </div>

            {/* Info: (20240920 - Julian) ---------------- Table Body ---------------- */}
            <div className="table-row-group">{displayedLedgerList}</div>
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-divider-stroke-lv-4"></div>

      {/* Info: (20241009 - Anna) 加總數字的表格 */}
      <div className="hide-scrollbar overflow-x-auto">
        <div className="min-w-900px print:min-w-0">
          <div
            className="mb-10 mt-4 grid h-70px grid-cols-9 overflow-hidden rounded-b-lg bg-surface-neutral-surface-lv2 text-text-neutral-tertiary print:bg-neutral-50"
            // Info: (20241206 - Anna) 避免行內換頁
            style={{ pageBreakInside: 'avoid' }}
          >
            {/* Info: (20241009 - Anna) 表格內容 */}
            <div className="col-span-1"></div>
            <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle">
              {t('journal:LEDGER.TOTAL_DEBIT_AMOUNT')}
            </div>
            <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle font-semibold text-text-neutral-primary">
              {total.totalDebitAmount || '0'}
            </div>
            <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle">
              {t('journal:LEDGER.TOTAL_CREDIT_AMOUNT')}
            </div>
            <div className="col-span-2 flex items-center justify-start py-8px text-left align-middle font-semibold text-text-neutral-primary">
              {total.totalCreditAmount || '0'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LedgerList;
