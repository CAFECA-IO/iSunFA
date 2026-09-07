"use client";

import { FC } from "react";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260907 - Julian) 「這份名單有哪些問題，只看其中一種」的勾選 filter。
 *
 * ## 從橫幅改成勾選（20260907）
 *
 * 前一版是三條橫幅：一句話講出人數，右邊一個「只看這幾位／顯示全部」的連結。
 * 改成勾選的理由是它本來就是 filter —— 橫幅那個形狀讓它看起來像通知，
 * 而通知是讀完就走的東西，勾選才看得出「現在正篩著哪幾種」。
 * 三個同時勾也才說得清楚（三條橫幅各自 toggle 時，畫面上沒有一處
 * 匯總「目前開著兩個條件」）。
 *
 * ## 三個，而不是一個「只看有問題的」
 *
 * 沒有電子郵件、沒有到職日、缺少薪資單紀錄 —— 三者要做的事完全不同：
 * 回頭編輯員工、補一個欄位、回計算機把那幾個月算出來。
 * 併成一個勾選的話，使用者勾了才發現名單裡混著三種毫不相干的待辦。
 *
 * ## 人數為什麼一定要留著
 *
 * 這是橫幅唯一不能丟的東西。特別是「沒有到職日」：完整度是從到職日
 * 往後推的，沒有到職日就算不出來，而算不出來時畫面上**什麼都不顯示**，
 * 與「大家都很完整」長得一模一樣。人數是那半句「說出為什麼不知道」。
 *
 * 人數為 0 時勾選框停用而不是消失：消失的話這一列會隨資料跳動，
 * 而「0」本身是有意義的答案（這個面向沒問題），不是沒有答案。
 */

const IssueToggle: FC<{
  label: string;
  hint?: string;
  count: number;
  checked: boolean;
  onChange: () => void;
}> = ({ label, hint = undefined, count, checked, onChange }) => {
  const isEmpty = count === 0;

  return (
    <label
      title={hint}
      className={`flex items-center gap-2 text-sm ${
        isEmpty
          ? "cursor-default text-gray-400"
          : "cursor-pointer text-gray-700"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={isEmpty}
        onChange={onChange}
        className="size-4 cursor-pointer accent-orange-600 disabled:cursor-default"
      />
      {label}
      {/**
       * Info: (20260907 - Julian) 人數用 badge 而不是括號 ——
       * 「（3）」在中日韓與西文語系的括號寬度差很多，而數字是這一列
       * 唯一需要被掃到的東西，給它自己的底色比塞進標籤裡更容易找。
       */}
      <span
        className={`min-w-5 rounded-md px-1.5 text-center text-xs font-semibold ${
          isEmpty ? "bg-gray-100 text-gray-400" : "bg-amber-100 text-amber-800"
        }`}
      >
        {count}
      </span>
    </label>
  );
};

export interface IEmployeeListIssueFiltersProps {
  missingEmailCount: number;
  missingHireDateCount: number;
  missingRecordsCount: number;
  onlyMissingEmail: boolean;
  onlyMissingHireDate: boolean;
  onlyMissingRecords: boolean;
  toggleMissingEmail: () => void;
  toggleMissingHireDate: () => void;
  toggleMissingRecords: () => void;
}

/**
 * Info: (20260907 - Julian) 三個勾選的順序：信箱、到職日、薪資單。
 *
 * 到職日排在薪資單之前是因為兩者是**一前一後不是兩種看法** ——
 * 沒有到職日的人補完之後，才可能出現在「缺少薪資單」那一組裡。
 * 顛倒的話，使用者會先去處理一份還不完整的名單。
 */
const EmployeeListIssueFilters: FC<IEmployeeListIssueFiltersProps> = ({
  missingEmailCount,
  missingHireDateCount,
  missingRecordsCount,
  onlyMissingEmail,
  onlyMissingHireDate,
  onlyMissingRecords,
  toggleMissingEmail,
  toggleMissingHireDate,
  toggleMissingRecords,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 md:flex-row md:flex-wrap md:items-center md:gap-5">
      <IssueToggle
        label={t("calculator.employee_list.filter_missing_email")}
        count={missingEmailCount}
        checked={onlyMissingEmail}
        onChange={toggleMissingEmail}
      />
      <IssueToggle
        label={t("calculator.employee_list.filter_missing_hire_date")}
        /**
         * Info: (20260907 - Julian) 只有這一個帶說明。
         *
         * 另外兩個的後果從標籤就看得出來（沒信箱＝寄不出、缺薪資單＝要補算），
         * 而「沒有到職日」的後果是**看不見的**：完整度算不出來，
         * 於是那幾個人在薪資單那一欄永遠是乾淨的。那句話要留著。
         */
        hint={t("calculator.employee_list.missing_hire_date_banner", {
          count: missingHireDateCount,
        })}
        count={missingHireDateCount}
        checked={onlyMissingHireDate}
        onChange={toggleMissingHireDate}
      />
      <IssueToggle
        label={t("calculator.employee_list.filter_missing_records")}
        count={missingRecordsCount}
        checked={onlyMissingRecords}
        onChange={toggleMissingRecords}
      />
    </div>
  );
};

export default EmployeeListIssueFilters;
