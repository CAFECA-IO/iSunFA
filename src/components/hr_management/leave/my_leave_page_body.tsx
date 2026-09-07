"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Loader2, Send, TriangleAlert } from "lucide-react";
import { LEAVE_API } from "@/constants/leave_api";
import {
  DEFAULT_SPAN_MINUTES,
  rawSpanMinutes,
  shiftLocalDateTime,
} from "@/lib/leave_span";
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
import HrFormSheet from "@/components/hr_management/hr_form_sheet";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import { LEAVE_UNRESOLVED_REASON_I18N_KEY } from "@/lib/utils/leave_chain_message";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260817 - Julian) 我的請假（L1 / L7 / L10 / L11 / L17）。
 *
 * 這一頁的核心不是送出按鈕，是它上面那塊試算結果：扣幾分鐘、剩多少、
 * 要簽幾關、誰簽、有沒有人同一天也請假。看不到這些，員工只能靠試錯 ——
 * 而每一次試錯都是一張要有人去駁回的單。
 *
 * 試算是純計算、不預扣，所以可以在每次改日期時重跑而不留痕跡
 * （ADR 023 §6「不預扣額度」在畫面上的好處）。
 */

/**
 * Info: (20260818 - Julian) 試算用的事由佔位字串。
 * validator 要求非空白，而試算不寫入任何東西，因此填什麼都不影響結果。
 */
const PREVIEW_REASON_PLACEHOLDER = "—";

const MyLeavePageBody: FC = () => {
  const { t } = useTranslation();

  const [policies, setPolicies] = useState<ILeavePolicyOption[]>([]);
  const [balance, setBalance] = useState<ILeaveBalanceView | null>(null);
  const [requests, setRequests] = useState<ILeaveRequestSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [policyId, setPolicyId] = useState<string>("");
  /**
   * Info: (20260819 - Julian) 起訖各是一個「日期＋時刻」。
   *
   * 「我從 8/19 早上八點走到 8/21 下午五點」是一段連續時間，那是工地的說法。
   * 逐日的展開在伺服器（`expandLeaveSpan`）：首日要請到當天班別結束為止，
   * 而前端不知道那個人那一天的班到幾點。
   */
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  /**
   * Info: (20260819 - Julian) 「起」不設上界，「迄」只設下界（`min = 起`）。
   *
   * 兩邊都限制會**互相咬住**：日期選錯時「起」被「迄」擋在上界之前、
   * 「迄」被「起」擋在下界之後，使用者得把兩個 picker 都清掉才能重選 ——
   * 為了防一種錯誤而製造出更難脫身的另一種。單向約束沒有死結：永遠可以先改
   * 「起」把下界移開。改「起」時順手把「迄」帶到一小時後。
   *
   * `min` 只約束選單，部分瀏覽器允許直接鍵入 —— 真正的護欄是
   * `span === null` 時送出鈕按不下去。**護欄與提示是兩件事。**
   */
  const pickStart = (value: string): void => {
    setStartAt(value);
    setEndAt(shiftLocalDateTime(value, DEFAULT_SPAN_MINUTES) ?? "");
  };

  const [reason, setReason] = useState("");

  const [preview, setPreview] = useState<ILeaveRequestPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /**
   * Info: (20260818 - Julian) 手機版把請假表單收進下方抽屜，入口是點假別卡片。
   * 桌機不改：那邊有橫向空間，表單與試算結果同時看得見，改成抽屜只是多一次點擊。
   * 版型本身由 `HrFormSheet` 負責，這裡只持有開關。
   */
  const [drawerOpen, setDrawerOpen] = useState(false);

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
       * Info: (20260818 - Julian) 三支端點都回信封（`jsonOk`），而 `request()` **不拆** ——
       * 它最後一行是 `return data as T`，型別參數在這裡是斷言不是保證，
       * 所以少接一層 `.payload` 編譯器不會有意見。
       *
       * 代價不是「少了幾個欄位」而是整頁掛掉：`policies` 變成信封物件，
       * `policies.map` 在 render 期間丟 TypeError，而全樹沒有 `error.tsx`。
       * 更難查的是它**只在 API 成功時發生** —— 失敗會被 catch 接住顯示紅字橫幅。
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
      /**
       * Info: (20260821 - Julian) 預設選第一個**可選**的假別（review 第二輪 R2）。
       * 用 `[0]` 會讓表單一開啟就停在一個送出必被拒的假別上 ——
       * 而那正好是排序在最前面的那幾個法定假別之一。
       */
      const firstSelectable = policyList.find((policy) => policy.isSelectable);
      if (firstSelectable !== undefined)
        setPolicyId((current) => current || firstSelectable.id);
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

  /**
   * Info: (20260818 - Julian) **一律以起訖時刻表達**，沒有整天／上下半天的選項。
   *
   * 使用者是工地人員，每個人的班別與上下班時刻都不一樣 ——「上半天」是辦公室
   * 的說法，對他們不是一個直覺的量。直接給起訖，他們填的就是自己實際的時刻。
   *
   * `LeaveDaySegment` 的四個值仍然存在、既有資料仍讀得出來，只是**新的單一律
   * 送 `CUSTOM`**；扣幾分鐘由引擎依該假別的 `unitBasis` 與 `minimumUnitMinutes`
   * 進位，而進位的差額由下方的橘字說出來。填法與計算方式因此分開。
   *
   * 「半天制」目前沒有法源：計畫書 §3.1 查證的是各假別的**日數上限**，
   * 最小請假單位不在其中 —— 那六種 `HALF_WORKDAY` 是 seed 的一個假設（已補進
   * §3.2 待核對）。在它結案之前，UI 不該替那個假設加上護欄。
   */
  /**
   * Info: (20260819 - Julian) 展開後首末日仍是 `CUSTOM`、中間日是 `FULL`，
   * 但那是**伺服器**決定的（`expandLeaveSpan`），前端不再送 segment。
   */

  /**
   * Info: (20260819 - Julian) 送出與試算共用同一份 payload。
   *
   * 兩者若各組一次，遲早會有一邊漏帶欄位 —— 而那個 bug 的症狀是
   * 「試算顯示 2 小時，送出卻扣了一整天」，比沒有試算更糟
   * （同 `leaveRequestCreateSchema` 與試算共用 schema 的理由）。
   *
   * 起訖沒填完就回 null：不送、也不試算，送了必定被 validator 擋。
   */
  const span = useMemo(() => {
    if (startAt === "" || endAt === "") return null;
    if (endAt <= startAt) return null;
    return { startAt, endAt };
  }, [startAt, endAt]);

  /**
   * Info: (20260819 - Julian) 使用者實際選了多長（**牆上時鐘的差**，未扣休息、
   * 未剔除非上班日、未進位）。它刻意不等於認列分鐘 —— 中間夾著週日、跨日的
   * 夜間不算工時、最小單位要進位，三者都會讓兩個數字不同。顯示它，是為了讓
   * 「為什麼我選了三天卻只扣兩天」有一個看得見的起點。
   */
  const rawSelectedMinutes = useMemo(
    () => (span === null ? null : rawSpanMinutes(span.startAt, span.endAt)),
    [span],
  );

  /**
   * Info: (20260817 - Julian) 日期或假別一改就重新試算。
   *
   * 沒有 debounce：日期是用 `<input type="date">` 選的，一次選擇只會觸發一次 change，
   * 不像文字輸入會逐字打。加 debounce 只會讓結果晚一點出現。
   */
  useEffect(() => {
    if (!policyId || span === null) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    let active = true;
    request<IEnvelopeLike<ILeaveRequestPreview>>(LEAVE_API.REQUEST_PREVIEW, {
      method: "POST",
      body: JSON.stringify({
        leavePolicyId: policyId,
        /**
         * Info: (20260818 - Julian) 事由固定送佔位字串，**不送使用者打的那一份**。
         *
         * 試算結果與事由無關（`buildPlan` 根本沒讀它），但只要把 `reason` 接進這個
         * effect 的相依，打字就會逐字觸發一次 POST —— 十個字的事由等於十次試算，
         * 而 `READ` 桶一分鐘只有 120 次。事由也是 Tier 2 個資，沒必要在送出前就上傳。
         */
        reason: PREVIEW_REASON_PLACEHOLDER,
        ...span,
      }),
    })
      .then((response) => {
        if (!active) return;

        /**
         * Info: (20260818 - Julian) 2xx 卻沒有 payload 是伺服器違約：走通用訊息，
         * 不把 null 當成一份試算結果。送出的三個前提全部讀 `preview`，靜靜塞 null
         * 進去的效果是送出鈕永遠不會亮，而畫面上沒有任何東西說明為什麼。
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
  }, [policyId, span, t]);

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await request(LEAVE_API.REQUEST, {
        method: "POST",
        body: JSON.stringify({
          leavePolicyId: policyId,
          reason,
          ...span,
        }),
      });
      /**
       * Info: (20260819 - Julian) 起訖清空、假別保留 —— 通常會連續請同一種。
       */
      setStartAt("");
      setEndAt("");
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
  /**
   * Info: (20260818 - Julian) 只有最小單位是**固定分鐘**的假別可以選自訂時段。
   *
   * 半天制的假別技術上也算得出來，但結果會被進位到半天 —— 給一個時刻選擇器、
   * 卻無論選幾分鐘都扣半天，是靜默升級（同 `assertHalfDaySelectable` 的理由：
   * 「會讓一個人以為自己請了半天，月底看到扣一天才發現」）。
   *
   * ToDo: (20260818 - Julian) 哪些假別可以用小時計是**法規問題**（生理假、產檢假、
   * 陪產假各有函釋）。要放寬請改 `DEFAULT_LEAVE_POLICY_SEED` 的 `unitBasis`，
   * 而不是放寬這裡 —— 這裡只是忠實反映那份設定。
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
       * Info: (20260820 - Julian) 手機版的表單入口。
       *
       * 表單先前**只能**從餘額卡片點開，而 `balances` 為空時一張卡片都不會渲染 ——
       * 桌機沒事（`HrFormSheet` 關閉時是 `hidden lg:block`，表單一直在畫面上），
       * **手機上完全打不開**：新到職、還沒有任何額度的員工送不出任何一張假單，
       * 包含不需要額度的事假與病假。
       *
       * 不設條件（不是只在沒有額度時才顯示）：一個時有時無的按鈕比沒有按鈕更難用。
       */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 lg:hidden"
      >
        <CalendarPlus className="size-4" />
        {t("hr_management.leave.form_title")}
      </button>

      <HrFormSheet
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={t("hr_management.leave.form_title")}
        icon={<CalendarPlus className="size-4 text-sky-500" />}
      >
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-600">
            {t("hr_management.leave.field_policy")}
            <select
              value={policyId}
              onChange={(event) => setPolicyId(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
            >
              {policies.map((policy) => {
                /**
                 * Info: (20260821 - Julian) 併計尚未實作的假別在**選之前**就灰掉
                 * （review 第二輪 R2）。
                 *
                 * 先前選得到、試算還會回一個完整成功的結果，直到按下送出才被拒。
                 * 判斷不在這裡做：`isSelectable` 是伺服器算好的結論，前端再算一次
                 * 就會有第二份規則，而它遲早會與伺服器的閘分家。
                 */
                return (
                  <option
                    key={policy.id}
                    value={policy.id}
                    disabled={!policy.isSelectable}
                  >
                    {policy.isSelectable
                      ? policy.name
                      : policy.name +
                        t("hr_management.leave.policy_unavailable_suffix")}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {/**
           * Info: (20260819 - Julian) 沒有「整天」捷徑：每個人的班別不同，整天對他們
           * 就是「07:30 到 17:00」這組每天打卡的數字，而不是一個要另外學的選項。
           * 想請整天就填自己的上下班時刻，引擎會夾到當日應工作分鐘為止。
           *
           * 跨日的中間幾天由伺服器補成整天、首末日切到班別核心區間 —— 前端不知道
           * 那個人那一天的班到幾點，猜的話會差半小時而看不出來。
           */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-600">
              {t("hr_management.leave.field_start_at")}
              <input
                type="datetime-local"
                value={startAt}
                onChange={(event) => pickStart(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-gray-600">
              {t("hr_management.leave.field_end_at")}
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
           * Info: (20260819 - Julian) 這是**牆上時鐘的差**，不是認列時數。先講它，因為它
           * 是使用者唯一能直接驗算的數字；認列由下方的試算回答。
           */}
          {rawSelectedMinutes !== null && rawSelectedMinutes > 0 && (
            <p className="text-xs text-gray-500">
              {t("hr_management.leave.span_selected", {
                hours: (rawSelectedMinutes / 60).toFixed(1),
              })}
            </p>
          )}

          {/**
           * Info: (20260818 - Julian) 最小單位要在填之前就說，不是等試算才顯示。
           * 「不足一單位以一單位計」是對勞工不利的預設，必須載明於工作規則
           * （`LeaveRoundingMode` 的既有說明）—— 畫面上也該說。
           */}
          {selectedPolicy?.minimumUnitMinutes && (
            <p className="text-xs text-gray-400">
              {t("hr_management.leave.unit_hint", {
                minutes: selectedPolicy.minimumUnitMinutes,
              })}
            </p>
          )}
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

            {/**
             * Info: (20260818 - Julian) 進位吃掉的分鐘要說出來。
             * 選 90 分鐘卻扣 120 分鐘，不講的話那 30 分鐘是無聲消失的。
             */}
            {rawSelectedMinutes !== null &&
              rawSelectedMinutes > 0 &&
              preview.totalMinutes !== rawSelectedMinutes && (
                <p className="text-sm text-amber-700">
                  {t("hr_management.leave.preview_rounded", {
                    raw: rawSelectedMinutes,
                    minutes: preview.totalMinutes,
                  })}
                </p>
              )}

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
                {/**
                 * Info: (20260820 - Julian) 成因也要翻譯 —— `unresolvedReason` 是 enum 值，
                 * 直接插進去使用者會讀到「簽核流程展不開（NO_DEPARTMENT_MANAGER）」。
                 */}
                {t("hr_management.leave.preview_chain_unresolved", {
                  reason: t(
                    LEAVE_UNRESOLVED_REASON_I18N_KEY[preview.unresolvedReason],
                  ),
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
                    escalatedFromKind: step.escalatedFromKind,
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
          className="mt-4 flex w-full items-center justify-center gap-1 gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-fit"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          <p>{t("hr_management.leave.action_submit")}</p>
        </button>
      </HrFormSheet>

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
