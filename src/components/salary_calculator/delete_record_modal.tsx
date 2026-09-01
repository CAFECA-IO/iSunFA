"use client";

import { FC, useState } from "react";
import { X, Loader2, Trash } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ISalaryRecordSummary } from "@/interfaces/salary_record";

interface IDeleteRecordModalProps {
  record: ISalaryRecordSummary;
  closeHandler: () => void;
  deleteHandler: () => Promise<void>;
}

/**
 * Info: (20260901 - Julian) 刪除薪資紀錄的確認。
 *
 * ## 為什麼這一顆非有不可
 *
 * 薪資紀錄是**硬刪**（`deleteMany`），沒有 `deletedAt`、沒有 AuditLog，
 * 刪掉就回不來。而它的按鈕是三顆相鄰、只有圖示沒有文字的 `size-8` 圖示鈕的最後一顆
 * —— 誤點的成本與命中率完全不成比例。
 *
 * 對照組：移除員工是**軟刪、可復原**，卻有完整的確認彈窗；覆寫紀錄也有
 * `OverwriteConfirmModal`，理由寫著「薪資單是對外憑據」。
 * 少了這一顆，這個模組的確認強度排序是反的（checklist §3.4：
 * 同一路徑上相似動作的稽核強度要對齊）。
 *
 * 沿用 `remove_employee_modal.tsx` 的形狀 —— `src/contexts/modal_context` 已不存在，
 * 這一系列的確認都是自己畫的。
 */
const DeleteRecordModal: FC<IDeleteRecordModalProps> = ({
  record,
  closeHandler,
  deleteHandler,
}) => {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const clickDeleteHandler = async () => {
    setIsDeleting(true);
    setHasError(false);
    try {
      await deleteHandler();
      closeHandler();
    } catch {
      // Info: (20260901 - Julian) 失敗就留在原地並說出來，不要關掉彈窗讓人以為刪成功了
      setHasError(true);
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
      <div className="bg-surface-neutral-surface-lv2 relative flex w-[90vw] flex-col rounded-2xl md:w-[450px]">
        <div className="relative flex items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-text-neutral-primary text-lg font-bold">
            {t("calculator.records.delete_title")}
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
            {t("calculator.records.delete_content", {
              name: record.employee.name,
              year: record.year,
              month: record.month,
            })}
          </p>

          {/**
           * Info: (20260901 - Julian) 「刪了就沒了」必須寫出來 ——
           * 移除員工那一顆的對應位置寫的是「紀錄會留著」，兩者語意相反，
           * 使用者不會自己推斷出這一顆沒有後路。
           */}
          <p className="bg-surface-brand-primary-soft text-text-neutral-secondary rounded-lg px-[14px] py-[12px] text-xs leading-relaxed">
            {t("calculator.records.delete_irreversible")}
          </p>

          {hasError && (
            <p className="text-text-state-error text-sm font-medium">
              {t("calculator.records.delete_failed")}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-[12px] px-[40px] pb-[24px]">
          <button
            type="button"
            onClick={closeHandler}
            disabled={isDeleting}
            className="text-text-neutral-secondary h-[40px] px-[18px] text-sm font-semibold"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={clickDeleteHandler}
            disabled={isDeleting}
            className="bg-text-state-error flex h-[40px] items-center justify-center gap-[8px] rounded-lg px-[20px] text-sm font-bold text-white disabled:opacity-60"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash size={16} />
            )}
            {t("calculator.records.delete_submit_btn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteRecordModal;
