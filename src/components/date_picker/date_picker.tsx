import { useCallback, useState, useEffect, Dispatch, SetStateAction } from 'react';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { DatePickerAlign, MONTH_ABR_LIST, WEEK_LIST } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '@/interfaces/locale';
import { IDatePeriod } from '@/interfaces/date_period';
import { cn, timestampToString } from '@/lib/utils/common';
import { Button } from '@/components/button/button';
import { FiCalendar } from 'react-icons/fi';

type Dates = {
  date: number;
  time: number;
  disable: boolean;
};
interface IPopulateDatesParams {
  daysInMonth: Dates[];
  selectedYear: number;
  selectedMonth: number;
  selectTimeOne: number;
  selectDateOne: (date: Dates | null) => void;
  selectTimeTwo: number;
  selectDateTwo: (date: Dates | null) => void;
  setComponentVisible: Dispatch<SetStateAction<boolean>>;
  type: DatePickerType;
}

// TODO: (20240529 - Shirley) [Beta] refactor to ICON_DATE, ICON_PERIOD, TEXT_PERIOD, TEXT_DATE
export enum DatePickerType {
  ICON_PERIOD = 'ICON_PERIOD',
  TEXT_DATE = 'TEXT_DATE',
  TEXT_PERIOD = 'TEXT_PERIOD',
  ICON_DATE = 'ICON_DATE',
}

interface IDatePickerProps {
  type: DatePickerType;
  period: IDatePeriod;
  setFilteredPeriod: Dispatch<SetStateAction<IDatePeriod>>;
  id?: string;
  minDate?: Date;
  maxDate?: Date;
  loading?: boolean;
  datePickerHandler?: (start: number, end: number) => void;
  btnClassName?: string;
  calenderClassName?: string;
  buttonStyleAfterDateSelected?: string;
  onClose?: (start: number, end: number) => void;
  // Info: (20240509 - Shirley) 關閉日期選擇器時的 callback
  // Info: (20240809 - Tzuhan) 更新傳入參數 start, end 用在 RegistrationInfoForm
  alignCalendar?: DatePickerAlign;
  datePickerClassName?: string;
  disabled?: boolean;
  label?: string; // Info: (20250416 - Anna) 選項標籤
  labelClassName?: string;
}

// Info: (2020417 - Shirley) Safari 只接受 YYYY/MM/DD 格式的日期
const PopulateDates = ({
  daysInMonth,
  selectedYear,
  selectedMonth,
  selectTimeOne,
  selectDateOne,
  selectTimeTwo,
  selectDateTwo,
  setComponentVisible,
  type,
}: IPopulateDatesParams) => {
  const { t }: { t: TranslateFunction } = useTranslation('date_picker');

  // Info: (2020417 - Shirley) 用於日期選取的樣式
  const beforeStyle =
    'before:absolute before:-z-10 before:w-40px before:md:w-42px before:h-40px before:md:h-36px before:rounded-full before:bg-date-picker-surface-date-selected';

  // Info: (20240417 - Shirley) 顯示星期標題
  const weekNameList = WEEK_LIST.map((week) => (
    <p className="mx-auto h-35px w-35px text-date-picker-text-week" key={week}>
      {t(week)}
    </p>
  ));

  // Info: (2020417 - Shirley) 將時間戳記還原為當天日期且時間設置為 00:00:00 的時間戳記
  const resetTimestampToMidnight = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0);
    return date.getTime();
  };

  // Info: (20240417 - Shirley) 顯示月份中的每一天
  const formatDaysInMonth = daysInMonth.map((el: Dates, index) => {
    const date = el ? new Date(`${selectedYear}/${selectedMonth}/${el.date} 00:00:00`) : null;

    // Info: (20240417 - Shirley) 因為 selectTimeTwo 是 23:59:59，所以還原時間設置為 00:00:00
    const selectTimeTwoReset = resetTimestampToMidnight(selectTimeTwo);

    // Info: (20240417 - Shirley) 已選擇區間的樣式
    const isSelectedPeriodStyle =
      selectTimeOne &&
      selectTimeTwoReset &&
      date?.getTime() &&
      date?.getTime() >= selectTimeOne &&
      date?.getTime() <= selectTimeTwoReset &&
      selectTimeOne !== selectTimeTwoReset
        ? 'bg-date-picker-surface-date-period'
        : '';

    // Info: (20240417 - Shirley) DateOne 和 DateTwo 的樣式
    const isSelectedDateStyle = date?.getTime()
      ? !selectTimeTwoReset && date.getTime() === selectTimeOne
        ? 'rounded-full'
        : selectTimeOne && selectTimeTwoReset
          ? date.getTime() === selectTimeOne && date.getTime() === selectTimeTwoReset // Info: (20240828 - Julian) 選擇的日期是同一天
            ? `rounded-full text-date-picker-text-selected ${beforeStyle}`
            : date.getTime() === selectTimeOne // Info: (20240828 - Julian) DateOne 的樣式
              ? `rounded-l-full text-date-picker-text-selected ${beforeStyle}`
              : date.getTime() === selectTimeTwoReset // Info: (20240828 - Julian) DateTwo 的樣式
                ? `rounded-r-full text-date-picker-text-selected ${beforeStyle}`
                : ''
          : ''
      : '';

    /* Info: (20240417 - Shirley) 只有可選擇的日期才能點擊 */
    const dateClickHandler = () => {
      if (el?.date && !el?.disable) {
        // Info: (20240417 - Shirley) elTemp 是點擊的日期
        const elTime = new Date(`${selectedYear}/${selectedMonth}/${el.date} 00:00:00`).getTime();
        // Info: (20240605 - Shirley) If DatePickerType is allowed for single date, select the date and close the component
        if (type === DatePickerType.TEXT_DATE || type === DatePickerType.ICON_DATE) {
          selectDateOne({ date: el.date, time: elTime, disable: el.disable });
          selectDateTwo({ date: el.date, time: elTime, disable: el.disable });
          setComponentVisible(false);
          return;
        }

        if (selectTimeOne !== 0 && selectTimeTwo !== 0) {
          // Info: (20240417 - Shirley) 如果有已選擇的日期區間，則先清除
          selectDateOne(null);
          selectDateTwo(null);
        }
        if (selectTimeOne === 0) {
          // Info: (20240417 - Shirley) 如果第一個日期尚未選擇，則將 el 填入第一個日期
          selectDateOne(el);
        } else if (selectTimeTwo === 0) {
          // Info: (20240417 - Shirley) 如果第二個日期尚未選擇，則將 el 填入第二個日期
          if (selectTimeOne > elTime) {
            // Info: (20240417 - Shirley) 檢查 TimeOne 是否大於 TimeTwo，如果是則交換
            const temp = new Date(selectTimeOne);
            selectDateOne(el);
            selectDateTwo({
              date: temp.getDate(),
              time: new Date(
                // Info: (20240417 - Shirley) 這裡的月份要加 1，因為 new Date() 的月份是 0 ~ 11
                `${temp.getFullYear()}/${temp.getMonth() + 1}/${temp.getDate()}`
              ).getTime(),
              disable: true,
            });
          } else {
            // Info: (20240417 - Shirley) 如果 TimeOne 小於 TimeTwo，則直接填入
            selectDateTwo(el);
          }
          setComponentVisible(false);
        }
      }
    };

    return (
      <button
        key={el?.date || `${Date.now()}-${index}`}
        type="button"
        disabled={el?.disable ?? true} // Info: (20241108 - Julian) 禁用範圍外和空白日期
        className={`relative z-10 flex h-36px items-center justify-center whitespace-nowrap px-1 transition-all duration-150 ease-in-out disabled:text-date-picker-text-disable ${isSelectedDateStyle} ${isSelectedPeriodStyle} ${!el?.disable ? 'hover:bg-date-picker-surface-date-period' : ''} hover:rounded-full`}
        onClick={dateClickHandler}
      >
        {el?.date ?? ' '}
      </button>
    );
  });

  return (
    <div className="grid grid-cols-7 text-center text-sm tablet:gap-y-2 tablet:text-base">
      {weekNameList}
      {formatDaysInMonth}
    </div>
  );
};

const SECONDS_TO_TOMORROW = 86400 - 1;
const MILLISECONDS_IN_A_SECOND = 1000;

type ViewMode = 'date' | 'month' | 'year';

/* Info: (20241226 - Tzuhan) === 幾個切換畫面的區塊 === */
interface IYearDropdownProps {
  setSelectedYear: Dispatch<SetStateAction<number>>;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  selectedYear: number;
}
// Info: (20241226 - Tzuhan) 1. 「選年份」畫面範例。你可以再做上下頁切換更多年。
const YearDropdown = ({ setSelectedYear, setViewMode, selectedYear }: IYearDropdownProps) => {
  // Info: (20241226 - Tzuhan) 簡單做個 12 年區間 (前後可自行調整)
  const startYear = selectedYear - 5;
  const endYear = selectedYear + 6;
  const years = [];
  for (let y = startYear; y <= endYear; y += 1) {
    years.push(y);
  }

  return (
    <div className="grid grid-cols-3 gap-4 text-center">
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => {
            setSelectedYear(y);
            // Info: (20241226 - Tzuhan) 選完年份，進入「選月份」模式
            setViewMode('month');
          }}
          className="rounded px-16px py-8px hover:bg-date-picker-surface-date-period"
        >
          {y}
        </button>
      ))}
    </div>
  );
};

interface IMonthDropdownProps {
  setSelectedMonth: Dispatch<SetStateAction<number>>;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
}

// Info: (20241226 - Tzuhan) 2.「選月份」畫面
const MonthDropdown = ({ setSelectedMonth, setViewMode }: IMonthDropdownProps) => {
  const { t }: { t: TranslateFunction } = useTranslation('date_picker');
  return (
    <div className="grid grid-cols-3 gap-4 text-center">
      {MONTH_ABR_LIST.map((monthAbr, idx) => {
        const mIndex = idx + 1; // Info: (20241226 - Tzuhan) 1~12
        return (
          <button
            key={monthAbr}
            type="button"
            onClick={() => {
              setSelectedMonth(mIndex);
              // Info: (20241226 - Tzuhan) 選完月，回到「選日期」模式
              setViewMode('date');
            }}
            className="rounded px-16px py-8px hover:bg-date-picker-surface-date-period"
          >
            {t(monthAbr)}
          </button>
        );
      })}
    </div>
  );
};

interface IDateDropdownProps {
  daysInMonth: (year: number, month: number) => Dates[];
  selectDateOne: (date: Dates | null) => void;
  selectDateTwo: (date: Dates | null) => void;
  selectedYear: number;
  selectedMonth: number;
  dateOne: Date | null;
  dateTwo: Date | null;
  setComponentVisible: Dispatch<SetStateAction<boolean>>;
  type: DatePickerType;
}

// 3. Info: (20241226 - Tzuhan) 「選日期」畫面 (就是你原本的日期 grid)
const DateDropdown = ({
  daysInMonth,
  selectDateOne,
  selectDateTwo,
  selectedYear,
  selectedMonth,
  dateOne,
  dateTwo,
  setComponentVisible,
  type,
}: IDateDropdownProps) => {
  /* Info: (20241226 - Tzuhan) 跟原本一樣，把 PopulateDates 拿來這邊顯示 */
  return (
    <div>
      <PopulateDates
        daysInMonth={daysInMonth(selectedYear, selectedMonth)}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectTimeOne={dateOne?.getTime() ?? 0}
        selectDateOne={selectDateOne}
        selectTimeTwo={dateTwo?.getTime() ?? 0}
        selectDateTwo={selectDateTwo}
        setComponentVisible={setComponentVisible}
        type={type}
      />
    </div>
  );
};

const DatePicker = ({
  id,
  type,
  minDate,
  maxDate,
  period,
  setFilteredPeriod,
  loading,
  btnClassName,
  calenderClassName,
  buttonStyleAfterDateSelected = 'border-input-stroke-input text-input-text-input-filled',
  onClose,
  alignCalendar,
  datePickerClassName,
  disabled,
  datePickerHandler,
  label,
  labelClassName,
}: IDatePickerProps) => {
  const { t }: { t: TranslateFunction } = useTranslation('date_picker');
  const { targetRef, componentVisible, setComponentVisible } = useOuterClick<HTMLDivElement>(false);

  /* Info: (20241226 - Tzuhan) 新增 viewMode，預設為 'date' */
  const [viewMode, setViewMode] = useState<ViewMode>('date');

  const today = new Date();
  const minTime = minDate ? minDate.getTime() : 0;
  const maxTime = maxDate ? maxDate.getTime() : new Date().getTime();

  const [dateOne, setDateOne] = useState<Date | null>(
    new Date(period.startTimeStamp * MILLISECONDS_IN_A_SECOND)
  );
  const [dateTwo, setDateTwo] = useState<Date | null>(
    new Date(period.endTimeStamp * MILLISECONDS_IN_A_SECOND)
  );

  const isDateSelected = dateOne && dateTwo && dateOne.getTime() !== 0 && dateTwo.getTime() !== 0;

  /* Info: (20241226 - Tzuhan) 保持目前所選的「月、年」 */
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  useEffect(() => {
    // Info: (20240417 - Shirley) 如果已取得兩個日期，則將日期區間傳回父層
    // Info: (20240417 - Shirley) 如果兩個日期相同，則將日期區間設為當天 00:00:00 ~ 23:59:59
    let dateOneStamp = 0;
    let dateTwoStamp = 0;
    if (type === DatePickerType.ICON_PERIOD || type === DatePickerType.TEXT_PERIOD) {
      dateOneStamp = dateOne ? dateOne.getTime() / MILLISECONDS_IN_A_SECOND : 0;
      dateTwoStamp = dateTwo ? dateTwo.getTime() / MILLISECONDS_IN_A_SECOND : 0;
    } else {
      dateOneStamp = dateOne ? dateOne.getTime() / MILLISECONDS_IN_A_SECOND : 0;
      dateTwoStamp = dateOne ? dateOne.getTime() / MILLISECONDS_IN_A_SECOND : 0;
    }

    if (dateOneStamp && dateTwoStamp) {
      const isSameDate = dateOneStamp === dateTwoStamp;
      setFilteredPeriod({
        startTimeStamp: dateOneStamp,
        endTimeStamp: isSameDate ? dateTwoStamp + SECONDS_TO_TOMORROW : dateTwoStamp,
      });
      if (datePickerHandler) {
        datePickerHandler(
          dateOneStamp,
          isSameDate ? dateTwoStamp + SECONDS_TO_TOMORROW : dateTwoStamp
        );
      }
      // Info: (20240509 - Shirley) 都選好日期之後執行 onClose callback
      if (onClose) {
        onClose(dateOneStamp, isSameDate ? dateTwoStamp + SECONDS_TO_TOMORROW : dateTwoStamp);
      }
    } else if (dateOneStamp === 0 && dateTwoStamp === 0) {
      setFilteredPeriod({
        startTimeStamp: 0,
        endTimeStamp: 0,
      });
      if (onClose) {
        onClose(0, 0);
      }
      if (datePickerHandler) {
        datePickerHandler(0, 0);
      }
    } else {
      setFilteredPeriod({
        startTimeStamp: 0,
        endTimeStamp: 0,
      });
    }
  }, [dateOne, dateTwo, type]);

  // Info: (20240417 - Shirley) 取得該月份第一天是星期幾
  const firstDayOfMonth = (year: number, month: number) => {
    return new Date(`${year}/${month}/01`).getDay();
  };

  // Info: (20240417 - Shirley) 取得該月份的所有天數
  const daysInMonth = (year: number, month: number) => {
    const day = firstDayOfMonth(year, month);
    const dateLength = new Date(year, month, 0).getDate();

    let dates: Dates[] = [];

    for (let i = 0; i < dateLength; i += 1) {
      const dateTime = new Date(`${year}/${month}/${i + 1}`).getTime();
      const date = {
        date: i + 1,
        time: dateTime,
        disable: dateTime < minTime || dateTime > maxTime, // Info: (20240424 - Shirley) 禁用小於最小日期或大於最大日期的日期
      };
      dates.push(date);
    }
    // Info: (20241226 - Tzuhan) 前面空白的格子 (用 day 來算)
    dates = Array(...Array(day)).concat(dates);
    return dates;
  };

  /* Info: (20241226 - Tzuhan) 點擊下一個月 */
  const goToNextMonth = useCallback(() => {
    let month = selectedMonth;
    let year = selectedYear;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    setSelectedMonth(month);
    setSelectedYear(year);
  }, [selectedMonth, selectedYear]);

  /* Info: (20241226 - Tzuhan) 點擊上一個月 */
  const goToPrevMonth = useCallback(() => {
    let month = selectedMonth;
    let year = selectedYear;
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    setSelectedMonth(month);
    setSelectedYear(year);
  }, [selectedMonth, selectedYear]);

  /* Info: (20241226 - Tzuhan) 選取 DateOne */
  const selectDateOne = useCallback((el: Dates | null) => {
    if (!el) {
      setDateOne(null);
      return;
    }
    const newDate = new Date(el.time);
    newDate.setHours(0, 0, 0);
    setDateOne(newDate);
  }, []);

  /* Info: (20241226 - Tzuhan) 選取 DateTwo */
  const selectDateTwo = useCallback((el: Dates | null) => {
    if (!el) {
      setDateTwo(null);
      return;
    }
    const newDate = new Date(el.time);
    newDate.setHours(23, 59, 59);
    setDateTwo(newDate);
  }, []);

  // Info: (20240417 - Shirley) 選單開關
  const openCalenderHandler = () => {
    //  Info: (20241226 - Tzuhan) 如果下一步要「打開」，就先把 viewMode 重置為 'date'
    if (!componentVisible) {
      setViewMode('date');
    }
    setComponentVisible(!componentVisible);
  };
  // Info: (20240417 - Shirley) 選擇今天
  const todayClickHandler = () => {
    const dateOfToday = new Date(
      `${today.getFullYear()}/${today.getMonth() + 1}/${today.getDate()} 00:00:00`
    );

    // Info: (20240417 - Shirley) 選擇區間改成今天
    setDateOne(dateOfToday);
    setDateTwo(dateOfToday);
    setSelectedMonth(today.getMonth() + 1);
    setSelectedYear(today.getFullYear());

    // Info: (20241226 - Tzuhan) 回到顯示日期模式
    setViewMode('date');
    setComponentVisible(false);
  };

  /* Info: (20241226 - Tzuhan) 顯示在按鈕上的文字 */
  const defaultPeriodText =
    type === DatePickerType.TEXT_DATE
      ? t('date_picker:DATE_PICKER.SELECT_DATE')
      : t('date_picker:DATE_PICKER.SELECT_PERIOD');

  // Info: (20240417 - Shirley) 顯示時間區間
  const displayedPeriod =
    period.startTimeStamp !== 0 && period.endTimeStamp !== 0 // Info: (20240510 - Julian) edited
      ? type === DatePickerType.TEXT_DATE || type === DatePickerType.ICON_DATE
        ? `${timestampToString(period.startTimeStamp).date}`
        : `${timestampToString(period.startTimeStamp).date} ${t(
            'date_picker:DATE_PICKER.TO'
          )} ${timestampToString(period.endTimeStamp).date}`
      : defaultPeriodText;

  const displayedYear = `${selectedYear}`;
  const displayedMonth = `${t(MONTH_ABR_LIST[selectedMonth - 1])}`;

  /* Info: (20241226 - Tzuhan) 按鈕 */
  const displayedButtonContent =
    type === DatePickerType.ICON_PERIOD || type === DatePickerType.ICON_DATE ? (
      <Button
        id={id}
        disabled={disabled}
        type="button"
        variant={'tertiaryOutline'}
        onClick={openCalenderHandler}
        className={cn(
          // Info: (20240426 - Liz) ===== default style =====
          'flex w-full items-center space-x-3 rounded-sm border border-input-stroke-input bg-input-surface-input-background p-3 text-input-text-input-placeholder hover:cursor-pointer',
          // Info: (20240426 - Liz) ===== props control style =====
          btnClassName,
          // Info: (20240426 - Liz) ===== variables control style =====
          {
            [buttonStyleAfterDateSelected]: isDateSelected,
            'border-input-stroke-selected text-input-surface-input-selected': componentVisible,
            'disabled:cursor-not-allowed disabled:border-button-stroke-disable disabled:bg-input-surface-input-disable disabled:text-button-text-disable':
              disabled,
          }
        )}
      >
        <FiCalendar
          size={16}
          className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover"
        />
      </Button>
    ) : type === DatePickerType.TEXT_PERIOD || type === DatePickerType.TEXT_DATE ? (
      <Button
        id={id}
        disabled={disabled}
        type="button"
        variant={'tertiaryOutline'}
        size={'placeholderInput'}
        onClick={openCalenderHandler}
        className={cn(
          'group flex w-full cursor-pointer items-center rounded-sm border border-input-stroke-input bg-input-surface-input-background p-3 text-input-text-input-placeholder group-hover:text-button-text-primary-hover',
          btnClassName,
          {
            'border-button-stroke-primary-hover': componentVisible,
            [buttonStyleAfterDateSelected]: isDateSelected,
            'disabled:border-button-stroke-disable disabled:bg-input-surface-input-disable disabled:text-button-text-disable disabled:hover:cursor-not-allowed':
              disabled,
          }
        )}
      >
        <p
          className={cn('flex-1 whitespace-nowrap text-start text-sm', {
            'border-button-stroke-primary-hover': componentVisible,
            [buttonStyleAfterDateSelected]: isDateSelected,
          })}
        >
          {displayedPeriod}
        </p>
        <FiCalendar
          size={20}
          className="text-icon-surface-single-color-primary group-hover:text-button-text-primary-hover"
        />
      </Button>
    ) : null;

  return (
    <div
      className={cn('relative flex w-full flex-col gap-8px max-md:max-w-full', datePickerClassName)}
    >
      {/* Info: (20240417 - Shirley) Select Period button */}
      {/* Info: (20250416 - Anna) 標籤 */}
      {label && (
        <p className={`text-sm font-semibold text-input-text-primary ${labelClassName}`}>
          {t(`date_picker:DATE_PICKER.${label.toUpperCase()}`)}
        </p>
      )}
      <div ref={targetRef}>
        {displayedButtonContent}

        {/** Info: (20241226 - Tzuhan)
         * 主要的下拉容器，根據 viewMode 來決定顯示哪個子元件
         */}
        <div
          className={cn(
            'w-230px invisible absolute top-16 z-20 grid grid-rows-0 items-center space-y-4 rounded-md bg-date-picker-surface-calendar-background p-5 text-date-picker-text-default opacity-0 shadow-xl transition-all duration-300 ease-in-out iphone12pro:w-300px md:w-[350px]',
            {
              'visible translate-y-0 grid-rows-1 opacity-100': componentVisible && !loading,
              'translate-x-0': alignCalendar === DatePickerAlign.LEFT || !!alignCalendar,
              '-translate-x-[50%]': alignCalendar === DatePickerAlign.CENTER,
              '-translate-x-[90%]': alignCalendar === DatePickerAlign.RIGHT,
            },
            calenderClassName
          )}
        >
          {/* Info: (20240417 - Shirley) Today button */}
          <Button
            id={`${id}-today-btn`}
            type="button"
            variant={'tertiaryOutline'}
            onClick={todayClickHandler}
            className="w-full p-1 text-sm"
          >
            {t('date_picker:DATE_PICKER.TODAY')}
          </Button>

          {/** Info: (20241226 - Tzuhan)
           * 這塊放「頭部區域」，可以把它做成三態：
           * - 在 viewMode = 'date' 時顯示 年/月 + 前後按鈕
           * - 在 viewMode = 'year' 時只顯示單純標題 + 前後按鈕(切更多年區間?)
           * - 在 viewMode = 'month' 時顯示「2024」之類的 + 前後按鈕(如果要切整年度範圍?)
           */}
          <div className="flex w-full items-center justify-between">
            <Button
              id={`${id}-prev-btn`}
              type="button"
              onClick={() => {
                if (viewMode === 'year') {
                  // Info: (20241226 - Tzuhan) 範例：往前一組 12 年
                  setSelectedYear((prev) => prev - 12);
                } else if (viewMode === 'month') {
                  // Info: (20241226 - Tzuhan) 往前一年
                  setSelectedYear((prev) => prev - 1);
                } else {
                  // Info: (20241226 - Tzuhan) 日期模式 → 上一個月
                  goToPrevMonth();
                }
              }}
              variant="tertiaryOutline"
              size={'smallSquare'}
            >
              <AiOutlineLeft size={12} />
            </Button>

            {/* Info: (20241226 - Tzuhan) 顯示當前「年份 / 月份」文字，且可點擊切換 viewMode */}
            {viewMode === 'date' && (
              <div
                className="flex cursor-pointer space-x-4 text-date-picker-text-default"
                onClick={() => setViewMode('month')}
              >
                <p>{displayedYear}</p>
                <p>{displayedMonth}</p>
              </div>
            )}

            {viewMode === 'month' && (
              <p
                className="cursor-pointer text-date-picker-text-default"
                onClick={() => setViewMode('year')}
              >
                {`${selectedYear}`}
              </p>
            )}

            {viewMode === 'year' && (
              <p className="text-date-picker-text-default">
                {`${selectedYear - 5} ~ ${selectedYear + 6}`}
              </p>
            )}

            <Button
              id={`${id}-next-btn`}
              type="button"
              onClick={() => {
                if (viewMode === 'year') {
                  // Info: (20241226 - Tzuhan) 往後一組 12 年
                  setSelectedYear((prev) => prev + 12);
                } else if (viewMode === 'month') {
                  // Info: (20241226 - Tzuhan) 往後一年
                  setSelectedYear((prev) => prev + 1);
                } else {
                  // Info: (20241226 - Tzuhan) 日期模式 → 下一個月
                  goToNextMonth();
                }
              }}
              variant="tertiaryOutline"
              size={'smallSquare'}
            >
              <AiOutlineRight size={12} />
            </Button>
          </div>

          {/* 根據 viewMode 決定要渲染什麼畫面 */}
          {viewMode === 'year' && (
            <YearDropdown
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              setViewMode={setViewMode}
            />
          )}
          {viewMode === 'month' && (
            <MonthDropdown setSelectedMonth={setSelectedMonth} setViewMode={setViewMode} />
          )}
          {viewMode === 'date' && (
            <DateDropdown
              daysInMonth={daysInMonth}
              selectDateOne={selectDateOne}
              selectDateTwo={selectDateTwo}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              dateOne={dateOne}
              dateTwo={dateTwo}
              setComponentVisible={setComponentVisible}
              type={type}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default DatePicker;
