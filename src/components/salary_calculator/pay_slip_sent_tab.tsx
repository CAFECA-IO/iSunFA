import React from 'react';
import { PiUserFill } from 'react-icons/pi';
import { FiCalendar } from 'react-icons/fi';
import { LuSend } from 'react-icons/lu';
import { ISentRecord } from '@/interfaces/pay_slip';
import { timestampToString } from '@/lib/utils/common';
import { SortOrder } from '@/constants/sort';
import SortingButton from '@/components/salary_calculator/sorting_button';

const cellStyle =
  'table-cell border-b border-stroke-neutral-quaternary px-24px py-12px align-middle';

const SentItem: React.FC<ISentRecord> = ({ payPeriod, toEmail, issuedDate }) => {
  const payPeriodDate = timestampToString(payPeriod);
  const periodStr = `${payPeriodDate.monthShortName} ${payPeriodDate.year}`;

  return (
    <div className="table-row h-50px">
      {/* Info: (20250723 - Julian) Pay Period */}
      <div className={cellStyle}>
        <div className="flex items-center gap-8px">
          <FiCalendar size={16} className="text-text-neutral-tertiary" />
          <p>{periodStr}</p>
        </div>
      </div>
      {/* Info: (20250723 - Julian) From */}
      <div className={cellStyle}>
        <div className="flex items-center gap-8px">
          <PiUserFill size={16} className="text-text-neutral-tertiary" />
          <p>{toEmail}</p>
        </div>
      </div>
      {/* Info: (20250723 - Julian) Net Pay */}
      <div className={cellStyle}>
        <div className="flex items-center gap-8px">
          <LuSend size={16} className="text-text-neutral-tertiary" />
          <p>{timestampToString(issuedDate).date}</p>
        </div>
      </div>
    </div>
  );
};

const SentTab: React.FC<{
  sentRecords: ISentRecord[];
  payPeriodSortOrder: SortOrder | null;
  setPayPeriodSortOrder: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  issuedDateSortOrder: SortOrder | null;
  setIssuedDateSortOrder: React.Dispatch<React.SetStateAction<SortOrder | null>>;
}> = ({
  sentRecords,
  payPeriodSortOrder,
  setPayPeriodSortOrder,
  issuedDateSortOrder,
  setIssuedDateSortOrder,
}) => {
  return (
    <div className="table w-full text-sm font-medium text-text-neutral-secondary">
      {/* Info: (20250723 - Julian) Table Header */}
      <div className="table-header-group">
        <div className="table-row">
          <div className={cellStyle}>
            <SortingButton
              string="Pay Period"
              sortOrder={payPeriodSortOrder}
              setSortOrder={setPayPeriodSortOrder}
            />
          </div>
          <div className={cellStyle}>To</div>
          <div className={cellStyle}>
            <SortingButton
              string="Payslip Issued Date"
              sortOrder={issuedDateSortOrder}
              setSortOrder={setIssuedDateSortOrder}
            />
          </div>
        </div>
      </div>

      {/* Info: (20250723 - Julian) Table Body */}
      <div className="table-row-group">
        {sentRecords.map((record) => (
          <SentItem key={record.id} {...record} />
        ))}
      </div>
    </div>
  );
};

export default SentTab;
