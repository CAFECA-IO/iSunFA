import React from 'react';
import { numberWithCommas } from '@/lib/utils/common';
import { FiCalendar, FiDownload } from 'react-icons/fi';
import { LuArrowUpDown } from 'react-icons/lu';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { IReceivedRecord } from '@/interfaces/pay_slip';

const cellStyle = 'table-cell border-b border-stroke-neutral-quaternary px-24px py-12px';

const ReceivedItem: React.FC<IReceivedRecord> = ({ payPeriod, fromEmail, netPay }) => {
  const periodStr = `${payPeriod.month} ${payPeriod.year}`;
  const amountStr = `NT $${numberWithCommas(netPay)}`;

  return (
    <div className="table-row">
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
          <FiCalendar size={16} className="text-text-neutral-tertiary" />
          <p>{fromEmail}</p>
        </div>
      </div>
      {/* Info: (20250723 - Julian) Net Pay */}
      <div className={cellStyle}>
        <div className="flex items-center gap-8px">
          <RiMoneyDollarCircleLine size={16} className="text-text-neutral-tertiary" />
          <p>{amountStr}</p>
        </div>
      </div>
      {/* Info: (20250723 - Julian) Action */}
      <div className={`${cellStyle} w-50px text-center`}>
        <button
          type="button"
          className="p-10px text-button-text-secondary hover:text-button-text-secondary-hover"
        >
          <FiDownload size={16} />
        </button>
      </div>
    </div>
  );
};

const ReceivedTab: React.FC<{
  receivedRecords: IReceivedRecord[];
}> = ({ receivedRecords }) => {
  return (
    <div className="table w-full text-sm font-medium text-text-neutral-secondary">
      {/* Info: (20250723 - Julian) Table Header */}
      <div className="table-header-group">
        <div className="table-row">
          <div className={cellStyle}>
            <button type="button" className="flex items-center gap-8px text-text-brand-primary-lv1">
              <p>Pay Period</p>
              <LuArrowUpDown size={16} />
            </button>
          </div>
          <div className={cellStyle}>From</div>
          <div className={cellStyle}>
            <button type="button" className="flex items-center gap-8px">
              <p>Net Pay</p>
              <LuArrowUpDown size={16} />
            </button>
          </div>
          <div className={`${cellStyle} w-50px text-center text-text-neutral-primary`}>Action</div>
        </div>
      </div>

      {/* Info: (20250723 - Julian) Table Body */}
      <div className="table-row-group">
        {receivedRecords.map((record) => (
          <ReceivedItem key={record.id} {...record} />
        ))}
      </div>
    </div>
  );
};

export default ReceivedTab;
