import { IGeneratedReportItem } from '@/interfaces/report_item';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { timestampToString } from '@/lib/utils/common';
import { Button } from '@/components/button/button';

interface IReportsHistoryItemProps {
  report: IGeneratedReportItem;
  checked: boolean;
  isCheckboxVisible: boolean;
  onCheckChange?: () => void;
}

export const AnimatedSVG = () => {
  return (
    <div role="status">
      <svg
        aria-hidden="true"
        className="inline h-6 w-6 animate-spinFast fill-progress-bar-surface-bar-primary text-gray-200"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
};

const ReportsHistoryItem = ({
  report,
  checked,
  isCheckboxVisible,
  onCheckChange = () => {},
}: IReportsHistoryItemProps) => {
  const { id, createdTimestamp, name, period } = report;

  const startDate = timestampToString(period.startTimestamp);
  const endDate = timestampToString(period.endTimestamp);

  return (
    <tr
      key={id}
      className="h-20 border-b border-lightGray6 text-center align-middle text-lightGray4"
    >
      {/* Info: (20240514 - Shirley) checkboxes */}
      {isCheckboxVisible ? (
        <td className="h-20 px-10px">
          <input
            checked={checked}
            onChange={onCheckChange}
            type="checkbox"
            className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected bg-white checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
          />
        </td>
      ) : null}
      <td className="border-x border-lightGray6">
        {/* Info: (20240514 - Shirley) 將日期畫成日曆的 icon */}
        <CalendarIcon timestamp={createdTimestamp} />
      </td>
      <td className="pl-5 text-start text-base text-text-neutral-primary">{name}</td>
      <td className="px-16px text-left font-medium text-navyBlue2">
        <div className="space-x-2 text-xs">
          <span className="text-text-neutral-tertiary">From</span>
          <span className="text-text-neutral-primary">{startDate.date}</span>
          <span className="text-text-neutral-tertiary">to</span>
          <span className="text-text-neutral-primary">{endDate.date}</span>
        </div>
      </td>
      {/* Info: (20240514 - Shirley) Remaining time */}
      <td className="px-16px text-left font-medium text-navyBlue2">
        <Button variant={'tertiaryBorderless'}>
          {' '}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              className="fill-current"
              fillRule="evenodd"
              d="M12.952 2.932a5.75 5.75 0 018.13 8.131l-.009.01-3 3a5.75 5.75 0 01-8.67-.622.75.75 0 011.2-.898 4.25 4.25 0 006.41.459l2.995-2.996a4.25 4.25 0 00-6.01-6.008l-1.716 1.706a.75.75 0 01-1.058-1.064l1.72-1.71.008-.008zM7.989 8.61a5.75 5.75 0 016.615 1.944.75.75 0 01-1.202.898 4.247 4.247 0 00-4.888-1.436 4.249 4.249 0 00-1.52.977l-2.996 2.995a4.25 4.25 0 006.01 6.01l1.705-1.705a.75.75 0 111.06 1.06l-1.71 1.71-.009.01a5.75 5.75 0 01-8.13-8.131l.008-.01 3-3A5.75 5.75 0 017.99 8.61z"
              clipRule="evenodd"
            ></path>
          </svg>
        </Button>
      </td>
      <td className="px-16px">
        <div className="flex items-center">label</div>
      </td>
      <td className="px-16px">
        <div className="flex items-center">icons</div>
      </td>
    </tr>
  );
};

export default ReportsHistoryItem;
