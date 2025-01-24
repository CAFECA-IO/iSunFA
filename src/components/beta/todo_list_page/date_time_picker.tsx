import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FiClock } from 'react-icons/fi';
import useOuterClick from '@/lib/hooks/use_outer_click';

// Info: (20241219 - Liz) 把 timeStamp 格式化為 YYYY-MM-DD
const formatDate = (timeStamp: number) => {
  return (
    new Date(timeStamp).getFullYear() +
    '-' +
    String(new Date(timeStamp).getMonth() + 1).padStart(2, '0') +
    '-' +
    String(new Date(timeStamp).getDate()).padStart(2, '0')
  );
};

// Info: (20241219 - Liz) 把 timeStamp 格式化為 HH:mm
const formatTime = (timeStamp: number) => {
  return (
    String(new Date(timeStamp).getHours()).padStart(2, '0') +
    ':' +
    String(new Date(timeStamp).getMinutes()).padStart(2, '0')
  );
};

interface DateTimePickerProps {
  setTimeStamp: Dispatch<SetStateAction<number | undefined>>;
  isAlert?: boolean;
  defaultTimestamp?: number; // Info: (20241219 - Liz) 預設顯示的時間戳記
}

const DateTimePicker = ({ setTimeStamp, isAlert, defaultTimestamp }: DateTimePickerProps) => {
  const [date, setDate] = useState<string>(defaultTimestamp ? formatDate(defaultTimestamp) : '');
  const [time, setTime] = useState<string>(defaultTimestamp ? formatTime(defaultTimestamp) : '');

  // Info: (20250123 - Julian) 如果有預設時間戳記，則轉換為 AM/PM、小時、分鐘
  const defaultClock = time?.split(':')[0] ? Number(time?.split(':')[0]) <= 12 : true;
  const defaultHour = time?.split(':')[0]
    ? // Info: (20250123 - Julian) 須轉換為 12 小時制
      Number(time?.split(':')[0]) > 12
      ? Number(time?.split(':')[0]) - 12
      : Number(time?.split(':')[0])
    : 1;
  const defaultMinute = time?.split(':')[1] ? Number(time?.split(':')[1]) : 0;

  const [isAM, setIsAM] = useState<boolean>(defaultClock);
  const [hour, setHour] = useState<number>(defaultHour);
  const [minute, setMinute] = useState<number>(defaultMinute);

  // Info: (20250123 - Julian) 時間字串
  const timeString = time
    ? `${isAM ? 'AM' : 'PM'}  ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    : '--:--';

  const {
    componentVisible: isTimePickerOuterClick,
    setComponentVisible: setIsTimePickerOuterClick,
  } = useOuterClick<HTMLDivElement>(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };

  // const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setTime(e.target.value);
  // };

  useEffect(() => {
    if (isTimePickerOuterClick) {
      const timeResult = `${
        isAM ? hour.toString().padStart(2, '0') : (hour + 12).toString().padStart(2, '0')
      }:${minute.toString().padStart(2, '0')}`;

      setTime(timeResult);
    }
  }, [isAM, hour, minute, isTimePickerOuterClick]);

  useEffect(() => {
    const getTimestamp = () => {
      if (date && time) {
        const combinedDateTime = new Date(`${date}T${time}`);
        const ts = combinedDateTime.getTime();
        setTimeStamp(ts); // Info: (20241218 - Liz) 將 timestamp 傳回父元件
      } else {
        setTimeStamp(undefined);
      }
    };

    getTimestamp();
  }, [date, time, setTimeStamp]);

  const amOption = (
    <button
      type="button"
      onClick={() => setIsAM(true)}
      className={`px-8px py-2px hover:cursor-pointer hover:bg-button-surface-soft-primary-hover ${isAM ? 'bg-button-surface-soft-primary' : ''}`}
    >
      AM
    </button>
  );

  const pmOption = (
    <button
      type="button"
      onClick={() => setIsAM(false)}
      className={`px-8px py-2px hover:cursor-pointer hover:bg-button-surface-soft-primary-hover ${!isAM ? 'bg-button-surface-soft-primary' : ''}`}
    >
      PM
    </button>
  );

  const hourOptions = [...Array(12).keys()].map((hr) => {
    // Info: (20250123 - Julian)  array 從 0 開始，所以要加 1
    const hrClick = () => setHour(hr + 1);

    // Info: (20250123 - Julian) 顯示 2 位數
    const hrStr = (hr + 1).toString().padStart(2, '0');

    //  Info: (20250123 - Julian) 判斷是否為當前選擇的小時
    const isHrActive = hour === hr + 1;

    return (
      <button
        key={hr}
        type="button"
        onClick={hrClick}
        className={`px-8px py-2px hover:cursor-pointer hover:bg-button-surface-soft-primary-hover ${isHrActive ? 'bg-button-surface-soft-primary' : ''}`}
      >
        {hrStr}
      </button>
    );
  });

  const minuteOptions = [...Array(60).keys()].map((min) => {
    const minClick = () => setMinute(min);

    // Info: (20250123 - Julian) 顯示 2 位數
    const minStr = min.toString().padStart(2, '0');

    //  Info: (20250123 - Julian) 判斷是否為當前選擇的分鐘
    const isMinActive = min === minute;

    return (
      <button
        key={min}
        type="button"
        onClick={minClick}
        className={`px-8px py-2px hover:cursor-pointer hover:bg-button-surface-soft-primary-hover ${isMinActive ? 'bg-button-surface-soft-primary' : ''}`}
      >
        {minStr}
      </button>
    );
  });

  return (
    <div className="flex items-center gap-20px">
      <input
        id="date-picker"
        type="date"
        value={date}
        onChange={handleDateChange}
        className={`flex-auto rounded-sm border bg-input-surface-input-background px-10px py-8px text-base font-medium text-input-text-input-placeholder shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected ${isAlert ? 'border-input-stroke-error' : 'border-input-stroke-input'}`}
      />

      {/* <input
        id="time-picker"
        type="time"
        value={time}
        onChange={handleTimeChange}
        className={`flex-auto rounded-sm border bg-input-surface-input-background px-10px py-8px text-base font-medium text-input-text-input-placeholder shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected ${isAlert ? 'border-input-stroke-error' : 'border-input-stroke-input'}`}
      /> */}
      <div
        onClick={() => setIsTimePickerOuterClick(!isTimePickerOuterClick)}
        className={`relative flex w-130px flex-auto cursor-pointer items-center justify-between rounded-sm border bg-input-surface-input-background px-10px py-8px text-base font-medium text-input-text-input-placeholder shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected ${isAlert ? 'border-input-stroke-error' : 'border-input-stroke-input'}`}
      >
        <p>{timeString}</p>
        <FiClock color="black" />

        <div
          className={`absolute left-0 top-50px z-10 w-max ${isTimePickerOuterClick ? 'grid' : 'hidden'} grid-cols-3 items-start overflow-hidden border border-input-stroke-input bg-input-surface-input-background p-4px text-input-text-input-placeholder shadow-Dropshadow_SM`}
        >
          {/* Info: (20250123 - Julian) AM/PM */}
          <div className="flex max-h-150px flex-col overflow-y-scroll text-center">
            {amOption}
            {pmOption}
          </div>
          {/* Info: (20250123 - Julian) 時間 */}
          <div className="flex max-h-150px flex-col overflow-y-scroll text-center">
            {hourOptions}
          </div>
          {/* Info: (20250123 - Julian) 分鐘 */}
          <ul className="flex max-h-150px flex-col overflow-y-scroll text-center">
            {minuteOptions}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DateTimePicker;
