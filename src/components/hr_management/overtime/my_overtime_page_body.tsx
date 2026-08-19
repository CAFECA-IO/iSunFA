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
 * ## 為什麼統計放在表單上面
 *
 * §32 II 的上限是硬的 —— 越過就是違法，核准端會直接擋。員工在**填單之前**
 * 就該看得到「這個月還剩幾小時」，否則他只會收到一個被拒絕的結果，
 * 而不知道要縮短多少（同請假頁把試算放在送出鈕上面的理由）。
 *
 * ## 時間怎麼填
 *
 * 兩個 `<input type="time">`。結束早於開始即視為隔日 —— 工地夜班很常見，
 * 而要人自己換算成「26:00」是把資料模型的表示法推給使用者。
 */

/** Info: (20260818 - Julian) 以**當地**日期取今天，不用 `toISOString()`（那是 UTC，跨月會差一天） */
const localIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * Info: (20260818 - Julian) 事前／事後**不是偏好，是事實**，因此由日期推出來當預設。
 *
 * 舊的預設一律 `ADVANCE`，而 `workDate` 預設是今天 —— 於是早上七點半班別窗
 * 一開，任何人照預設值送出都必定被 `assertOvertimeFilingType` 擋下
 * （那條不變式擋的是「事後補的單被標成事前申請」，因為事後補單在勞動檢查時
 * 證據力較低，謊報對填單的人有利）。規則是對的，預設值是錯的。
 *
 * 今天算事後：班別窗多半已經開了。真的在上班前就先報備的人可以自己改回來，
 * 而那個選擇仍然會被伺服器端的不變式驗一次 —— 這裡只負責不要引導人去撞牆。
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
   * Info: (20260818 - Julian) 預設看本月。用瀏覽器的時鐘 ——
   * 這個值只決定要查哪一個月，沒有任何判定依賴它（打卡與認列的時區
   * 一律由伺服器的政策時區決定），而使用者隨時可以改。
   */
  const [month, setMonth] = useState(() =>
    localIsoDate(new Date()).slice(0, 7),
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  /**
   * Info: (20260819 - Julian) 起訖各是一個「日期＋時刻」。
   *
   * 先前是「一個日期 + 兩個時刻」，跨夜靠「結束早於開始即視為隔日」這條
   * 隱含規則 —— 使用者要在心裡完成那個推論，而工地的夜間搶修就是跨夜的。
   * 現在把日期直接寫在兩端：`18:00 → 隔天 02:00` 是兩個看得見的日期，
   * 不是一條要記住的規則。
   *
   * 落庫的形狀沒有變（`workDate` + 兩個分鐘數、>= 1440 表次日），
   * 換算在 `payload` 那裡做一次。
   */
  const [startAt, setStartAt] = useState(
    () => `${localIsoDate(new Date())}T18:00`,
  );
  const [endAt, setEndAt] = useState(
    () => `${localIsoDate(new Date())}T20:00`,
  );

  /**
   * Info: (20260819 - Julian) 「起」不設上界，「迄」的下界跟著「起」走。
   *
   * ## 為什麼「起」不限制
   *
   * 兩邊都限制的話，使用者不小心把日期選錯（例如選到下個月），就必須
   * **把兩個 picker 都清掉**才能重選 —— 「起」被「迄」擋在上界之前、
   * 「迄」被「起」擋在下界之後，兩個互相咬住。那是一個為了防止一種錯誤，
   * 而製造出另一種更難脫身的錯誤。
   *
   * 「起」可以自由改，因此它每改一次就把「迄」帶到一小時後 ——
   * 使用者重選日期時不必再回頭修「迄」，而那個值本來就已經被上一次的
   * 選擇弄成不合理的了。
   *
   * ## 為什麼「迄」仍然限制
   *
   * 它只有下界（`min = 起`），而下界不會把人咬住：使用者永遠可以先改「起」
   * 把下界移開。單向的約束沒有死結。
   *
   * ## 送出端仍然擋
   *
   * `min` 只約束選單，部分瀏覽器允許直接鍵入超出範圍的值 ——
   * `span === null` 時送出鈕按不下去。**護欄與提示是兩件事**，
   * 畫面上不提示不等於放行。
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
        {/**
         * Info: (20260819 - Julian) 起／迄各一個「日期＋時刻」。
         *
         * 跨夜不再靠「結束早於開始即視為隔日」這條隱含規則 ——
         * 18:00 → 隔天 02:00 是兩個看得見的日期。工地的夜間搶修就是跨夜的，
         * 而要使用者在心裡完成那個推論，是把系統的方便當成他的責任。
         */}
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
         * Info: (20260819 - Julian) 選了多長，當場說出來。
         *
         * 這是申請的時數，不是**認列**的 —— 認列是 `min(核准, 打卡事實)`，
         * 核准當下才定得下來。先講這一個，是因為它是使用者唯一能直接驗算的數字。
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
         * Info: (20260818 - Julian) 同一句規則，在選擇必定被擋時改成琥珀色。
         *
         * 不另外寫一句警告文案：要說的話與 `filing_hint` 完全相同，
         * 差別只在「這是規則」與「你現在違反了它」—— 那個差別用顏色說得完，
         * 而多一個 i18n key 就多五個語系要跟著改。
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
         * Info: (20260819 - Julian) 天災事變的勾選框**拿掉了**（review B7）。
         *
         * §32 IV 的構成要件是「天災、事變或突發事件」**且**已依法報備 ——
         * 而後者是一件對外發生的事（通知工會，或報當地主管機關備查），
         * 不是申請單上的一個勾選框。它原本由申請人自填，卻會讓整段加班
         * 跳到加倍發給並繞過例假日的閘門，系統裡沒有任何地方記載那次報備。
         *
         * 認定改由具 `HR_ADMIN` 職能者在**核准之前**登記（`.../emergency`），
         * 並強制附上報備紀錄；主管在待簽清單上會先看到標記再決定核不核。
         * 這裡留一句說明而不是留一個 disabled 的勾選框：一個永遠按不下去的
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
