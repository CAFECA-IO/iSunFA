import React, { useState, useRef, useEffect } from 'react';
import BalanceSheetList from '@/components/balance_sheet_report_body/balance_sheet_list_new';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import { useReactToPrint } from 'react-to-print';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Info: (20241016 - Anna) 改為動態搜尋，不使用reportId
const BalanceSheetPageBody = () => {
  const { t } = useTranslation(['reports']);

  // Info: (20241212 - Anna) 將日期篩選狀態改為單日期模式
  const [selectedDate, setSelectedDate] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  // Info: (20241122 - Anna) 添加狀態來控制打印模式(加頁首頁尾、a4大小)
  const [isPrinting, setIsPrinting] = useState(false);

  // Info: (20241122 - Anna) 新增 Ref 來捕獲列印區塊的 DOM
  const printRef = useRef<HTMLDivElement>(null);

  // Info: (20250327 - Anna) downloadRef 存放某個 <div> 的 DOM 節點
  const downloadRef = useRef<HTMLDivElement>(null);

  const filename = `Balance_Sheet.pdf`;

  // Info: (20250327 - Anna) pageCountRef 存放頁數
  const pageCountRef = useRef(1);

  // Info: (20250327 - Anna) 下載
  const handleDownload = async () => {
    pageCountRef.current = 1; // // Info: (20250327 - Anna) reset 頁數

    if (!downloadRef.current) return;

    //  Info: (20250401 - Anna) 插入修正樣式
    const style = document.createElement('style');
    style.innerHTML = `
  /* Info: (20250401 - Anna) 表格 */
  .download-page td,
  .download-page th {
    padding-top: 0 !important;
  }

  /* Info: (20250401 - Anna) 子科目 */
  .download-page .child-code-name-wrapper {
    padding-bottom: 8px !important;
  }

  /* Info: (20250401 - Anna) 子科目名稱允許換行 */
  .download-page .child-name {
    white-space: normal !important;
  }

  /* Info: (20250401 - Anna) Balance Sheet (header) 調整底部間距 */
  .download-page h2 {
    padding-bottom: 6px !important;
  }

  /* Info: (20250401 - Anna) 大標題與表格間距 */
  .download-page .download-header-label {
    padding-bottom: 8px !important;
  }
`;

    document.head.appendChild(style);

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
        // windowWidth: page.scrollWidth, // 🌟
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

    // Info: (20250401 - Anna) 移除修正樣式
    style.remove();

    // Info: (20250327 - Anna) 隱藏下載用的內容
    downloadRef.current.classList.add('hidden');
    downloadRef.current.style.position = '';
    downloadRef.current.style.left = '';

    // Info: (20250327 - Anna) 下載 PDF
    pdf.save(filename);
  };

  useEffect(() => {
    if (isPrinting && printRef.current) {
      // Deprecated: (20241130 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('balance_sheet_report_body.觀察 Printing content:', printRef.current.innerHTML);
      // Deprecated: (20241130 - Anna) remove eslint-disable
      // eslint-disable-next-line no-console
      console.log('balance_sheet_report_body.觀察 isPrinting?', isPrinting);
    }
  }, [isPrinting]);

  const handleOnBeforePrint = React.useCallback(() => {
    // Deprecated: (20241130 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(
      'balance_sheet_report_body 觀察 handleOnBeforePrint (Before setting isPrinting):',
      isPrinting
    );
    setIsPrinting(true);
    // Deprecated: (20241130 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(
      'balance_sheet_report_body 觀察 handleOnBeforePrint (After setting isPrinting):',
      true
    );

    // Info: (20241130 - Anna) 強制 React 完成渲染，確保打印模式下渲染正確內容
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve(); // Info: (20241130 - Anna) 明確調用 resolve，表示完成
      }, 100); // Info: (20241130 - Anna) 延遲 100 毫秒
    });
  }, [isPrinting]);

  const handleOnAfterPrint = React.useCallback(() => {
    // Deprecated: (20241130 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(
      'balance_sheet_report_body 觀察 handleOnAfterPrint (Before resetting isPrinting):',
      isPrinting
    );
    setIsPrinting(false);
    // Deprecated: (20241130 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(
      'balance_sheet_report_body 觀察 handleOnAfterPrint (After resetting isPrinting):',
      false
    );
  }, [isPrinting]);

  // Info: (20241122 - Anna)
  const printFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'balance Sheet Report',
    onBeforePrint: handleOnBeforePrint,
    onAfterPrint: handleOnAfterPrint,
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20241017 - Anna) 日期篩選器和語言選擇 */}
        <div className="flex flex-col max-md:flex-col md:flex-row md:items-center md:gap-10 print:hidden">
          {/* Info: (20241212 - Anna) 單日期選擇器 */}
          <div className="flex min-w-250px flex-1 flex-col space-y-0">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('reports:PENDING_REPORT_LIST.DATE')}
            </div>
            <DatePicker
              period={selectedDate} // Info: (20241212 - Anna) 使用單日期狀態
              setFilteredPeriod={setSelectedDate}
              type={DatePickerType.TEXT_DATE} // Info: (20241212 - Anna) 設定為單日期選擇器
              btnClassName="mt-28px"
            />
          </div>
          {/* Info: (20250103 - Anna) 先用全域的語言選擇替代 */}
        </div>

        {/* Info: (20241017 - Anna) Balance Sheet List */}
        <BalanceSheetList
          selectedDateRange={selectedDate} // Info: (20241212 - Anna) 傳遞單日期選擇結果
          isPrinting={isPrinting} // Info: (20241122 - Anna) 傳遞列印狀態
          printRef={printRef} // Info: (20241122 - Anna) 傳遞列印區域 Ref
          downloadRef={downloadRef} // Info: (20250327 - Anna) 傳遞下載區域 Ref
          printFn={printFn} // Info: (20241122 - Anna) 傳遞列印函數
          downloadFn={handleDownload} // Info: (20250327 - Anna) 傳遞下載函數
          // pageCountRef={pageCountRef} // Info: (20250327 - Anna) 傳遞頁數 Ref
        />
      </div>
    </div>
  );
};

export default BalanceSheetPageBody;
