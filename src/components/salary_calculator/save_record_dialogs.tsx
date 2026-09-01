"use client";

import { FC } from "react";
import { X, Plus, Search, UserCheck, AlertCircle, Pencil } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { numberWithCommas } from "@/lib/utils/common";
import {
  ISalaryCalculatorEmployee,
  ISalaryRecordSummary,
} from "@/interfaces/salary_record";

/**
 * Info: (20260831 - Julian) 儲存路徑上的兩個**例外**對話框。
 *
 * 正常情況（已連結員工、該年月還沒有紀錄）按下儲存就直接存完，這裡不會出現。
 * 把它們寫成例外而不是必經的表單，是因為員工與年月在 Step 1 就填過了 ——
 * 再問一次等於要求使用者把剛做過的事做第二遍（計劃書 §2.4）。
 */

const modalShell =
  "fixed inset-0 z-70 flex items-center justify-center bg-black/50";
const cardShell =
  "w-[90vw] md:w-[450px] bg-surface-neutral-surface-lv2 relative flex flex-col rounded-2xl";

const CloseButton: FC<{ onClick: () => void; label: string }> = ({
  onClick,
  label,
}) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className="text-text-neutral-secondary absolute right-[16px] flex h-[32px] w-[32px] items-center justify-center rounded-md"
  >
    <X size={20} />
  </button>
);

interface IOverwriteConfirmModalProps {
  existing: ISalaryRecordSummary;
  isSaving: boolean;
  closeHandler: () => void;
  confirmHandler: () => void;
}

// Info: (20260831 - Julian) 例外 A：同員工同年月已有紀錄。一句話 + 兩顆按鈕，不是表單
export const OverwriteConfirmModal: FC<IOverwriteConfirmModalProps> = ({
  existing,
  isSaving,
  closeHandler,
  confirmHandler,
}) => {
  const { t } = useTranslation();

  return (
    <div className={modalShell}>
      <div className={cardShell}>
        <div className="relative flex items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-text-neutral-primary text-lg font-bold">
            {t("calculator.save_record.overwrite_title")}
          </h2>
          <CloseButton onClick={closeHandler} label={t("common.cancel")} />
        </div>

        <div className="px-[40px] pb-[24px]">
          <p className="text-text-neutral-secondary text-sm leading-relaxed">
            {t("calculator.save_record.overwrite_content", {
              name: existing.employee.name,
              year: existing.year,
              month: existing.month,
              amount: numberWithCommas(existing.totalPayment),
            })}
          </p>
        </div>

        <div className="flex items-center justify-end gap-[12px] px-[40px] pb-[24px]">
          <button
            type="button"
            onClick={closeHandler}
            disabled={isSaving}
            className="text-text-neutral-secondary h-[40px] px-[18px] text-sm font-semibold"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={confirmHandler}
            disabled={isSaving}
            className="h-[40px] rounded-lg bg-orange-600 px-[20px] text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
          >
            {t("calculator.save_record.overwrite_submit")}
          </button>
        </div>
      </div>
    </div>
  );
};

interface IUnlinkedEmployeeModalProps {
  employeeName: string;
  employeeNumber: string;
  canCreate: boolean;
  isSaving: boolean;
  /**
   * Info: (20260901 - Julian) 計算機上填的編號已經是這位員工的（帳本內編號唯一）。
   *
   * 有值就代表「直接新增」一定會被後端以 409 擋下來 —— 與其讓使用者按下去撞牆，
   * 不如先把人指出來，並給一條「改存給他」的路。
   */
  conflictEmployee: ISalaryCalculatorEmployee | null;
  // Info: (20260901 - Julian) 後端回的錯誤（名單過期時的保險），沒有就不顯示
  errorMessage: string | null;
  closeHandler: () => void;
  createHandler: () => void;
  pickHandler: () => void;
  useConflictHandler: () => void;
  // Info: (20260901 - Julian) 關掉對話框並回到 Step 1 的編號欄（撞號時才會用到）
  editNumberHandler: () => void;
}

/**
 * Info: (20260831 - Julian) 例外 B：姓名是手打的，沒有對應的員工。
 *
 * 主要路徑是「用計算機上已經填好的姓名、Email、本薪直接建員工並儲存」——
 * 一次點擊完成，不必把剛打過的東西再打一次。從列表選是次要路徑。
 */
export const UnlinkedEmployeeModal: FC<IUnlinkedEmployeeModalProps> = ({
  employeeName,
  employeeNumber,
  canCreate,
  isSaving,
  conflictEmployee,
  errorMessage,
  closeHandler,
  createHandler,
  pickHandler,
  useConflictHandler,
  editNumberHandler,
}) => {
  const { t } = useTranslation();

  /**
   * Info: (20260901 - Julian) 編號撞號時，「直接新增」必定被後端擋下 —— 整顆不渲染。
   *
   * 一開始是把它 disable 起來、用底下的說明交代原因。但畫面上留一顆按不動的按鈕，
   * 等於要使用者自己看懂「這條路不通」；衝突的事實放在說明文字裡講得更清楚，
   * 而這裡只留真的能按的選項。
   */
  const isConflict = conflictEmployee !== null;

  const createHint = canCreate
    ? t("calculator.save_record.create_and_save_hint")
    : t("calculator.save_record.create_needs_number");

  return (
    <div className={modalShell}>
      <div className={cardShell}>
        <div className="relative flex items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-text-neutral-primary text-lg font-bold">
            {t("calculator.save_record.unlinked_title")}
          </h2>
          <CloseButton onClick={closeHandler} label={t("common.cancel")} />
        </div>

        <div className="flex flex-col gap-[14px] px-[40px] pb-[24px]">
          {/**
           * Info: (20260901 - Julian) 衝突的事實在這裡講完，而不是掛在一顆按不動的按鈕底下。
           * 說明文字本來就是交代狀況的地方，講在這裡三條選項才都是「能按的」。
           */}
          <p className="text-text-neutral-secondary text-sm leading-relaxed">
            {isConflict
              ? t("calculator.save_record.unlinked_conflict_content", {
                  name: employeeName,
                  number: employeeNumber,
                  existingName: conflictEmployee.name,
                })
              : t("calculator.save_record.unlinked_content", {
                  name: employeeName,
                })}
          </p>

          {/**
           * Info: (20260901 - Julian) 編號撞號時，主要路徑換成「改存給既有的那位員工」。
           *
           * 不自動幫使用者存 —— 計算機上的姓名可能和既有員工不同（打錯編號的情況），
           * 靜靜存到別人身上比報錯更糟。這裡只把事實說清楚並給一顆按鈕。
           */}
          {isConflict && (
            <button
              type="button"
              onClick={useConflictHandler}
              disabled={isSaving}
              className="bg-surface-brand-primary-soft flex items-center gap-[12px] rounded-lg px-[16px] py-[14px] text-left disabled:opacity-60"
            >
              <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                <UserCheck size={18} />
              </span>
              <span className="flex flex-col gap-[3px]">
                <span className="text-text-neutral-primary text-sm font-bold">
                  {t("calculator.save_record.save_to_existing", {
                    name: conflictEmployee.name,
                  })}
                </span>
                <span className="text-text-neutral-secondary text-xs leading-relaxed">
                  {t("calculator.save_record.save_to_existing_hint")}
                </span>
              </span>
            </button>
          )}

          {!isConflict && (
            <button
              type="button"
              onClick={createHandler}
              disabled={!canCreate || isSaving}
              className="bg-surface-brand-primary-soft flex items-center gap-[12px] rounded-lg px-[16px] py-[14px] text-left disabled:opacity-60"
            >
              <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full bg-orange-600 text-white">
                <Plus size={18} />
              </span>
              <span className="flex flex-col gap-[3px]">
                <span className="text-text-neutral-primary text-sm font-bold">
                  {t("calculator.save_record.create_and_save", {
                    name: employeeName,
                  })}
                </span>
                <span className="text-text-neutral-secondary text-xs leading-relaxed">
                  {createHint}
                </span>
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={pickHandler}
            disabled={isSaving}
            className="border-stroke-neutral-quaternary flex items-center gap-[12px] rounded-lg border px-[16px] py-[14px] text-left disabled:opacity-60"
          >
            <span className="bg-surface-hover text-text-neutral-secondary flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full">
              <Search size={18} />
            </span>
            <span className="flex flex-col gap-[3px]">
              <span className="text-text-neutral-primary text-sm font-bold">
                {t("calculator.save_record.pick_from_list")}
              </span>
              <span className="text-text-neutral-secondary text-xs leading-relaxed">
                {t("calculator.save_record.pick_from_list_hint")}
              </span>
            </span>
          </button>

          {/**
           * Info: (20260901 - Julian) 第三條路：其實是打錯編號。
           *
           * 不在這裡放輸入框改編號 —— 那個欄位歸 Step 1 管，兩邊都能改遲早會不一致，
           * 而且改完還可能撞到第二個已被使用的編號、再彈一次。
           * 這裡只把人送回那個唯一的欄位。
           */}
          {isConflict && (
            <button
              type="button"
              onClick={editNumberHandler}
              disabled={isSaving}
              className="border-stroke-neutral-quaternary flex items-center gap-[12px] rounded-lg border px-[16px] py-[14px] text-left disabled:opacity-60"
            >
              <span className="bg-surface-hover text-text-neutral-secondary flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full">
                <Pencil size={18} />
              </span>
              <span className="flex flex-col gap-[3px]">
                <span className="text-text-neutral-primary text-sm font-bold">
                  {t("calculator.save_record.edit_number")}
                </span>
                <span className="text-text-neutral-secondary text-xs leading-relaxed">
                  {t("calculator.save_record.edit_number_hint", {
                    name: employeeName,
                  })}
                </span>
              </span>
            </button>
          )}
        </div>

        {errorMessage !== null && (
          <div className="flex items-start gap-[8px] px-[40px] pb-[16px]">
            <AlertCircle
              size={16}
              className="text-text-state-error mt-[2px] shrink-0"
            />
            <p className="text-text-state-error text-sm font-medium">
              {errorMessage}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-[12px] px-[40px] pb-[24px]">
          <button
            type="button"
            onClick={closeHandler}
            disabled={isSaving}
            className="text-text-neutral-secondary h-[40px] px-[18px] text-sm font-semibold"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};
