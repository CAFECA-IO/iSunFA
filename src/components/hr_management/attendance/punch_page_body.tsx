"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, TriangleAlert } from "lucide-react";
import {
  ATTENDANCE_API,
  GeolocationStatus,
  PunchType,
  ShiftPatternKind,
} from "@/constants/attendance";
import {
  IOutOfFencePayload,
  ITodayStatus,
  IWorkLocationSummary,
} from "@/interfaces/attendance";
import {
  findNearestGeofence,
  IGeofenceMatch,
  isDefinitelyOutside,
} from "@/lib/attendance_geofence";
import PunchMap from "@/components/hr_management/attendance/punch_map";
import ConfirmModal from "@/components/common/confirm_modal";
import PendingRecallCard from "@/components/hr_management/attendance/pending_recall_card";
import { usePendingRecalls } from "@/hooks/use_pending_recalls";
import { useRouter } from "next/navigation";
import { HR_MANAGEMENT_ROUTE } from "@/constants/hr_management";
import { useServerClock } from "@/hooks/use_server_clock";
import { formatMinuteOfDay } from "@/lib/utils/attendance_format";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { ApiError, IEnvelopeLike, request } from "@/lib/utils/request";
import { useGeolocation } from "@/hooks/use_geolocation";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 打卡頁主內容區。
 *
 * 圍欄外一律拒絕，距離與可否打卡在進頁時先算好顯示。按鈕 disable 判準是
 * `isDefinitelyOutside()`（距離扣掉定位誤差仍超出半徑），不是 `inside`——
 * 曖昧地帶維持可按，交由伺服器裁決（護欄 G2），disable 時必須伴隨紅字說明。
 * 手機上打卡鈕吸底、身分列吸頂；打卡前需二次確認，因出勤紀錄是
 * append-only，誤按無法刪除。
 */

/**
 * Info: (20260813 - Julian) 從 `ApiError` 取出圍欄外的 403 payload。
 * 用欄位存在與否判斷，而非比對 errorCode 字串——前者在代碼改名時仍然成立。
 */
const outOfFencePayloadOf = (error: unknown): IOutOfFencePayload | null => {
  if (!(error instanceof ApiError)) return null;
  const envelope = error.data as
    | IEnvelopeLike<IOutOfFencePayload>
    | undefined
    | null;
  const payload = envelope?.payload;
  if (
    payload &&
    typeof payload === "object" &&
    "nearestLocationName" in payload
  )
    return payload;
  return null;
};

/**
 * Info: (20260814 - Julian) 打卡頁最高頻的錯誤：帳號還沒綁到員工檔。
 * 它值得一句自己的話 —— 使用者能做的事（找人事確認信箱）與其他載入失敗完全不同。
 */
const LOAD_ERROR_I18N_KEY: Readonly<Record<string, string>> = {
  [API_ERRORS.NF_EMPLOYEE_FOR_USER.code]:
    "hr_management.attendance.error_no_employee",
};

const PunchPageBody: FC = () => {
  const { t } = useTranslation();
  const { status: geoStatus, reading, refresh } = useGeolocation();

  const [locations, setLocations] = useState<IWorkLocationSummary[]>([]);
  const [today, setToday] = useState<ITodayStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [rejection, setRejection] = useState<IOutOfFencePayload | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  /**
   * Info: (20260813 - Julian) 只存 `punchType`，不存時刻——時刻來自伺服器的
   * `firstInMinute` / `lastOutMinute`（護欄 G1：`punchedAt` 一律由伺服器產生）。
   */
  const [success, setSuccess] = useState<PunchType | null>(null);

  // Info: (20260813 - Julian) 待確認的打卡類型；非 null 時對話框開著
  const [pendingPunch, setPendingPunch] = useState<PunchType | null>(null);

  const router = useRouter();

  /**
   * Info: (20260813 - Julian) 秒錶以伺服器時刻為準 —— 見 `useServerClock` 的說明。
   * `today` 每次更新（載入、打卡）都會帶來新的 `serverNowIso`，等於重新校時。
   */
  const { label: serverClock } = useServerClock(today?.serverNowIso ?? null);

  // Info: (20260814 - Julian) 待回應的銷假徵詢；同意後今日班別可能就變了，所以要一起重載
  const pendingRecalls = usePendingRecalls();

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [locationRes, todayRes] = await Promise.all([
        request<IEnvelopeLike<{ locations: IWorkLocationSummary[] }>>(
          ATTENDANCE_API.LOCATION,
        ),
        request<IEnvelopeLike<ITodayStatus>>(ATTENDANCE_API.TODAY),
      ]);
      setLocations(locationRes.payload?.locations ?? []);
      setToday(todayRes.payload);
    } catch (error) {
      /**
       * Info: (20260813 - Julian) 最可能的失敗是帳號尚未對應到員工檔
       * （`NF_EMPLOYEE_FOR_USER`），直接顯示後端訊息，不再包一層。
       */
      setLoadError(
        t(
          errorI18nKeyOf(
            error,
            "hr_management.attendance.error_load",
            LOAD_ERROR_I18N_KEY,
          ),
        ),
      );
    }
  }, [t]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Info: (20260813 - Julian) 前端自己算最近距離：顯示用，與伺服器判定各算各的
  const nearest = useMemo<IGeofenceMatch | null>(() => {
    if (!reading || locations.length === 0) return null;
    return findNearestGeofence(reading.latitude, reading.longitude, locations);
  }, [reading, locations]);

  /**
   * Info: (20260813 - Julian) 只有「確定在圈外」才擋 —— 判準見 `isDefinitelyOutside`。
   */
  const outOfRange = isDefinitelyOutside(
    nearest,
    reading?.accuracyMeters ?? null,
  );

  const punch = async (punchType: PunchType) => {
    if (!reading) return;
    setSubmitting(true);
    setRejection(null);
    setFailure(null);
    setSuccess(null);

    try {
      const result = await request<IEnvelopeLike<ITodayStatus>>(
        ATTENDANCE_API.PUNCH,
        {
          method: "POST",
          body: JSON.stringify({
            punchType,
            latitude: reading.latitude,
            longitude: reading.longitude,
            accuracyMeters: reading.accuracyMeters,
          }),
        },
      );
      setToday(result.payload);
      setSuccess(punchType);

      /**
       * Info: (20260813 - Julian) 打卡成功後跳到現場狀態頁，留 900ms 讓成功
       * 訊息先看得到一眼，避免使用者不確定剛才是否成功。
       */
      window.setTimeout(() => {
        router.push(HR_MANAGEMENT_ROUTE.ATTENDANCE_PRESENCE);
      }, 900);
    } catch (error) {
      /**
       * Info: (20260813 - Julian) 圍欄外的 403 帶著最近地點與距離。
       * 收到它的人正站在某處試圖上班，「離工區 340 公尺」比「不能打卡」有用得多。
       */
      const outOfFence = outOfFencePayloadOf(error);
      if (outOfFence) {
        setRejection(outOfFence);
        return;
      }
      setFailure(
        t(errorI18nKeyOf(error, "hr_management.attendance.error_punch")),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const shiftLabel = (): string => {
    if (!today?.shift || !today.shiftName) {
      return t("hr_management.attendance.no_schedule_today");
    }
    const kind =
      today.shiftKind === ShiftPatternKind.FLEXIBLE
        ? t("hr_management.attendance.kind_flexible")
        : t("hr_management.attendance.kind_fixed");
    const nextDay = t("hr_management.attendance.next_day");
    const from = formatMinuteOfDay(today.shift.windowStartMinute, nextDay);
    const to = formatMinuteOfDay(today.shift.windowEndMinute, nextDay);
    return `${today.shiftName}（${kind}）${from}–${to}`;
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-3 lg:gap-5">
        {/* Info: (20260813 - Julian) 身分、班別與現在時間。手機上吸頂，讓下方的按鈕進得了第一屏 */}
        <div className="sticky top-16 z-20 rounded-2xl bg-white/95 p-3 ring-1 ring-gray-200 backdrop-blur lg:static lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-800 lg:text-lg">
                {today
                  ? t("hr_management.attendance.greeting", {
                      name: today.name,
                      employeeNo: today.employeeNo,
                    })
                  : t("hr_management.attendance.title")}
              </div>
              <div className="mt-1 text-xs text-gray-500 lg:text-sm">
                {today
                  ? `${t("hr_management.attendance.today_shift")}：${shiftLabel()}`
                  : t("hr_management.attendance.loading")}
              </div>
            </div>
          </div>

          {loadError && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200 lg:text-sm">
              {loadError}
            </div>
          )}
        </div>

        {/**
         * Info: (20260814 - Julian) 徵詢卡放在最上面：它是這一頁上唯一「別人在等你回答」的東西。
         * 排在打卡按鈕之後的話，人會先打完卡就離開，而徵詢會一直掛著。
         */}
        {pendingRecalls.recalls.map((recall) => (
          <PendingRecallCard
            key={recall.recallId}
            recall={recall}
            onResponded={() => {
              pendingRecalls.refresh();
              loadAll();
            }}
          />
        ))}

        {/* Info: (20260813 - Julian) 定位狀態：四種狀態各有各的下一步，不能壓成一個轉圈圈 */}
        <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200 lg:p-6">
          {/* Info: (20260814 - Julian) 伺服器時間 */}
          {serverClock && (
            <div className="shrink-0 py-2 text-center lg:py-0 lg:text-right">
              <p className="font-mono text-lg leading-none font-semibold text-gray-800 tabular-nums lg:text-xl">
                {serverClock}
              </p>
            </div>
          )}
          <LocationStatus
            geoStatus={geoStatus}
            nearest={nearest}
            accuracyMeters={reading?.accuracyMeters ?? null}
            onRetry={refresh}
          />

          {/**
           * Info: (20260813 - Julian) 地圖擺在狀態列下面，不是上面——上面的文字
           * 才是主張，地圖只是佐證。只有拿得到地點清單時才渲染。
           */}
          {locations.length > 0 && (
            <div className="mt-4">
              <PunchMap
                locations={locations}
                nearestLocation={
                  locations.find(
                    (location) => location.id === nearest?.location.id,
                  ) ?? null
                }
                reading={reading}
                inside={nearest?.inside ?? false}
              />
            </div>
          )}
        </div>

        {/* Info: (20260813 - Julian) 打卡按鈕。手機上吸底；確定在圈外才 disable —— 見檔頭說明 */}
        <div className="sticky bottom-0 z-20 rounded-2xl bg-white/95 p-3 ring-1 ring-gray-200 backdrop-blur sm:static lg:p-6">
          <button
            type="button"
            disabled={submitting || !reading || !today || outOfRange}
            onClick={() =>
              setPendingPunch(
                today?.onSite ? PunchType.CLOCK_OUT : PunchType.CLOCK_IN,
              )
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300 lg:px-6 lg:py-4 lg:text-base"
          >
            {submitting && <Loader2 className="size-5 shrink-0 animate-spin" />}
            {today?.onSite
              ? t("hr_management.attendance.action_clock_out")
              : t("hr_management.attendance.action_clock_in")}
          </button>

          {/**
           * Info: (20260813 - Julian) 按鈕變灰必須伴隨一句話說明原因，
           * 否則使用者會以為系統壞了或自己沒有權限。
           */}
          {outOfRange && nearest && (
            <p className="mt-3 text-center text-sm font-medium text-red-600">
              {t("hr_management.attendance.blocked_out_of_range", {
                name: nearest.location.name,
                distance: nearest.distanceMeters,
                radius: nearest.location.radiusMeters,
              })}
            </p>
          )}

          {success && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="size-4 shrink-0" />
              {success === PunchType.CLOCK_IN
                ? t("hr_management.attendance.success_clock_in", {
                    location: today?.workLocationName ?? "",
                  })
                : t("hr_management.attendance.success_clock_out")}
            </div>
          )}

          {rejection && (
            <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
              <div className="font-semibold">
                {t("hr_management.attendance.rejected_title")}
              </div>
              <div className="mt-1">
                {t(
                  rejection.withinAccuracyMargin
                    ? "hr_management.attendance.rejected_detail_accuracy"
                    : "hr_management.attendance.rejected_detail",
                  {
                    name: rejection.nearestLocationName,
                    distance: rejection.distanceMeters,
                    radius: rejection.radiusMeters,
                  },
                )}
              </div>
            </div>
          )}

          {failure && (
            <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
              {failure}
            </div>
          )}

          <TodaySummary today={today} />
        </div>

        {/**
         * Info: (20260813 - Julian) 確認訊息帶「上班／下班」與地點名稱，
         * 而非籠統的「確定要打卡嗎」——要擋的是打錯方向那一下。
         */}
        <ConfirmModal
          isOpen={pendingPunch !== null}
          onClose={() => setPendingPunch(null)}
          title={
            pendingPunch === PunchType.CLOCK_OUT
              ? t("hr_management.attendance.confirm_title_out")
              : t("hr_management.attendance.confirm_title_in")
          }
          message={
            pendingPunch === PunchType.CLOCK_OUT
              ? t("hr_management.attendance.confirm_message_out", {
                  name: nearest?.location.name ?? "",
                })
              : t("hr_management.attendance.confirm_message_in", {
                  name: nearest?.location.name ?? "",
                })
          }
          confirmText={
            pendingPunch === PunchType.CLOCK_OUT
              ? t("hr_management.attendance.action_clock_out")
              : t("hr_management.attendance.action_clock_in")
          }
          cancelText={t("hr_management.attendance.confirm_cancel")}
          onConfirm={() => {
            if (pendingPunch) punch(pendingPunch);
          }}
        />
      </div>
    </div>
  );
};

/**
 * Info: (20260813 - Julian) 定位狀態列：四種狀態各自的下一步不同（等一下、
 * 可以打卡、去設定改權限、換裝置），因此各給各的文案與動作。
 */
const LocationStatus: FC<{
  geoStatus: GeolocationStatus;
  nearest: IGeofenceMatch | null;
  accuracyMeters: number | null;
  onRetry: () => void;
}> = ({ geoStatus, nearest, accuracyMeters, onRetry }) => {
  const { t } = useTranslation();

  if (
    geoStatus === GeolocationStatus.LOCATING ||
    geoStatus === GeolocationStatus.IDLE
  ) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        {t("hr_management.attendance.locating")}
      </div>
    );
  }

  if (
    geoStatus === GeolocationStatus.DENIED ||
    geoStatus === GeolocationStatus.UNAVAILABLE
  ) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
          <TriangleAlert className="size-4 shrink-0" />
          {geoStatus === GeolocationStatus.DENIED
            ? t("hr_management.attendance.geo_denied")
            : t("hr_management.attendance.geo_unavailable")}
        </div>
        <div className="text-xs text-gray-500">
          {geoStatus === GeolocationStatus.DENIED
            ? t("hr_management.attendance.geo_denied_hint")
            : t("hr_management.attendance.geo_unavailable_hint")}
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="self-start rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-200"
        >
          {t("hr_management.attendance.geo_retry")}
        </button>
      </div>
    );
  }

  if (!nearest) {
    return (
      <div className="text-sm text-gray-500">
        {t("hr_management.attendance.no_location_configured")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex items-center gap-2 text-sm font-medium ${
          nearest.inside ? "text-emerald-700" : "text-red-700"
        }`}
      >
        {nearest.inside ? (
          <CheckCircle2 className="size-4 shrink-0" />
        ) : (
          <MapPin className="size-4 shrink-0" />
        )}
        {t(
          nearest.inside
            ? "hr_management.attendance.geo_inside"
            : "hr_management.attendance.geo_outside",
          {
            name: nearest.location.name,
            distance: nearest.distanceMeters,
          },
        )}
      </div>
      {accuracyMeters !== null && (
        <div className="text-xs text-gray-400">
          {t("hr_management.attendance.geo_accuracy", {
            accuracy: accuracyMeters,
          })}
        </div>
      )}
    </div>
  );
};

// Info: (20260813 - Julian) 今日已打的卡。尚未打卡時也要顯示，讓人知道系統確實讀到了他
const TodaySummary: FC<{ today: ITodayStatus | null }> = ({ today }) => {
  const { t } = useTranslation();

  if (!today) return null;

  const nextDay = t("hr_management.attendance.next_day");
  const hasPunch = today.firstInMinute !== null || today.lastOutMinute !== null;

  return (
    <div className="mt-5 border-t border-gray-100 pt-4 text-sm">
      {hasPunch ? (
        <div className="flex flex-col gap-1 text-gray-600">
          <div>
            {t("hr_management.attendance.summary_in")}：
            {formatMinuteOfDay(today.firstInMinute, nextDay)}
            {today.workLocationName ? ` @ ${today.workLocationName}` : ""}
          </div>
          <div>
            {t("hr_management.attendance.summary_out")}：
            {formatMinuteOfDay(today.lastOutMinute, nextDay)}
          </div>
        </div>
      ) : (
        <div className="text-gray-400">
          {t("hr_management.attendance.summary_none")}
        </div>
      )}
    </div>
  );
};

export default PunchPageBody;
