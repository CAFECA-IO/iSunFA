import React, { useEffect, useState } from 'react';
import { IGeneratedReportItem } from '../../interfaces/report_item';
import ReportsHistoryItem from '../reports_history_item/reports_history_item';

interface IReportsHistoryListProps {
  reports: IGeneratedReportItem[];
  isCheckboxVisible: boolean;
}

const ReportsHistoryList = ({ reports, isCheckboxVisible }: IReportsHistoryListProps) => {
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
  );
};

export default ReportsHistoryList;
