import { Dispatch, SetStateAction, useEffect, useState } from 'react';

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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTime(e.target.value);
  };

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

  return (
    <div className="flex items-center gap-20px">
      <input
        id="date-picker"
        type="date"
        value={date}
        onChange={handleDateChange}
        className={`flex-auto rounded-sm border bg-input-surface-input-background px-10px py-8px text-base font-medium text-input-text-input-placeholder shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected ${isAlert ? 'border-input-stroke-error' : 'border-input-stroke-input'}`}
      />

      <input
        id="time-picker"
        type="time"
        value={time}
        onChange={handleTimeChange}
        className={`flex-auto rounded-sm border bg-input-surface-input-background px-10px py-8px text-base font-medium text-input-text-input-placeholder shadow-Dropshadow_SM outline-none hover:border-input-stroke-input-hover focus:border-input-stroke-selected ${isAlert ? 'border-input-stroke-error' : 'border-input-stroke-input'}`}
      />
    </div>
  );
};

export default DateTimePicker;
