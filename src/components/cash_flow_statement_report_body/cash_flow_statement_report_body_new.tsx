import React, { useState, useRef } from 'react';
import CashFlowStatementList from '@/components/cash_flow_statement_report_body/cash_flow_statement_list_new';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Info: (20241016 - Anna) 改為動態搜尋，不使用reportId
const CashFlowStatementPageBody = () => {
  // Info: (20241015 - Anna) 定義日期篩選狀態
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  // Info: (20241101 - Anna) 定義語言選擇狀態
  const { t } = useTranslation(['reports']);

  // Info: (20241122 - Anna) 新增 Ref 來捕獲列印區塊的 DOM
  const printRef = useRef<HTMLDivElement>(null);

  // Info: (20250327 - Anna) downloadRef 存放某個 <div> 的 DOM 節點
  const downloadRef = useRef<HTMLDivElement>(null);

  const filename = `Cash_Flow_Statement.pdf`;

  // Info: (20250327 - Anna) 每次開始渲染時重置頁碼
  const pageCountRef = useRef(1);

  // Info: (20250624 - Anna) 下載狀態
  const [isDownloading, setIsDownloading] = useState(false);

  // Info: (20250327 - Anna) 下載
  const handleDownload = async () => {
    setIsDownloading(true);
    pageCountRef.current = 1; // Info: (20250327 - Anna) reset 頁數

    if (!downloadRef.current) return;

    //  Info: (20250327 - Anna) 顯示下載內容讓 html2canvas 擷取，移到畫面外避免干擾
    downloadRef.current.classList.remove('hidden');
    downloadRef.current.style.position = 'absolute';
    downloadRef.current.style.left = '-9999px';

    // Info: (20250327 - Anna) 強制瀏覽器執行「重新排版 (reflow)」，預防 classList.remove('hidden') 還沒生效導致 html2canvas 擷取不到內容
    downloadRef.current?.getBoundingClientRect();

    // Info: (20250327 - Anna) 等所有圖片載入，確保 html2canvas 可以擷取圖片內容
    const images = Array.from(downloadRef.current.querySelectorAll('img'));
    await Promise.all(
      images.map((imgElement) => {
        const img = imgElement; // Info: (20250327 - Anna)新變數，避免直接操作參數
        return new Promise((resolve) => {
          if (img.complete) {
            resolve(true); // Info: (20250327 - Anna) 圖片已完成載入流程（無論成功或失敗），立即 resolve
          } else {
            img.onload = () => resolve(true); // Info: (20250327 - Anna) 尚未載入完成，監聽 onload 成功事件
            img.onerror = () => resolve(true); // Info: (20250327 - Anna) 尚未載入完成，監聽 onerror 失敗事件，依然 resolve 避免卡住
          }
        });
      })
    );

    // Info: (20250327 - Anna) 等待所有字體（包含系統字體）完成解析與載入。
    await document.fonts.ready;

    // Info: (20250327 - Anna) 雙重 requestAnimationFrame：等待兩次繪製週期，確保樣式與 DOM 完整渲染，避免 html2canvas 抓到第一頁空白
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve());
      });
    });

    // Info: (20250327 - Anna) 額外延遲（150ms）確保樣式穩定下來
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      });

    await wait(150);

    const downloadPages = downloadRef.current.querySelectorAll('.download-page');
    if (!downloadPages.length) return;

    // Info: (20250327 - Anna) jsPDF 是類別，但命名為小寫，需關閉 eslint new-cap
    // eslint-disable-next-line new-cap
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // Info: (20250327 - Anna) 把 div 用 html2canvas 轉成圖片
    for (let i = 0; i < downloadPages.length; i += 1) {
      const page = downloadPages[i];
      // Info: (20250327 - Anna) 為了逐頁轉圖並依序加入 PDF，需保留 await；略過 ESLint 提示
      // eslint-disable-next-line no-await-in-loop
      const canvas = await html2canvas(page as HTMLElement, {
        scale: 2,
        useCORS: true,
        logging: true, // Info: (20250327 - Anna) 「顯示除錯訊息」到 console
      });

      // Info: (20250327 - Anna) 轉成 PNG 格式
      const imgData = canvas.toDataURL('image/png');

      if (i === 0) {
        // Info: (20250327 - Anna) 放入 PDF
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 270);
      } else {
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 10, 190, 270);
      }
    }

    // Info: (20250327 - Anna) 隱藏下載用的內容
    downloadRef.current.classList.add('hidden');
    downloadRef.current.style.position = '';
    downloadRef.current.style.left = '';

    // Info: (20250327 - Anna) 下載 PDF
    pdf.save(filename);
    setIsDownloading(false);
  };

  // Info: (20241122 - Anna) 添加狀態來控制打印模式(加頁首頁尾、a4大小)
  const [isPrinting, setIsPrinting] = useState(false);

  const handleOnBeforePrint = React.useCallback(() => {
    setIsPrinting(true);
    // Info: (20241130 - Anna) 強制 React 完成渲染，確保打印模式下渲染正確內容
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve(); // Info: (20241130 - Anna) 明確調用 resolve，表示完成
      }, 100); // Info: (20241130 - Anna) 延遲 100 毫秒
    });
  }, [isPrinting]);

  const handleOnAfterPrint = React.useCallback(() => {
    setIsPrinting(false);
  }, [isPrinting]);

  const printFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Cash Flow Statement Report',
    onBeforePrint: handleOnBeforePrint,
    onAfterPrint: handleOnAfterPrint,
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-32px tablet:gap-40px">
        <p className="text-base font-semibold leading-6 tracking-wide text-neutral-400 tablet:hidden">
          {t('reports:REPORTS.CASH_FLOW_STATEMENT')}
        </p>
        {/* Info: (20241017 - Anna) 日期篩選器和語言選擇 */}
        <div className="flex flex-col max-md:flex-col md:flex-row md:items-center md:gap-10">
          {/* Info: (20241017 - Anna)日期篩選器 */}
          <div className="flex min-w-250px flex-1 flex-col space-y-0">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-neutral-300 max-md:max-w-full">
              {t('reports:PENDING_REPORT_LIST.PERIOD')}
            </div>
            <DatePicker
              period={selectedDateRange}
              setFilteredPeriod={setSelectedDateRange}
              type={DatePickerType.TEXT_PERIOD}
              btnClassName="mt-2 tablet:mt-14px md:mt-28px"
            />
          </div>
          {/* Info: (20250107 - Anna) 先用全域的語言選擇替代 */}
        </div>

        {/* Info: (20241017 - Anna) Balance Sheet List */}
        <CashFlowStatementList
          selectedDateRange={selectedDateRange}
          printRef={printRef} // Info: (20241122 - Anna) 傳遞列印區域 Ref
          downloadRef={downloadRef} // Info: (20250327 - Anna) 傳遞下載區域 Ref
          printFn={printFn} // Info: (20241122 - Anna) 傳遞列印函數
          downloadFn={handleDownload} // Info: (20250327 - Anna) 傳遞下載函數
          isDownloading={isDownloading}
        />
      </div>
    </div>
  );
};

export default CashFlowStatementPageBody;
