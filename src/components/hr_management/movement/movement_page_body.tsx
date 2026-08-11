"use client";

import { FC, useMemo, useState } from "react";
import { LogOut, Repeat, Search, UserPlus } from "lucide-react";
import MovementKanban from "@/components/hr_management/movement/movement_kanban";
import MovementTaskDrawer from "@/components/hr_management/movement/movement_task_drawer";
import OffboardingSplitView from "@/components/hr_management/movement/offboarding_split_view";
import OnboardingTable from "@/components/hr_management/movement/onboarding_table";
import ProbationReviewModal from "@/components/hr_management/movement/probation_review_modal";
import ProbationTable from "@/components/hr_management/movement/probation_table";
import {
  HR_DASHBOARD_ROLES,
  HR_DASHBOARD_ROLE_I18N_KEY,
  HR_FILTER_ALL,
  HrDashboardRole,
  MOVEMENT_TABS,
  MOVEMENT_TAB_I18N_KEY,
  MOVEMENT_VIEW_MODES,
  MOVEMENT_VIEW_MODE_I18N_KEY,
  MovementStage,
  MovementTab,
  MovementViewMode,
  OffboardingListMode,
  OnboardingQuickFilter,
  ProcessTaskStatus,
} from "@/constants/hr_management";
import { MOCK_HR_TODAY } from "@/constants/mock_hr_employees";
import {
  MOCK_HR_MOVEMENT_PEOPLE,
  MOCK_HR_MOVEMENT_TASKS,
  MOCK_HR_RESIGNATION_NOTICES,
} from "@/constants/mock_hr_movement";
import { MOCK_HR_DEPARTMENTS } from "@/constants/mock_hr_organization";
import {
  IMovementCase,
  IProbationReviewForm,
  IProbationRow,
  IProcessTask,
} from "@/interfaces/hr_management";
import { parseIsoDate } from "@/lib/utils/hr_date";
import {
  applyOnboardingFilter,
  buildMovementCases,
  buildOffboardingCases,
  buildOnboardingRows,
  buildProbationMetrics,
  buildProbationRows,
  resolveProbationAlert,
} from "@/lib/utils/hr_movement";
import {
  buildDepartmentTree,
  flattenDepartmentTree,
} from "@/lib/utils/hr_organization";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260811 - Julian) 到離職與試用期管理的主內容區。
 *
 * 四個分頁看的是同一批人與同一份任務，因此所有可變狀態都放在這一層：
 * 在抽屜裡勾掉一項任務，看板的進度條、報到列表的三個欄位、離職矩陣的計數
 * 會同時更新。狀態若下放到各分頁，同一件事會有四份互相不知道的副本。
 *
 * ToDo: (20260811 - Julian) 所有變更目前只存在記憶體，重整即回復。
 * 接上 API 後這三份 override 都要改成送出並以伺服器回傳為準。
 */
const MovementPageBody: FC = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<MovementTab>(MovementTab.OVERVIEW);
  const [viewMode, setViewMode] = useState<MovementViewMode>(
    MovementViewMode.KANBAN,
  );
  const [role, setRole] = useState<HrDashboardRole>(HrDashboardRole.HR);

  const [keyword, setKeyword] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>(HR_FILTER_ALL);
  const [assignee, setAssignee] = useState<string>(HR_FILTER_ALL);
  const [onboardingFilter, setOnboardingFilter] =
    useState<OnboardingQuickFilter>(OnboardingQuickFilter.ALL);
  const [offboardingMode, setOffboardingMode] = useState<OffboardingListMode>(
    OffboardingListMode.ACTIVE,
  );

  const [taskOverrides, setTaskOverrides] = useState<Record<string, boolean>>(
    {},
  );
  const [stageOverrides, setStageOverrides] = useState<
    Record<string, MovementStage>
  >({});
  /**
   * Info: (20260811 - Julian) 每位員工一份考核表單，草稿與已提交共用同一份。
   * `isDraft` 決定它算不算完成考核 —— 草稿不會讓清單的紅燈消失。
   */
  const [probationForms, setProbationForms] = useState<
    Record<string, IProbationReviewForm>
  >({});

  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [reviewEmployeeId, setReviewEmployeeId] = useState<string | null>(null);
  const [selectedOffboardingId, setSelectedOffboardingId] = useState<
    string | null
  >(null);

  const today = useMemo(() => parseIsoDate(MOCK_HR_TODAY), []);

  // Info: (20260811 - Julian) 套用勾選覆寫後的任務，所有分頁都吃這一份
  const tasks = useMemo<IProcessTask[]>(
    () =>
      MOCK_HR_MOVEMENT_TASKS.map((task) => {
        const override = taskOverrides[task.id];
        if (override === undefined) return task;
        return {
          ...task,
          status: override
            ? ProcessTaskStatus.COMPLETED
            : ProcessTaskStatus.PENDING,
        };
      }),
    [taskOverrides],
  );

  const departmentOptions = useMemo(
    () =>
      flattenDepartmentTree(
        buildDepartmentTree(MOCK_HR_DEPARTMENTS, MOCK_HR_MOVEMENT_PEOPLE),
      ),
    [],
  );

  // Info: (20260811 - Julian) 負責人選單從任務裡取，避免列出與到離職無關的同仁
  const assigneeOptions = useMemo(
    () =>
      [
        ...new Set(MOCK_HR_MOVEMENT_TASKS.map((task) => task.assigneeName)),
      ].sort(),
    [],
  );

  const allCases = useMemo(() => {
    const built = buildMovementCases(MOCK_HR_MOVEMENT_PEOPLE, tasks, today);
    return built.map((item) => ({
      ...item,
      stage: stageOverrides[item.id] ?? item.stage,
    }));
  }, [tasks, today, stageOverrides]);

  // Info: (20260811 - Julian) 頂部搜尋列同時作用在四個分頁
  const filteredCases = useMemo<IMovementCase[]>(() => {
    const normalized = keyword.trim().toLowerCase();
    return allCases.filter((item) => {
      const matchedKeyword =
        normalized === "" ||
        item.employeeName.toLowerCase().includes(normalized) ||
        item.employeeNo.toLowerCase().includes(normalized);
      const matchedDepartment =
        departmentId === HR_FILTER_ALL ||
        departmentOptions.some(
          (option) =>
            option.id === departmentId && option.name === item.departmentName,
        );
      const matchedAssignee =
        assignee === HR_FILTER_ALL ||
        item.tasks.some((task) => task.assigneeName === assignee);
      return matchedKeyword && matchedDepartment && matchedAssignee;
    });
  }, [allCases, keyword, departmentId, assignee, departmentOptions]);

  const onboardingRows = useMemo(
    () =>
      applyOnboardingFilter(
        buildOnboardingRows(filteredCases),
        onboardingFilter,
      ),
    [filteredCases, onboardingFilter],
  );

  const offboardingCases = useMemo(() => {
    const built = buildOffboardingCases(
      filteredCases,
      MOCK_HR_MOVEMENT_PEOPLE,
      today,
      MOCK_HR_RESIGNATION_NOTICES,
    );
    return built.filter((item) =>
      offboardingMode === OffboardingListMode.ACTIVE
        ? !item.isCompleted
        : item.isCompleted,
    );
  }, [filteredCases, today, offboardingMode]);

  // Info: (20260811 - Julian) 已填寫的考核結果覆寫回列，統計才會跟著動
  const probationRows = useMemo<IProbationRow[]>(() => {
    const normalized = keyword.trim().toLowerCase();
    return buildProbationRows(MOCK_HR_MOVEMENT_PEOPLE, today)
      .filter(
        (row) =>
          normalized === "" ||
          row.employeeName.toLowerCase().includes(normalized) ||
          row.employeeNo.toLowerCase().includes(normalized),
      )
      .map((row) => {
        const form = probationForms[row.employeeId];
        if (!form) return row;

        /**
         * Info: (20260811 - Julian) 只有「已提交」才算完成考核。
         * 草稿仍然是未考核 —— 否則主管存個草稿就能讓逾期紅燈消失，
         * 那個警示也就失去意義了。
         */
        const isSubmitted = !form.isDraft && form.result !== null;
        const scores = Object.values(form.scores);
        const average =
          Math.round(
            (scores.reduce((sum, value) => sum + value, 0) / scores.length) *
              10,
          ) / 10;

        const result = isSubmitted ? form.result : null;

        return {
          ...row,
          score: isSubmitted ? average : null,
          result,
          isDraft: form.isDraft,
          alert: resolveProbationAlert(row.isOverdue, result),
        };
      });
  }, [today, keyword, probationForms]);

  const probationMetrics = useMemo(
    () => buildProbationMetrics(probationRows, today),
    [probationRows, today],
  );

  /**
   * Info: (20260811 - Julian) 員工 id → 案件，供「點姓名開抽屜」使用。
   *
   * 試用期分頁列的是人不是案件，而試用期中的人不一定還有進行中的報到流程
   * （報到滿一週就從看板消失了）。因此提供 `hasCase` 讓該分頁能決定
   * 要不要把姓名做成連結，而不是給了入口卻打開空抽屜。
   */
  const caseByEmployeeId = useMemo(
    () => new Map(allCases.map((item) => [item.employeeId, item])),
    [allCases],
  );

  const openCase = allCases.find((item) => item.id === openCaseId) ?? null;
  const reviewRow =
    probationRows.find((row) => row.employeeId === reviewEmployeeId) ?? null;

  const handleToggleTask = (taskId: string, isDone: boolean) => {
    setTaskOverrides((prev) => ({ ...prev, [taskId]: isDone }));
  };

  const handleOpenCaseByEmployee = (employeeId: string): boolean => {
    const found = caseByEmployeeId.get(employeeId);
    if (!found) return false;
    setOpenCaseId(found.id);
    return true;
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        {/* Info: (20260811 - Julian) 標題與兩個發起動作 */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-800">
              <Repeat className="size-6 shrink-0 text-orange-500" />
              {t("hr_management.movement.title")}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {t("hr_management.movement.subtitle")}
              <span className="mx-2 text-gray-300">|</span>
              {t("hr_management.dashboard.as_of", { date: MOCK_HR_TODAY })}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* ToDo: (20260811 - Julian) 發起流程的 API 完成後接上表單 Modal */}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <UserPlus className="size-4 shrink-0" />
              {t("hr_management.movement.action_new_onboarding")}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              <LogOut className="size-4 shrink-0" />
              {t("hr_management.movement.action_new_offboarding")}
            </button>
          </div>
        </div>

        {/* Info: (20260811 - Julian) 四個分頁 */}
        <div className="flex flex-wrap gap-6 border-b border-gray-200">
          {MOVEMENT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
              className={`pb-2 text-base font-bold transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-orange-600 text-gray-900"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t(MOVEMENT_TAB_I18N_KEY[tab])}
            </button>
          ))}
        </div>

        {/* Info: (20260811 - Julian) 共用篩選列 */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 shrink-0 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              aria-label={t("hr_management.movement.search_placeholder")}
              placeholder={t("hr_management.movement.search_placeholder")}
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm text-gray-700 transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none"
            />
          </div>

          <select
            aria-label={t("hr_management.employee.filter.department")}
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none lg:w-44"
          >
            <option value={HR_FILTER_ALL}>
              {t("hr_management.employee.filter.all_departments")}
            </option>
            {departmentOptions.map((department) => (
              <option key={department.id} value={department.id}>
                {`${"　".repeat(department.depth)}${department.name}`}
              </option>
            ))}
          </select>

          <select
            aria-label={t("hr_management.movement.filter_assignee")}
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none lg:w-40"
          >
            <option value={HR_FILTER_ALL}>
              {t("hr_management.movement.all_assignees")}
            </option>
            {assigneeOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {activeTab === MovementTab.OVERVIEW && (
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
              {MOVEMENT_VIEW_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  aria-pressed={viewMode === mode}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    viewMode === mode
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t(MOVEMENT_VIEW_MODE_I18N_KEY[mode])}
                </button>
              ))}
            </div>
          )}

          {activeTab === MovementTab.PROBATION && (
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
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
          )}
        </div>

        {activeTab === MovementTab.OVERVIEW &&
          (viewMode === MovementViewMode.KANBAN ? (
            <MovementKanban
              cases={filteredCases}
              onSelect={(item) => setOpenCaseId(item.id)}
              onMoveStage={(caseId, stage) =>
                setStageOverrides((prev) => ({ ...prev, [caseId]: stage }))
              }
            />
          ) : (
            <OnboardingTable
              rows={buildOnboardingRows(filteredCases)}
              activeFilter={OnboardingQuickFilter.ALL}
              onFilterChange={setOnboardingFilter}
              onOpenDetail={(row) => setOpenCaseId(row.id)}
            />
          ))}

        {activeTab === MovementTab.ONBOARDING && (
          <OnboardingTable
            rows={onboardingRows}
            activeFilter={onboardingFilter}
            onFilterChange={setOnboardingFilter}
            onOpenDetail={(row) => setOpenCaseId(row.id)}
          />
        )}

        {activeTab === MovementTab.PROBATION && (
          <ProbationTable
            rows={probationRows}
            metrics={probationMetrics}
            role={role}
            onOpenReview={(row) => setReviewEmployeeId(row.employeeId)}
            onOpenCase={handleOpenCaseByEmployee}
            hasCase={(employeeId) => caseByEmployeeId.has(employeeId)}
          />
        )}

        {activeTab === MovementTab.OFFBOARDING && (
          <OffboardingSplitView
            cases={offboardingCases}
            listMode={offboardingMode}
            onListModeChange={setOffboardingMode}
            selectedId={selectedOffboardingId}
            onSelect={setSelectedOffboardingId}
            onToggleTask={handleToggleTask}
          />
        )}
      </div>

      <MovementTaskDrawer
        movementCase={openCase}
        onClose={() => setOpenCaseId(null)}
        onToggleTask={handleToggleTask}
      />

      <ProbationReviewModal
        row={reviewRow}
        form={
          reviewEmployeeId ? (probationForms[reviewEmployeeId] ?? null) : null
        }
        onClose={() => setReviewEmployeeId(null)}
        onSubmit={(employeeId, form) => {
          setProbationForms((prev) => ({ ...prev, [employeeId]: form }));
          setReviewEmployeeId(null);
        }}
      />
    </div>
  );
};

export default MovementPageBody;
