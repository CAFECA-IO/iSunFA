"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { Clock4, Loader2, Plus, Send } from "lucide-react";
import {
  OvertimeCompensationMode,
  OvertimeFilingType,
  OVERTIME_REASON_MAX_LENGTH,
} from "@/constants/overtime";
import { OVERTIME_API } from "@/constants/overtime_api";
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
const toMinuteOfDay = (value: string): number | null => {
  const matched = /^(\d{2}):(\d{2})$/.exec(value);
  if (matched === null) return null;
  return Number(matched[1]) * 60 + Number(matched[2]);
};

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
  const [workDate, setWorkDate] = useState(() => localIsoDate(new Date()));
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [filingType, setFilingType] = useState<OvertimeFilingType>(() =>
    filingTypeFor(localIsoDate(new Date()), localIsoDate(new Date())),
  );
  const [compensationMode, setCompensationMode] =
    useState<OvertimeCompensationMode>(OvertimeCompensationMode.PAYMENT);
  const [reason, setReason] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
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
  useEffect(() => {
    setFilingType(filingTypeFor(workDate, localIsoDate(new Date())));
  }, [workDate]);

  const submit = async () => {
    const startMinute = toMinuteOfDay(startTime);
    const endMinute = toMinuteOfDay(endTime);
    if (startMinute === null || endMinute === null) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await request(OVERTIME_API.REQUEST, {
        method: "POST",
        body: JSON.stringify({
          workDate,
          filingType,
          compensationMode,
          requestedStartMinute: startMinute,
          /**
           * Info: (20260818 - Julian) 結束早於（或等於）開始即視為隔日。
           * 分鐘數 >= 1440 表次日，與 `ShiftPattern` 同型別同語意 ——
           * 換算在這裡做一次，使用者填的永遠是牆上時鐘。
           */
          requestedEndMinute:
            endMinute <= startMinute ? endMinute + 1440 : endMinute,
          reason,
          isEmergency,
        }),
      });

      setReason("");
      setIsEmergency(false);
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

  // Info: (20260818 - Julian) 時刻空白時 `toMinuteOfDay` 會回 null，送出鈕會變成按了沒反應
  const canSubmit =
    !submitting &&
    reason.trim().length > 0 &&
    startTime !== "" &&
    endTime !== "";

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
            {t("hr_management.overtime.field_date")}
            <input
              type="date"
              value={workDate}
              onChange={(event) => setWorkDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            />
          </label>

          <div className="flex items-end gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-600">
              {t("hr_management.overtime.field_start")}
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-600">
              {t("hr_management.overtime.field_end")}
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </label>
          </div>
        </div>

        <p className="mt-1 text-xs text-gray-400">
          {t("hr_management.overtime.field_time_hint")}
        </p>

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
         * Info: (20260818 - Julian) 天災事變預設不勾。
         * 它會讓整段跳到加倍發給並繞過例假日的 §40 閘門 ——
         * 那不是一個可以靠忘記填就成立的狀態，所以提示寫在勾選框旁邊。
         */}
        <label className="mt-3 flex items-start gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={isEmergency}
            onChange={(event) => setIsEmergency(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-gray-300"
          />
          <span>
            {t("hr_management.overtime.field_emergency")}
            <span className="mt-0.5 block leading-relaxed text-gray-400">
              {t("hr_management.overtime.field_emergency_hint")}
            </span>
          </span>
        </label>

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
