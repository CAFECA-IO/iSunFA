import React, { useState, useRef } from 'react';
import CashFlowStatementList from '@/components/cash_flow_statement_report_body/cash_flow_statement_list_new';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import { useReactToPrint } from 'react-to-print';

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

  // Info: (20241122 - Anna) 添加狀態來控制打印模式(加頁首頁尾、a4大小)
  const [isPrinting, setIsPrinting] = useState(false);

  const handleOnBeforePrint = React.useCallback(() => {
    // Deprecated: (20241130 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(
      'cash_flow_statement_report_body 觀察 handleOnBeforePrint (Before setting isPrinting):',
      isPrinting
    );
    setIsPrinting(true);
    // Deprecated: (20241130 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(
      'cash_flow_statement_report_body 觀察 handleOnBeforePrint (After setting isPrinting):',
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
      'cash_flow_statement_report_body 觀察 handleOnAfterPrint (Before resetting isPrinting):',
      isPrinting
    );
    setIsPrinting(false);
    // Deprecated: (20241130 - Anna) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log(
      'cash_flow_statement_report_body 觀察 handleOnAfterPrint (After resetting isPrinting):',
      false
    );
  }, [isPrinting]);

  const printFn = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Cash Flow Statement Report',
    onBeforePrint: handleOnBeforePrint,
    onAfterPrint: handleOnAfterPrint,
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20241017 - Anna) 日期篩選器和語言選擇 */}
        <div className="flex flex-col max-md:flex-col md:flex-row md:items-center md:gap-10">
          {/* Info: (20241017 - Anna)日期篩選器 */}
          <div className="flex min-w-250px flex-1 flex-col space-y-0">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('reports:PENDING_REPORT_LIST.PERIOD')}
            </div>
            <DatePicker
              period={selectedDateRange}
              setFilteredPeriod={setSelectedDateRange}
              type={DatePickerType.TEXT_PERIOD}
              btnClassName="mt-28px p-[12px]"
            />
          </div>
          {/* Info: (20250107 - Anna) 先用全域的語言選擇替代 */}
        </div>

        {/* Info: (20241017 - Anna) Balance Sheet List */}
        <CashFlowStatementList
          selectedDateRange={selectedDateRange}
          isPrinting={isPrinting} // Info: (20241122 - Anna) 傳遞列印狀態
          printRef={printRef} // Info: (20241122 - Anna) 傳遞列印區域 Ref
          printFn={printFn} // Info: (20241122 - Anna) 傳遞列印函數
        />
      </div>
    </div>
  );
};

export default CashFlowStatementPageBody;
