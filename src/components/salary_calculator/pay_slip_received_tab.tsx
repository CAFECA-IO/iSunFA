import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FiCalendar, FiDownload } from 'react-icons/fi';
import { RiMoneyDollarCircleLine } from 'react-icons/ri';
import { IReceivedRecord } from '@/interfaces/pay_slip';
import { numberWithCommas, timestampToString } from '@/lib/utils/common';
import { SortOrder } from '@/constants/sort';
import SortingButton from '@/components/salary_calculator/sorting_button';
import ViewPaySlipModal from '@/components/salary_calculator/view_pay_slip_modal';

const cellStyle =
  'table-cell border-b border-stroke-neutral-quaternary px-24px py-12px align-middle';

const ReceivedItem: React.FC<{
  record: IReceivedRecord;
  itemClickHandler: (recordId: string) => void;
}> = ({ record, itemClickHandler }) => {
  const { id, payPeriod, fromEmail, netPay } = record;
  const payPeriodDate = timestampToString(payPeriod);
  const periodStr = `${payPeriodDate.monthShortName} ${payPeriodDate.year}`;
  const amountStr = `NT $${numberWithCommas(netPay)}`;

  const clickHandler = () => itemClickHandler(id);

  return (
    <div
      onClick={clickHandler}
      className="table-row h-50px hover:cursor-pointer hover:bg-surface-brand-primary-30"
    >
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
          className="text-button-text-secondary hover:text-button-text-secondary-hover"
        >
          <FiDownload size={16} />
        </button>
      </div>
    </div>
  );
};

const ReceivedTab: React.FC<{
  receivedRecords: IReceivedRecord[];
  payPeriodSortOrder: SortOrder | null;
  setPayPeriodSortOrder: React.Dispatch<React.SetStateAction<SortOrder | null>>;
  netPaySortOrder: SortOrder | null;
  setNetPaySortOrder: React.Dispatch<React.SetStateAction<SortOrder | null>>;
}> = ({
  receivedRecords,
  payPeriodSortOrder,
  setPayPeriodSortOrder,
  netPaySortOrder,
  setNetPaySortOrder,
}) => {
  const { t } = useTranslation('calculator');

  const [isShowModal, setIsShowModal] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<IReceivedRecord | null>(null);

  const currentMonth = currentRecord
    ? timestampToString(currentRecord.payPeriod).monthFullName
    : '-';
  const currentYear = currentRecord ? timestampToString(currentRecord.payPeriod).year : '-';

  const itemClickHandler = (recordId: string) => {
    // Info: (20250725 - Julian) 找到目標 record 並顯示 Modal
    const record = receivedRecords.find((item) => item.id === recordId);
    if (record) {
      setCurrentRecord(record);
      setIsShowModal(true);
    }
  };

  const closeModal = () => {
    // Info: (20250725 - Julian) 關閉 Modal 並重置 currentRecord
    setIsShowModal(false);
    setCurrentRecord(null);
  };

  return (
    <>
      <div className="table w-full text-sm font-medium text-text-neutral-secondary">
        {/* Info: (20250723 - Julian) Table Header */}
        <div className="table-header-group">
          <div className="table-row">
            <div className={cellStyle}>
              <SortingButton
                string={t('calculator:MY_PAY_SLIP.PAY_PERIOD')}
                sortOrder={payPeriodSortOrder}
                setSortOrder={setPayPeriodSortOrder}
              />
            </div>
            <div className={cellStyle}>{t('calculator:MY_PAY_SLIP.FROM')}</div>
            <div className={cellStyle}>
              <SortingButton
                string={t('calculator:MY_PAY_SLIP.NET_PAY')}
                sortOrder={netPaySortOrder}
                setSortOrder={setNetPaySortOrder}
                className="text-text-neutral-secondary"
              />
            </div>
            <div className={`${cellStyle} w-50px text-center text-text-neutral-primary`}>
              Action
            </div>
          </div>
        </div>

        {/* Info: (20250723 - Julian) Table Body */}
        <div className="table-row-group">
          {receivedRecords.map((record) => (
            <ReceivedItem key={record.id} record={record} itemClickHandler={itemClickHandler} />
          ))}
        </div>
      </div>

      {/* Info: (20250725 - Julian) View My Pay Slip Modal */}
      {isShowModal && currentRecord && (
        <ViewPaySlipModal
          monthStr={currentMonth}
          yearStr={currentYear}
          paySlipData={currentRecord.paySlipData}
          modalCloseHandler={closeModal}
        />
      )}
    </>
  );
};

export default ReceivedTab;
