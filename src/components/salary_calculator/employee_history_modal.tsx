"use client";

import { FC, useState } from "react";
import { ArrowRight, History, Loader2, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { numberWithCommas } from "@/lib/utils/common";
import { useSalaryProfileChanges } from "@/hooks/use_salary_profile_changes";
import { ISalaryProfileChange } from "@/interfaces/salary_record";
import {
  SALARY_PROFILE_FIELDS,
  SalaryProfileField,
  SalaryProfileValue,
  isDefaultVisibleProfileField,
} from "@/lib/utils/salary_profile_diff";

interface IEmployeeHistoryModalProps {
  accountBookId: string;
  /**
   * Info: (20260908 - Julian) 只要 id、姓名、編號 —— **不收整個 `ISalaryCalculatorEmployee`**。
   *
   * 這個彈窗只拿它們做兩件事：抓歷程（id）與寫標題（姓名、編號）。
   * 收整個員工物件的話，薪資紀錄頁就開不了它 ——
   * 那一頁手上只有 `record.employee`（三個欄位），沒有本薪與投保狀態，
   * 而為了滿足型別去多抓一次員工名單是純粹的浪費。
   *
   * 型別窄到剛好用得到的那幾個欄位，呼叫端就自然變多。
   */
  employee: { id: string; name: string; number: string };
  modalVisibleHandler: () => void;
}

/**
 * Info: (20260908 - Julian) 每個欄位的值該怎麼讀。
 *
 * 型別是 `Record<SalaryProfileField, ...>`，所以**漏一個欄位就編譯失敗** ——
 * 新增員工檔欄位時「它在歷程上長什麼樣」是被迫回答的問題。
 * 沒有這一層的話，新欄位會用 `String(value)` 顯示，
 * 而一個布林值在畫面上變成 `false`、金額變成 `45000`（沒有千分位）。
 */
const FIELD_KIND: Record<
  SalaryProfileField,
  "amount" | "bool" | "int" | "percent" | "date" | "text" | "employment"
> = {
  baseSalary: "amount",
  mealAllowance: "amount",
  otherAllowanceTaxable: "amount",
  otherAllowanceTaxFree: "amount",
  isForeignWorker: "bool",
  baseSalary30Days: "bool",
  isLaborInsured: "bool",
  isHealthInsured: "bool",
  isPensionInsured: "bool",
  industryCode: "int",
  dependentsCount: "int",
  voluntaryPensionRate: "percent",
  hireDate: "date",
  resignDate: "date",
  // Info: (20260909 - Julian) 留職停薪起訖（#6774）；與到職日同樣是 UTC 午夜的日期
  leaveStartDate: "date",
  leaveEndDate: "date",
  name: "text",
  number: "text",
  email: "text",
  employmentType: "employment",
};

/**
 * Info: (20260908 - Julian) 到職／離職日用 **UTC** 讀，不用本地時區。
 *
 * 它們在資料庫裡是「某一天的午夜 UTC」（`toDateOrNull` 由 Unix 秒還原），
 * 也就是**日期**而不是時刻。用 `getMonth()` 這類本地方法讀的話，
 * UTC+8 以西的時區會把 2026-08-15 顯示成 2026-08-14 ——
 * 而那是薪資單上的到職日，差一天就是差一天的薪水。
 *
 * `recordedAt` 相反：它是真的時刻（伺服器按下寫入的那一瞬間），
 * 所以用本地時間顯示才對得上使用者的感覺。
 */
const formatDateUtc = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
};

const formatInstant = (unixSeconds: number): string => {
  const date = new Date(unixSeconds * 1000);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day} ${hour}:${minute}`;
};

const EmployeeHistoryModal: FC<IEmployeeHistoryModalProps> = ({
  accountBookId,
  employee,
  modalVisibleHandler,
}) => {
  const { t } = useTranslation();

  /**
   * Info: (20260908 - Julian) 預設只勾「影響金額或勞檢會問」的那些欄位。
   *
   * 全部欄位一起顯示的話，一次「把打錯的姓名改回來」會與一次調薪
   * 長得一樣重要 —— 而使用者打開這一頁多半是為了找調薪。
   * 清單來自 `SALARY_PROFILE_FIELD_VISIBILITY`（單一來源），
   * 不在這裡另列一份。
   */
  const [selectedFields, setSelectedFields] = useState<SalaryProfileField[]>(
    () => SALARY_PROFILE_FIELDS.filter(isDefaultVisibleProfileField),
  );

  const {
    changes,
    totalCount,
    recordedSince,
    isLoading,
    hasError,
    hasMore,
    loadMore,
  } = useSalaryProfileChanges(accountBookId, employee.id, selectedFields);

  const toggleField = (field: SalaryProfileField) =>
    setSelectedFields((previous) =>
      previous.includes(field)
        ? previous.filter((item) => item !== field)
        : [...previous, field],
    );

  const labelOf = (field: string): string =>
    t(`calculator.employee_list.field_labels.${field}`);

  const formatValue = (field: string, value: SalaryProfileValue): string => {
    // Info: (20260908 - Julian) null 是「沒有這個值」，不是 0 也不是空字串
    if (value === null || value === "") return "—";

    const kind = FIELD_KIND[field as SalaryProfileField] ?? "text";

    switch (kind) {
      case "amount":
        return numberWithCommas(Number(value));
      case "bool":
        return value
          ? t("calculator.employee_list.field_true")
          : t("calculator.employee_list.field_false");
      case "percent":
        return `${value}%`;
      case "date":
        return formatDateUtc(Number(value));
      case "employment":
        return value === "FULL_TIME"
          ? t("calculator.basic_info_form.full_time")
          : t("calculator.basic_info_form.part_time");
      default:
        return String(value);
    }
  };

  /**
   * Info: (20260908 - Julian) 生效期間與記錄時刻不同月時標出來。
   *
   * 這是這張表最容易被讀錯的地方：一筆「4 月起生效」的列可能是 2 月就決定的、
   * 也可能是 4/20 才補登的，而那兩件事對稽核的意義完全不同。
   * 兩個時間都印在畫面上，但**只有標籤會讓人真的注意到差異** ——
   * 兩個日期並排時，讀者通常只看第一個。
   */
  const timingHintOf = (change: ISalaryProfileChange): string | null => {
    const recorded = new Date(change.recordedAt * 1000);
    const recordedYear = recorded.getFullYear();
    const recordedMonth = recorded.getMonth() + 1;

    const effectiveIndex = change.effectiveYear * 12 + change.effectiveMonth;
    const recordedIndex = recordedYear * 12 + recordedMonth;

    if (effectiveIndex === recordedIndex) return null;
    return effectiveIndex < recordedIndex
      ? t("calculator.employee_list.timing_backdated")
      : t("calculator.employee_list.timing_scheduled");
  };

  const actionLabelOf = (action: ISalaryProfileChange["action"]): string => {
    if (action === "CREATE") return t("calculator.employee_list.action_create");
    if (action === "DELETE") return t("calculator.employee_list.action_delete");
    return t("calculator.employee_list.action_update");
  };

  const actionStyleOf = (action: ISalaryProfileChange["action"]): string => {
    if (action === "CREATE") return "bg-emerald-50 text-emerald-800";
    if (action === "DELETE") return "bg-rose-50 text-rose-800";
    return "bg-orange-50 text-orange-900";
  };

  const body = (() => {
    if (isLoading && changes.length === 0) {
      return (
        <div className="text-text-neutral-tertiary flex items-center justify-center gap-[10px] py-[60px] text-sm">
          <Loader2 size={18} className="animate-spin" />
          {t("calculator.employee_list.history_loading")}
        </div>
      );
    }

    if (hasError) {
      return (
        <p className="text-text-state-error py-[60px] text-center text-sm">
          {t("calculator.employee_list.history_load_failed")}
        </p>
      );
    }

    if (changes.length === 0) {
      return (
        <div className="flex flex-col items-center gap-[12px] px-[24px] py-[60px] text-center">
          <History size={26} className="text-text-neutral-tertiary shrink-0" />
          <p className="text-text-neutral-secondary text-sm leading-relaxed">
            {selectedFields.length === SALARY_PROFILE_FIELDS.length ||
            selectedFields.length === 0
              ? t("calculator.employee_list.history_empty")
              : t("calculator.employee_list.history_empty_filtered")}
          </p>
        </div>
      );
    }

    return (
      <ul className="flex flex-col gap-[10px]">
        {changes.map((change) => {
          const timingHint = timingHintOf(change);
          const month = `${change.effectiveMonth}`.padStart(2, "0");

          return (
            <li
              key={change.id}
              className="border-stroke-neutral-quaternary flex flex-col gap-[8px] rounded-xl border p-[14px]"
            >
              <div className="flex flex-wrap items-center gap-[8px]">
                <span className="text-text-neutral-primary text-sm font-bold">
                  {change.effectiveYear}-{month}
                </span>
                <span
                  className={`rounded-md px-[8px] py-[2px] text-xs font-semibold ${actionStyleOf(change.action)}`}
                >
                  {actionLabelOf(change.action)}
                </span>
                {timingHint !== null && (
                  <span className="bg-surface-neutral-surface-lv1 text-text-neutral-secondary rounded-md px-[8px] py-[2px] text-xs font-medium">
                    {timingHint}
                  </span>
                )}
              </div>

              {change.changes.length > 0 && (
                <ul className="flex flex-col gap-[4px]">
                  {change.changes.map((delta) => (
                    <li
                      key={delta.field}
                      className="flex flex-wrap items-center gap-[6px] text-sm"
                    >
                      <span className="text-text-neutral-secondary">
                        {labelOf(delta.field)}
                      </span>
                      <span className="text-text-neutral-tertiary">
                        {formatValue(delta.field, delta.before)}
                      </span>
                      <ArrowRight
                        size={13}
                        className="text-text-neutral-tertiary shrink-0"
                      />
                      <span className="text-text-neutral-primary font-semibold">
                        {formatValue(delta.field, delta.after)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {change.reason !== null && change.reason !== "" && (
                <p className="text-text-neutral-secondary text-xs">
                  {t("calculator.employee_list.change_reason")}：{change.reason}
                </p>
              )}

              <p className="text-text-neutral-tertiary text-xs">
                {t("calculator.employee_list.recorded_by", {
                  name:
                    change.changedBy.name ??
                    t("calculator.employee_list.unknown_user"),
                  at: formatInstant(change.recordedAt),
                })}
              </p>
            </li>
          );
        })}
      </ul>
    );
  })();

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-[16px]">
      <div className="bg-surface-neutral-surface-lv2 flex max-h-[90vh] w-full max-w-[720px] flex-col rounded-xl">
        <div className="flex shrink-0 items-start justify-between gap-[12px] px-[20px] pt-[20px] md:px-[32px]">
          <div className="flex flex-col gap-[2px]">
            <h2 className="text-text-neutral-primary text-lg font-bold">
              {t("calculator.employee_list.history_title")}
            </h2>
            <p className="text-text-neutral-secondary text-sm">
              {employee.name}（{employee.number}）
            </p>
          </div>
          <button
            type="button"
            onClick={modalVisibleHandler}
            className="text-text-neutral-tertiary hover:text-text-neutral-primary shrink-0 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/**
         * Info: (20260908 - Julian) **這段說明是必要的，不是客套。**
         *
         * 這張表從功能上線那天才開始有資料。一張沒說明起點的異動表，
         * 讀者會把空白讀成「沒有變動」—— 對稽核而言那比沒有這張表更糟
         * （計劃書 §8）。
         *
         * 刻意不做「從薪資紀錄回推更早的歷程」：回推的結果會隨著薪資紀錄
         * 被重存而改變（同年同月是唯一鍵、可覆寫），也就是同一個問題
         * 今天問和明天問可能不同答案 —— 那種東西放在稽核軌跡旁邊，
         * 遲早會被當成當時的紀錄。指路比重建誠實。
         */}
        <div className="text-text-neutral-tertiary bg-surface-neutral-surface-lv1 mx-[20px] mt-[14px] shrink-0 rounded-lg px-[12px] py-[10px] text-xs leading-relaxed md:mx-[32px]">
          {recordedSince === null
            ? t("calculator.employee_list.history_no_record_yet")
            : t("calculator.employee_list.history_since", {
                date: formatDateUtc(recordedSince),
              })}
        </div>

        <div className="shrink-0 px-[20px] pt-[14px] md:px-[32px]">
          <p className="text-text-neutral-secondary mb-[6px] text-xs font-semibold">
            {t("calculator.employee_list.history_field_filter")}
          </p>
          <div className="flex flex-wrap gap-[6px]">
            {SALARY_PROFILE_FIELDS.map((field) => {
              const isOn = selectedFields.includes(field);
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => toggleField(field)}
                  aria-pressed={isOn}
                  className={`rounded-lg border px-[10px] py-[4px] text-xs font-medium transition-colors ${
                    isOn
                      ? "border-text-brand-primary-lv1 bg-surface-brand-primary-soft text-text-brand-primary-lv1"
                      : "border-stroke-neutral-quaternary text-text-neutral-tertiary hover:text-text-neutral-primary"
                  }`}
                >
                  {labelOf(field)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grow overflow-y-auto px-[20px] py-[14px] md:px-[32px]">
          {body}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-[12px] px-[20px] pb-[16px] md:px-[32px]">
          <p className="text-text-neutral-tertiary text-xs">
            {t("calculator.employee_list.history_count", {
              shown: changes.length,
              total: totalCount,
            })}
          </p>
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={isLoading}
              className="text-text-brand-primary-lv1 text-sm font-semibold hover:underline disabled:opacity-60"
            >
              {isLoading
                ? t("calculator.employee_list.history_loading")
                : t("calculator.employee_list.history_load_more")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeHistoryModal;
