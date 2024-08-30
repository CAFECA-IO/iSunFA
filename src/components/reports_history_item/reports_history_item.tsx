import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { timestampToString, truncateString } from '@/lib/utils/common';
import Link from 'next/link';
import { FinancialReportTypeName, ReportTypeToBaifaReportType } from '@/interfaces/report_type';
import { ISUNFA_ROUTE } from '@/constants/url';
import { useTranslation } from 'next-i18next';
import { IReport } from '@/interfaces/report';

interface IReportsHistoryItemProps {
  report: IReport;
  checked: boolean;
  isCheckboxVisible: boolean;
  onCheckChange?: () => void;
}

const ReportsHistoryItem = ({
  report,
  checked,
  isCheckboxVisible,
  onCheckChange = () => {},
}: IReportsHistoryItemProps) => {
  const { t } = useTranslation([
    'common',
    'project',
    'journal',
    'kyc',
    'report_401',
    'salary',
    'setting',
    'terms',
  ]);
  const { id, createdAt, name, from, to, project, reportType, blockChainExplorerLink } = report;

  const startDate = timestampToString(from);
  const endDate = timestampToString(to);

  const displayedProject = project ? (
    <div className="flex w-fit items-center gap-2px rounded bg-badge-surface-soft-primary px-8px py-2px font-medium text-badge-text-primary-solid">
      <div className="flex h-14px w-14px items-center justify-center rounded-full bg-surface-support-strong-indigo text-xxs text-avatar-text-in-dark-background">
        {project?.code}
      </div>
      <p>{project?.name}</p>
    </div>
  ) : null;

  return (
    <tr
      key={id}
      className="h-20 border-b border-stroke-neutral-quaternary text-center align-middle"
    >
      {/* Info: (20240514 - Shirley) checkboxes */}
      {isCheckboxVisible ? (
        <td className="h-20 px-10px">
          <input
            checked={checked}
            onChange={onCheckChange}
            type="checkbox"
            className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected bg-checkbox-surface-unselected checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
          />
        </td>
      ) : null}
      <td className="border-x border-stroke-neutral-quaternary">
        {/* Info: (20240514 - Shirley) 將日期畫成日曆的 icon */}
        <CalendarIcon timestamp={createdAt} />
      </td>
      {/* Info: (20240528 - Shirley) report name */}
      <td className="pl-5 text-start text-base text-text-neutral-primary">
        <div className="flex w-full flex-col justify-start">
          <Link
            className="hidden lg:flex"
            href={`${ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_VIEW}/${id}?report_type=${ReportTypeToBaifaReportType[reportType]}`}
          >
            {name}
          </Link>
          {/* Info: (20240722 - Anna) 錯的http://localhost:3000/users/reports/financials/view?report_type=balance */}
          {/*  Info: (20240722 - Anna) 對的http://localhost:3000/users/reports/financials/view/10000008?report_type=cash-flow */}
          <div className="flex flex-col space-y-2 lg:hidden">
            <Link
              className="sm:hidden"
              href={`${ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_VIEW}/${id}?report_type=${ReportTypeToBaifaReportType[reportType]}`}
            >
              {truncateString(name, 16)}
            </Link>

            <Link
              className="hidden sm:block"
              href={`${ISUNFA_ROUTE.USERS_FINANCIAL_REPORTS_VIEW}/${id}?report_type=${ReportTypeToBaifaReportType[reportType]}`}
            >
              {name}
            </Link>

            <div className="flex space-x-1 text-xs">
              <span className="text-text-neutral-primary">{startDate.date}</span>
              <span className="text-text-neutral-tertiary">-</span>
              <span className="text-text-neutral-primary">{endDate.date}</span>
            </div>
          </div>
        </div>
      </td>
      <td className="hidden px-16px text-left font-medium lg:table-cell">
        <span className="text-sm text-text-neutral-primary">
          {t(
            `common:PLUGIN.${FinancialReportTypeName[report.reportType].toUpperCase().replace(/ /g, '_')}`
          )}
        </span>
      </td>
      {/* Info: (20240528 - Shirley) period */}
      <td className="hidden min-w-220px px-16px text-left font-medium lg:table-cell">
        <div className="space-x-2 text-xs">
          <span className="text-text-neutral-tertiary">
            {t('report_401:REPORTS_HISTORY_ITEM.FROM')}
          </span>
          <span className="text-text-neutral-primary">{startDate.date}</span>
          <span className="text-text-neutral-tertiary">
            {t('report_401:REPORTS_HISTORY_ITEM.TO')}
          </span>
          <span className="text-text-neutral-primary">{endDate.date}</span>
        </div>
      </td>
      {/* Info: (20240514 - Shirley) Blockchain explorer link */}
      <td className="hidden px-16px text-left font-medium text-button-text-secondary-hover lg:table-cell">
        {blockChainExplorerLink ? (
          <Link href={blockChainExplorerLink} target="_blank">
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
          </Link>
        ) : null}
      </td>
      {/* Info: (20240528 - Shirley) project */}
      <td className="hidden px-16px text-left lg:table-cell">{displayedProject}</td>
      {/* Info: (20240516 - Shirley) operation buttons */}
      <td className="hidden min-w-100px px-16px lg:table-cell">
        <div className="flex items-center justify-between">
          {/* Info: (20240808 - Anna) Alpha版先隱藏(下載按鈕) */}
          {/* Info: (20240516 - Shirley) download button */}
          {/* <Button variant={'tertiaryBorderless'} className="my-auto mr-5 px-0 py-0">
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
          </Button> */}
          {/* Info: (20240808 - Anna) Alpha版先隱藏(分享按鈕) */}
          {/* Info: (20240516 - Shirley) share button */}
          {/* <Button variant={'tertiaryBorderless'} className="mr-2 px-0 py-0">
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
          </Button> */}
        </div>
      </td>
    </tr>
  );
};

export default ReportsHistoryItem;
