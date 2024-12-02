import React, { useState, useRef, useEffect } from 'react';
import BalanceSheetList from '@/components/balance_sheet_report_body/balance_sheet_list_new';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import { ReportLanguagesMap, ReportLanguagesKey } from '@/interfaces/report_language';
import { IoIosArrowDown } from 'react-icons/io';
import Image from 'next/image';
import { useReactToPrint } from 'react-to-print';

// Info: (20241016 - Anna) 改為動態搜尋，不使用reportId
const BalanceSheetPageBody = () => {
  const { t } = useTranslation(['reports']);

  // Info: (20241017 - Anna) 定義日期篩選狀態
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  // Info: (20241122 - Anna) 添加狀態來控制打印模式(加頁首頁尾、a4大小)
  const [isPrinting, setIsPrinting] = useState(false);

  // Info: (20241122 - Anna) 新增 Ref 來捕獲列印區塊的 DOM
  const printRef = useRef<HTMLDivElement>(null);

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

  const [selectedReportLanguage, setSelectedReportLanguage] = useState<ReportLanguagesKey>(
    ReportLanguagesKey.en
  );
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  // Info: (20241017 - Anna) 語言選單開關處理
  const languageMenuClickHandler = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  // Info: (20241017 - Anna) 語言選擇處理
  const languageMenuOptionClickHandler = (id: ReportLanguagesKey) => {
    setSelectedReportLanguage(id);
    setIsLanguageMenuOpen(false);
  };

  // Info: (20241017 - Anna) 渲染語言選單
  const displayedLanguageMenu = (
    <div className="relative flex w-full">
      <button
        type="button"
        className={`flex w-full items-center justify-between rounded-sm border bg-input-surface-input-background px-5 py-2.5 ${
          isLanguageMenuOpen ? 'border-input-stroke-selected' : 'border-dropdown-stroke-menu'
        }`}
        onClick={languageMenuClickHandler}
      >
        <div className="flex items-center gap-2">
          <Image
            src={ReportLanguagesMap[selectedReportLanguage].icon}
            alt={ReportLanguagesMap[selectedReportLanguage].name}
            width={20}
            height={20}
          />
          <span className="text-base font-medium leading-6 tracking-normal">
            {ReportLanguagesMap[selectedReportLanguage].name}
          </span>
        </div>
        <IoIosArrowDown size={20} className="text-icon-surface-single-color-primary" />
      </button>
      {isLanguageMenuOpen && (
        <ul className="absolute left-0 top-12 z-10 w-full rounded-md border bg-white shadow-md">
          {Object.entries(ReportLanguagesMap).map(([id, { name, icon }]) => (
            <li
              key={id}
              onClick={() => languageMenuOptionClickHandler(id as ReportLanguagesKey)}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-100"
            >
              <Image src={icon} alt={name} width={20} height={20} />
              <span>{name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="flex w-full flex-col items-stretch gap-40px">
        {/* Info: (20241017 - Anna) 日期篩選器和語言選擇 */}
        <div className="flex flex-col max-md:flex-col md:flex-row md:items-center md:gap-10 print:hidden">
          {/* Info: (20241017 - Anna)日期篩選器 */}
          <div className="flex min-w-250px flex-1 flex-col space-y-0">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('reports:PENDING_REPORT_LIST.PERIOD')}
            </div>
            <DatePicker
              period={selectedDateRange}
              setFilteredPeriod={setSelectedDateRange}
              type={DatePickerType.TEXT_PERIOD}
              btnClassName="mt-28px"
            />
          </div>
          {/* Info: (20241017 - Anna)語言選擇 */}
          <div className="flex flex-col space-y-6 max-md:max-w-full">
            <div className="justify-center text-sm font-semibold leading-5 tracking-normal text-input-text-primary max-md:max-w-full">
              {t('layout:EMBED_CODE_MODAL.REPORT_LANGUAGE')}
            </div>
            {displayedLanguageMenu}
          </div>
        </div>

        {/* Info: (20241017 - Anna) Balance Sheet List */}
        <BalanceSheetList
          selectedDateRange={selectedDateRange}
          isPrinting={isPrinting} // Info: (20241122 - Anna) 傳遞列印狀態
          printRef={printRef} // Info: (20241122 - Anna) 傳遞列印區域 Ref
          printFn={printFn} // Info: (20241122 - Anna) 傳遞列印函數
        />
      </div>
    </div>
  );
};

export default BalanceSheetPageBody;
