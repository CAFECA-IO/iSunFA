"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Loader2, Send, TriangleAlert, X } from "lucide-react";
import { HR_LEAVE_FORM_DRAWER_MEDIA_QUERY } from "@/constants/hr_management";
import { LEAVE_API } from "@/constants/leave_api";
import { LeaveDaySegment, LeaveUnitBasis } from "@/constants/leave_policy";
import { LeaveRequestStatus } from "@/constants/leave";
import { ILeavePolicyOption } from "@/interfaces/leave_policy_option";
import { ILeaveBalanceView } from "@/interfaces/leave_balance";
import {
  ILeaveRequestPreview,
  ILeaveRequestSummary,
} from "@/interfaces/leave_request";
import LeaveBalanceCards from "@/components/hr_management/leave/leave_balance_cards";
import ApprovalChainView from "@/components/hr_management/leave/approval_chain_view";
import LeaveRequestList from "@/components/hr_management/leave/leave_request_list";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { LEAVE_ERROR_I18N_KEY } from "@/lib/utils/leave_error_message";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import { useScrollLock } from "@/hooks/use_scroll_lock";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260817 - Julian) 我的請假（L1 / L7 / L10 / L11 / L17）。
 *
 * ## 為什麼一定要有試算
 *
 * 送出前看不到「這樣請會發生什麼」，員工只能靠試錯 ——
 * 而每一次試錯都是一張要有人去駁回的單（`ILeaveRequestPreview` 的檔頭）。
 * 所以這一頁的核心不是送出按鈕，是它上面那塊試算結果：
 * 扣幾分鐘、剩多少、要簽幾關、誰簽、有沒有人同一天也請假。
 *
 * ## 試算是純計算，不預扣
 *
 * 因此可以在使用者每改一次日期時重跑，不會留下任何痕跡。
 * 這也是「不預扣額度」那個設計（ADR 023 §6）在畫面上的好處：
 * 開著表單不送出，不會佔住任何人的額度。
 */

/** Info: (20260817 - Julian) 送出後回到乾淨表單，但保留假別 —— 通常會連續請同一種 */
const emptyDays = (): string[] => [""];

const MyLeavePageBody: FC = () => {
  const { t } = useTranslation();

  const [policies, setPolicies] = useState<ILeavePolicyOption[]>([]);
  const [balance, setBalance] = useState<ILeaveBalanceView | null>(null);
  const [requests, setRequests] = useState<ILeaveRequestSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [policyId, setPolicyId] = useState<string>("");
  const [segment, setSegment] = useState<LeaveDaySegment>(LeaveDaySegment.FULL);
  const [workDates, setWorkDates] = useState<string[]>(emptyDays());
  const [reason, setReason] = useState("");

  const [preview, setPreview] = useState<ILeaveRequestPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Info: (20260818 - Julian) 手機版把請假表單收進下方抽屜，入口是點假別卡片。
   *
   * 桌機不改：那邊有橫向空間，表單與試算結果同時看得見，改成抽屜只是多一次點擊。
   *
   * `isCompact` 與抽屜外框那串 `lg:` 覆蓋講的是同一個斷點
   * （來源都是 `HR_LEAVE_FORM_DRAWER_MEDIA_QUERY`）。分成兩個表達是因為
   * 捲動鎖定與 `role="dialog"` 都是 JS 端的決定，CSS 關不掉它們 ——
   * 少了這個判斷，桌機會在點卡片後被鎖住捲動而畫面上沒有任何遮罩。
   */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(HR_LEAVE_FORM_DRAWER_MEDIA_QUERY);
    const sync = () => setIsCompact(media.matches);

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Info: (20260818 - Julian) 只有真的以抽屜呈現時，它才是一層 modal
  const asDrawer = drawerOpen && isCompact;

  useScrollLock(asDrawer);

  /**
   * Info: (20260818 - Julian) Esc 關抽屜。手機上少用，但接了鍵盤的平板與
   * 桌機縮窄視窗都會走到這裡，而一個關不掉的遮罩是死路。
   */
  useEffect(() => {
    if (!asDrawer) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [asDrawer]);

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === policyId) ?? null,
    [policies, policyId],
  );

  /**
   * Info: (20260817 - Julian) 日約當分鐘取試算結果的第一天。
   *
   * 不寫死 480：那個數字依班別而不同（辦公室 450、現場 480），
   * 而寫死的後果是餘額卡片上的「天」與實際扣的分鐘對不起來。
   * 試算之前沒有這個資訊，所以卡片先顯示分鐘、有試算後才換算。
   */
  const dayEquivalentMinutes = preview?.days[0]?.dayEquivalentMinutes ?? 0;

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      /**
       * Info: (20260818 - Julian) 三支端點都回信封（`jsonOk`），而 `request()` 不拆 ——
       * 它最後一行是 `return data as T`，型別參數在這裡是斷言而不是保證，
       * 所以少接一層 `.payload` 編譯器不會有意見。
       *
       * 代價不是「少了幾個欄位」而是整頁掛掉：`policies` 變成信封物件，
       * `policies.map` 在 render 期間丟 TypeError，而全樹沒有 `error.tsx`，
       * 於是換成 Next.js 內建的錯誤邊界（This page couldn't load）。
       * 更難查的是它**只在 API 成功時發生** —— 失敗會被 catch 接住顯示紅字橫幅。
       * 拆法比照簽到的 `schedule_page_body.tsx`。
       */
      const [policyRes, balanceRes, requestRes] = await Promise.all([
        request<IEnvelopeLike<ILeavePolicyOption[]>>(LEAVE_API.POLICY),
        request<IEnvelopeLike<ILeaveBalanceView>>(LEAVE_API.BALANCE),
        request<IEnvelopeLike<ILeaveRequestSummary[]>>(LEAVE_API.REQUEST),
      ]);
      const policyList = policyRes.payload ?? [];
      setPolicies(policyList);
      setBalance(balanceRes.payload);
      setRequests(requestRes.payload ?? []);
      if (policyList.length > 0)
        setPolicyId((current) => current || policyList[0].id);
    } catch (error) {
      setLoadError(
        t(
          errorI18nKeyOf(
            error,
            "hr_management.leave.error_load",
            LEAVE_ERROR_I18N_KEY,
          ),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filledDates = useMemo(
    () => workDates.filter((date) => date !== ""),
    [workDates],
  );

  /**
   * Info: (20260817 - Julian) 日期或假別一改就重新試算。
   *
   * 沒有 debounce：日期是用 `<input type="date">` 選的，一次選擇只會觸發一次 change，
   * 不像文字輸入會逐字打。加 debounce 只會讓結果晚一點出現。
   */
  useEffect(() => {
    if (!policyId || filledDates.length === 0) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let active = true;
    request<IEnvelopeLike<ILeaveRequestPreview>>(LEAVE_API.REQUEST_PREVIEW, {
      method: "POST",
      body: JSON.stringify({
        leavePolicyId: policyId,
        // Info: (20260817 - Julian) 試算不寫入，事由填佔位字串即可（送出時才用真的）
        reason: reason || "—",
        days: filledDates.map((workDate) => ({ workDate, segment })),
      }),
    })
      .then((response) => {
        if (!active) return;

        /**
         * Info: (20260818 - Julian) 2xx 卻沒有 payload 是伺服器違約（處置同
         * `schedule_page_body.tsx`）：走通用訊息，不把 null 當成一份試算結果。
         * 送出的三個前提全部讀 `preview`，靜靜塞 null 進去的效果是
         * 送出鈕永遠不會亮，而畫面上沒有任何東西說明為什麼。
         */
        if (!response.payload) {
          setPreview(null);
          setPreviewError(t("hr_management.leave.error_preview"));
          return;
        }

        setPreview(response.payload);
        setPreviewError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setPreview(null);
        setPreviewError(
          t(
            errorI18nKeyOf(
              error,
              "hr_management.leave.error_preview",
              LEAVE_ERROR_I18N_KEY,
            ),
          ),
        );
      });

    return () => {
      active = false;
    };
  }, [policyId, segment, filledDates, reason, t]);

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await request(LEAVE_API.REQUEST, {
        method: "POST",
        body: JSON.stringify({
          leavePolicyId: policyId,
          reason,
          days: filledDates.map((workDate) => ({ workDate, segment })),
        }),
      });
      setWorkDates(emptyDays());
      setReason("");
      setPreview(null);
      // Info: (20260818 - Julian) 送出成功就收起抽屜，讓底下剛更新的「我的假單」露出來
      setDrawerOpen(false);
      await reload();
    } catch (error) {
      setSubmitError(
        t(
          errorI18nKeyOf(
            error,
            "hr_management.leave.error_submit",
            LEAVE_ERROR_I18N_KEY,
          ),
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Info: (20260817 - Julian) 送出的三個前提，全部由試算結果決定。
   *
   * 事由必填 —— 一張沒有理由的假單，事後沒有人能判斷它合不合理
   * （`LeaveRequest.reasonCipher` 欄位註解）。前端擋是為了少一次往返，
   * 真正的把關在 validator。
   */
  const blockingWarning = preview?.concurrencyWarnings.some(
    (warning) => warning.blocking,
  );
  const canSubmit =
    !submitting &&
    preview !== null &&
    preview.unresolvedReason === null &&
    preview.shortfallMinutes === 0 &&
    !blockingWarning &&
    reason.trim().length > 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500">
        <Loader2 className="size-4 animate-spin" />
        {t("hr_management.leave.loading")}
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
        <h2 className="mb-3 text-sm font-semibold text-gray-800">
          {t("hr_management.leave.balance_title")}
        </h2>
        <LeaveBalanceCards
          balances={balance?.balances ?? []}
          dayEquivalentMinutes={dayEquivalentMinutes}
          selectedPolicyId={policyId}
          onSelect={(leavePolicyId) => {
            setPolicyId(leavePolicyId);
            setDrawerOpen(true);
          }}
        />
      </section>

      {/**
       * Info: (20260818 - Julian) 同一份表單，兩種版型：桌機內嵌、手機由下方彈出。
       *
       * 只有一個實例、用 CSS 換位置，不是寫兩份 —— 兩份意味著兩套 `<input>`、
       * 兩個要同步的 DOM，以及日後只改到其中一份的機會
       * （同 `hr_sidebar.tsx` 只寫一份 `navList` 的理由）。
       *
       * `lg:` 那一串把 fixed / absolute / 圓角 / 陰影全部收回內嵌卡片的樣子，
       * 因此桌機完全不受 `drawerOpen` 影響：關著是內嵌卡片，開著也還是內嵌卡片。
       */}
      <div
        className={
          drawerOpen
            ? "fixed inset-0 z-40 lg:static lg:z-auto"
            : "hidden lg:block"
        }
      >
        {drawerOpen && (
          <button
            type="button"
            aria-label={t("common.close")}
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 h-full w-full bg-gray-900/40 lg:hidden"
          />
        )}

        <section
          role={asDrawer ? "dialog" : undefined}
          aria-modal={asDrawer ? true : undefined}
          aria-label={
            asDrawer ? t("hr_management.leave.form_title") : undefined
          }
          className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-4 pb-6 shadow-xl lg:static lg:max-h-none lg:overflow-visible lg:rounded-2xl lg:pb-4 lg:shadow-none lg:ring-1 lg:ring-gray-200"
        >
          {/* Info: (20260818 - Julian) 抓握條：說明「這是蓋在上面的一層」，可以撥掉 */}
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 lg:hidden" />

          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <CalendarPlus className="size-4 text-sky-500" />
              {t("hr_management.leave.form_title")}
            </h2>

            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => setDrawerOpen(false)}
              className="-m-1 rounded-lg p-1 text-gray-400 transition hover:text-gray-600 lg:hidden"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-gray-600">
              {t("hr_management.leave.field_policy")}
              <select
                value={policyId}
                onChange={(event) => setPolicyId(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              >
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-gray-600">
              {t("hr_management.leave.field_segment")}
              <select
                value={segment}
                onChange={(event) =>
                  setSegment(event.target.value as LeaveDaySegment)
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              >
                <option value={LeaveDaySegment.FULL}>
                  {t("hr_management.leave.segment_full")}
                </option>
                {/**
                 * Info: (20260817 - Julian) 半天只在假別允許時才給選。
                 * `FULL_WORKDAY` 的假別（產假、公傷病假）請半天沒有意義，
                 * 引擎會直接丟 —— 而讓使用者選一個必定失敗的選項是壞的。
                 */}
                {selectedPolicy?.unitBasis !== LeaveUnitBasis.FULL_WORKDAY && (
                  <>
                    <option value={LeaveDaySegment.MORNING}>
                      {t("hr_management.leave.segment_morning")}
                    </option>
                    <option value={LeaveDaySegment.AFTERNOON}>
                      {t("hr_management.leave.segment_afternoon")}
                    </option>
                  </>
                )}
              </select>
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <span className="text-xs text-gray-600">
              {t("hr_management.leave.field_dates")}
            </span>
            {workDates.map((date, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(event) => {
                    const next = [...workDates];
                    next[index] = event.target.value;
                    setWorkDates(next);
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
                />
                {workDates.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setWorkDates(workDates.filter((_, i) => i !== index))
                    }
                    className="text-xs text-gray-400 hover:text-rose-500"
                  >
                    {t("hr_management.leave.action_remove_date")}
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setWorkDates([...workDates, ""])}
              className="self-start text-xs font-medium text-sky-600 hover:text-sky-700"
            >
              {t("hr_management.leave.action_add_date")}
            </button>
          </div>

          <label className="mt-3 flex flex-col gap-1 text-xs text-gray-600">
            {t("hr_management.leave.field_reason")}
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={2}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              placeholder={t("hr_management.leave.field_reason_placeholder")}
            />
            {/**
             * Info: (20260817 - Julian) 事由會被加密入庫（ADR 018 Tier 2）。
             * 說出來是為了讓人願意寫實話 —— 不說的話，會寫「私事」的人
             * 遠多於會寫「回診複檢」的人，而後者才是主管判斷得了的資訊。
             */}
            <span className="text-xs text-gray-400">
              {t("hr_management.leave.field_reason_encrypted")}
            </span>
          </label>

          {previewError && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {previewError}
            </p>
          )}

          {preview && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-gray-50 p-3">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-gray-700">
                  {t("hr_management.leave.preview_total", {
                    days: preview.totalDays.toFixed(1),
                    minutes: preview.totalMinutes,
                  })}
                </span>
                {preview.remainingMinutesAfter !== null && (
                  <span className="text-gray-700">
                    {t("hr_management.leave.preview_after", {
                      minutes: preview.remainingMinutesAfter,
                    })}
                  </span>
                )}
              </div>

              {preview.shortfallMinutes > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-rose-700">
                  <TriangleAlert className="size-4" />
                  {t("hr_management.leave.preview_shortfall", {
                    minutes: preview.shortfallMinutes,
                  })}
                </p>
              )}

              {/**
               * Info: (20260817 - Julian) 併休超限：擋與不擋顯示成兩種顏色。
               *
               * 特休依 §38 II 期日由勞工排定，雇主只能協商 —— 對它硬擋等於
               * 行使一個法律上沒有的否決權（計畫書 §D14）。畫面必須讓這兩者
               * 看起來就不一樣，否則使用者會以為紅字都代表送不出去。
               */}
              {preview.concurrencyWarnings.map((warning) => (
                <p
                  key={warning.workDate}
                  className={`text-sm ${warning.blocking ? "text-rose-700" : "text-amber-700"}`}
                >
                  {t(
                    warning.blocking
                      ? "hr_management.leave.preview_concurrency_blocked"
                      : "hr_management.leave.preview_concurrency_warn",
                    {
                      date: warning.workDate,
                      count: warning.observedCount,
                      limit: warning.limitValue,
                    },
                  )}
                </p>
              ))}

              {preview.unresolvedReason ? (
                <p className="text-sm text-rose-700">
                  {t("hr_management.leave.preview_chain_unresolved", {
                    reason: preview.unresolvedReason,
                  })}
                </p>
              ) : (
                <div>
                  <div className="mb-1.5 text-xs font-medium text-gray-600">
                    {t("hr_management.leave.preview_chain", {
                      count: preview.approvalSteps.length,
                    })}
                  </div>
                  <ApprovalChainView
                    steps={preview.approvalSteps.map((step) => ({
                      order: step.order,
                      nodeKind: step.nodeKind,
                      approverName: step.approver.name,
                      approverJobTitle: step.approver.jobTitle,
                      status: "PENDING" as never,
                      mergedFromKinds: step.mergedFromKinds,
                      escalatedReason: step.escalatedReason,
                    }))}
                  />
                </div>
              )}
            </div>
          )}

          {submitError && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {submitError}
            </p>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {t("hr_management.leave.action_submit")}
          </button>
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-800">
          {t("hr_management.leave.my_requests_title")}
        </h2>
        <LeaveRequestList
          requests={requests}
          emptyKey="hr_management.leave.my_requests_empty"
          withdrawableStatus={LeaveRequestStatus.PENDING}
          onChanged={reload}
        />
      </section>
    </div>
  );
};

export default MyLeavePageBody;
