"use client";

import { FC } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import { X } from "lucide-react";
import { useCalculatorCtx } from "@/contexts/calculator_context";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";
import EmployeeList, {
  iconBtnStyle,
} from "@/components/salary_calculator/employee_list";

interface IEmployeeListModalProps {
  accountBookId: string;
  modalVisibleHandler: () => void;
  /**
   * Info: (20260901 - Julian) 選完人之後要接著做的事（例如：直接把這次試算存給他）。
   *
   * 員工本身**直接傳出去**，不要呼叫端自己去讀 context 的 `selectedEmployeeId` ——
   * `linkEmployee` 是 setState，同一個 tick 內讀到的還是舊值（多半是 null）。
   * 不傳這個 prop 就是原本的行為：選完只灌值、關閉彈窗。
   */
  onPicked?: (employee: ISalaryCalculatorEmployee) => void;
}

/**
 * Info: (20260904 - Julian) 選擇員工的彈窗 —— 現在只是 `EmployeeList` 的外框。
 *
 * 名單、搜尋、新增／編輯／移除全部在 `employee_list.tsx`，與員工列表頁共用同一份。
 * 這裡剩下的是彈窗才有的三件事：遮罩、標題列、以及「選人之後要做什麼」。
 */
const EmployeeListModal: FC<IEmployeeListModalProps> = ({
  accountBookId,
  modalVisibleHandler,
  onPicked = undefined,
}) => {
  const { t } = useTranslation();

  /**
   * Info: (20260831 - Julian) 選人之後除了灌欄位，還要記住是哪一筆（linkEmployee）。
   * 那個 id 就是「按下儲存會存到誰身上」—— 原本只灌值不記 id，
   * 於是儲存時無從得知這次試算屬於誰。
   */
  const { linkEmployee } = useCalculatorCtx();

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-[16px]">
      <div className="bg-surface-neutral-surface-lv2 relative flex max-h-[90vh] w-[90vw] flex-col rounded-2xl md:w-[560px]">
        {/* Info: (20250711 - Julian) Modal Header */}
        <div className="relative flex shrink-0 items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-card-text-primary text-lg font-bold">
            {t("calculator.employee_list.main_title")}
          </h2>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={modalVisibleHandler}
            className={`text-text-neutral-secondary absolute right-[16px] ${iconBtnStyle}`}
          >
            <X size={20} />
          </button>
        </div>

        <EmployeeList
          accountBookId={accountBookId}
          variant="modal"
          onPick={(employee) => {
            linkEmployee(employee);
            modalVisibleHandler();
            onPicked?.(employee);
          }}
        />
      </div>
    </div>
  );
};

export default EmployeeListModal;
