import { timestampToString } from '@/lib/utils/common';

interface ICalendarIconProps {
  timestamp: number;
  incomplete?: boolean;
  isExporting?: boolean;
}

const CalendarIcon = ({ timestamp, incomplete = true, isExporting }: ICalendarIconProps) => {
  const { year, monthFullName, day } = timestampToString(timestamp);

  // Info: (20240418 - Julian) 取得月份的前三個字元
  const displayMonth = monthFullName.substring(0, 3);
  // Info: (20240418 - Julian) 將日期轉換為數字以除去前面的 0，若為'-'則保留'-'
  const displayDay = day === '-' ? '-' : +day;

  const incompleteStyle = incomplete === false ? 'hidden' : 'block';

  return (
    <div className="relative flex w-fit scale-75 flex-col items-center justify-end font-barlow md:scale-100">
      {/* Info: (20240916 - Julian) 日曆掛鉤 */}
      <div className="absolute -top-6px flex items-center gap-20px">
        <span className="h-6px w-2px rounded-t bg-stroke-neutral-tertiary"></span>
        <span className="h-6px w-2px rounded-t bg-stroke-neutral-tertiary"></span>
      </div>

      {/* Info: (20240916 - Julian) 日曆外框 */}
      <div className="flex h-54px w-54px flex-col items-stretch divide-y-2 divide-stroke-neutral-tertiary rounded-sm border-2 border-stroke-neutral-tertiary">
        {/* Info: (20240916 - Julian) 年份 */}
        <p
          className={`${isExporting ? 'pb-3' : ''} text-center text-xs font-semibold text-text-neutral-tertiary`}
        >
          {year}
        </p>
        <div className={`${isExporting ? 'pb-3' : ''} flex flex-col items-center`}>
          {/* Info: (20240916 - Julian) 月份 */}
          <p className="text-sm font-semibold leading-3 text-text-brand-primary-lv2">
            {displayMonth}
          </p>
          {/* Info: (20240916 - Julian) 日 */}
          <p className="text-xl font-bold leading-5 text-text-brand-secondary-lv2">{displayDay}</p>
        </div>
      </div>

      {/* Info: (20241004 - Julian) 未讀標記 */}
      <div className={`${isExporting ? 'hidden' : ''}`}>
        <div
          className={`absolute ${incompleteStyle} -bottom-1 -right-1 h-14px w-14px rounded-full border-2 border-avatar-stroke-primary bg-surface-state-error`}
        ></div>
      </div>
    </div>
  );
};

export default CalendarIcon;
