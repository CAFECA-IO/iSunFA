"use client";

import { useState, FC, KeyboardEvent, Dispatch, SetStateAction } from "react";

import { User, Calendar, Send, Loader2, UserCheck } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ISalaryPaySlipDeliveryListItem } from "@/interfaces/salary_pay_slip_delivery";
import { timestampToString } from "@/lib/utils/common";
import { MONTHS } from "@/constants/month";
import { SortOrder } from "@/constants/sort";
import SortingButton from "@/components/salary_calculator/sorting_button";
import ViewPaySlipModal from "@/components/salary_calculator/view_pay_slip_modal";
import { useSalaryRecordDetail } from "@/hooks/use_salary_record_detail";

const cellStyle =
  "table-cell border-b border-stroke-neutral-quaternary px-[24px] py-[12px] align-middle";

/**
 * Info: (20260904 - Julian) 一列寄送紀錄。
 *
 * 上一版的資料是 `dummySentData`（兩筆硬編）。接上真資料之後多了兩欄：
 * **員工姓名**與**寄送者**。
 *
 * 員工姓名是因為 `recipientEmail` 是當初的信箱 —— 同一個人換過信箱之後，
 * 光看信箱會以為是兩個人。寄送者則是計畫書 §6.3：母計畫 §13.2 記著
 * `SalaryRecord.createdByUserId` 至今沒有任何讀者、稽核價值等於零；
 * 這一欄從第一天就有讀者。
 */
const SentItem: FC<{
  delivery: ISalaryPaySlipDeliveryListItem;
  itemClickHandler: (deliveryId: string) => void;
}> = ({ delivery, itemClickHandler }) => {
  const { t } = useTranslation();
  const { id, year, month, recipientEmail, createdAt, employee, sentBy } =
    delivery;

  const monthName = MONTHS[month - 1]?.name ?? "";
  const periodStr = `${monthName.slice(0, 3)} ${year}`;

  const clickHandler = () => itemClickHandler(id);
  const keyDownHandler = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      itemClickHandler(id);
    }
  };

  return (
    <div
      onClick={clickHandler}
      onKeyDown={keyDownHandler}
      role="button"
      tabIndex={0}
      className="hover:bg-surface-brand-primary-30 table-row h-[50px] hover:cursor-pointer"
    >
      {/* Info: (20250723 - Julian) Pay Period */}
      <div className={cellStyle}>
        <div className="flex items-center gap-[8px]">
          <Calendar size={16} className="text-text-neutral-tertiary" />
          <p>{periodStr}</p>
        </div>
      </div>
      {/* Info: (20260904 - Julian) 這是誰的薪資單 */}
      <div className={cellStyle}>
        <div className="flex items-center gap-[8px]">
          <User size={16} className="text-text-neutral-tertiary" />
          <p>{employee.name}</p>
        </div>
      </div>
      {/* Info: (20260904 - Julian) 當初實際寄到的信箱（快照，不是員工檔的現值） */}
      <div className={cellStyle}>
        <p className="break-all">{recipientEmail}</p>
      </div>
      {/* Info: (20250723 - Julian) Issued Date */}
      <div className={cellStyle}>
        <div className="flex items-center gap-[8px]">
          <Send size={16} className="text-text-neutral-tertiary" />
          <p>{timestampToString(createdAt).dateWithSlash}</p>
        </div>
      </div>
      {/* Info: (20260904 - Julian) 誰按下的寄送（計畫書 §6.3） */}
      <div className={cellStyle}>
        <div className="flex items-center gap-[8px]">
          <UserCheck size={16} className="text-text-neutral-tertiary" />
          <p>{sentBy.name || t("calculator.my_pay_slip.unknown_sender")}</p>
        </div>
      </div>
    </div>
  );
};

const SentTab: FC<{
  accountBookId: string;
  deliveries: ISalaryPaySlipDeliveryListItem[];
  isLoading: boolean;
  hasError: boolean;
  payPeriodSortOrder: SortOrder | null;
  setPayPeriodSortOrder: Dispatch<SetStateAction<SortOrder | null>>;
  issuedDateSortOrder: SortOrder | null;
  setIssuedDateSortOrder: Dispatch<SetStateAction<SortOrder | null>>;
  onResent: () => void;
}> = ({
  accountBookId,
  deliveries,
  isLoading,
  hasError,
  payPeriodSortOrder,
  setPayPeriodSortOrder,
  issuedDateSortOrder,
  setIssuedDateSortOrder,
  onResent,
}) => {
  const { t } = useTranslation();

  const [current, setCurrent] = useState<ISalaryPaySlipDeliveryListItem | null>(
    null,
  );
  const {
    record,
    isLoading: isLoadingRecord,
    load,
    clear,
  } = useSalaryRecordDetail(accountBookId);

  /**
   * Info: (20260904 - Julian) 點開才去取薪資單快照。
   *
   * 清單本身沒有 `result` —— 見 `useSalaryRecordDetail` 的說明。
   * 兩個 state 一起設：`current` 決定彈窗要顯示誰的、`record` 是內容。
   */
  const itemClickHandler = async (deliveryId: string) => {
    const delivery = deliveries.find((item) => item.id === deliveryId);
    if (!delivery) return;
    setCurrent(delivery);
    await load(delivery.salaryRecordId);
  };

  const closeModal = () => {
    setCurrent(null);
    clear();
  };

  const tableBody = deliveries.map((delivery) => (
    <SentItem
      key={delivery.id}
      delivery={delivery}
      itemClickHandler={itemClickHandler}
    />
  ));

  /**
   * Info: (20260904 - Julian) 空、載入中、抓不到是三種不同的狀態，不能長得一樣。
   *
   * 上一版永遠有兩筆假資料，所以這三種情況從來沒有出現過。
   * 「一片空白」在真資料上可能是「還沒寄過」，也可能是「請求掛了」——
   * 使用者分不出來的話，會一直重新整理一個沒有壞掉的頁面。
   */
  const emptyState = (message: string) => (
    <div className="text-text-neutral-tertiary flex items-center justify-center py-[48px] text-sm">
      {message}
    </div>
  );

  let fallback = null;
  if (isLoading) {
    fallback = (
      <div className="flex items-center justify-center py-[48px]">
        <Loader2 size={24} className="animate-spin text-orange-600" />
      </div>
    );
  } else if (hasError) {
    fallback = emptyState(t("calculator.my_pay_slip.sent_load_failed"));
  } else if (deliveries.length === 0) {
    fallback = emptyState(t("calculator.my_pay_slip.sent_empty"));
  }

  return (
    <>
      <div className="text-text-neutral-secondary table w-full text-sm font-medium">
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
            <div className={cellStyle}>
              {t("calculator.my_pay_slip.employee")}
            </div>
            <div className={cellStyle}>{t("calculator.my_pay_slip.to")}</div>
            <div className={cellStyle}>
              <SortingButton
                string={t("calculator.my_pay_slip.pay_slip_issued_date")}
                sortOrder={issuedDateSortOrder}
                setSortOrder={setIssuedDateSortOrder}
              />
            </div>
            <div className={cellStyle}>
              {t("calculator.my_pay_slip.sent_by")}
            </div>
          </div>
        </div>

        {/* Info: (20250723 - Julian) Table Body */}
        <div className="table-row-group">{fallback ? null : tableBody}</div>
      </div>

      {fallback}

      {/* Info: (20260904 - Julian) 快照還在路上時先擋一層，避免彈窗閃一下空內容 */}
      {current && isLoadingRecord && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
          <Loader2 size={32} className="animate-spin text-white" />
        </div>
      )}

      {/* Info: (20250725 - Julian) View Sent Pay Slip Modal */}
      {current && record && (
        <ViewPaySlipModal
          monthStr={MONTHS[current.month - 1]?.name ?? ""}
          yearStr={current.year.toString()}
          paySlipData={record.result}
          employeeName={current.employee.name}
          employeeNumber={current.employee.number}
          modalCloseHandler={closeModal}
          sentDate={current.createdAt}
          sentTo={current.recipientEmail}
          accountBookId={accountBookId}
          recordId={current.salaryRecordId}
          onResent={onResent}
        />
      )}
    </>
  );
};

export default SentTab;
