import { IGeneratedReportItem } from '@/interfaces/report_item';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { timestampToString } from '@/lib/utils/common';
import { Button } from '@/components/button/button';
import Link from 'next/link';
import { ReportTypeToBaifaReportType } from '../../interfaces/report_type';
import { ISUNFA_ROUTE } from '../../constants/url';

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

// // TODO: dummy data to be replaced (20240429 - Shirley)
// const getBaseUrl = (): string => {
//   return 'https://baifa.io';
// };

// // TODO: dummy data to be replaced (20240429 - Shirley)
// const ReportLink = {
//   balance_sheet: `https://baifa.io/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/${ReportTypeToBaifaReportType.balance_sheet}`,
//   comprehensive_income_statement: `https://baifa.io/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/${ReportTypeToBaifaReportType.comprehensive_income_statement}`,
//   cash_flow_statement: `https://baifa.io/app/chains/8017/evidence/505c1ddbd5d6cb47fc769577d6afaa0410f5c1090000000000000000000000000000000000000007/${ReportTypeToBaifaReportType.cash_flow_statement}`,
// } as const;

const ReportsHistoryItem = ({
  report,
  checked,
  isCheckboxVisible,
  onCheckChange = () => {},
}: IReportsHistoryItemProps) => {
  const {
    id,
    createdTimestamp,
    name,
    period,
    project,
    reportLinkId,
    reportType,
    blockchainExplorerLink,
  } = report;

  const startDate = timestampToString(period.startTimestamp);
  const endDate = timestampToString(period.endTimestamp);

  const displayedProject = project ? (
    <div className="flex w-fit items-center gap-2px rounded bg-primaryYellow3 px-8px py-2px font-medium text-primaryYellow2">
      <div className="flex h-14px w-14px items-center justify-center rounded-full bg-indigo text-xxs text-white">
        {project?.code}
      </div>
      <p>{project?.name}</p>
    </div>
  ) : null;

  // const displayedBlockchainLink =

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
      <td className="pl-5 text-start text-base text-text-neutral-primary">
        <Link
          href={`${ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_VIEW}/?report_id=${reportLinkId}&report_type=${ReportTypeToBaifaReportType[reportType]}`}
        >
          {name}
        </Link>
      </td>
      <td className="px-16px text-left font-medium text-navyBlue2">
        <div className="space-x-2 text-xs">
          <span className="text-text-neutral-tertiary">From</span>
          <span className="text-text-neutral-primary">{startDate.date}</span>
          <span className="text-text-neutral-tertiary">to</span>
          <span className="text-text-neutral-primary">{endDate.date}</span>
        </div>
      </td>
      {/* Info: (20240514 - Shirley) Blockchain explorer link */}
      {/* TODO: 需要點了之後導向 'google.com'，現在會被整個 <Link /> 覆蓋 */}
      <td className="px-16px text-left font-medium text-navyBlue2">
        <Link href={blockchainExplorerLink} target="_blank">
          <Button variant={'tertiaryBorderless'} size={'small'}>
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
        </Link>
      </td>
      <td className="px-16px text-left">{displayedProject}</td>
      <td className="px-16px">
        <div className="flex items-center">
          <Button variant={'tertiaryBorderless'} className="my-auto mr-5 px-0 py-0">
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
                d="M12.003 2.252a.75.75 0 01.75.75v10.19l3.72-3.72a.75.75 0 011.06 1.06l-5 5a.75.75 0 01-1.06 0l-5-5a.75.75 0 011.06-1.06l3.72 3.72V3.001a.75.75 0 01.75-.75zm-9 12a.75.75 0 01.75.75v1.2c0 .852 0 1.447.038 1.91.037.453.107.714.207.911.216.424.56.768.983.984.198.1.459.17.913.207.462.037 1.056.038 1.909.038h8.4c.852 0 1.447 0 1.91-.038.453-.037.714-.107.911-.207a2.25 2.25 0 00.984-.984c.1-.197.17-.458.207-.912.037-.462.038-1.057.038-1.909v-1.2a.75.75 0 111.5 0v1.232c0 .813 0 1.468-.043 2-.045.546-.14 1.026-.366 1.47a3.75 3.75 0 01-1.639 1.64c-.444.226-.924.32-1.47.365-.532.043-1.187.043-2 .043H7.771c-.813 0-1.469 0-2-.043-.546-.045-1.026-.14-1.47-.366a3.75 3.75 0 01-1.64-1.639c-.226-.444-.32-.924-.365-1.47-.043-.532-.043-1.187-.043-2v-1.232a.75.75 0 01.75-.75z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>{' '}
          <Button variant={'tertiaryBorderless'} className="mr-2 px-0 py-0">
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
                d="M10.534 3.298c.244-.3.613-.47 1-.46.327.008.582.173.73.278.155.11.335.265.525.428l.023.02 8.47 7.26.017.014c.108.092.221.19.31.281.1.101.227.25.302.46a1.25 1.25 0 010 .844c-.075.21-.202.358-.301.46-.09.091-.203.188-.31.28l-.018.015-8.47 7.26-.023.02c-.19.163-.37.317-.525.428-.148.105-.403.27-.73.277a1.25 1.25 0 01-1-.46c-.207-.253-.248-.554-.264-.734-.017-.19-.017-.427-.017-.678v-3.387a10.651 10.651 0 00-6.673 3.739.75.75 0 01-1.327-.48v-.611a10.416 10.416 0 018-10.127V4.71c0-.25 0-.487.017-.677.016-.18.057-.481.264-.735zm1.219 1.334v4.403a.75.75 0 01-.62.74 8.916 8.916 0 00-7.281 7.459 12.148 12.148 0 017.1-2.911.75.75 0 01.8.748v4.19l.001.109.082-.07 8.471-7.261.044-.038-.044-.038-8.47-7.26-.083-.071zm8.799 7.187l-.002.001.002-.001z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
      </td>

      {/* <Link
        href={`${ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_VIEW}/?report_id=${reportLinkId}&report_type=${ReportTypeToBaifaReportType[reportType]}`}
        target="_blank"
        className={`${isCheckboxVisible ? `left-11rem w-80vw` : `left-7rem w-85vw`} absolute h-80px`}
      ></Link> */}
    </tr>
  );
};

export default ReportsHistoryItem;
