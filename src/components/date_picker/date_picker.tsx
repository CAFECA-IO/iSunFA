import { useCallback, useState, useEffect, Dispatch, SetStateAction } from 'react';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import useOuterClick from '@/lib/hooks/use_outer_click';
import { DatePickerAlign, MONTH_ABR_LIST, WEEK_LIST } from '@/constants/display';
import { useTranslation } from 'next-i18next';
import { TranslateFunction } from '@/interfaces/locale';
import { IDatePeriod } from '@/interfaces/date_period';
import { cn, timestampToString } from '@/lib/utils/common';
import { Button } from '@/components/button/button';

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

// TODO: refactor to ICON_DATE, ICON_PERIOD, TEXT_PERIOD, TEXT_DATE (20240529 - Shirley)
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
  minDate?: Date;
  maxDate?: Date;
  loading?: boolean;
  datePickerHandler?: (start: number, end: number) => Promise<void>;
  btnClassName?: string;
  calenderClassName?: string;
  buttonStyleAfterDateSelected?: string;
  onClose?: () => void; // Info: (20240509 - Shirley) 關閉日期選擇器時的 callback
  alignCalendar?: DatePickerAlign;
  datePickerClassName?: string;
  disabled?: boolean;
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
  const { t }: { t: TranslateFunction } = useTranslation('common');

  // Info: (2020417 - Shirley) 用於日期選取的樣式
  const beforeStyle =
    'before:absolute before:-z-10 before:w-[40px] before:md:w-[42px] before:h-[40px] before:md:h-[42px] before:rounded-full before:bg-primaryYellow';

  // Info: (20240417 - Shirley) 顯示星期標題
  const weekNameList = WEEK_LIST.map((week) => (
    <p className="mx-auto h-35px w-35px text-primaryYellow" key={week}>
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
  const formatDaysInMonth = daysInMonth.map((el: Dates) => {
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
        ? 'bg-primaryYellow/30'
        : '';

    // Info: (20240417 - Shirley) DateOne 和 DateTwo 的樣式
    const isSelectedDateStyle = date?.getTime()
      ? !selectTimeTwoReset && date.getTime() === selectTimeOne
        ? 'rounded-full bg-white text-primaryYellow'
        : selectTimeOne && selectTimeTwoReset
          ? date.getTime() === selectTimeOne && date.getTime() === selectTimeTwoReset
            ? `rounded-full text-secondaryBlue bg-primaryYellow`
            : date.getTime() === selectTimeOne
              ? `rounded-l-full text-secondaryBlue before:md:left-[1px] before:left-0 before:-top-3px ${beforeStyle}`
              : date.getTime() === selectTimeTwoReset
                ? `rounded-r-full text-secondaryBlue before:md:right-[1px] before:right-0 before:-top-3px ${beforeStyle}`
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
        key={el?.date}
        type="button"
        disabled={el?.disable}
        className={`relative z-10 h-35px whitespace-nowrap px-1 text-base md:h-35px ${isSelectedDateStyle} ${isSelectedPeriodStyle} transition-all duration-150 ease-in-out disabled:text-lilac`}
        onClick={dateClickHandler}
      >
        {el?.date ?? ' '}
      </button>
    );
  });

  return (
    <div className="grid grid-cols-7 gap-y-2 text-center text-base">
      {weekNameList}
      {formatDaysInMonth}
    </div>
  );
};

const SECONDS_TO_TOMORROW = 86400 - 1;
const MILLISECONDS_IN_A_SECOND = 1000;

const DatePicker = ({
  type,
  minDate,
  maxDate,
  period,
  setFilteredPeriod,
  loading,
  btnClassName,
  calenderClassName,
  buttonStyleAfterDateSelected = 'border-secondaryBlue text-secondaryBlue',
  onClose,
  alignCalendar,
  datePickerClassName,
  disabled,
  datePickerHandler,
}: IDatePickerProps) => {
  const { t }: { t: TranslateFunction } = useTranslation('common');

  const { targetRef, componentVisible, setComponentVisible } = useOuterClick<HTMLDivElement>(false);

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

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 0 (January) to 11 (December).
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  // useEffect(() => {
  //   setDateOne(new Date(period.startTimeStamp * MILLISECONDS_IN_A_SECOND));
  //   setDateTwo(new Date(period.endTimeStamp * MILLISECONDS_IN_A_SECOND));
  // }, [period]);

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
      // Info: 都選好日期之後執行 onClose callback (20240509 - Shirley)
      if (onClose) {
        onClose();
      }
    } else if (dateOneStamp === 0 && dateTwoStamp === 0) {
      setFilteredPeriod({
        startTimeStamp: 0,
        endTimeStamp: 0,
      });
      if (onClose) {
        onClose();
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
        disable: dateTime < minTime || dateTime > maxTime, // Info: 禁用小於最小日期或大於最大日期的日期 (20240424 - Shirley)
      };
      dates.push(date);
    }
    dates = Array(...Array(day)).concat(dates);
    return dates;
  };

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

  const selectDateOne = useCallback((el: Dates | null) => {
    if (!el) {
      setDateOne(null);
      return;
    }
    const newDate = new Date(el.time);
    // Info: (20240417 - Shirley) 設定時間為當天的開始（00:00:00）
    newDate.setHours(0, 0, 0);
    setDateOne(newDate);
  }, []);

  const selectDateTwo = useCallback((el: Dates | null) => {
    if (!el) {
      setDateTwo(null);
      return;
    }
    const newDate = new Date(el.time);
    // Info: (20240417 - Shirley) 設定時間為當天的最後一秒（23:59:59）
    newDate.setHours(23, 59, 59);
    setDateTwo(newDate);
  }, []);

  // Info: (20240417 - Shirley) 選單開關
  const openCalenderHandler = () => setComponentVisible(!componentVisible);
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
    setComponentVisible(false);
  };

  const defaultPeriodText =
    type === DatePickerType.TEXT_DATE
      ? t('DATE_PICKER.SELECT_DATE')
      : t('DATE_PICKER.SELECT_PERIOD');

  // Info: (20240417 - Shirley) 顯示時間區間
  const displayedPeriod =
    period.startTimeStamp !== 0 && period.endTimeStamp !== 0 // Info: (20240510 - Julian) edited
      ? type === DatePickerType.TEXT_DATE || type === DatePickerType.ICON_DATE
        ? `${timestampToString(period.startTimeStamp).date}`
        : `${timestampToString(period.startTimeStamp).date} ${t(
            'DATE_PICKER.TO'
          )} ${timestampToString(period.endTimeStamp).date}`
      : defaultPeriodText;

  // Info: (20240417 - Shirley) 顯示月份和年份
  const displayedYear = `${selectedYear}`;
  const displayedMonth = `${t(MONTH_ABR_LIST[selectedMonth - 1])}`;

  const displayedButtonContent =
    type === DatePickerType.ICON_PERIOD || type === DatePickerType.ICON_DATE ? (
      <Button
        disabled={disabled}
        type="button"
        variant={'tertiaryOutline'}
        onClick={openCalenderHandler}
        className={cn(
          // default style
          'flex w-full items-center space-x-3 rounded-xs border border-lightGray3 bg-white p-3 text-input-text-input-placeholder hover:cursor-pointer',
          // props control style
          btnClassName,
          // variables control style
          {
            [buttonStyleAfterDateSelected]: isDateSelected,
            'border-primaryYellow text-primaryYellow': componentVisible,
            'cursor-not-allowed border-button-stroke-disable text-button-text-disable': disabled,
          }
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 16 16"
        >
          <g clipPath="url(#clip0_653_75494)">
            <path
              className="fill-current"
              fillRule="evenodd"
              d="M5.336.584a.75.75 0 01.75.75v.584h3.833v-.584a.75.75 0 011.5 0v.586c.284.002.536.01.758.028.38.03.736.098 1.074.27a2.75 2.75 0 011.202 1.201c.171.338.238.694.27 1.074.03.364.03.81.03 1.344v5.661c0 .534 0 .98-.03 1.344-.032.38-.099.737-.27 1.074a2.75 2.75 0 01-1.202 1.202c-.338.172-.694.239-1.074.27-.364.03-.81.03-1.344.03H5.172c-.534 0-.98 0-1.344-.03-.38-.031-.737-.098-1.074-.27a2.75 2.75 0 01-1.202-1.202c-.172-.337-.239-.694-.27-1.074-.03-.364-.03-.81-.03-1.344v-5.66c0-.535 0-.98.03-1.345.031-.38.098-.736.27-1.074a2.75 2.75 0 011.202-1.202c.337-.171.694-.238 1.074-.27.221-.018.474-.025.758-.027v-.586a.75.75 0 01.75-.75zm-.75 2.836a9.144 9.144 0 00-.636.023c-.287.023-.425.065-.515.111a1.25 1.25 0 00-.547.546c-.046.09-.088.228-.111.515-.024.296-.025.68-.025 1.253v.05h10.5v-.05c0-.573 0-.957-.025-1.253-.023-.287-.065-.424-.111-.515a1.25 1.25 0 00-.546-.546c-.09-.046-.228-.088-.515-.111a9.141 9.141 0 00-.636-.023V4a.75.75 0 01-1.5 0v-.583H6.086V4a.75.75 0 01-1.5 0V3.42zm8.666 3.998h-10.5v4.05c0 .572 0 .956.025 1.252.023.287.065.425.111.515.12.236.312.427.547.546.09.047.228.089.515.112.296.024.68.025 1.252.025h5.6c.573 0 .957 0 1.253-.025.287-.023.424-.065.515-.112a1.25 1.25 0 00.546-.546c.046-.09.088-.228.111-.515.025-.296.025-.68.025-1.252v-4.05z"
              clipRule="evenodd"
            ></path>
          </g>
          <defs>
            <clipPath id="clip0_653_75494">
              <path fill="#fff" d="M0 0H16V16H0z"></path>
            </clipPath>
          </defs>
        </svg>{' '}
      </Button>
    ) : type === DatePickerType.TEXT_PERIOD || type === DatePickerType.TEXT_DATE ? (
      <Button
        disabled={disabled}
        type="button"
        variant={'tertiaryOutline'}
        onClick={openCalenderHandler}
        className={cn(
          'group flex w-full items-center rounded-xs border border-lightGray3 bg-white px-3 py-3 hover:cursor-pointer',
          btnClassName,
          {
            'border-primaryYellow text-primaryYellow': componentVisible,
            'text-secondaryBlue': isDateSelected,
            'cursor-not-allowed border-button-stroke-disable text-button-text-disable': disabled,
          }
        )}
      >
        <p
          className={cn(
            'flex-1 whitespace-nowrap text-start text-sm text-input-text-input-placeholder group-hover:text-primaryYellow',
            {
              'text-primaryYellow': componentVisible,
              [buttonStyleAfterDateSelected]: isDateSelected,
            }
          )}
        >
          {displayedPeriod}
        </p>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="none"
          viewBox="0 0 16 16"
        >
          <g clipPath="url(#clip0_653_75494)">
            <path
              className="fill-current"
              fillRule="evenodd"
              d="M5.336.584a.75.75 0 01.75.75v.584h3.833v-.584a.75.75 0 011.5 0v.586c.284.002.536.01.758.028.38.03.736.098 1.074.27a2.75 2.75 0 011.202 1.201c.171.338.238.694.27 1.074.03.364.03.81.03 1.344v5.661c0 .534 0 .98-.03 1.344-.032.38-.099.737-.27 1.074a2.75 2.75 0 01-1.202 1.202c-.338.172-.694.239-1.074.27-.364.03-.81.03-1.344.03H5.172c-.534 0-.98 0-1.344-.03-.38-.031-.737-.098-1.074-.27a2.75 2.75 0 01-1.202-1.202c-.172-.337-.239-.694-.27-1.074-.03-.364-.03-.81-.03-1.344v-5.66c0-.535 0-.98.03-1.345.031-.38.098-.736.27-1.074a2.75 2.75 0 011.202-1.202c.337-.171.694-.238 1.074-.27.221-.018.474-.025.758-.027v-.586a.75.75 0 01.75-.75zm-.75 2.836a9.144 9.144 0 00-.636.023c-.287.023-.425.065-.515.111a1.25 1.25 0 00-.547.546c-.046.09-.088.228-.111.515-.024.296-.025.68-.025 1.253v.05h10.5v-.05c0-.573 0-.957-.025-1.253-.023-.287-.065-.424-.111-.515a1.25 1.25 0 00-.546-.546c-.09-.046-.228-.088-.515-.111a9.141 9.141 0 00-.636-.023V4a.75.75 0 01-1.5 0v-.583H6.086V4a.75.75 0 01-1.5 0V3.42zm8.666 3.998h-10.5v4.05c0 .572 0 .956.025 1.252.023.287.065.425.111.515.12.236.312.427.547.546.09.047.228.089.515.112.296.024.68.025 1.252.025h5.6c.573 0 .957 0 1.253-.025.287-.023.424-.065.515-.112a1.25 1.25 0 00.546-.546c.046-.09.088-.228.111-.515.025-.296.025-.68.025-1.252v-4.05z"
              clipRule="evenodd"
            ></path>
          </g>
          <defs>
            <clipPath id="clip0_653_75494">
              <path fill="#fff" d="M0 0H16V16H0z"></path>
            </clipPath>
          </defs>
        </svg>
      </Button>
    ) : null;

  return (
    <div className={cn('relative flex w-full flex-col max-md:max-w-full', datePickerClassName)}>
      {/* Info: (20240417 - Shirley) Select Period button */}

      <div ref={targetRef}>
        {displayedButtonContent}

        {/* Info: (20240417 - Shirley) Calender part */}
        <div
          className={cn(
            'invisible absolute top-16 z-20 grid w-[300px] grid-rows-0 items-center space-y-4 rounded-md bg-white p-5 text-black opacity-0 shadow-xl transition-all duration-300 ease-in-out md:w-[350px]',
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
          <button
            type="button"
            onClick={todayClickHandler}
            className="w-full rounded border border-secondaryBlue p-1 text-sm text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
          >
            {t('DATE_PICKER.TODAY')}
          </button>

          <div className="flex w-full items-center justify-between">
            {/* Info: Previous button (20240417 - Shirley) */}
            <button
              type="button"
              onClick={goToPrevMonth}
              className="rounded border border-secondaryBlue p-2 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
            >
              <AiOutlineLeft size={12} />
            </button>
            {/* Info: (20240417 - Shirley) Month and Year */}
            <div className="flex space-x-4">
              {' '}
              <p className="text-secondaryBlue">{displayedYear}</p>
              <p className="text-secondaryBlue">{displayedMonth}</p>
            </div>

            {/* Info: Next button (20240417 - Shirley) */}
            <button
              type="button"
              onClick={goToNextMonth}
              className="rounded border border-secondaryBlue p-2 text-secondaryBlue hover:border-primaryYellow hover:text-primaryYellow"
            >
              <AiOutlineRight size={12} />
            </button>
          </div>
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
      </div>
    </div>
  );
};

export default DatePicker;
