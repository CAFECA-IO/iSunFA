import { timestampToString } from '@/lib/utils/common';

interface ICalendarIconProps {
  timestamp: number;
}

const CalendarIcon = ({ timestamp }: ICalendarIconProps) => {
  const { year, monthFullName, day } = timestampToString(timestamp);

  // Info: (20240418 - Julian) 取得月份的前三個字元
  const displayMonth = monthFullName.substring(0, 3);
  // Info: (20240418 - Julian) 將日期轉換為數字以除去前面的 0，若為'-'則保留'-'
  const displayDay = day === '-' ? '-' : +day;
  // Info: (20240418 - Julian) 設定日期的 x 座標
  const dayX =
    // Info: (20240418 - Julian) 若日期為'-'或個位數，則 x 座標為 26
    displayDay === '-' || displayDay < 10 ? 26 : displayDay >= 10 && displayDay <= 19 ? 22 : 20;

  return (
    <div className="scale-75 md:scale-100">
      {/* // ToDo: (20240911 - Liz) 未來可以改用 CSS 刻，以便拔掉 svg */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mx-auto"
      >
        {/* Info: (20240418 - Julian) 日曆外框 */}
        <path
          d="M58 22.7201V47.0801C58 51.9526 58 54.3888 57.0554 56.2498C56.2245 57.8868 54.8987 59.2178 53.2679 60.0519C51.414 61.0001 48.9871 61.0001 44.1333 61.0001H19.8667C15.0129 61.0001 12.586 61.0001 10.7321 60.0519C9.10134 59.2178 7.77551 57.8868 6.94461 56.2498C6 54.3888 6 51.9526 6 47.0801V22.7201M58 22.7201C58 17.8477 58 15.4114 57.0554 13.5504C56.2245 11.9134 54.8987 10.5825 53.2679 9.74837C51.414 8.80012 48.9871 8.80012 44.1333 8.80012H19.8667C15.0129 8.80012 12.586 8.80012 10.7321 9.74837C9.10134 10.5825 7.77551 11.9134 6.94461 13.5504C6 15.4114 6 17.8477 6 22.7201M58 22.7201H32H6M43.5556 3.00012V8.80012M20.4444 3.00012V8.80012"
          stroke="#7F8A9D"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Info: (20240418 - Julian) 年份 */}
        <text x="17" y="20" fontWeight="600" fontSize="12px" fontFamily="Barlow" fill="#7F8A9D">
          {year}
        </text>
        {/* Info: (20240418 - Julian) 月份 */}
        <text x="20" y="38" fontWeight="600" fontSize="14px" fontFamily="Barlow" fill="#FFA502">
          {displayMonth}
        </text>
        {/* Info: (20240418 - Julian) 日 */}
        <text x={dayX} y="56.5" fontWeight="700" fontSize="20px" fontFamily="Barlow" fill="#304872">
          {displayDay}
        </text>
      </svg>
    </div>
  );
};

export default CalendarIcon;
