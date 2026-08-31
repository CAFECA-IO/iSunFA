"use client";

import { FC, useState } from "react";
import { X, Loader2, Trash } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ISalaryCalculatorEmployee } from "@/interfaces/salary_record";

interface IRemoveEmployeeModalProps {
  employee: ISalaryCalculatorEmployee;
  closeHandler: () => void;
  removeHandler: () => Promise<void>;
}

/**
 * Info: (20260831 - Julian) 移除員工的確認。
 *
 * 自製而不是走共用的 Modal 系統：`src/contexts/modal_context` 已經不存在了
 * （計算機底下好幾個檔案還留著 `useModalContext` 的註解，指向一個被移除的模組）。
 * 這裡沿用 `progress_bar.tsx` 重置確認的作法 —— 自己畫一個。
 */
const RemoveEmployeeModal: FC<IRemoveEmployeeModalProps> = ({
  employee,
  closeHandler,
  removeHandler,
}) => {
  const { t } = useTranslation();
  const [isRemoving, setIsRemoving] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const clickRemoveHandler = async () => {
    setIsRemoving(true);
    setHasError(false);
    try {
      await removeHandler();
      closeHandler();
    } catch {
      setHasError(true);
      setIsRemoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-surface-neutral-surface-lv2 relative flex w-[90vw] flex-col rounded-2xl md:w-[450px]">
        <div className="relative flex items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-text-neutral-primary text-lg font-bold">
            {t("calculator.employee_list.remove_employee_title")}
          </h2>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={closeHandler}
            className="text-text-neutral-secondary absolute right-[16px] flex h-[32px] w-[32px] items-center justify-center rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-[16px] px-[40px] pb-[24px]">
          <p className="text-text-neutral-primary text-sm leading-relaxed">
            {t("calculator.employee_list.remove_employee_content", {
              name: employee.name,
            })}
          </p>

          {/**
           * Info: (20260831 - Julian) 軟刪除的語意一定要講出來。
           * 不講的話，使用者會以為按下去連薪資紀錄一起消失而不敢按。
           */}
          <p className="bg-surface-brand-primary-soft text-text-neutral-secondary rounded-lg px-[14px] py-[12px] text-xs leading-relaxed">
            {t("calculator.employee_list.remove_employee_records_kept")}
          </p>

          {hasError && (
            <p className="text-text-state-error text-sm font-medium">
              {t("calculator.employee_list.remove_failed")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-[12px] px-[40px] pb-[24px]">
          <button
            type="button"
            onClick={closeHandler}
            disabled={isRemoving}
            className="text-text-neutral-secondary h-[40px] px-[18px] text-sm font-semibold"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={clickRemoveHandler}
            disabled={isRemoving}
            className="bg-text-state-error flex h-[40px] items-center justify-center gap-[8px] rounded-lg px-[20px] text-sm font-bold text-white disabled:opacity-60"
          >
            {isRemoving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash size={16} />
            )}
            {t("calculator.employee_list.remove_employee_submit_btn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveEmployeeModal;
