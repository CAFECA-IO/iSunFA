import { Dispatch, SetStateAction, useEffect, useState } from 'react';

interface DateTimePickerProps {
  setTimeStamp: Dispatch<SetStateAction<number | undefined>>;
  isAlert?: boolean;
}

const DateTimePicker = ({ setTimeStamp, isAlert }: DateTimePickerProps) => {
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');

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
