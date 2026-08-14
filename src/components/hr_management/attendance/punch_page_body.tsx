"use client";

import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, TriangleAlert } from "lucide-react";
import {
  DEMO_ACCOUNT_BOOK_ID,
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
import { useRouter } from "next/navigation";
import { HR_MANAGEMENT_ROUTE } from "@/constants/hr_management";
import { useServerClock } from "@/hooks/use_server_clock";
import { formatMinuteOfDay } from "@/lib/utils/attendance_format";
import { ApiError, IEnvelopeLike, request } from "@/lib/utils/request";
import { GeolocationStatus, useGeolocation } from "@/hooks/use_geolocation";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260813 - Julian) 打卡頁主內容區。
 *
 * ## 設計主張：在按下按鈕之前就讓人知道打不打得成
 *
 * 圍欄外一律拒絕（母計畫 §D6），而每一次拒絕都是一次挫折 ——
 * 站在工地上卻被系統擋下來的人不會想再按第二次。
 * 因此距離與可否打卡在進頁時就算好並顯示。
 *
 * ## 確定在圈外才 disable，曖昧地帶維持可按
 *
 * 原本的做法是「一律不 disable」，理由是 disable 掉的按鈕不會告訴任何人為什麼。
 * 那句話仍然成立 —— 所以現在 disable 的同時**一定伴隨一行紅字說明原因與下一步**，
 * 而不是只把按鈕變灰。
 *
 * 但門檻不是 `inside`，是 `isDefinitelyOutside()`：距離扣掉定位誤差之後仍然超出半徑。
 * 精度 35 公尺、半徑 60 公尺時，一個**真的站在圈內**的人可能被回報成距中心 70 公尺 ——
 * 照 `inside` 直接 disable，他會被鎖在門外，而且沒有任何辦法讓伺服器來裁決。
 * 誤差範圍內因此維持可按，由伺服器判定（護欄 G2）。**前端的估算不該變成判決。**
 *
 * ## 手機上「不用滑動就按得到」
 *
 * 演示全程在手機上（計畫書 §10）。原本的直式堆疊把打卡鈕推到地圖下方，
 * 而地圖高 256px —— 使用者要先滑一段才看得到那顆按鈕，
 * 而**那顆按鈕是這一頁存在的唯一理由**。
 *
 * 因此身分與班別收成**吸頂的細列**（`top-16`，讓開站台自己的 `h-16` 頁首），
 * 打卡鈕在手機上**吸底**（`sm:` 以上恢復正常排版）。
 * 兩者都用 sticky 而不是 fixed：fixed 會脫離文件流，
 * 中間的內容捲到底時會被蓋住最後一段。
 *
 * ## 打卡前要再確認一次
 *
 * 上下班共用同一顆按鈕，而打卡成功後標籤會立刻從「上班」翻成「下班」——
 * 連點兩下就是打完上班卡再打下班卡，而**出勤紀錄是 append-only，那一筆刪不掉**。
 * 因此中間隔一個確認對話框：它擋的不是誤解，是手指。
 */

const API_BASE = `/api/v1/user/account_book/${DEMO_ACCOUNT_BOOK_ID}/hr/attendance`;

/**
 * Info: (20260813 - Julian) 從 `ApiError` 裡取出圍欄外的 403 payload。
 *
 * `request()` 對非 2xx 一律拋 `ApiError`，而信封裡的 `payload` 只有
 * 圍欄外這一種失敗會帶東西（`jsonFailWithPayload`）。用欄位存在與否判斷，
 * 而不是比對 errorCode 字串 —— 前者在錯誤代碼改名時仍然成立。
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

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof ApiError && error.message ? error.message : fallback;

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
   * Info: (20260813 - Julian) 打卡成功的確認。
   *
   * 只存 `punchType`，**不存時刻** —— 時刻在下方的今日摘要裡，
   * 而那份摘要來自伺服器回傳的 `firstInMinute` / `lastOutMinute`。
   * 這裡若自己用瀏覽器時鐘印一個時間，等於在確認訊息上寫一個
   * 系統並不採信的數字（護欄 G1：`punchedAt` 一律由伺服器產生）。
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

  const loadAll = useCallback(async () => {
    setLoadError(null);
    try {
      const [locationRes, todayRes] = await Promise.all([
        request<IEnvelopeLike<{ locations: IWorkLocationSummary[] }>>(
          `${API_BASE}/location`,
        ),
        request<IEnvelopeLike<ITodayStatus>>(`${API_BASE}/today`),
      ]);
      setLocations(locationRes.payload?.locations ?? []);
      setToday(todayRes.payload);
    } catch (error) {
      /**
       * Info: (20260813 - Julian) 最可能的失敗是「Google 帳號尚未對應到員工檔」
       * （`NF_EMPLOYEE_FOR_USER`）。直接把後端訊息顯示出來，
       * 因為那句話已經寫得夠明白，再包一層只會讓人查不到原因。
       */
      setLoadError(messageOf(error, t("hr_management.attendance.error_load")));
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
        `${API_BASE}/punch`,
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
       * Info: (20260813 - Julian) 打卡成功後跳到現場狀態頁。
       *
       * 留 900ms 讓成功訊息看得見一眼再走 —— 直接跳走的話，使用者不確定
       * 剛才那一下到底成功了沒，而下一頁的名單要 15 秒輪詢才會出現他自己。
       * 這 900ms 就是「我按到了」與「我在名單上」之間的那個銜接。
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
      setFailure(messageOf(error, t("hr_management.attendance.error_punch")));
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

        {/* Info: (20260813 - Julian) 定位狀態：四種狀態各有各的下一步，不能壓成一個轉圈圈 */}
        <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200 lg:p-6">
          {/* Info: (20260814 - Julian) 伺服器時間 */}
          {serverClock && (
            <div className="shrink-0 py-2 text-center lg:py-0 lg:text-right">
              <p className="font-mono text-base leading-none font-semibold text-gray-800 tabular-nums lg:text-xl">
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
           * Info: (20260813 - Julian) 地圖擺在狀態列**下面**，不是上面。
           *
           * 上面那一行是主張（「距工區 340 公尺，超出打卡範圍」），
           * 地圖是它的佐證。反過來擺，第一眼看到的會是一張還在載入的灰框，
           * 而使用者真正需要的那句話被推到下面 —— 地圖掛掉時更是如此。
           *
           * 只有拿得到地點清單時才渲染：沒有地點就沒有圍欄可畫，
           * 一張空白底圖不會告訴任何人任何事。
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
           * Info: (20260813 - Julian) 灰掉的按鈕一定要伴隨一句話。
           *
           * 只變灰不解釋，使用者會以為系統壞了或自己沒有權限 ——
           * 而真正的原因（走近一點就好）是他自己解得開的。
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
                {t("hr_management.attendance.rejected_detail", {
                  name: rejection.nearestLocationName,
                  distance: rejection.distanceMeters,
                  radius: rejection.radiusMeters,
                })}
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
         * Info: (20260813 - Julian) 打卡前的確認。
         *
         * 訊息裡帶「上班／下班」與地點名稱，而不是一句「確定要打卡嗎」——
         * 這個對話框要擋的正是「以為在打上班卡，其實在打下班卡」，
         * 而那件事只有把動作名稱寫出來才擋得住。
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
 * Info: (20260813 - Julian) 定位狀態列。
 *
 * 四種狀態的下一步完全不同：等一下、可以打卡、去設定裡改權限、換一台裝置。
 * 因此各給各的文案與動作，而不是共用一個「定位失敗」。
 */
const LocationStatus: FC<{
  geoStatus: GeolocationStatus;
  nearest: IGeofenceMatch | null;
  accuracyMeters: number | null;
  onRetry: () => void;
}> = ({ geoStatus, nearest, accuracyMeters, onRetry }) => {
  const { t } = useTranslation();

  if (geoStatus === "locating" || geoStatus === "idle") {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="size-4 shrink-0 animate-spin" />
        {t("hr_management.attendance.locating")}
      </div>
    );
  }

  if (geoStatus === "denied" || geoStatus === "unavailable") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-700">
          <TriangleAlert className="size-4 shrink-0" />
          {geoStatus === "denied"
            ? t("hr_management.attendance.geo_denied")
            : t("hr_management.attendance.geo_unavailable")}
        </div>
        <div className="text-xs text-gray-500">
          {geoStatus === "denied"
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
