"use client";

import { FC } from "react";
import { AlertTriangle, ArrowRight, Info, X } from "lucide-react";
import { useTranslation } from "@/i18n/i18n_context";
import { numberWithCommas } from "@/lib/utils/common";
import { ISalaryRecordSummary } from "@/interfaces/salary_record";

interface IBaseSalaryChangeModalProps {
  record: ISalaryRecordSummary;
  closeHandler: () => void;
  fullHistoryHandler: () => void;
}

/**
 * Info: (20260908 - Julian) 「這個月的本薪為什麼變了」。
 *
 * 計劃書：`documents/architecture/salary_profile_change_history_plan.md` §16
 *
 * ## 兩層資料，缺一層仍然說得出話
 *
 * - `baseSalaryDelta`：較上一筆的差額。**一律有**（只要有更早的紀錄），
 *   由紀錄本身算出來，不需要使用者做任何額外動作。
 * - `baseSalaryChange`：員工檔的異動紀錄。**有的時候才有**，
 *   能說出誰改的、原因、從哪個月起生效。
 *
 * 第二層缺席時不是留白，而是**明說它缺席**：那句話本身就是答案 ——
 * 多半是在計算機上選了「只存這一次」，員工檔沒被改。
 * 20260908 的實測就是撞到這個：畫面上兩個月差一萬，而系統說「沒有異動」。
 *
 * ## 為什麼不直接開完整歷程
 *
 * 使用者現在看的是九月。開整條時間軸會把他從九月帶走，
 * 而他的問題只有「這 −10,000 是怎麼來的」。完整歷程留成第二個點擊。
 *
 * ## 為什麼是彈窗而不是就地展開那一列
 *
 * `DataTable` 不支援展開列，而它有 16 個頁面在用 —— 為了這一個功能改共用元件
 * 是錯的交換（20260906 那次「`className` 只到 `<th>`」是同一個教訓）。
 * 彈窗標題直接寫著月份，所以「我還在看九月」沒有丟掉。
 */
const BaseSalaryChangeModal: FC<IBaseSalaryChangeModalProps> = ({
  record,
  closeHandler,
  fullHistoryHandler,
}) => {
  const { t } = useTranslation();
  const delta = record.baseSalaryDelta;
  const change = record.baseSalaryChange;

  // Info: (20260908 - Julian) 呼叫端只在有差額時渲染；這一行是型別窄化，不是防禦
  if (delta === null) return null;

  const recordedText =
    change === null
      ? ""
      : (() => {
          const at = new Date(change.recordedAt * 1000);
          const month = `${at.getMonth() + 1}`.padStart(2, "0");
          const day = `${at.getDate()}`.padStart(2, "0");
          return `${at.getFullYear()}-${month}-${day}`;
        })();

  /**
   * Info: (20260908 - Julian) 異動後的本薪與**這個月實際試算用的**本薪不一致。
   *
   * 這是一個真的會出錯的組合：有人把員工檔調成 9 月起 30,000，
   * 但九月的薪資是在調整**之前**就算好存下的（或試算時手動改回舊值）——
   * 於是薪資單上的本薪是 29,000，而員工檔說 30,000。
   *
   * 兩個數字都不是錯的（一個是條件、一個是那次試算的事實），
   * 但它們不一致這件事**只有並排時看得出來**。
   * 不擋、不自動修，只說出來 —— 要不要重算是使用者的判斷。
   */
  /**
   * Info: (20260910 - Luphia) `after` 為 null 時不比對（review 建-1）。
   *
   * 「刪除員工」那一列沒有「之後」，而 `record.baseSalary !== null` 恆為真 ——
   * 不擋的話那句警告會對每一筆這種紀錄跳出來，內容還是「與 null 不符」。
   */
  const mismatchedAfter =
    change !== null &&
    change.after !== null &&
    record.baseSalary !== change.after
      ? change.after
      : null;

  return (
    <div className="font-barlow fixed inset-0 z-70 flex items-center justify-center bg-black/50 p-[16px]">
      <div className="bg-surface-neutral-surface-lv2 flex w-full max-w-[460px] flex-col gap-[16px] rounded-xl p-[20px] md:p-[24px]">
        <div className="flex items-start justify-between gap-[12px]">
          <div className="flex flex-col gap-[2px]">
            <h2 className="text-text-neutral-primary text-base font-bold">
              {t("calculator.records.base_salary_delta_title", {
                year: record.year,
                month: record.month,
              })}
            </h2>
            <p className="text-text-neutral-secondary text-sm">
              {record.employee.name}
              {record.employee.number !== "" && `（${record.employee.number}）`}
            </p>
          </div>
          <button
            type="button"
            onClick={closeHandler}
            className="text-text-neutral-tertiary hover:text-text-neutral-primary shrink-0 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="bg-surface-neutral-surface-lv1 flex flex-col items-center gap-[4px] rounded-lg py-[14px]">
          <div className="flex items-center gap-[10px]">
            <span className="text-text-neutral-tertiary text-lg">
              {numberWithCommas(delta.previous)}
            </span>
            <ArrowRight size={16} className="text-text-neutral-tertiary" />
            <span className="text-text-neutral-primary text-lg font-bold">
              {numberWithCommas(record.baseSalary)}
            </span>
            <span
              className={`text-sm font-semibold ${delta.delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}
            >
              {delta.delta >= 0 ? "+" : "−"}
              {numberWithCommas(Math.abs(delta.delta))}
            </span>
          </div>
          {/**
           * Info: (20260908 - Julian) 「跟哪個月比」必須寫出來。
           *
           * 「上一筆」不保證是上一個月 —— 八月沒存紀錄的話，九月的上一筆是七月。
           * 一個光禿禿的 −10,000 那時候就是一句沒說清楚的話。
           */}
          <p className="text-text-neutral-tertiary text-xs">
            {t("calculator.records.base_salary_delta_vs", {
              year: delta.previousYear,
              month: delta.previousMonth,
            })}
          </p>
        </div>

        {change === null ? (
          /**
           * Info: (20260908 - Julian) 沒有對應的員工檔異動 —— **明說，不留白。**
           *
           * 這是最常見的情況：在計算機上改了本薪、選了「只存這一次」。
           * 留白的話使用者只知道「沒東西」，而這句話給他下一步。
           *
           * ## 為什麼指示裡一定要帶年月
           *
           * 「請到員工列表編輯異動原因」聽起來夠清楚，但照著做**不會補上
           * 這一個月的原因** —— 員工列表的編輯會產生一筆**新的**異動列，
           * 生效月份是他在那裡選的（預設當期）。於是他照做完之後回來，
           * 這裡仍然顯示「沒有對應的異動紀錄」。
           *
           * 所以指示必須說到生效月份，而且要說出**是哪一個月**：
           * 「本月」在這裡是有歧義的（這一筆的期間 vs 今天所在的月份）。
           * 年月從 `record` 帶進文案，使用者不必自己回頭看標題。
           */
          <div className="flex gap-[8px] rounded-lg bg-slate-50 p-[12px]">
            <Info size={16} className="mt-[2px] shrink-0 text-slate-500" />
            <p className="text-xs leading-relaxed text-slate-700">
              {t("calculator.records.base_salary_no_change_record", {
                year: record.year,
                month: record.month,
              })}
            </p>
          </div>
        ) : (
          <>
            {change.count > 1 && (
              <p className="text-text-neutral-secondary text-xs">
                {t("calculator.records.base_salary_change_count", {
                  count: change.count,
                })}
              </p>
            )}

            <dl className="flex flex-col gap-[8px] text-sm">
              <div className="flex gap-[8px]">
                <dt className="text-text-neutral-tertiary w-[72px] shrink-0">
                  {t("calculator.employee_list.change_reason")}
                </dt>
                <dd className="text-text-neutral-primary">
                  {change.reason !== null && change.reason !== ""
                    ? change.reason
                    : "—"}
                </dd>
              </div>
              <div className="flex gap-[8px]">
                <dt className="text-text-neutral-tertiary w-[72px] shrink-0">
                  {t("calculator.records.base_salary_change_recorded")}
                </dt>
                <dd className="text-text-neutral-primary">
                  {t("calculator.employee_list.recorded_by", {
                    name:
                      change.changedBy.name ??
                      t("calculator.employee_list.unknown_user"),
                    at: recordedText,
                  })}
                </dd>
              </div>
            </dl>
          </>
        )}

        {mismatchedAfter !== null && (
          <div className="flex gap-[8px] rounded-lg bg-amber-50 p-[12px]">
            <AlertTriangle
              size={16}
              className="mt-[2px] shrink-0 text-amber-700"
            />
            <p className="text-xs leading-relaxed text-amber-900">
              {t("calculator.records.base_salary_mismatch", {
                used: numberWithCommas(record.baseSalary),
                changed: numberWithCommas(mismatchedAfter),
              })}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-[12px]">
          <button
            type="button"
            onClick={fullHistoryHandler}
            className="text-text-brand-primary-lv1 bg-surface-brand-primary-soft rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-60"
          >
            {t("calculator.records.base_salary_change_full_history")}
          </button>
          <button
            type="button"
            onClick={closeHandler}
            className="text-text-neutral-secondary ring-stroke-neutral-quaternary hover:bg-surface-hover flex h-10 items-center justify-center rounded-xl px-[20px] text-sm font-semibold ring-1 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaseSalaryChangeModal;
