import React, { useState } from 'react';
import BusinessTaxList from '@/components/tax_report_body_all/business_tax_report_list_new';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import { ReportLanguagesMap, ReportLanguagesKey } from '@/interfaces/report_language';
import Image from 'next/image';
import { IoIosArrowDown } from 'react-icons/io';

// Info: (20241016 - Anna) 改為動態搜尋，不使用reportId
const BusinessTaxPageBody = () => {
  const { t } = useTranslation(['reports']);

  // Info: (20241101 - Anna) 定義語言選擇狀態
  const [selectedReportLanguage, setSelectedReportLanguage] = useState<ReportLanguagesKey>(
    ReportLanguagesKey.tw
  );
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  // Info: (20241101 - Anna) 語言選單開關處理
  const languageMenuClickHandler = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
  };

  // Info: (20241101 - Anna) 語言選擇處理
  const languageMenuOptionClickHandler = (id: ReportLanguagesKey) => {
    setSelectedReportLanguage(id);
    setIsLanguageMenuOpen(false);
  };

  // Info: (20241015 - Anna) 定義日期篩選狀態
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  // Info: (20241101 - Anna) 渲染語言選單
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
          {Object.entries(ReportLanguagesMap).map(([id, { name, icon }]) => {
            const isDisabled = id === ReportLanguagesKey.en || id === ReportLanguagesKey.cn; // Info: (20250107 - Anna) 英文和簡體中文先disable
            return (
              <li
                key={id}
                onClick={
                  !isDisabled
                    ? () => languageMenuOptionClickHandler(id as ReportLanguagesKey)
                    : undefined
                }
                className={`flex cursor-pointer items-center gap-2 px-4 py-2 hover:bg-gray-100 ${isDisabled ? 'pointer-events-none text-button-text-disable' : 'text-button-text-secondary'}`}
              >
                <Image src={icon} alt={name} width={20} height={20} />
                <span>{name}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

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
        <div className="h-px w-full bg-neutral-100"></div>
        {/* Info: (20240920 - Julian) Voucher List */}
        <BusinessTaxList
          selectedDateRange={selectedDateRange}
          selectedReportLanguage={selectedReportLanguage}
        />
      </div>
    </div>
  );
};

export default BusinessTaxPageBody;
