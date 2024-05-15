import React, { useEffect, useState } from 'react';
import { IGeneratedReportItem } from '@/interfaces/report_item';
import ReportsHistoryItem from '@/components/reports_history_item/reports_history_item';
import { Button } from '../button/button';

interface IReportsHistoryListProps {
  reports: IGeneratedReportItem[];
}

const ReportsHistoryList = ({ reports }: IReportsHistoryListProps) => {
  // Info: 使用 reportItems(useState) 取代 reports 作為渲染畫面的資料，才能在 child component 更改狀態的時候及時更新畫面，也能實現 optimistic updates 的功能；如果之後串上 API，每次更改狀態會重新拿資料，也許可以再改回來 (20240514 - Shirley)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [reportItems, setReportItems] = useState<IGeneratedReportItem[]>(reports);

  const [isCheckboxVisible, setIsCheckboxVisible] = useState(false);

  const [allChecked, setAllChecked] = useState(false);
  const [individualChecks, setIndividualChecks] = useState<boolean[]>(
    new Array(reports.length).fill(false)
  );

  useEffect(() => {
    if (individualChecks.every(Boolean)) {
      setAllChecked(true);
    } else if (allChecked) {
      setAllChecked(false);
    }
  }, [individualChecks]);

  const clearAllChecks = () => {
    setAllChecked(false);
    setIndividualChecks(new Array(reportItems.length).fill(false));
  };

  const toggleCheckboxVisibility = () => {
    setIsCheckboxVisible(!isCheckboxVisible);
    clearAllChecks();
  };

  const allCheckboxClickHandler = () => {
    setAllChecked(!allChecked);
    setIndividualChecks(new Array(reports.length).fill(!allChecked));
  };

  const individualCheckHandler = (index: number) => {
    const updatedChecks = [...individualChecks];
    updatedChecks[index] = !updatedChecks[index];
    setIndividualChecks(updatedChecks);
  };

  const displayedList = reports.map((report, index) => (
    <ReportsHistoryItem
      key={report.id}
      report={report}
      checked={individualChecks[index]}
      onCheckChange={() => individualCheckHandler(index)}
      isCheckboxVisible={isCheckboxVisible}
    />
  ));

  const displayedStatusButtons = (
    <div className="flex w-full items-center justify-end space-x-5">
      {isCheckboxVisible ? (
        <div className="flex space-x-5">
          {' '}
          <Button variant={'secondaryOutline'} className="px-2 py-2">
            {' '}
            {/* Info: Print (20240514 - Shirley) */}
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
                d="M6.107.584h3.79c.35 0 .655 0 .909.02.268.023.543.072.809.207.392.2.71.518.91.91.136.266.185.54.207.81.02.253.02.559.02.908v.501l.091.007c.38.031.737.098 1.074.27A2.75 2.75 0 0115.12 5.42c.172.337.24.694.27 1.074.03.364.03.81.03 1.344V9.432c0 .524 0 .928-.094 1.28a2.75 2.75 0 01-1.944 1.945c-.191.051-.397.074-.629.085 0 .275-.003.52-.02.729-.022.268-.071.543-.207.809-.2.392-.518.71-.91.91a2.12 2.12 0 01-.81.207c-.252.02-.559.02-.908.02h-3.79c-.349 0-.655 0-.908-.02a2.12 2.12 0 01-.81-.207c-.391-.2-.71-.518-.91-.91a2.119 2.119 0 01-.206-.81 9.584 9.584 0 01-.02-.728 2.939 2.939 0 01-.63-.085A2.75 2.75 0 01.68 10.712c-.094-.352-.094-.756-.094-1.28V7.837c0-.534 0-.98.03-1.344.031-.38.098-.737.27-1.074a2.75 2.75 0 011.202-1.202c.337-.172.694-.239 1.074-.27l.091-.007V3.44c0-.35 0-.655.02-.908.023-.27.072-.544.207-.81.2-.392.519-.71.91-.91.267-.135.541-.184.81-.206.253-.021.56-.021.908-.021zM4.752 3.917h6.5v-.45c0-.385 0-.63-.016-.814-.014-.176-.038-.231-.047-.25a.583.583 0 00-.255-.255l.34-.669-.34.669c-.02-.01-.074-.034-.25-.048a11.28 11.28 0 00-.815-.016H6.136c-.386 0-.63 0-.815.016-.176.014-.231.038-.25.048a.583.583 0 00-.255.254c-.01.02-.034.075-.048.25-.015.185-.016.43-.016.815v.45zm0 8.084v.533c0 .386 0 .63.016.815.014.176.038.23.048.25.056.11.145.199.255.255.019.01.074.033.25.048.185.015.429.015.815.015h3.733c.386 0 .63 0 .815-.015.176-.015.23-.038.25-.048a.583.583 0 00.255-.255c.01-.02.033-.074.047-.25.016-.185.016-.43.016-.815V11.467c0-.385 0-.63-.016-.814-.014-.176-.038-.231-.047-.25a.583.583 0 00-.255-.255c-.02-.01-.074-.034-.25-.048a11.27 11.27 0 00-.815-.016H6.136c-.386 0-.63 0-.815.016-.176.014-.231.038-.25.048a.583.583 0 00-.255.255c-.01.019-.034.074-.048.25a11.28 11.28 0 00-.016.814v.534zm8-.76c0-.268-.004-.507-.02-.71a2.118 2.118 0 00-.207-.81c-.2-.392-.518-.71-.91-.91a2.119 2.119 0 00-.81-.206c-.252-.021-.559-.021-.908-.021h-3.79c-.349 0-.655 0-.908.02-.269.023-.543.072-.81.207-.391.2-.71.518-.91.91-.135.266-.184.54-.206.81-.017.203-.02.442-.02.71a1.161 1.161 0 01-.241-.033 1.25 1.25 0 01-.884-.884c-.036-.135-.042-.322-.042-.99V7.867c0-.572 0-.956.024-1.252.024-.287.066-.425.112-.515a1.25 1.25 0 01.546-.546c.09-.047.228-.088.515-.112.296-.024.68-.025 1.253-.025h6.933c.572 0 .957 0 1.252.025.287.024.425.065.515.112.236.12.427.31.547.546.046.09.088.228.111.515.024.296.025.68.025 1.252v1.467c0 .668-.007.855-.043.99a1.25 1.25 0 01-.884.884 1.161 1.161 0 01-.24.032zM9.252 7a.75.75 0 01.75-.75h2a.75.75 0 010 1.5h-2a.75.75 0 01-.75-.75z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
          <Button variant={'secondaryOutline'} className="px-2 py-2">
            {' '}
            {/* Info: Share (20240514 - Shirley) */}
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
                d="M8.002 1.252a.75.75 0 01.75.75v6.19l2.053-2.054a.75.75 0 011.06 1.061l-3.332 3.333a.75.75 0 01-1.061 0L4.139 7.2a.75.75 0 011.06-1.06L7.252 8.19v-6.19a.75.75 0 01.75-.749zm-6 8a.75.75 0 01.75.75v.8c0 .572 0 .957.025 1.253.023.287.065.424.111.514.12.236.312.427.547.547.09.046.228.088.515.111.296.024.68.025 1.252.025h5.6c.573 0 .957 0 1.253-.025.287-.023.424-.065.515-.111a1.25 1.25 0 00.546-.547c.046-.09.088-.227.111-.514.025-.296.025-.68.025-1.253v-.8a.75.75 0 111.5 0V10.832c0 .535 0 .98-.03 1.345-.03.38-.098.736-.27 1.073a2.75 2.75 0 01-1.201 1.202c-.338.172-.694.24-1.074.27-.364.03-.81.03-1.344.03H5.172c-.534 0-.98 0-1.344-.03-.38-.03-.737-.098-1.074-.27a2.75 2.75 0 01-1.202-1.202c-.172-.337-.239-.694-.27-1.073-.03-.365-.03-.81-.03-1.345V10.002a.75.75 0 01.75-.75z"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
        </div>
      ) : null}
      {/* Info: Select or Cancel (20240514 - Shirley) */}
      <Button
        size={'extraSmall'}
        onClick={toggleCheckboxVisibility}
        variant={'secondaryBorderless'}
      >
        {isCheckboxVisible ? (
          <p>Cancel</p>
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
            <p>Select</p>
          </>
        )}
      </Button>
    </div>
  );

  const displayedCheckbox = isCheckboxVisible ? (
    <th className="flex h-10 justify-center pt-10px">
      <input
        checked={allChecked}
        onChange={allCheckboxClickHandler}
        type="checkbox"
        className="my-auto h-4 w-4 shrink-0 appearance-none rounded-xxs border border-solid border-checkbox-surface-selected bg-white checked:border-checkbox-surface-selected checked:bg-checkbox-surface-selected checked:text-surface-neutral-main-background hover:cursor-pointer"
      />
    </th>
  ) : null;

  return (
    <div className="lg:mr-10">
      {displayedStatusButtons}
      <table className="my-20px w-full shrink-0 border border-lightGray6 font-barlow">
        {/* Info: (20240514 - Shirley) Header */}
        <thead>
          <tr className="h-10 border border-lightGray6 bg-surface-neutral-main-background text-left text-sm text-lightGray4">
            {/* Info: (20240514 - Shirley) checkboxes */}
            {displayedCheckbox}
            <th className="text-center">Date</th>
            <th className="px-16px">Report Name</th>
            <th className="px-16px">Period</th>
            <th className="px-16px">Blockchain</th>
            <th className="px-16px">Project</th>
            <th className="px-16px">Operations</th>
          </tr>
        </thead>

        {/* Info: (20240514 - Shirley) Body */}
        <tbody>{displayedList}</tbody>
      </table>
    </div>
  );
};

export default ReportsHistoryList;
