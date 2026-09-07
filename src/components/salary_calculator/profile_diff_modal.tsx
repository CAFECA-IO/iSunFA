"use client";

import { FC, useState } from "react";
import { X, Loader2, UserCog } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { ISalaryEmployeeProfile } from "@/interfaces/salary_record";
import {
  employmentTypeI18nKey,
  IProfileDiffEntry,
  PROFILE_FIELD_I18N_KEY,
  toDateInputValue,
} from "@/lib/utils/salary_employee_profile";
import { industryCategoryOf } from "@/constants/industry_category";
import { numberWithCommas } from "@/lib/utils/common";

interface IProfileDiffModalProps {
  employeeName: string;
  diff: IProfileDiffEntry[];
  closeHandler: () => void;
  // Info: (20260902 - Julian) 兩條出路都會接著存薪資紀錄，差別只在要不要先更新員工檔
  updateAndSaveHandler: () => Promise<void>;
  saveOnlyHandler: () => Promise<void>;
}

/**
 * Info: (20260902 - Julian) 計算機上的常態屬性與員工檔不一致時，儲存前問一句。
 *
 * ## 為什麼是「問」而不是自動回寫
 *
 * 產品決策（20260902）是**單向為主**：員工檔在員工列表裡編輯，計算機只讀它。
 * 自動雙向同步的問題是「這個月臨時多報一個扶養人」會永久改掉那個人的設定，
 * 而且完全靜默 —— 下個月選到他，算出來的稅額就不一樣了，沒有人知道為什麼。
 *
 * 但單純單向也不對：使用者在計算機上把投保狀態改對了，那多半就是員工檔錯了。
 * 所以在儲存的那一刻問一句，讓「改員工設定」始終是一個他按下去的動作。
 *
 * ## 為什麼要逐條列出來
 *
 * 「要不要更新員工資料？」這種問法使用者無從判斷，於是每次都按同一個鍵 ——
 * 那道確認就等於不存在。列出「扶養人數 0 → 1」他才有辦法決定。
 */
const ProfileDiffModal: FC<IProfileDiffModalProps> = ({
  employeeName,
  diff,
  closeHandler,
  updateAndSaveHandler,
  saveOnlyHandler,
}) => {
  const { t } = useTranslation();
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const run = (handler: () => Promise<void>) => async () => {
    setIsBusy(true);
    setHasError(false);
    try {
      await handler();
    } catch {
      // Info: (20260902 - Julian) 失敗就留在原地並說出來，不要關掉彈窗讓人以為存好了
      setHasError(true);
      setIsBusy(false);
    }
  };

  /**
   * Info: (20260902 - Julian) 把值變成看得懂的字。
   *
   * 直接印原始值的話，使用者會看到「isForeignWorker false → true」
   * 與「hireDate 1755216000 → null」—— 那比不列出來更糟，
   * 因為它看起來像是系統在講一件他管不著的事。
   */
  const display = (
    field: keyof ISalaryEmployeeProfile,
    value: IProfileDiffEntry["before"],
  ): string => {
    if (value === null) return t("calculator.save_record.profile_value_none");
    if (typeof value === "boolean") {
      if (field === "isForeignWorker") {
        return value
          ? t("calculator.basic_info_form.residency_option_non_taiwan")
          : t("calculator.basic_info_form.residency_option_taiwan");
      }
      if (field === "baseSalary30Days") {
        return value
          ? t("calculator.basic_info_form.payroll_option_fixed")
          : t("calculator.basic_info_form.payroll_option_actual");
      }
      return value
        ? t("calculator.save_record.profile_value_on")
        : t("calculator.save_record.profile_value_off");
    }
    if (typeof value === "number") {
      if (field === "industryCode") return industryCategoryOf(value).INDUSTRY;
      if (field === "voluntaryPensionRate") return `${value}%`;
      if (field === "dependentsCount") return `${value}`;
      // Info: (20260902 - Julian) 日期是 Unix 秒，其餘 number 都是金額
      if (field === "hireDate" || field === "resignDate") {
        return toDateInputValue(value);
      }
      return numberWithCommas(value);
    }
    // Info: (20260902 - Julian) employmentType 存的是鍵，顯示要走字典
    if (field === "employmentType") {
      return t(employmentTypeI18nKey(value));
    }
    return `${value}`;
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-[16px]">
      <div className="bg-surface-neutral-surface-lv2 relative flex max-h-[90vh] w-[90vw] flex-col rounded-2xl md:w-[480px]">
        <div className="relative flex shrink-0 items-start justify-center px-[40px] py-[16px]">
          <h2 className="text-text-neutral-primary text-lg font-bold">
            {t("calculator.save_record.profile_diff_title")}
          </h2>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={closeHandler}
            disabled={isBusy}
            className="text-text-neutral-secondary absolute right-[16px] flex h-[32px] w-[32px] items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto px-[40px] pb-[16px]">
          <p className="text-text-neutral-primary text-sm leading-relaxed">
            {t("calculator.save_record.profile_diff_content", {
              name: employeeName,
            })}
          </p>

          <ul className="border-stroke-neutral-quaternary flex flex-col divide-y rounded-lg border">
            {diff.map((entry) => (
              <li
                key={entry.field}
                className="flex items-center justify-between gap-3 px-[14px] py-[10px] text-sm"
              >
                <span className="text-text-neutral-secondary shrink-0 font-medium">
                  {t(PROFILE_FIELD_I18N_KEY[entry.field])}
                </span>
                <span className="text-text-neutral-primary text-right">
                  <span className="text-text-neutral-tertiary line-through">
                    {display(entry.field, entry.before)}
                  </span>
                  <span className="px-2">→</span>
                  <span className="font-semibold">
                    {display(entry.field, entry.after)}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {/**
           * Info: (20260902 - Julian) 講清楚「不更新」不會影響這次的薪資紀錄。
           * 不講的話使用者會以為不更新就算不到這些值，於是每次都按更新。
           */}
          <p className="bg-surface-brand-primary-soft text-text-neutral-secondary rounded-lg px-[14px] py-[12px] text-xs leading-relaxed">
            {t("calculator.save_record.profile_diff_hint")}
          </p>

          {hasError && (
            <p className="text-text-state-error text-sm font-medium">
              {t("calculator.save_record.profile_diff_failed")}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-[12px] px-[40px] pb-[24px] sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={run(saveOnlyHandler)}
            disabled={isBusy}
            className="text-text-neutral-secondary ring-stroke-neutral-quaternary hover:bg-surface-hover flex h-[40px] items-center justify-center rounded-lg px-[18px] text-sm font-semibold ring-1 transition-colors disabled:opacity-60"
          >
            {t("calculator.save_record.profile_diff_skip_btn")}
          </button>
          <button
            type="button"
            onClick={run(updateAndSaveHandler)}
            disabled={isBusy}
            className="flex h-[40px] items-center justify-center gap-[8px] rounded-lg bg-orange-600 px-[20px] text-sm font-bold text-white transition-colors hover:bg-orange-700 disabled:opacity-60"
          >
            {isBusy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserCog size={16} />
            )}
            {t("calculator.save_record.profile_diff_update_btn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileDiffModal;
