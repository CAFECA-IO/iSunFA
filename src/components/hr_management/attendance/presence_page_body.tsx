"use client";

import { FC, useEffect, useMemo, useState } from "react";
import LeaveTodayPanel from "@/components/hr_management/attendance/leave_today_panel";
import LeaveRecallDialog from "@/components/hr_management/attendance/leave_recall_dialog";
import { useLeaveToday } from "@/hooks/use_leave_today";
import { ILeaveTodayEntry } from "@/interfaces/leave";
import {
  Clock,
  Download,
  Loader2,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import PresenceMap from "@/components/hr_management/attendance/presence_map";
import {
  ATTENDANCE_API,
  PRESENCE_STATUS_I18N_KEY,
  PRESENCE_STATUS_STYLE,
} from "@/constants/attendance";
import {
  defaultSelectedLocation,
  sortRosterEntries,
} from "@/lib/utils/attendance_presence_view";
import {
  EMPTY_VALUE,
  formatMinuteOfDay,
  isoDateTimeLabel,
} from "@/lib/utils/attendance_format";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { requestFile } from "@/lib/utils/request";
import { usePresenceFeed } from "@/hooks/use_presence_feed";
import {
  IPresenceExpectedAbsentee,
  IPresenceLocationSummary,
} from "@/interfaces/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 現場人數與到班名單。
 *
 * 在班／未打下班卡／未到工三個數字缺一不可，誠實表達系統知道什麼、不知道
 * 什麼。「未打下班卡」代表系統不知道這個人在不在，不是「他不在」——
 * 這句話要寫在畫面上，因為看板前的人要據此決定要不要打電話。
 */

/**
 * Info: (20260813 - Julian) `hint` 必填而非選填：每個數字都需要一句話解釋，
 * 尤其「未打下班卡」關係到看板前的人要不要打電話。
 */
const StatCard: FC<{
  label: string;
  value: number;
  hint: string;
  tone: string;
}> = ({ label, value, hint, tone }) => (
  <div className="flex-1 rounded-2xl bg-white p-3 ring-1 ring-gray-200 lg:p-5">
    <div className="flex flex-row justify-between gap-2 lg:flex-col">
      <div className="text-sm text-gray-500">{label}</div>
      <div
        className={`inline-flex w-fit items-baseline rounded-lg px-3 py-1 text-xl font-semibold tabular-nums lg:text-3xl ${tone}`}
      >
        {value}
      </div>
    </div>
    <div className="mt-2 text-[10px] text-gray-400 lg:text-xs">{hint}</div>
  </div>
);

const PresencePageBody: FC = () => {
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recallTarget, setRecallTarget] = useState<ILeaveTodayEntry | null>(
    null,
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const feed = usePresenceFeed({
    selectedLocationId: selectedId,
    fallbackError: t("hr_management.attendance_presence.error_load"),
  });

  const leave = useLeaveToday({
    fallbackError: t("hr_management.attendance_presence.error_load"),
  });

  /**
   * Info: (20260814 - Julian) 視野分級（計畫書 §8.5）：名單與人數全開放，
   * 地圖與匯出只給主管 —— 名單回答「有誰」，地圖回答「在哪」。
   * 旗標來自 A3 而不是 A11：決定要不要畫地圖的頁面，該問餵地圖的那支端點。
   */
  const isSupervisor = feed.summary?.viewerIsSupervisor ?? false;

  const locations = useMemo<IPresenceLocationSummary[]>(
    () => feed.summary?.locations ?? [],
    [feed.summary],
  );

  /**
   * Info: (20260813 - Julian) 進頁時自動選人數最多的工區，但只選一次——
   * 每輪都重選的話，使用者點開的工區會被 15 秒一次的輪詢拉走。
   */
  useEffect(() => {
    if (selectedId || locations.length === 0) return;
    setSelectedId(defaultSelectedLocation(locations));
  }, [locations, selectedId]);

  const entries = useMemo(
    () => sortRosterEntries(feed.roster?.entries ?? []),
    [feed.roster],
  );
  const absentees: IPresenceExpectedAbsentee[] =
    feed.summary?.expectedAbsentees ?? [];

  const exportRoster = async (workLocationId?: string) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const file = await requestFile(ATTENDANCE_API.PRESENCE_ROSTER_EXPORT, {
        method: "POST",
        body: JSON.stringify(workLocationId ? { workLocationId } : {}),
      });

      const url = window.URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      // Info: (20260813 - Julian) 檔名以伺服器為準：它帶著產出時刻，與稽核紀錄對得起來
      anchor.download = file.filename ?? "attendance-roster.csv";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(
        t(
          errorI18nKeyOf(
            error,
            "hr_management.attendance_presence.error_export",
          ),
        ),
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (feed.isInitialLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500 sm:px-6 lg:px-8">
        <Loader2 className="size-4 animate-spin" />
        {t("hr_management.attendance_presence.loading")}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-800">
              {t("hr_management.attendance_presence.title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {t("hr_management.attendance_presence.subtitle")}
            </p>
          </div>

          {/**
           * Info: (20260813 - Julian) 全帳本匯出放在最顯眼位置：事故當下沒有人會先想
           * 「是哪一個工區」，先給全部，要縮小範圍再從工區卡片按。
           */}
          {/* Info: (20260814 - Julian) 匯出只給主管（§8.5）：它是一份帶走的全帳本名單 */}
          {isSupervisor && (
            <button
              type="button"
              disabled={isExporting}
              onClick={() => exportRoster()}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:bg-gray-300"
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              {t("hr_management.attendance_presence.export_all")}
            </button>
          )}
        </div>

        {/* Info: (20260813 - Julian) 三個數字回答三個不同的問題，缺一個就會暗示系統其實不知道的事 */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-4">
          <StatCard
            label={t("hr_management.attendance_presence.stat_on_site")}
            value={feed.summary?.onSiteTotal ?? 0}
            hint={t("hr_management.attendance_presence.stat_on_site_hint")}
            tone="bg-emerald-50 text-emerald-700"
          />
          <StatCard
            label={t("hr_management.attendance_presence.stat_stale")}
            value={feed.summary?.staleTotal ?? 0}
            hint={t("hr_management.attendance_presence.stat_stale_hint")}
            tone="bg-amber-100 text-amber-700"
          />
          <StatCard
            label={t("hr_management.attendance_presence.stat_expected_absent")}
            value={absentees.length}
            hint={t(
              "hr_management.attendance_presence.stat_expected_absent_hint",
            )}
            tone="bg-orange-100 text-orange-700"
          />
          <StatCard
            label={t("hr_management.attendance_presence.stat_leave")}
            value={leave.view?.entries.length ?? 0}
            hint={t("hr_management.attendance_presence.stat_leave_hint")}
            tone="bg-amber-50 text-amber-700"
          />
        </div>

        {feed.error && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            <TriangleAlert className="size-4 shrink-0" />
            {/* Info: (20260813 - Julian) 更新失敗時畫面留著舊資料，因此必須說清楚它是舊的 */}
            {t("hr_management.attendance_presence.stale_feed", {
              message: feed.error,
            })}
          </div>
        )}

        {isSupervisor && (
          <PresenceMap
            locations={locations}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        )}

        <LeaveTodayPanel
          entries={leave.view?.entries ?? []}
          canRequestRecall={leave.view?.canRequestRecall ?? false}
          pendingLeaveDayId={recallTarget?.leaveDayId ?? null}
          onRequestRecall={setRecallTarget}
        />

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Info: (20260813 - Julian) 工區卡片。人數為零的工區也要列，否則「沒有人」與「不存在」同形 */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {locations.map((location) => (
              <div
                key={location.workLocationId}
                className="relative flex w-full items-center"
              >
                <div
                  className={`${
                    location.workLocationId === selectedId
                      ? "visible opacity-100"
                      : "invisible opacity-0"
                  } absolute -right-8 z-10 hidden size-0 rotate-90 transition lg:block`}
                  style={{
                    borderLeft: "20px solid transparent",
                    borderRight: "20px solid transparent",
                    borderBottom: "20px solid #fb923c",
                  }}
                ></div>
                {/* Info: (20260814 - Julian) 刻意不下 aria-label：它會蓋掉卡片內所有內容，
                    螢幕閱讀器就只唸得到工區名稱，聽不到在班與未打下班卡的人數 */}
                <button
                  type="button"
                  onClick={() => setSelectedId(location.workLocationId)}
                  className={`flex-1 rounded-2xl bg-white p-3 text-left ring-1 transition lg:p-4 ${
                    location.workLocationId === selectedId
                      ? "ring-2 ring-orange-400"
                      : "ring-gray-200 hover:ring-gray-300"
                  }`}
                >
                  <div className="flex flex-col items-center justify-between gap-2 lg:flex-row">
                    <span className="text-sm font-medium text-gray-800 lg:text-base">
                      {location.name}
                    </span>
                    <span className="text-[10px] text-gray-400 lg:text-xs">
                      {location.code}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-sm">
                    {/* Info: (20260814 - Julian) 兩個數字只靠背景色分辨，對紅綠色覺辨識障礙者
                        等於兩個一樣的數字（同 attendance_result_grid 的理由）。
                        加圖示給看得到的人，加 sr-only 文字給聽的人 */}
                    <span
                      className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 tabular-nums"
                      title={t(
                        "hr_management.attendance_presence.stat_on_site",
                      )}
                    >
                      <UserCheck className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">
                        {t("hr_management.attendance_presence.stat_on_site")}
                      </span>
                      {location.onSiteCount}
                    </span>
                    <span
                      className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold tabular-nums ${
                        location.staleCount > 0
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-50 text-gray-300"
                      }`}
                      title={t("hr_management.attendance_presence.stat_stale")}
                    >
                      <Clock className="size-3.5" aria-hidden="true" />
                      <span className="sr-only">
                        {t("hr_management.attendance_presence.stat_stale")}
                      </span>
                      {location.staleCount}
                    </span>
                    <span className="text-center text-[10px] text-gray-400 lg:text-right lg:text-xs">
                      {t("hr_management.attendance_presence.radius", {
                        radius: location.radiusMeters,
                      })}
                    </span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          {/* Info: (20260813 - Julian) 選定工區的到班名單 */}
          <div className="rounded-2xl bg-white ring-1 ring-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-gray-100 bg-orange-100 p-3 lg:px-5 lg:py-4">
              <div className="font-medium text-gray-800">
                {feed.roster?.name ??
                  t("hr_management.attendance_presence.no_location_selected")}
              </div>
              {feed.roster && (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => exportRoster(feed.roster?.workLocationId)}
                  className="flex items-center gap-1.5 rounded-lg py-1.5 text-sm text-red-500 transition enabled:hover:text-red-300 disabled:text-gray-500"
                >
                  <Download className="size-4 shrink-0" />
                  {t("hr_management.attendance_presence.export_location")}
                </button>
              )}
            </div>

            {entries.length === 0 ? (
              <div className="px-5 py-8 text-sm text-gray-400">
                {t("hr_management.attendance_presence.roster_empty")}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {entries.map((entry) => (
                  // Info: (20260814 - Julian) 手機直式堆疊、桌機才對齊成欄；理由同未到工名單
                  <li
                    key={entry.employeeId}
                    className="items-center px-4 py-3 lg:flex lg:flex-wrap lg:gap-3 lg:px-5"
                  >
                    <div className="flex items-baseline gap-2 lg:w-44">
                      <span className="text-sm font-medium text-gray-800">
                        {entry.name}
                      </span>
                      <span className="font-mono text-xs text-gray-400">
                        {entry.employeeNo}
                      </span>
                      <span
                        className={`ml-auto rounded-md px-2 py-0.5 text-xs font-medium lg:hidden ${PRESENCE_STATUS_STYLE[entry.status]}`}
                      >
                        {t(PRESENCE_STATUS_I18N_KEY[entry.status])}
                      </span>
                    </div>

                    <div className="mt-0.5 text-xs text-gray-500 lg:mt-0 lg:w-72 lg:text-sm">
                      {entry.jobTitle ?? EMPTY_VALUE}
                      {entry.departmentName ? `　${entry.departmentName}` : ""}
                    </div>

                    <div className="mt-0.5 text-xs text-gray-600 tabular-nums lg:mt-0 lg:w-32 lg:text-sm">
                      {/**
                       * Info: (20260813 - Julian) 跨夜班的進場時間屬於昨天，因此連日期一起顯示——
                       * 只印 20:05，凌晨看板前的人會誤以為是今晚。
                       */}
                      {entry.workDate === feed.summary?.workDate
                        ? formatMinuteOfDay(
                            entry.sinceMinute,
                            t("hr_management.attendance.next_day"),
                          )
                        : isoDateTimeLabel(entry.workDate, entry.sinceMinute)}
                    </div>
                    <span
                      className={`ml-auto hidden rounded-md px-2 py-0.5 text-xs font-medium lg:inline ${PRESENCE_STATUS_STYLE[entry.status]}`}
                    >
                      {t(PRESENCE_STATUS_I18N_KEY[entry.status])}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/**
         * Info: (20260813 - Julian) 未到工名單：只給數字的話，看板前的人下一步就是
         * 問「是誰」，這個問題應該由畫面直接回答。
         */}
        {absentees.length > 0 && (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200">
            <div className="rounded-t-2xl border-b border-gray-100 bg-orange-100 p-3 lg:px-5 lg:py-4">
              <div className="font-medium text-gray-800">
                {t("hr_management.attendance_presence.expected_absent_title")}
              </div>
              <div className="text-[10px] text-gray-400 lg:mt-1 lg:text-xs">
                {t("hr_management.attendance_presence.expected_absent_note")}
              </div>
            </div>
            <ul className="divide-y divide-gray-100">
              {absentees.map((absentee) => (
                /**
                 * Info: (20260814 - Julian) 手機直式堆疊、桌機才排成對齊的欄。
                 *
                 * 原本一律用固定寬度（w-24／w-32／w-40）配 flex-wrap —— 在手機上每一欄
                 * 各自換行、部門名稱又在自己的框裡再折一次，一個人佔掉五行且對不齊。
                 * 事故當下要用眼睛掃這份名單，掃不動就等於沒有。
                 */
                <li
                  key={absentee.employeeId}
                  className="px-4 py-3 lg:flex lg:flex-wrap lg:items-center lg:gap-3 lg:px-5"
                >
                  <div className="flex items-baseline gap-2 lg:w-44">
                    <span className="text-sm font-medium text-gray-800">
                      {absentee.name}
                    </span>
                    <span className="font-mono text-xs text-gray-400">
                      {absentee.employeeNo}
                    </span>
                  </div>

                  <div className="mt-0.5 text-xs text-gray-500 lg:mt-0 lg:w-72 lg:text-sm">
                    {absentee.jobTitle ?? EMPTY_VALUE}
                    {absentee.departmentName
                      ? `　${absentee.departmentName}`
                      : ""}
                  </div>

                  <div className="mt-0.5 text-xs text-gray-500 lg:mt-0 lg:text-sm">
                    {t("hr_management.attendance_presence.expected_by", {
                      shift: absentee.shiftName ?? EMPTY_VALUE,
                      time: formatMinuteOfDay(
                        absentee.coreStartMinute,
                        t("hr_management.attendance.next_day"),
                      ),
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {exportError && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            {exportError}
          </div>
        )}

        {/**
         * Info: (20260813 - Julian) 觀測時間戳：現場狀態每分每秒都在變，沒有時間戳
         * 的名單在事故調查時無法採信。
         */}
        {feed.summary && (
          <div className="px-1 text-xs text-gray-400">
            {t("hr_management.attendance_presence.observed_at", {
              time: new Date(feed.summary.observedAt).toLocaleString(
                undefined,
                {
                  timeZone: feed.summary.timeZone,
                },
              ),
              zone: feed.summary.timeZone,
            })}
          </div>
        )}
      </div>

      <LeaveRecallDialog
        entry={recallTarget}
        onClose={() => setRecallTarget(null)}
        onSubmitted={leave.refresh}
      />
    </div>
  );
};

export default PresencePageBody;
