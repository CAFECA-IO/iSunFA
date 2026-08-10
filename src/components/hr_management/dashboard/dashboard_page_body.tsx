"use client";

import { FC, useMemo, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import DashboardActionPanel from "@/components/hr_management/dashboard/dashboard_action_panel";
import DashboardDepartmentPie from "@/components/hr_management/dashboard/dashboard_department_pie";
import DashboardEngagementRow from "@/components/hr_management/dashboard/dashboard_engagement_row";
import DashboardKpiCards from "@/components/hr_management/dashboard/dashboard_kpi_cards";
import DashboardStructureChart from "@/components/hr_management/dashboard/dashboard_structure_chart";
import DashboardTrendChart from "@/components/hr_management/dashboard/dashboard_trend_chart";
import {
  HR_DASHBOARD_ROLE_I18N_KEY,
  HR_DASHBOARD_ROLES,
  HrDashboardRole,
  MOCK_MANAGER_DEPARTMENT_ID,
} from "@/constants/hr_management";
import {
  MOCK_HR_DOCUMENTS,
  MOCK_HR_PROCESS_TASKS,
} from "@/constants/mock_hr_dashboard";
import {
  MOCK_HR_EMPLOYEES,
  MOCK_HR_TODAY,
} from "@/constants/mock_hr_employees";
import { MOCK_HR_DEPARTMENTS } from "@/constants/mock_hr_organization";
import { buildDashboardData } from "@/lib/utils/hr_dashboard";
import { parseIsoDate } from "@/lib/utils/hr_date";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260810 - Julian) 儀表板主內容區。
 *
 * 所有相對日期都以 `MOCK_HR_TODAY` 為基準，不用 `new Date()`：
 * 伺服器與瀏覽器各自取當下時間會算出不同的「本月」與「剩餘天數」，
 * 跨月或跨日的那一刻就會 hydration 不一致。基準日直接顯示在標題列下方，
 * 接上 API 後改成伺服器回傳的資料時間，這行字仍然成立。
 */
const DashboardPageBody: FC = () => {
  const { t } = useTranslation();

  /**
   * ToDo: (20260810 - Julian) 視角目前由這個切換器決定，接上權限後
   * 改為讀取 `useAuth()` 的角色與其管理的部門，並移除切換器。
   */
  const [role, setRole] = useState<HrDashboardRole>(HrDashboardRole.HR);

  const today = useMemo(() => parseIsoDate(MOCK_HR_TODAY), []);

  const departmentScopeId =
    role === HrDashboardRole.MANAGER ? MOCK_MANAGER_DEPARTMENT_ID : null;

  const scopeLabel = useMemo(() => {
    if (!departmentScopeId) return t("hr_management.dashboard.scope_all");
    const department = MOCK_HR_DEPARTMENTS.find(
      (item) => item.id === departmentScopeId,
    );
    return t("hr_management.dashboard.scope_department", {
      department: department?.name ?? "",
    });
  }, [departmentScopeId, t]);

  const data = useMemo(
    () =>
      buildDashboardData(
        {
          employees: MOCK_HR_EMPLOYEES,
          documents: MOCK_HR_DOCUMENTS,
          tasks: MOCK_HR_PROCESS_TASKS,
          departments: MOCK_HR_DEPARTMENTS,
          today,
          departmentScopeId,
        },
        t,
      ),
    [today, departmentScopeId, t],
  );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Info: (20260810 - Julian) 標題列與視角切換 */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-800">
              <LayoutDashboard className="size-6 shrink-0 text-orange-500" />
              {t("hr_management.dashboard.title")}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {t("hr_management.dashboard.subtitle")}
              <span className="mx-2 text-gray-300">|</span>
              {scopeLabel}
              <span className="mx-2 text-gray-300">|</span>
              {t("hr_management.dashboard.as_of", { date: MOCK_HR_TODAY })}
            </p>
          </div>

          <div
            className="flex shrink-0 gap-1 rounded-xl bg-gray-100 p-1"
            aria-label={t("hr_management.dashboard.role_aria")}
          >
            {HR_DASHBOARD_ROLES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                aria-pressed={role === item}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  role === item
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t(HR_DASHBOARD_ROLE_I18N_KEY[item])}
              </button>
            ))}
          </div>
        </div>

        {/* Info: (20260810 - Julian) 區塊一：KPI */}
        <DashboardKpiCards kpi={data.kpi} />

        {/**
         * Info: (20260810 - Julian) 區塊二與區塊三並排。
         * 左欄給待辦（3fr）、右欄給圖表（2fr）—— 待辦是每天真的要處理的東西，
         * 圖表是拿來對照的背景，兩者對半分會讓清單擠到要換行。
         */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <DashboardActionPanel
            probationAlerts={data.probationAlerts}
            processTasks={data.processTasks}
            documentAlerts={data.documentAlerts}
          />

          <div className="flex flex-col gap-4">
            <DashboardDepartmentPie data={data.departmentDistribution} />
            <DashboardTrendChart data={data.trend} />
            <DashboardStructureChart
              tenure={data.tenureDistribution}
              age={data.ageDistribution}
            />
          </div>
        </div>

        {/* Info: (20260810 - Julian) 區塊二下半：動態與關懷，橫跨整個版面 */}
        <DashboardEngagementRow
          recentHires={data.recentHires}
          birthdays={data.birthdays}
          anniversaries={data.anniversaries}
        />
      </div>
    </div>
  );
};

export default DashboardPageBody;
