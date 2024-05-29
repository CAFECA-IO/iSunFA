import React, { useEffect, useState } from 'react';
import { IPendingReportItem } from '@/interfaces/report_item';
import CalendarIcon from '@/components/calendar_icon/calendar_icon';
import { countdown, timestampToString, truncateString } from '@/lib/utils/common';
import { Button } from '@/components/button/button';
import { useGlobalCtx } from '@/contexts/global_context';
import { MessageType } from '@/interfaces/message_modal';
import { LoadingSVG } from '@/components/loading_svg/loading_svg';
import { MILLISECONDS_IN_A_SECOND } from '@/constants/display';

interface IPendingReportItemProps {
  report: IPendingReportItem;
  checked: boolean;
  isCheckboxVisible: boolean;
  onCheckChange?: () => void;
  onReportItemUpdate?: (report: IPendingReportItem) => void;
  onReportItemDelete?: (id: string) => void;
}

const PendingReportItem = ({
  report,
  checked,
  isCheckboxVisible,
  onCheckChange = () => {},
  onReportItemUpdate = () => {},
  onReportItemDelete = () => {},
}: IPendingReportItemProps) => {
  const { messageModalVisibilityHandler, messageModalDataHandler } = useGlobalCtx();

  const [reportItem, setReportItem] = useState(report);
  const { id, createdTimestamp, name, period, remainingSeconds, paused } = reportItem;

  const [isPaused, setIsPaused] = useState(paused);
  const [remainingTime, setRemainingTime] = useState(remainingSeconds);

  const startDate = timestampToString(period.startTimestamp);
  const endDate = timestampToString(period.endTimestamp);
  const remainingData = countdown(remainingTime);

  const togglePausedStatus = () => {
    setIsPaused(!isPaused);
    const updatedReport = { ...reportItem, paused: !isPaused };
    onReportItemUpdate(updatedReport);
  };

  const pauseItem = () => {
    togglePausedStatus();
    // TODO: send paused request (20240514 - Shirley)
  };

  const resumeItem = () => {
    togglePausedStatus();
    // TODO: send resumed request (20240514 - Shirley)
  };

  const pauseClickHandler = () => {
    pauseItem();
  };

  const resumeClickHandler = () => {
    resumeItem();
  };

  const deleteItem = () => {
    // Info: 調用 onReportItemDelete 並傳入要刪除的報告 ID (20240515 - Shirley)
    onReportItemDelete(report.id);
  };

  const deleteClickHandler = () => {
    // TODO: show notification modal (20240514 - Shirley)
    messageModalDataHandler({
      title: '',
      subtitle: 'Are you sure\n you want to delete the process?',
      content: `It will take 30 - 40 minutes\n 
      if you want to apply it again.`,
      submitBtnStr: 'Yes, Delete it',
      submitBtnFunction: deleteItem,
      messageType: MessageType.WARNING,
      backBtnStr: 'Cancel', // TODO: i18n (20240528 - Shirley)
    });
    messageModalVisibilityHandler();
  };

  useEffect(() => {
    setReportItem(report);
    setIsPaused(report.paused);
  }, [report]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isPaused) {
      timer = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime > 0) {
            return prevTime - 1;
          }
          clearInterval(timer);
          return 0;
        });
      }, MILLISECONDS_IN_A_SECOND);
    }

    return () => {
      clearInterval(timer);
    };
  }, [isPaused]);

  const displayedPauseOrResumeButton = !isPaused ? (
    <Button
      onClick={pauseClickHandler}
      variant={'tertiaryBorderless'}
      className="my-auto mr-5 px-0 py-0"
    >
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
          d="M12.003 2.752a9.25 9.25 0 100 18.5 9.25 9.25 0 000-18.5zm-10.75 9.25c0-5.937 4.813-10.75 10.75-10.75s10.75 4.813 10.75 10.75-4.813 10.75-10.75 10.75-10.75-4.813-10.75-10.75zm8.25-3.75a.75.75 0 01.75.75v6a.75.75 0 11-1.5 0v-6a.75.75 0 01.75-.75zm5 0a.75.75 0 01.75.75v6a.75.75 0 01-1.5 0v-6a.75.75 0 01.75-.75z"
          clipRule="evenodd"
        ></path>
      </svg>
    </Button>
  ) : (
    <Button
      onClick={resumeClickHandler}
      variant={'tertiaryBorderless'}
      className="my-auto mr-5 px-0 py-0"
    >
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
          d="M7.878 3.017l.028.02 10.516 7.01.027.017c.31.208.585.39.793.559.216.173.445.395.575.709.178.429.178.911 0 1.34-.13.314-.359.535-.575.71-.208.167-.482.35-.793.557l-.027.018-10.516 7.01-.028.02c-.38.253-.707.47-.981.62-.275.148-.614.296-.998.273a1.75 1.75 0 01-1.292-.69c-.232-.308-.297-.672-.326-.983-.028-.311-.028-.704-.028-1.16V4.992v-.035c0-.456 0-.85.028-1.16.029-.311.094-.676.326-.982A1.75 1.75 0 015.9 2.123c.384-.022.723.125.998.274.274.149.601.367.98.62zm-1.905.605a.25.25 0 00-.16.086c-.006.017-.024.08-.038.226-.021.234-.022.557-.022 1.057v14.021c0 .5 0 .824.022 1.058.014.146.032.209.038.226a.25.25 0 00.16.085c.018-.004.08-.023.21-.093.206-.112.475-.29.891-.569l10.516-7.01c.346-.23.562-.376.71-.495a.861.861 0 00.135-.125.25.25 0 000-.174.85.85 0 00-.134-.125c-.149-.12-.365-.265-.711-.495L7.074 4.285a13.325 13.325 0 00-.892-.569c-.13-.07-.191-.09-.209-.094z"
          clipRule="evenodd"
        ></path>
      </svg>
    </Button>
  );

  const displayedSpinner = !isPaused ? <LoadingSVG /> : null;

  const displayedOperationsColumn =
    remainingTime > 0 ? (
      <div className="flex w-full justify-start space-x-2 md:space-x-10 lg:space-x-2">
        {/* Info: Pause / Resume (20240514 - Shirley) */}
        {displayedPauseOrResumeButton}
        {/* Info: Delete (20240514 - Shirley) */}
        <Button
          onClick={deleteClickHandler}
          variant={'tertiaryBorderless'}
          className="mr-2 px-0 py-0"
        >
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
              d="M11.172 1.252h1.661c.534 0 .98 0 1.345.03.38.03.736.098 1.073.27a2.75 2.75 0 011.202 1.201c.172.338.24.694.27 1.074.03.365.03.81.03 1.345v.08h4.25a.75.75 0 010 1.5h-1.25v10.482c0 .813 0 1.468-.043 2-.045.546-.14 1.026-.366 1.47a3.75 3.75 0 01-1.639 1.64c-.444.226-.924.32-1.47.365-.531.043-1.187.043-2 .043H9.771c-.813 0-1.469 0-2-.043-.546-.045-1.026-.14-1.47-.366a3.75 3.75 0 01-1.64-1.639c-.226-.444-.32-.924-.365-1.47-.043-.532-.043-1.187-.043-2V6.752h-1.25a.75.75 0 110-1.5h4.25v-.08c0-.535 0-.98.03-1.345.03-.38.098-.736.27-1.074a2.75 2.75 0 011.201-1.201c.338-.172.694-.24 1.074-.27.365-.03.81-.03 1.345-.03zm-3.17 5.5h-2.25v10.45c0 .852.002 1.447.04 1.91.036.453.106.714.206.911.216.424.56.768.983.984.198.1.459.17.913.207.462.037 1.056.038 1.909.038h4.4c.852 0 1.447 0 1.91-.038.453-.037.714-.107.911-.207a2.25 2.25 0 00.984-.984c.1-.197.17-.458.207-.912.037-.462.038-1.057.038-1.909V6.752H8.003zm7.25-1.5h-6.5v-.05c0-.572.002-.957.026-1.253.023-.287.065-.424.111-.515a1.25 1.25 0 01.546-.546c.091-.046.228-.088.515-.111.296-.024.68-.025 1.253-.025h1.6c.572 0 .957 0 1.252.025.288.023.425.065.515.111.236.12.427.311.547.546.046.091.088.228.111.515.024.296.025.68.025 1.253v.05zm-5.25 5.5a.75.75 0 01.75.75v5a.75.75 0 01-1.5 0v-5a.75.75 0 01.75-.75zm4 0a.75.75 0 01.75.75v5a.75.75 0 01-1.5 0v-5a.75.75 0 01.75-.75z"
              clipRule="evenodd"
            ></path>
          </svg>
        </Button>
        {/* Info: Loading (20240514 - Shirley) */}
        <div className="">{displayedSpinner}</div>
      </div>
    ) : null;

  const displayedEstimatedTime =
    +remainingData.days > 0 ? (
      <>
        <span className="text-text-neutral-primary">{remainingData.days}</span>
        <span className="text-text-neutral-tertiary">D</span>
        <span className="text-text-neutral-primary">{remainingData.hours}</span>
        <span className="text-text-neutral-tertiary">H</span>
      </>
    ) : +remainingData.hours > 0 ? (
      <>
        <span className="text-text-neutral-primary">{remainingData.hours}</span>
        <span className="text-text-neutral-tertiary">H</span>
        <span className="text-text-neutral-primary">{remainingData.minutes}</span>
        <span className="text-text-neutral-tertiary">M</span>
      </>
    ) : (
      <>
        <span className="text-text-neutral-primary">{remainingData.minutes}</span>
        <span className="text-text-neutral-tertiary">M</span>
        <span className="text-text-neutral-primary">{remainingData.seconds}</span>
        <span className="text-text-neutral-tertiary">S</span>
      </>
    );

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
        {/* Info: desktop (20240528 - Shirley) */}
        <p className="hidden lg:flex">{name}</p>

        {/* Info: mobile (20240528 - Shirley) */}
        <div className="flex flex-col space-y-5 lg:hidden">
          <p className="text-ellipsis sm:hidden">{truncateString(name, 16)}</p>
          <p className="hidden text-ellipsis sm:flex">{name}</p>

          <div className="flex items-center justify-start">{displayedOperationsColumn}</div>
        </div>
      </td>
      <td className="hidden px-16px text-left font-medium text-navyBlue2 lg:table-cell">
        <div className="space-x-2 text-xs">
          <span className="text-text-neutral-tertiary">From</span>
          <span className="text-text-neutral-primary">{startDate.date}</span>
          <span className="text-text-neutral-tertiary">to</span>
          <span className="text-text-neutral-primary">{endDate.date}</span>
        </div>
      </td>
      {/* Info: (20240514 - Shirley) Remaining time */}
      <td className="hidden px-16px text-left font-medium text-navyBlue2 lg:table-cell">
        <div className="space-x-2 text-xs">
          <span className="text-text-neutral-tertiary">Estimated</span>
          {displayedEstimatedTime}
        </div>
      </td>
      {/* Info: Operations (20240514 - Shirley) */}
      <td className="hidden px-16px lg:table-cell">
        <div className="flex items-center">{displayedOperationsColumn}</div>
      </td>
    </tr>
  );
};

export default PendingReportItem;
