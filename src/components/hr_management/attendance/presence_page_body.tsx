"use client";

import { FC, useEffect, useMemo, useState } from "react";
import { Download, Loader2, TriangleAlert } from "lucide-react";
import PresenceMap from "@/components/hr_management/attendance/presence_map";
import {
  DEMO_ACCOUNT_BOOK_ID,
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
import { ApiError, requestFile } from "@/lib/utils/request";
import { usePresenceFeed } from "@/hooks/use_presence_feed";
import {
  IPresenceExpectedAbsentee,
  IPresenceLocationSummary,
} from "@/interfaces/attendance";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 現場人數與到班名單。
 *
 * ## 三個數字，缺一不可
 *
 * 在班 / 未打下班卡 / 未到工。母文件 §D10.6 要求它們同時出現：
 * 一個只顯示「在班 42 人」的看板，會讓人以為現場就是 42 個人。
 * 三個並列，才誠實地表達了**系統知道什麼、不知道什麼**。
 *
 * 而「未打下班卡」的意思是**系統不知道這個人在不在**，不是「他不在」——
 * 這句話必須寫在畫面上，不能只寫在文件裡：看板前的人要據此決定
 * 要不要打電話，而那個決定取決於他怎麼理解那個黃色數字。
 */

const API_BASE = `/api/v1/user/account_book/${DEMO_ACCOUNT_BOOK_ID}/hr/attendance`;

/**
 * Info: (20260813 - Julian) `hint` 是必填而不是選填。
 *
 * 這三個數字每一個都需要一句話解釋它在說什麼 —— 尤其「未打下班卡」，
 * 看板前的人要據此決定要不要打電話，而那個決定取決於他怎麼理解那個數字。
 * 留成選填，第一個趕時間的人就會少寫一句，而少的往往正是最需要的那一句。
 */
const StatCard: FC<{
  label: string;
  value: number;
  hint: string;
  tone: string;
}> = ({ label, value, hint, tone }) => (
  <div className="flex-1 rounded-2xl bg-white p-3 ring-1 ring-gray-200 lg:p-5">
    <div className="text-sm text-gray-500">{label}</div>
    <div
      className={`mt-2 inline-flex items-baseline rounded-lg px-3 py-1 text-3xl font-semibold tabular-nums ${tone}`}
    >
      {value}
    </div>
    <div className="mt-2 text-xs text-gray-400">{hint}</div>
  </div>
);

const PresencePageBody: FC = () => {
  const { t } = useTranslation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const feed = usePresenceFeed({
    apiBase: API_BASE,
    selectedLocationId: selectedId,
    fallbackError: t("hr_management.attendance_presence.error_load"),
  });

  const locations = useMemo<IPresenceLocationSummary[]>(
    () => feed.summary?.locations ?? [],
    [feed.summary],
  );

  /**
   * Info: (20260813 - Julian) 進頁時自動選人數最多的工區，但**只選一次**。
   *
   * 每輪都重選的話，使用者點開 A 工區、下一次輪詢就被拉回 B —— 而輪詢
   * 每 15 秒發生一次，等於這個看板不能用。
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
      const file = await requestFile(`${API_BASE}/presence/roster/export`, {
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
        error instanceof ApiError && error.message
          ? error.message
          : t("hr_management.attendance_presence.error_export"),
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
           * Info: (20260813 - Julian) 全帳本匯出放在最顯眼的位置。
           *
           * 這顆按鈕的使用場合是事故當下 —— 那個當下沒有人會先想
           * 「是哪一個工區」。先給全部，要縮小範圍再從工區卡片按。
           */}
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
        </div>

        {/* Info: (20260813 - Julian) 三個數字回答三個不同的問題，缺一個就會暗示系統其實不知道的事 */}
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap">
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

        <PresenceMap
          locations={locations}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          {/* Info: (20260813 - Julian) 工區卡片。人數為零的工區也要列，否則「沒有人」與「不存在」同形 */}
          <div className="flex flex-col gap-3">
            {locations.map((location) => (
              <button
                key={location.workLocationId}
                type="button"
                aria-label={location.name}
                onClick={() => setSelectedId(location.workLocationId)}
                className={`rounded-2xl bg-white p-4 text-left ring-1 transition ${
                  location.workLocationId === selectedId
                    ? "ring-2 ring-orange-400"
                    : "ring-gray-200 hover:ring-gray-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-800">
                    {location.name}
                  </span>
                  <span className="text-xs text-gray-400">{location.code}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700 tabular-nums">
                    {location.onSiteCount}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 font-semibold tabular-nums ${
                      location.staleCount > 0
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-50 text-gray-300"
                    }`}
                  >
                    {location.staleCount}
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    {t("hr_management.attendance_presence.radius", {
                      radius: location.radiusMeters,
                    })}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Info: (20260813 - Julian) 選定工區的到班名單 */}
          <div className="rounded-2xl bg-white ring-1 ring-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
              <div className="font-medium text-gray-800">
                {feed.roster?.name ??
                  t("hr_management.attendance_presence.no_location_selected")}
              </div>
              {feed.roster && (
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => exportRoster(feed.roster?.workLocationId)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  <Download className="size-4" />
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
                  <li
                    key={entry.employeeId}
                    className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
                  >
                    <span className="w-24 font-medium text-gray-800">
                      {entry.name}
                    </span>
                    <span className="w-20 text-gray-400">
                      {entry.employeeNo}
                    </span>
                    <span className="w-32 text-gray-500">
                      {entry.jobTitle ?? EMPTY_VALUE}
                    </span>
                    <span className="w-40 text-gray-500">
                      {entry.departmentName ?? EMPTY_VALUE}
                    </span>
                    <span className="w-32 text-gray-600 tabular-nums">
                      {/**
                       * Info: (20260813 - Julian) 跨夜班的進場時間屬於昨天，
                       * 因此連日期一起顯示 —— 只印 20:05 的話，
                       * 凌晨兩點看板前的人會以為那是今晚。
                       */}
                      {entry.workDate === feed.summary?.workDate
                        ? formatMinuteOfDay(
                            entry.sinceMinute,
                            t("hr_management.attendance.next_day"),
                          )
                        : isoDateTimeLabel(entry.workDate, entry.sinceMinute)}
                    </span>
                    <span
                      className={`ml-auto rounded-md px-2 py-0.5 text-xs font-medium ${PRESENCE_STATUS_STYLE[entry.status]}`}
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
         * Info: (20260813 - Julian) 未到工名單。
         *
         * 只給數字，看板前的人下一步就是問「是誰」—— 而那個問題應該由畫面回答，
         * 不是由一通打回辦公室的電話。
         */}
        {absentees.length > 0 && (
          <div className="rounded-2xl bg-white ring-1 ring-gray-200">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="font-medium text-gray-800">
                {t("hr_management.attendance_presence.expected_absent_title")}
              </div>
              <div className="mt-1 text-xs text-gray-400">
                {t("hr_management.attendance_presence.expected_absent_note")}
              </div>
            </div>
            <ul className="divide-y divide-gray-100">
              {absentees.map((absentee) => (
                <li
                  key={absentee.employeeId}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"
                >
                  <span className="w-24 font-medium text-gray-800">
                    {absentee.name}
                  </span>
                  <span className="w-20 text-gray-400">
                    {absentee.employeeNo}
                  </span>
                  <span className="w-32 text-gray-500">
                    {absentee.jobTitle ?? EMPTY_VALUE}
                  </span>
                  <span className="w-40 text-gray-500">
                    {absentee.departmentName ?? EMPTY_VALUE}
                  </span>
                  <span className="text-gray-500">
                    {t("hr_management.attendance_presence.expected_by", {
                      shift: absentee.shiftName ?? EMPTY_VALUE,
                      time: formatMinuteOfDay(
                        absentee.coreStartMinute,
                        t("hr_management.attendance.next_day"),
                      ),
                    })}
                  </span>
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
         * Info: (20260813 - Julian) 觀測時間戳。
         *
         * 現場狀態每分每秒都在變 —— 一份沒有時間戳的名單在事故調查時無法採信，
         * 而畫面上的數字若不標明是幾點的，看的人沒有辦法判斷它有多舊。
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
    </div>
  );
};

export default PresencePageBody;
