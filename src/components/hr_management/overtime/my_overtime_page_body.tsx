"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Clock4, Loader2, Plus, Send } from "lucide-react";
import {
  OvertimeCompensationMode,
  OvertimeFilingType,
  OVERTIME_REASON_MAX_LENGTH,
} from "@/constants/overtime";
import { OVERTIME_API } from "@/constants/overtime_api";
import { MINUTES_PER_DAY } from "@/constants/attendance";
import {
  DEFAULT_SPAN_MINUTES,
  daysBetweenIso,
  parseLocalDateTime,
  shiftLocalDateTime,
} from "@/lib/leave_span";
import {
  IOvertimeRequestSummary,
  IOvertimeSummaryView,
} from "@/interfaces/overtime";
import HrFormSheet from "@/components/hr_management/hr_form_sheet";
import OvertimeRequestList from "@/components/hr_management/overtime/overtime_request_list";
import OvertimeSummaryCards from "@/components/hr_management/overtime/overtime_summary_cards";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { OVERTIME_ERROR_I18N_KEY } from "@/lib/utils/overtime_error_message";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 我的加班（L24 / L25 / L28）。
 *
 * 統計放在表單上面：§32 II 的上限是硬的，越過就是違法而核准端會直接擋。
 * 員工在**填單之前**就該看得到「這個月還剩幾小時」，否則他只會收到一個
 * 被拒絕的結果，而不知道要縮短多少（同請假頁把試算放在送出鈕上面的理由）。
 */

/** Info: (20260818 - Julian) 以**當地**日期取今天，不用 `toISOString()`（那是 UTC，跨月會差一天） */
const localIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Info: (20260818 - Julian) 事前／事後**不是偏好，是事實**，因此由日期推出預設。
 *
 * 今天算事後（班別窗多半已經開了）。一律預設 `ADVANCE` 的話，照預設值送出
 * 必定被 `assertOvertimeFilingType` 擋下 —— 那條不變式擋的是「事後補的單被
 * 標成事前申請」（事後補單證據力較低，謊報對填單的人有利）。
 * 真的事前報備的人可以自己改回來，而伺服器端仍會再驗一次；
 * 這裡只負責不要引導人去撞牆。
 */
const filingTypeFor = (workDate: string, today: string): OvertimeFilingType =>
  workDate > today ? OvertimeFilingType.ADVANCE : OvertimeFilingType.POST_HOC;

/** Info: (20260818 - Julian) "HH:MM" → 當日 00:00 起算的分鐘數 */

const MyOvertimePageBody: FC = () => {
  const { t } = useTranslation();

  const [summary, setSummary] = useState<IOvertimeSummaryView | null>(null);
  const [requests, setRequests] = useState<IOvertimeRequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * Info: (20260818 - Julian) 預設本月。用瀏覽器時鐘無妨：它只決定查哪個月，
   * 沒有任何判定依賴它（打卡與認列一律走伺服器的政策時區）。
   */
  const [month, setMonth] = useState(() =>
    localIsoDate(new Date()).slice(0, 7),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  /**
   * Info: (20260819 - Julian) 起訖各是一個「日期＋時刻」。
   *
   * 跨夜不靠「結束早於開始即視為隔日」那種隱含規則 —— 工地的夜間搶修就是
   * 跨夜的，而要使用者在心裡完成那個推論，是把系統的方便當成他的責任。
   * `18:00 → 隔天 02:00` 是兩個看得見的日期。
   *
   * 落庫形狀不變（`workDate` + 兩個分鐘數、>= 1440 表次日），換算在 `payload`。
   */
  const [startAt, setStartAt] = useState(
    () => `${localIsoDate(new Date())}T18:00`,
  );
  const [endAt, setEndAt] = useState(() => `${localIsoDate(new Date())}T20:00`);

  /**
   * Info: (20260819 - Julian) 「起」不設上界，「迄」只設下界（`min = 起`）。
   *
   * 兩邊都限制會**互相咬住**：日期選錯時「起」被「迄」擋在上界之前、
   * 「迄」被「起」擋在下界之後，使用者得把兩個 picker 都清掉才能重選 ——
   * 為了防一種錯誤而製造出更難脫身的另一種。單向約束沒有死結：
   * 永遠可以先改「起」把下界移開。改「起」時順手把「迄」帶到一小時後。
   *
   * `min` 只約束選單，部分瀏覽器允許直接鍵入 —— 真正的護欄是
   * `span === null` 時送出鈕按不下去。**護欄與提示是兩件事。**
   */
  const pickStart = (value: string): void => {
    setStartAt(value);
    setEndAt(shiftLocalDateTime(value, DEFAULT_SPAN_MINUTES) ?? "");
  };

  const [filingType, setFilingType] = useState<OvertimeFilingType>(() =>
    filingTypeFor(localIsoDate(new Date()), localIsoDate(new Date())),
  );
  const [compensationMode, setCompensationMode] =
    useState<OvertimeCompensationMode>(OvertimeCompensationMode.PAYMENT);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [summaryRes, requestRes] = await Promise.all([
        request<IEnvelopeLike<IOvertimeSummaryView>>(OVERTIME_API.SUMMARY, {
          query: { month },
        }),
        request<IEnvelopeLike<IOvertimeRequestSummary[]>>(OVERTIME_API.REQUEST),
      ]);
      setSummary(summaryRes.payload);
      setRequests(requestRes.payload ?? []);
    } catch (error) {
      setLoadError(
        t(
          errorI18nKeyOf(
            error,
            "hr_management.overtime.error_load",
            OVERTIME_ERROR_I18N_KEY,
          ),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [month, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  /**
   * Info: (20260818 - Julian) 改日期就重推申請時序 —— 它是那個日期的事實，
   * 不是使用者上一次的選擇。改完仍可手動改回來（見 `filingTypeFor`）。
   */
  // Info: (20260819 - Julian) 工作日就是**起**的那一天；跨夜的加班仍屬起始日
  const workDate = startAt.slice(0, 10);

  useEffect(() => {
    setFilingType(filingTypeFor(workDate, localIsoDate(new Date())));
  }, [workDate]);

  /**
   * Info: (20260819 - Julian) 兩個 datetime 換算成落庫的形狀。
   *
   * `requestedEndMinute >= 1440` 表次日 —— 跨越幾天就加幾個 1440，
   * 與 `ShiftPattern` 同型別同語意。使用者填的永遠是牆上時鐘。
   */
  const span = useMemo(() => {
    const start = parseLocalDateTime(startAt);
    const end = parseLocalDateTime(endAt);
    if (start === null || end === null) return null;

    const dayOffset = daysBetweenIso(start.workDate, end.workDate);
    if (dayOffset === null || dayOffset < 0) return null;

    const requestedEndMinute = dayOffset * MINUTES_PER_DAY + end.minuteOfDay;
    if (requestedEndMinute <= start.minuteOfDay) return null;

    return {
      workDate: start.workDate,
      requestedStartMinute: start.minuteOfDay,
      requestedEndMinute,
    };
  }, [startAt, endAt]);

  const submit = async () => {
    if (span === null) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await request(OVERTIME_API.REQUEST, {
        method: "POST",
        body: JSON.stringify({
          ...span,
          filingType,
          compensationMode,
          reason,
        }),
      });

      setReason("");
      setSheetOpen(false);
      await reload();
    } catch (error) {
      setSubmitError(
        t(
          errorI18nKeyOf(
            error,
            "hr_management.overtime.error_submit",
            OVERTIME_ERROR_I18N_KEY,
          ),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Info: (20260818 - Julian) 使用者手動選了一個與日期矛盾的時序。
   * 只看得出「必定錯」的兩種組合；今天這一格由班別窗決定，前端不知道窗在哪。
   */
  const filingMismatch =
    (filingType === OvertimeFilingType.ADVANCE &&
      workDate < localIsoDate(new Date())) ||
    (filingType === OvertimeFilingType.POST_HOC &&
      workDate > localIsoDate(new Date()));

  /**
   * Info: (20260819 - Julian) 起訖填不完整或迄不晚於起時 `span` 為 null，
   * 送出鈕就按不下去 —— 送了必定被 validator 或不變式擋。
   */
  const canSubmit = !submitting && reason.trim().length > 0 && span !== null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        {t("hr_management.overtime.loading")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      {loadError && (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700 ring-1 ring-rose-200">
          {loadError}
        </p>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">
            {t("hr_management.overtime.summary_title")}
          </h2>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
          />
        </div>

        {summary !== null && <OvertimeSummaryCards summary={summary} />}
      </section>

      {/**
       * Info: (20260818 - Julian) 手機版的表單入口。
       * 桌機不需要它 —— 表單一直在畫面上（`HrFormSheet` 的 `lg:` 版型）。
       */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 lg:hidden"
      >
        <Plus className="size-4" />
        {t("hr_management.overtime.form_title")}
      </button>

      <HrFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t("hr_management.overtime.form_title")}
        icon={<Clock4 className="size-4 text-sky-500" />}
      >
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            {t("hr_management.overtime.field_start_at")}
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => pickStart(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            {t("hr_management.overtime.field_end_at")}
            <input
              type="datetime-local"
              value={endAt}
              min={startAt === "" ? undefined : startAt}
              onChange={(event) => setEndAt(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>
        </div>

        {/**
         * Info: (20260819 - Julian) 這是**申請**的時數，不是認列的
         * （認列 = `min(核准, 打卡事實)`，核准當下才定得下來）。
         * 先講它，因為它是使用者唯一能直接驗算的數字。
         */}
        {span !== null && (
          <p className="mt-1 text-xs text-gray-500">
            {t("hr_management.overtime.span_selected", {
              hours: (
                (span.requestedEndMinute - span.requestedStartMinute) /
                60
              ).toFixed(1),
            })}
          </p>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            {t("hr_management.overtime.field_filing")}
            <select
              value={filingType}
              onChange={(event) =>
                setFilingType(event.target.value as OvertimeFilingType)
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            >
              <option value={OvertimeFilingType.ADVANCE}>
                {t("hr_management.overtime.filing_advance")}
              </option>
              <option value={OvertimeFilingType.POST_HOC}>
                {t("hr_management.overtime.filing_post_hoc")}
              </option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-gray-600">
            {t("hr_management.overtime.field_compensation")}
            <select
              value={compensationMode}
              onChange={(event) =>
                setCompensationMode(
                  event.target.value as OvertimeCompensationMode,
                )
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            >
              <option value={OvertimeCompensationMode.PAYMENT}>
                {t("hr_management.overtime.compensation_payment")}
              </option>
              <option value={OvertimeCompensationMode.COMPENSATORY_LEAVE}>
                {t("hr_management.overtime.compensation_leave")}
              </option>
            </select>
          </label>
        </div>

        {/**
         * Info: (20260818 - Julian) 同一句規則，選擇必定被擋時改成琥珀色。
         * 不另寫警告文案：要說的話完全相同，差別只在「這是規則」與
         * 「你違反了它」，那個差別用顏色說得完 —— 而多一個 key 要改五個語系。
         */}
        <p
          className={`mt-1 text-xs leading-relaxed ${
            filingMismatch ? "text-amber-600" : "text-gray-400"
          }`}
        >
          {t("hr_management.overtime.filing_hint")}
        </p>
        {compensationMode === OvertimeCompensationMode.COMPENSATORY_LEAVE && (
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            {t("hr_management.overtime.compensation_hint")}
          </p>
        )}

        <label className="mt-3 flex flex-col gap-1 text-xs text-gray-600">
          {t("hr_management.overtime.field_reason")}
          <textarea
            value={reason}
            maxLength={OVERTIME_REASON_MAX_LENGTH}
            onChange={(event) => setReason(event.target.value)}
            rows={2}
            placeholder={t("hr_management.overtime.field_reason_placeholder")}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
          />
        </label>

        {/**
         * Info: (20260819 - Julian) 天災事變**沒有**勾選框，而且不該有。
         *
         * §32 IV 的構成要件是「天災、事變或突發事件」**且已依法報備** ——
         * 後者是一件對外發生的事（通知工會或報主管機關備查），不是一個
         * 申請人自填的布林值。認定改由 `HR_ADMIN` 在核准之前登記
         * （`.../emergency`）並強制附報備紀錄。
         *
         * 這裡留一句說明而不是 disabled 的勾選框 —— 一個永遠按不下去的
         * 勾選框，看的人只會以為功能壞了。
         */}
        <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
          {t("hr_management.overtime.field_emergency_moved_hint")}
        </p>

        {submitError && (
          <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {submitError}
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-fit"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {t("hr_management.overtime.action_submit")}
        </button>
      </HrFormSheet>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-800">
          {t("hr_management.overtime.my_requests_title")}
        </h2>
        <OvertimeRequestList
          requests={requests}
          emptyKey="hr_management.overtime.my_requests_empty"
          withdrawable
          onChanged={reload}
        />
      </section>
    </div>
  );
};

export default MyOvertimePageBody;
