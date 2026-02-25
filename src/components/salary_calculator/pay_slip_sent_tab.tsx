import React, { useState } from "react";
import { User, Calendar, Send } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ISentRecord } from "@/interfaces/pay_slip";
import { timestampToString } from "@/lib/utils/common";
import { SortOrder } from "@/constants/sort";
import SortingButton from "@/components/salary_calculator/sorting_button";
import ViewPaySlipModal from "@/components/salary_calculator/view_pay_slip_modal";

const cellStyle =
  "table-cell border-b border-stroke-neutral-quaternary px-24px py-12px align-middle";

const SentItem: React.FC<{
  record: ISentRecord;
  itemClickHandler: (recordId: string) => void;
}> = ({ record, itemClickHandler }) => {
  const { id, payPeriod, toEmail, issuedDate } = record;
  const payPeriodDate = timestampToString(payPeriod);
  const periodStr = `${payPeriodDate.monthName.slice(0, 3)} ${payPeriodDate.year}`;

  const clickHandler = () => itemClickHandler(id);

  return (
    <div
      onClick={clickHandler}
      className="table-row h-50px hover:cursor-pointer hover:bg-surface-brand-primary-30"
    >
      {/* Info: (20250723 - Julian) Pay Period */}
      <div className={cellStyle}>
        <div className="flex items-center gap-8px">
          <Calendar size={16} className="text-text-neutral-tertiary" />
          <p>{periodStr}</p>
        </div>
      </div>
      {/* Info: (20250723 - Julian) From */}
      <div className={cellStyle}>
        <div className="flex items-center gap-8px">
          <User size={16} className="text-text-neutral-tertiary" />
          <p>{toEmail}</p>
        </div>
      </div>
      {/* Info: (20250723 - Julian) Net Pay */}
      <div className={cellStyle}>
        <div className="flex items-center gap-8px">
          <Send size={16} className="text-text-neutral-tertiary" />
          <p>{timestampToString(issuedDate).dateWithSlash}</p>
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
  setIssuedDateSortOrder: React.Dispatch<
    React.SetStateAction<SortOrder | null>
  >;
}> = ({
  sentRecords,
  payPeriodSortOrder,
  setPayPeriodSortOrder,
  issuedDateSortOrder,
  setIssuedDateSortOrder,
}) => {
  const { t } = useTranslation();

  const [isShowModal, setIsShowModal] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<ISentRecord | null>(null);

  const currentMonth = currentRecord
    ? timestampToString(currentRecord.payPeriod).monthName
    : "-";
  const currentYear = currentRecord
    ? timestampToString(currentRecord.payPeriod).year
    : "-";

  const itemClickHandler = (recordId: string) => {
    // Info: (20250725 - Julian) 找到目標 record 並顯示 Modal
    const record = sentRecords.find((item) => item.id === recordId);
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
                string={t("calculator.my_pay_slip.pay_period")}
                sortOrder={payPeriodSortOrder}
                setSortOrder={setPayPeriodSortOrder}
              />
            </div>
            <div className={cellStyle}>{t("calculator.my_pay_slip.to")}</div>
            <div className={cellStyle}>
              <SortingButton
                string={t("calculator.my_pay_slip.payslip_issued_date")}
                sortOrder={issuedDateSortOrder}
                setSortOrder={setIssuedDateSortOrder}
              />
            </div>
          </div>
        </div>

        {/* Info: (20250723 - Julian) Table Body */}
        <div className="table-row-group">
          {sentRecords.map((record) => (
            <SentItem
              key={record.id}
              record={record}
              itemClickHandler={itemClickHandler}
            />
          ))}
        </div>
      </div>

      {/* Info: (20250725 - Julian) View Sent Pay Slip Modal */}
      {isShowModal && currentRecord && (
        <ViewPaySlipModal
          monthStr={currentMonth}
          yearStr={currentYear}
          paySlipData={currentRecord.paySlipData}
          modalCloseHandler={closeModal}
          sentDate={currentRecord.issuedDate}
          sentTo={currentRecord.toEmail}
        />
      )}
    </>
  );
};

export default SentTab;
