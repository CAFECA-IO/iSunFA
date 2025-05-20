import { useState } from 'react';
import DatePicker, { DatePickerType } from '@/components/date_picker/date_picker';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import IncomeStatementList from '@/components/income_statement_report_body/income_statement_list';

const IncomeStatementPageBody = () => {
  const { t } = useTranslation(['reports']);
  const [selectedDateRange, setSelectedDateRange] = useState<IDatePeriod>({
    startTimeStamp: 0,
    endTimeStamp: 0,
  });

  return (
    <div className="relative flex min-h-screen flex-col items-center gap-40px">
      <div className="hide-scrollbar flex w-full flex-col items-stretch gap-32px overflow-x-auto tablet:gap-40px">
        <p className="text-base font-semibold leading-6 tracking-wide text-neutral-400 tablet:hidden">
          {t('reports:REPORTS.COMPREHENSIVE_INCOME_STATEMENT')}
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
          {/* Info: (20250103 - Anna) 先用全域的語言選擇替代 */}
        </div>

        <IncomeStatementList selectedDateRange={selectedDateRange} />
      </div>
    </div>
  );
};

export default IncomeStatementPageBody;
