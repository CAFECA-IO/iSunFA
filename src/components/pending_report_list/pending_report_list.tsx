import React, { useEffect, useState } from 'react';
import PendingReportItem from '@/components/pending_report_item/pending_report_item';
import { Button } from '@/components/button/button';
import { useModalContext } from '@/contexts/modal_context';
import { MessageType } from '@/interfaces/message_modal';
import { useTranslation } from 'next-i18next';
import { IReport } from '@/interfaces/report';

interface IReportListProps {
  reports: IReport[];
}
const PendingReportList = ({ reports }: IReportListProps) => {
  const { t } = useTranslation(['common', 'reports']);
  const { messageModalVisibilityHandler, messageModalDataHandler } = useModalContext();
  // Info: (20240514 - Shirley) 使用 reportItems(useState) 取代 reports 作為渲染畫面的資料，才能在 child component 更改狀態的時候及時更新畫面，也能實現 optimistic updates 的功能；如果之後串上 API，每次更改狀態會重新拿資料，也許可以再改回來
  const [reportItems, setReportItems] = useState<IReport[]>(reports);

  const [isCheckboxVisible, setIsCheckboxVisible] = useState(false);

  // Info: (20240515 - Shirley) 如果選取的項目都已暫停，則顯示 resume 按鈕；如果選取的項目並非全部都已暫停，則顯示 pause 按鈕
  const [isSelectedItemPaused, setIsSelectedItemPaused] = useState(false);

  const [allChecked, setAllChecked] = useState(false);
  const [individualChecks, setIndividualChecks] = useState<boolean[]>(
    new Array(reportItems.length).fill(false)
  );

  const clearAllChecks = () => {
    setAllChecked(false);
    setIndividualChecks(new Array(reportItems.length).fill(false));
  };

  // Info: (20240830 - Anna) 為了拿掉next-line function-paren-newline註解所以改寫，再加上prettier-ignore，請Prettier不要格式化
  const handleReportItemUpdate = (updatedReportItem: IReport) => {
    // prettier-ignore
    setReportItems((prevReportItems) => {
      return prevReportItems.map((item) =>
        (item.id === updatedReportItem.id ? updatedReportItem : item));
    });
  };

  const handleReportItemDelete = (reportId: number) => {
    setReportItems((prevReports) => prevReports.filter((report) => report.id !== reportId));
  };

  const deleteSelectedReports = () => {
    setReportItems((prevReports) => prevReports.filter((_, index) => !individualChecks[index]));
    setIndividualChecks(Array(reportItems.length).fill(false));
    setAllChecked(false);
  };

  const toggleCheckboxVisibility = () => {
    setIsCheckboxVisible(!isCheckboxVisible);
    clearAllChecks();
  };

  const toggleAllPaused = () => {
    setIsSelectedItemPaused(!isSelectedItemPaused);
  };

  const deleteClickHandler = () => {
    if (!individualChecks.some(Boolean)) {
      return;
    }

    messageModalDataHandler({
      title: '',
      subtitle: t('reports:MY_REPORTS_SECTION.DELETE_PROCESS'),
      content: t('reports:MY_REPORTS_SECTION.APPLY_AGAIN'),
      submitBtnStr: t('reports:PENDING_REPORT_ITEM.YES_DELETE_IT'),
      submitBtnFunction: deleteSelectedReports,
      messageType: MessageType.WARNING,
      backBtnStr: t('common:COMMON.CANCEL'),
    });
    messageModalVisibilityHandler();
  };

  const pauseClickHandler = () => {
    if (!individualChecks.some(Boolean)) {
      return;
    }
    toggleAllPaused();
    // TODO: (20240514 - Shirley) [Beta] LOCK and send paused request
    // Info: (20240515 - Shirley) 將所有選中的報告項目暫停
    const updatedReports = reportItems.map((report) => {
      if (
        individualChecks.some((checked, index) => {
          return checked && report.id === reportItems[index].id;
        })
      ) {
        return { ...report, paused: true };
      }
      return report;
    });

    setReportItems(updatedReports);
    clearAllChecks();
  };

  const resumeClickHandler = () => {
    toggleAllPaused();
    // TODO: (20240514 - Shirley) [Beta] LOCK and send resumed request
    const updatedReports = reportItems.map((report) => {
      if (
        individualChecks.some((checked, index) => {
          return checked && report.id === reportItems[index].id;
        })
      ) {
        return { ...report, paused: false };
      }
      return report;
    });

    setReportItems(updatedReports);
    clearAllChecks();
  };

  const allCheckboxClickHandler = () => {
    setAllChecked(!allChecked);
    setIndividualChecks(new Array(reportItems.length).fill(!allChecked));
  };

  const individualCheckHandler = (index: number) => {
    const updatedChecks = [...individualChecks];
    updatedChecks[index] = !updatedChecks[index];
    setIndividualChecks(updatedChecks);
  };

  useEffect(() => {
    if (individualChecks.every(Boolean)) {
      setAllChecked(true);
    } else if (allChecked) {
      setAllChecked(false);
    }

    // Info: (20240515 - Shirley) 檢查選中的報告項目是否都已暫停
    const selectedReports = reportItems.filter((_, index) => individualChecks[index]);
    const allSelectedPaused =
      selectedReports.length > 0 ? selectedReports.every((report) => report.paused) : false;
    setIsSelectedItemPaused(allSelectedPaused);
  }, [individualChecks, reportItems]);

  const displayedPauseOrResumeButton = !isSelectedItemPaused ? (
    <Button onClick={pauseClickHandler} variant={'secondaryOutline'} className="p-2">
      {/* Info: (20240513 - Shirley) Pause */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          className="fill-current"
          fillRule="evenodd"
          d="M8.002 2.084a5.917 5.917 0 100 11.833 5.917 5.917 0 000-11.833zM.586 8.001a7.417 7.417 0 1114.833 0A7.417 7.417 0 01.586 8zm5.75-2.75a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm3.333 0a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z"
          clipRule="evenodd"
        ></path>
      </svg>
    </Button>
  ) : (
    <Button onClick={resumeClickHandler} variant={'secondaryOutline'} className="p-2">
      {/* Info: (20240514 - Shirley) Resume */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="none"
        viewBox="0 0 16 16"
      >
        <path
          className="fill-current"
          fillRule="evenodd"
          d="M5.384 1.799l.026.017 7.01 4.674.024.016c.202.134.393.262.541.381.155.125.347.305.457.572.144.347.144.737 0 1.085-.11.267-.302.446-.457.571-.147.12-.339.247-.54.382l-.025.016-7.01 4.673-.026.018c-.247.164-.474.315-.667.42-.193.105-.471.232-.8.212a1.417 1.417 0 01-1.045-.56c-.198-.261-.246-.563-.267-.782-.02-.219-.02-.491-.02-.788V3.328v-.032c0-.296 0-.569.02-.787.02-.22.069-.521.267-.783.25-.33.632-.535 1.046-.56.328-.02.606.108.8.212.192.105.419.256.666.42zm-1.292.95c-.006.134-.007.315-.007.579v9.347c0 .264 0 .445.007.579.115-.07.266-.17.486-.316l7.01-4.673c.18-.12.3-.2.386-.264a11.602 11.602 0 00-.386-.263l-7.01-4.674a13.77 13.77 0 00-.486-.315z"
          clipRule="evenodd"
        ></path>
      </svg>
    </Button>
  );

  const displayedStatusButtons = (
    <div className="flex w-full items-center justify-end space-x-5">
      {isCheckboxVisible ? (
        <div className="flex space-x-5">
          {displayedPauseOrResumeButton}
          <Button onClick={deleteClickHandler} variant={'secondaryOutline'} className="p-2">
            {/* Info: (20240514 - Shirley) Delete */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                className="fill-current"
                fillRule="evenodd"
                d="M7.44.584H8.565c.349 0 .655 0 .908.02.269.023.543.072.81.207.391.2.71.518.91.91.135.266.184.54.206.81.017.206.02.448.02.72h2.584a.75.75 0 010 1.5h-.583v6.746c0 .535 0 .98-.03 1.345-.03.38-.098.736-.27 1.074a2.75 2.75 0 01-1.202 1.202c-.337.171-.694.239-1.073.27-.365.03-.81.03-1.345.03H6.506c-.535 0-.98 0-1.345-.03-.38-.031-.737-.099-1.074-.27a2.75 2.75 0 01-1.202-1.202l.65-.331-.65.33c-.172-.336-.239-.693-.27-1.073-.03-.364-.03-.81-.03-1.344V4.75h-.583a.75.75 0 110-1.5h2.584c0-.272.003-.514.02-.72.022-.27.071-.544.207-.81.2-.392.518-.71.91-.91.266-.135.54-.184.81-.206.252-.021.558-.021.908-.021zM5.337 4.751h-1.25v6.716c0 .573 0 .957.024 1.253.024.287.066.424.112.515.12.235.31.426.546.546l-.34.668.34-.668c.09.046.228.088.515.112.296.024.68.024 1.253.024h2.933c.572 0 .957 0 1.252-.024.287-.024.425-.066.515-.112a1.25 1.25 0 00.547-.546c.046-.09.088-.228.111-.515.024-.296.025-.68.025-1.253V4.751H5.336zm4.583-1.5H6.086c0-.265.003-.45.015-.598.015-.176.038-.231.048-.25a.583.583 0 01.255-.255c.02-.01.074-.034.25-.048.185-.015.43-.016.815-.016h1.067c.385 0 .63 0 .814.016.176.014.231.038.25.048.11.055.2.145.255.254.01.02.034.075.048.25.012.148.015.334.016.599zm-3.25 3.666a.75.75 0 01.75.75v3.334a.75.75 0 01-1.5 0V7.667a.75.75 0 01.75-.75zm2.667 0a.75.75 0 01.75.75v3.334a.75.75 0 11-1.5 0V7.667a.75.75 0 01.75-.75z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
      ) : null}
      {/* Info: (20240514 - Shirley) Select or Cancel */}
      <Button
        size={'extraSmall'}
        onClick={toggleCheckboxVisibility}
        variant={'secondaryBorderless'}
      >
        {isCheckboxVisible ? (
          <p>{t('reports:PENDING_REPORT_LIST.CANCEL')}</p>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                className="fill-current"
                fillRule="evenodd"
                d="M5.172 1.252h5.497a.75.75 0 010 1.5H5.202c-.572 0-.956 0-1.252.025-.287.023-.425.065-.515.111a1.25 1.25 0 00-.547.546c-.046.091-.088.228-.111.515-.024.296-.025.68-.025 1.253v5.6c0 .572 0 .957.025 1.253.023.287.065.424.111.514.12.236.312.427.547.547.09.046.228.088.515.111.296.024.68.025 1.252.025h5.6c.573 0 .957 0 1.253-.025.287-.023.424-.065.515-.111a1.25 1.25 0 00.546-.547c.046-.09.088-.227.111-.514.025-.296.025-.68.025-1.253v-2.8a.75.75 0 011.5 0V10.832c0 .535 0 .98-.03 1.345-.03.38-.098.736-.27 1.073a2.75 2.75 0 01-1.201 1.202c-.338.172-.694.24-1.074.27-.364.03-.81.03-1.344.03H5.172c-.534 0-.98 0-1.344-.03-.38-.03-.737-.098-1.074-.27a2.75 2.75 0 01-1.202-1.202c-.172-.337-.239-.694-.27-1.073-.03-.365-.03-.81-.03-1.345v-5.66c0-.535 0-.98.03-1.345.031-.38.098-.736.27-1.074a2.75 2.75 0 011.202-1.201c.337-.172.694-.24 1.074-.27.364-.03.81-.03 1.344-.03zm10.027.886a.75.75 0 010 1.061L8.533 9.866a.75.75 0 01-1.061 0l-2-2a.75.75 0 111.06-1.061l1.47 1.47 6.136-6.137a.75.75 0 011.061 0z"
                clipRule="evenodd"
              ></path>
            </svg>
            <p>{t('common:COMMON.SELECT')}</p>
          </>
        )}
      </Button>
    </div>
  );

  const displayedList = reportItems.map((reportItem, index) => (
    <PendingReportItem
      key={reportItem.id}
      report={reportItem}
      checked={individualChecks[index]}
      isCheckboxVisible={isCheckboxVisible}
      onCheckChange={() => individualCheckHandler(index)}
      onReportItemUpdate={handleReportItemUpdate}
      onReportItemDelete={handleReportItemDelete}
    />
  ));

  const displayedCheckbox = isCheckboxVisible ? (
    <th className="flex h-10 justify-center pt-10px">
      <input
        checked={allChecked}
        onChange={allCheckboxClickHandler}
        type="checkbox"
        className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected bg-checkbox-surface-unselected checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
      />
    </th>
  ) : null;

  return (
    <div className="">
      {displayedStatusButtons}
      <table className="my-20px w-full shrink-0 border border-stroke-neutral-quaternary font-barlow">
        {/* Info: (20240514 - Shirley) Header */}
        <thead>
          <tr className="h-10 border border-stroke-neutral-quaternary bg-surface-neutral-main-background text-left text-sm text-text-neutral-tertiary">
            {/* Info: (20240514 - Shirley) checkboxes */}
            {displayedCheckbox}
            <th className="text-center">{t('reports:PENDING_REPORT_LIST.DATE')}</th>
            <th className="px-16px">{t('reports:PENDING_REPORT_LIST.REPORT_NAME')}</th>
            <th className="hidden px-16px lg:table-cell">{t('common:COMMON.TYPE')}</th>
            <th className="hidden px-16px lg:table-cell">
              {t('reports:PENDING_REPORT_LIST.PERIOD')}
            </th>
            <th className="hidden px-16px lg:table-cell">
              {t('reports:PENDING_REPORT_LIST.REMAINING_TIME')}
            </th>
            <th className="hidden px-16px lg:table-cell">
              {t('reports:PENDING_REPORT_LIST.OPERATIONS')}
            </th>
          </tr>
        </thead>

        {/* Info: (20240514 - Shirley) Body */}
        <tbody>{displayedList}</tbody>
      </table>
    </div>
  );
};

export default PendingReportList;
