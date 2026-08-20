"use client";

import { FC } from "react";
import { AlertTriangle, FileCheck2, FileQuestion } from "lucide-react";
import { OVERTIME_TIER_I18N_KEY } from "@/constants/overtime";
import { IOvertimeSummaryView } from "@/interfaces/overtime";
import {
  ceilRatioText,
  floorRatioText,
  MINUTES_PER_HOUR,
} from "@/lib/utils/hr_quantity_display";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 加班統計卡（L28）。
 *
 * ## 為什麼顯示「還剩幾小時」而不是百分比
 *
 * 使用率是 `已用 / 上限` 一個比例，而使用者要回答的問題是
 * 「這個月還能加幾小時」。端點刻意回分鐘與上限兩個數字讓畫面自己減
 * （§32 II 的分母是 46 還是 54 小時，取決於有沒有記載的同意）。
 *
 * ## 為什麼佐證來源占一整塊
 *
 * 勞動檢查會問「你們有多少加班沒有出勤紀錄佐證」。把它藏在小字裡，
 * 等於要人在被問到時才第一次看到這個數字（ADR 024 §2.2）。
 */
const OvertimeSummaryCards: FC<{ summary: IOvertimeSummaryView }> = ({
  summary,
}) => {
  const { t } = useTranslation();

  /**
   * Info: (20260818 - Julian) 分鐘轉小時只在顯示層做；一位小數足以表達「還剩 3.5 小時」。
   *
   * Info: (20260820 - Julian) 但**方向要分開**（review 第 7 輪 M28）。
   * 原本一律 `toFixed(1)`（四捨五入）：59 分鐘的剩餘額度會顯示成
   * 「還可加班 1.0 小時」，而使用者照著送出會被上限擋下 ——
   * 那正是這幾張卡片存在的理由（檔頭：「不然他只會收到一個被拒絕的結果」）。
   */

  /** Info: (20260820 - Julian) 「已經用掉多少」→ 進位。少報會讓人以為還有空間 */
  const usedHours = (minutes: number): string =>
    ceilRatioText(minutes, MINUTES_PER_HOUR) ?? "—";

  /**
   * Info: (20260820 - Julian) 「還可以用多少」與「上限是多少」→ 捨去。
   * 兩者多報的後果相同：使用者以為還能加，而核准端會擋下。
   */
  const availableHours = (minutes: number): string =>
    floorRatioText(minutes, MINUTES_PER_HOUR) ?? "—";

  const monthlyLeft = summary.monthlyLimitMinutes - summary.monthlyMinutes;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <div className="text-xs text-gray-500">
          {t("hr_management.overtime.summary_monthly")}
        </div>
        <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">
          {usedHours(summary.monthlyMinutes)}
          <span className="ml-1 text-sm font-normal text-gray-500">
            {t("hr_management.overtime.unit_hour")}
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-400">
          {t("hr_management.overtime.summary_limit", {
            hours: availableHours(summary.monthlyLimitMinutes),
          })}
        </div>
        {/**
         * Info: (20260818 - Julian) 貼著線或超過都要說出來。
         * 上限本身由核准端擋（越過即 throw），但員工在送出之前就該看得到 ——
         * 不然他只會收到一個被拒絕的結果，而不知道為什麼。
         */}
        <div
          className={`mt-2 text-xs font-medium ${monthlyLeft < 0 ? "text-rose-600" : "text-emerald-600"}`}
        >
          {monthlyLeft < 0
            ? t("hr_management.overtime.summary_over_limit")
            : t("hr_management.overtime.summary_remaining", {
                hours: availableHours(monthlyLeft),
              })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
        <div className="text-xs text-gray-500">
          {t("hr_management.overtime.summary_quarterly")}
        </div>
        <div className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums">
          {usedHours(summary.quarterlyMinutes)}
          <span className="ml-1 text-sm font-normal text-gray-500">
            {t("hr_management.overtime.unit_hour")}
          </span>
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-gray-400 tabular-nums">
          {summary.quarterFrom} – {summary.quarterTo}
        </div>
        {/**
         * Info: (20260818 - Julian) 未經同意放寬時**沒有**三個月上限 ——
         * 那不是「上限無限大」，是這條線不適用。顯示 0 或 138 都會讓畫面
         * 說出一個法律上不存在的限制。
         */}
        <div className="mt-2 text-xs text-gray-400">
          {summary.quarterlyLimitMinutes === null
            ? t("hr_management.overtime.summary_quarterly_none")
            : t("hr_management.overtime.summary_limit", {
                hours: availableHours(summary.quarterlyLimitMinutes),
              })}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-gray-200 sm:col-span-2 lg:col-span-1">
        <div className="text-xs text-gray-500">
          {t("hr_management.overtime.summary_by_tier")}
        </div>

        {summary.byTier.length === 0 ? (
          <p className="mt-2 text-sm text-gray-400">
            {t("hr_management.overtime.summary_empty")}
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1">
            {summary.byTier.map((entry) => (
              <li
                key={entry.tier}
                className="flex items-baseline justify-between gap-2 text-sm"
              >
                <span className="text-gray-600">
                  {t(OVERTIME_TIER_I18N_KEY[entry.tier])}
                </span>
                <span className="font-medium text-gray-800 tabular-nums">
                  {usedHours(entry.minutes)}
                  <span className="ml-0.5 text-xs font-normal text-gray-400">
                    {t("hr_management.overtime.unit_hour")}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex flex-col gap-1 border-t border-gray-100 pt-3 text-xs">
          <span className="flex items-center gap-1.5 text-gray-600">
            <FileCheck2 className="size-3.5 shrink-0 text-emerald-500" />
            {t("hr_management.overtime.summary_punch_backed")}
            <span className="ml-auto font-medium tabular-nums">
              {usedHours(summary.punchBackedMinutes)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <FileQuestion className="size-3.5 shrink-0 text-amber-500" />
            {t("hr_management.overtime.summary_declared")}
            <span className="ml-auto font-medium tabular-nums">
              {usedHours(summary.declaredMinutes)}
            </span>
          </span>
          {summary.declaredMinutes > 0 && (
            <span className="mt-1 flex items-start gap-1.5 leading-relaxed text-amber-700">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {t("hr_management.overtime.summary_evidence_hint")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default OvertimeSummaryCards;
