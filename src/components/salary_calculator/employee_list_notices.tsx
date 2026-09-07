"use client";

import { FC } from "react";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260907 - Julian) 員工列表的三條提示，以及它們為什麼是三條。
 *
 * 缺信箱、沒有到職日、缺薪資單 —— 併成一句「N 位員工資料不完整」比較短，
 * 但**三者要做的事完全不同**：缺信箱是回頭編輯員工，沒有到職日是補一個欄位，
 * 缺薪資單是回計算機把那幾個月算出來。併起來的話，使用者點進去才發現
 * 不是自己以為的那件事。
 *
 * 抽成元件的理由不是「檔案太長」，是這三塊原本是三段各自寫一次的 JSX
 * （邊框、內距、切換鈕、`show_all` 的三元式全都重複三遍）——
 * 改一個共同的樣式要改三個地方，而漏掉一個不會有人發現。
 *
 * ## 顏色為什麼分兩種
 *
 * 缺信箱與缺薪資單是**這本帳的資料缺漏**（琥珀色，要動手補）；
 * 沒有到職日是**上游欄位沒有回填**（天藍色，`hire_date` 是 20260902 才加的）。
 * 同色的話，使用者會以為三件事是同一種待辦。
 */

type INoticeTone = "amber" | "sky";

const TONE_STYLE: Record<INoticeTone, { box: string; text: string }> = {
  amber: {
    box: "border-amber-200 bg-amber-50",
    text: "text-amber-800 hover:text-amber-900",
  },
  sky: {
    box: "border-sky-200 bg-sky-50",
    text: "text-sky-800 hover:text-sky-900",
  },
};

const Notice: FC<{
  tone: INoticeTone;
  message: string;
  isFiltering: boolean;
  filterLabel: string;
  onToggle: () => void;
}> = ({ tone, message, isFiltering, filterLabel, onToggle }) => {
  const { t } = useTranslation();
  const style = TONE_STYLE[tone];

  return (
    <div
      className={`flex shrink-0 flex-col gap-[8px] rounded-lg border px-[16px] py-[10px] md:flex-row md:items-center ${style.box}`}
    >
      <p className={`flex-1 text-sm font-medium ${style.text}`}>{message}</p>
      <button
        type="button"
        onClick={onToggle}
        className={`shrink-0 text-sm font-semibold underline underline-offset-2 ${style.text}`}
      >
        {isFiltering ? t("calculator.employee_list.show_all") : filterLabel}
      </button>
    </div>
  );
};

export interface IEmployeeListNoticesProps {
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
 * Info: (20260907 - Julian) 三條的順序是**一前一後，不是三種看法**。
 *
 * 沒有到職日的人補完之後，才可能出現在「缺薪資單」那一條裡 ——
 * 完整度是從到職日往後推的。順序反過來的話，使用者會先去處理一份
 * 還不完整的名單。缺信箱與另外兩條無關，放最前面是因為它最單純。
 *
 * 一條都不需要顯示時回 `null`，讓呼叫端不必自己判斷該不該留那段間距。
 */
const EmployeeListNotices: FC<IEmployeeListNoticesProps> = ({
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

  if (
    missingEmailCount === 0 &&
    missingHireDateCount === 0 &&
    missingRecordsCount === 0
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {/**
       * Info: (20260904 - Julian) 缺信箱。寄薪資單靠 email，沒填的人寄不出去，
       * 而在此之前唯一看得出「誰沒填」的方法是逐一點開編輯 —— 五十個人就是五十次。
       */}
      {missingEmailCount > 0 && (
        <Notice
          tone="amber"
          message={t("calculator.employee_list.missing_email_banner", {
            count: missingEmailCount,
          })}
          isFiltering={onlyMissingEmail}
          filterLabel={t("calculator.employee_list.only_missing_email")}
          onToggle={toggleMissingEmail}
        />
      )}

      {/**
       * Info: (20260906 - Luphia) 沒有到職日（#6774）。
       *
       * 完整度是從到職日往後推的，沒有到職日就算不出來 —— 而算不出來時
       * 畫面上**什麼都不顯示**，與「大家都很完整」長得一模一樣。
       * `hire_date` 是 20260902 才加的可空欄位、沒有回填，所以既有帳本的
       * 員工全部是空的。少了這一條，功能上線那天使用者看到一片空白，
       * 結論會是「這功能沒做」或「我們資料很完整」—— 兩個都不對。
       *
       * 「不知道就不要說」是對的，但要補上另外半句：**說出為什麼不知道**。
       */}
      {missingHireDateCount > 0 && (
        <Notice
          tone="sky"
          message={t("calculator.employee_list.missing_hire_date_banner", {
            count: missingHireDateCount,
          })}
          isFiltering={onlyMissingHireDate}
          filterLabel={t("calculator.employee_list.only_missing_hire_date")}
          onToggle={toggleMissingHireDate}
        />
      )}

      {/* Info: (20260905 - Luphia) 缺薪資單（#6774）：要回計算機把那幾個月算出來 */}
      {missingRecordsCount > 0 && (
        <Notice
          tone="amber"
          message={t("calculator.employee_list.missing_records_banner", {
            count: missingRecordsCount,
          })}
          isFiltering={onlyMissingRecords}
          filterLabel={t("calculator.employee_list.only_missing_records")}
          onToggle={toggleMissingRecords}
        />
      )}
    </div>
  );
};

export default EmployeeListNotices;
