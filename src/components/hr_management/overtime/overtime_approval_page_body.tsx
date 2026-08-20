"use client";

import { FC, useCallback, useEffect, useState } from "react";
import { Loader2, Stamp } from "lucide-react";
import { DEMO_ATTENDANCE_MAX_RANGE_DAYS } from "@/constants/attendance";
import { EmployeeHrFunction } from "@/constants/hr_management";
import { HR_IDENTITY_API } from "@/constants/hr_identity_api";
import { IHrIdentityView } from "@/interfaces/hr_identity";
import { OVERTIME_API } from "@/constants/overtime_api";
import {
  IOvertimeExceptionReport,
  IOvertimeRequestSummary,
} from "@/interfaces/overtime";
import OvertimeRequestList from "@/components/hr_management/overtime/overtime_request_list";
import OvertimeUnapprovedPanel from "@/components/hr_management/overtime/overtime_unapproved_panel";
import { errorI18nKeyOf } from "@/lib/utils/attendance_error_message";
import { OVERTIME_ERROR_I18N_KEY } from "@/lib/utils/overtime_error_message";
import { addIsoDays } from "@/lib/utils/attendance_time";
import { IEnvelopeLike, request } from "@/lib/utils/request";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260818 - Julian) 加班簽核（L26 / L27 / L29 與待簽清單）。
 *
 * ## 為什麼未核准時段跟待簽清單放同一頁
 *
 * 它們是同一個決定的兩面：待簽清單是「有人申請了，請你決定」，
 * 未核准時段是「有人待著，但沒有人申請」。只做前者，主管會以為
 * 沒出現在清單上的就沒有發生 —— 而那正是勞動檢查會看見的東西
 * （ADR 024 §2.1）。
 *
 * ## 為什麼不是主管的人也打得開
 *
 * 待簽清單對他而言是空的，而那是正確的：「你沒有要簽的單」與
 * 「你沒有權限」是兩件事，用 403 表達前者會讓一個剛被升為主管的人
 * 以為系統壞了（同假單 L16 的既有處置）。
 */

/** Info: (20260818 - Julian) 以**當地**日期取今天，不用 `toISOString()`（那是 UTC，跨日會差一天） */
const localIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const OvertimeApprovalPageBody: FC = () => {
  const { t } = useTranslation();

  const [pending, setPending] = useState<IOvertimeRequestSummary[]>([]);
  /**
   * Info: (20260819 - Julian) §32 IV 的認定限 `HR_ADMIN`（review B7）。
   * 這只決定看不看得到那一區 —— 授權在 service 端。
   */
  const [mayDeclareEmergency, setMayDeclareEmergency] = useState(false);
  /**
   * Info: (20260820 - Julian) **下屬的**未核准時段（review 第 6 輪 M23）。
   *
   * 這裡原本是單一份報告，而查詢沒有帶 `employeeId` —— route 的預設是本人，
   * 於是簽核頁顯示的是主管自己的未核准時段，下屬的永遠不會出現在任何畫面上。
   * 本檔檔頭寫的正是這件事的後果：「主管會以為沒出現在清單上的就沒有發生」。
   */
  const [reports, setReports] = useState<IOvertimeExceptionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * Info: (20260818 - Julian) 未核准時段預設看近 14 天。
   *
   * 不預設整個區間上限（`DEMO_ATTENDANCE_MAX_RANGE_DAYS`）：那份清單是要
   * 用眼睛掃的，一次列三個月會讓人直接放棄看它。使用者可以自己往前調。
   */
  const [days, setDays] = useState(14);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const to = localIsoDate(new Date());

    try {
      const [pendingRes, reportRes, meRes] = await Promise.all([
        request<IEnvelopeLike<IOvertimeRequestSummary[]>>(
          OVERTIME_API.REQUEST_PENDING,
        ),
        request<IEnvelopeLike<IOvertimeExceptionReport[]>>(
          OVERTIME_API.UNAPPROVED,
          {
            query: {
              from: addIsoDays(to, -(days - 1)),
              to,
              // Info: (20260820 - Julian) 我管得到的每一個人（review 第 6 輪 M23）
              scope: "team",
            },
          },
        ),
        request<IEnvelopeLike<IHrIdentityView>>(HR_IDENTITY_API.ME),
      ]);
      setPending(pendingRes.payload ?? []);
      setReports(reportRes.payload ?? []);
      setMayDeclareEmergency(
        meRes.payload?.hrFunctions?.includes(EmployeeHrFunction.HR_ADMIN) ??
          false,
      );
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
  }, [days, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

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
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Stamp className="size-4 text-sky-500" />
          {t("hr_management.overtime.approval_title", {
            count: pending.length,
          })}
        </h2>

        <OvertimeRequestList
          requests={pending}
          emptyKey="hr_management.overtime.approval_empty"
          decidable
          mayDeclareEmergency={mayDeclareEmergency}
          onChanged={reload}
        />
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-800">
            {t("hr_management.overtime.unapproved_title")}
          </h2>
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800"
          >
            {[7, 14, 30, DEMO_ATTENDANCE_MAX_RANGE_DAYS].map((option) => (
              <option key={option} value={option}>
                {t("hr_management.overtime.unapproved_range_days", {
                  days: option,
                })}
              </option>
            ))}
          </select>
        </div>

        {reports.length === 0 ? (
          <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-500">
            {t("hr_management.overtime.unapproved_team_empty")}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.map((item) => (
              <div key={item.employeeId} className="flex flex-col gap-2">
                {/* Info: (20260820 - Julian) 逐人分組：一份混在一起的清單看不出是誰的 */}
                <h3 className="text-xs font-medium text-gray-500">
                  {item.employeeNo} {item.employeeName}
                </h3>
                <OvertimeUnapprovedPanel report={item} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default OvertimeApprovalPageBody;
