import { useState, useCallback, useMemo } from 'react';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { timestampToString } from '@/lib/utils/common';
import { IDatePeriod } from '@/interfaces/date_period';
import { useTranslation } from 'next-i18next';
import { Button } from '@/components/button/button';

type ISingleDate = {
  date: number | null;
  timestamp: number;
};

interface ICalendarProps {
  designingPeriod: IDatePeriod;
  developingPeriod: IDatePeriod;
  testingPeriod: IDatePeriod;
  sellingPeriod: IDatePeriod;
  soldPeriod: IDatePeriod;
}

const MilestoneCalendar = ({
  designingPeriod,
  developingPeriod,
  testingPeriod,
  sellingPeriod,
  soldPeriod,
}: ICalendarProps) => {
  const { t } = useTranslation('common');
  const weekdayTitle = [
    t('common:DATE_PICKER.SUN'),
    t('common:DATE_PICKER.MON'),
    t('common:DATE_PICKER.TUE'),
    t('common:DATE_PICKER.WED'),
    t('common:DATE_PICKER.THU'),
    t('common:DATE_PICKER.FRI'),
    t('common:DATE_PICKER.SAT'),
  ];
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Info: (20240613 - Julian) 取得 1 日是星期幾
  const firstDayOfMonth = new Date(`${currentYear}/${currentMonth}/01`).getDay();
  // Info: (20240613 - Julian) 取得該月的天數 (最後一天是幾號)
  const monthLength = new Date(currentYear, currentMonth, 0).getDate();

  // Info: (20240613 - Julian) 印出該月所有日期
  const dates = useMemo(() => {
    const result: ISingleDate[] = [];
    for (let i = 1; i <= monthLength; i += 1) {
      result.push({
        date: i,
        timestamp: new Date(`${currentYear}/${currentMonth}/${i}`).getTime() / 1000,
      });
    }
    return result;
  }, [monthLength]);

  // Info: (20240613 - Julian) 補上 1 日之前的空白
  const daysInMonth: ISingleDate[] = useMemo(() => {
    return Array(firstDayOfMonth)
      .fill({
        date: null,
        timestamp: -1,
      })
      .concat(dates);
  }, [firstDayOfMonth, dates]);

  // Info: (20240613 - Julian) 顯示的日期字串
  const displayDateStr = timestampToString(currentDate.getTime() / 1000);

  // Info: (20240613 - Julian) 移動到上個月
  const previousMonthHandler = useCallback(() => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate); // Info: (20240613 - Julian) 複製日期物件
      newDate.setMonth(newDate.getMonth() - 1); // Info: (20240613 - Julian) 設定月份為上一個月
      return newDate;
    });
  }, []);

  // Info: (20240613 - Julian) 移動到下個月
  const nextMonthHandler = useCallback(() => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate); // Info: (20240613 - Julian) 複製日期物件
      newDate.setMonth(newDate.getMonth() + 1); // Info: (20240613 - Julian) 設定月份為下一個月
      return newDate;
    });
  }, []);

  const displayWeekdayTitle = weekdayTitle.map((day) => (
    <p key={day} className="p-10px text-center text-date-picker-text-week">
      {day}
    </p>
  ));

  const displayDays = daysInMonth.map((day) => {
    const designingColor =
      designingPeriod.startTimeStamp <= day.timestamp &&
      day.timestamp <= designingPeriod.endTimeStamp
        ? 'bg-surface-support-soft-maple'
        : '';
    const developingColor =
      developingPeriod.startTimeStamp <= day.timestamp &&
      day.timestamp <= developingPeriod.endTimeStamp
        ? 'bg-surface-support-soft-green'
        : '';
    const testingColor =
      testingPeriod.startTimeStamp <= day.timestamp && day.timestamp <= testingPeriod.endTimeStamp
        ? 'bg-surface-support-soft-indigo'
        : '';
    const sellingColor =
      sellingPeriod.startTimeStamp <= day.timestamp && day.timestamp <= sellingPeriod.endTimeStamp
        ? 'bg-surface-support-soft-taro'
        : '';
    const soldColor =
      soldPeriod.startTimeStamp <= day.timestamp && day.timestamp <= soldPeriod.endTimeStamp
        ? 'bg-surface-support-soft-rose'
        : '';

    return (
      <p
        key={day.timestamp}
        className={`p-10px text-center text-text-neutral-solid-dark ${designingColor} ${developingColor} ${testingColor} ${sellingColor} ${soldColor}`}
      >
        {day.date}
      </p>
    );
  });

  return (
    <div className="flex w-full flex-col items-center gap-x-8px">
      {/* Info: (20240613 - Julian) Header */}
      <div className="flex w-full items-center justify-between">
        {/* Info: (20240613 - Julian) Previous Button */}
        <Button
          type="button"
          onClick={previousMonthHandler}
          variant="secondaryOutline"
          className="h-40px w-40px p-0"
        >
          <AiOutlineLeft size={16} />
        </Button>
        {/* Info: (20240613 - Julian) Month */}
        <div className="flex gap-12px">
          <p className="text-date-picker-text-default">{displayDateStr.year}</p>
          <p className="text-date-picker-text-default">{displayDateStr.monthShortName}</p>
        </div>
        {/* Info: (20240613 - Julian) Next Button */}
        <Button
          type="button"
          onClick={nextMonthHandler}
          variant="secondaryOutline"
          className="h-40px w-40px p-0"
        >
          <AiOutlineRight size={16} />
        </Button>
      </div>
      {/* Info: (20240613 - Julian) Weekdays */}
      <div className="grid w-full grid-cols-7">
        {displayWeekdayTitle}
        {displayDays}
      </div>
    </div>
  );
};

export default MilestoneCalendar;
