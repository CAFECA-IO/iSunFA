"use client";

import { FC, useCallback, useMemo, useState } from "react";
import { LogOut, Repeat, Search, UserPlus } from "lucide-react";
import MovementKanban from "@/components/hr_management/movement/movement_kanban";
import MovementTaskDrawer from "@/components/hr_management/movement/movement_task_drawer";
import OffboardingProcessModal from "@/components/hr_management/movement/offboarding_process_modal";
import OffboardingTable from "@/components/hr_management/movement/offboarding_table";
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
  ProcessTaskType,
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
  IOffboardingCase,
  IOffboardingForm,
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
  buildOffboardingForm,
  buildOffboardingProgress,
  mergeOffboardingForm,
} from "@/lib/utils/hr_offboarding";
import {
  buildDepartmentTree,
  flattenDepartmentTree,
} from "@/lib/utils/hr_organization";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260810 - Julian) 到離職與試用期管理的主內容區。
 *
 * 三個分頁看的是同一批人與同一份任務，因此所有可變狀態都放在這一層：
 * 在抽屜裡勾掉一項任務，看板的進度條、報到列表的三個欄位、離職清單的三段進度
 * 會同時更新。狀態若下放到各分頁，同一件事會有幾份互相不知道的副本。
 *
 * ToDo: (20260810 - Julian) 所有變更目前只存在記憶體，重整即回復。
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
  /**
   * Info: (20260811 - Julian) 每個離職案件一份流程表單。
   * 只保存「任務裡沒有的欄位」；勾選狀態仍然以 `taskOverrides` 為準，
   * 打開 Modal 時再由現在的任務重新推導（見 `mergeOffboardingForm`）。
   */
  const [offboardingForms, setOffboardingForms] = useState<
    Record<string, IOffboardingForm>
  >({});

  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [openOffboardingId, setOpenOffboardingId] = useState<string | null>(
    null,
  );
  /**
   * Info: (20260811 - Julian) 目前被解鎖編輯的已結案案件。
   *
   * 只記一個、而且關掉 Modal 就清掉：解鎖是為了「補一筆填錯的退保日」，
   * 不是把案件改回進行中。留著解鎖狀態的話，下次無意間點開就直接改得動了。
   */
  const [reopenedCaseId, setReopenedCaseId] = useState<string | null>(null);
  const [reviewEmployeeId, setReviewEmployeeId] = useState<string | null>(null);

  const today = useMemo(() => parseIsoDate(MOCK_HR_TODAY), []);

  // Info: (20260810 - Julian) 套用勾選覆寫後的任務，所有分頁都吃這一份
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

  // Info: (20260810 - Julian) 負責人選單從任務裡取，避免列出與到離職無關的同仁
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

  // Info: (20260810 - Julian) 頂部搜尋列同時作用在三個分頁
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

  /**
   * Info: (20260811 - Julian) 供 Modal 查閱的離職案件，走的是「未篩選」的名單。
   *
   * Modal 也會從看板與其他分頁打開，而那些入口不受離職分頁的
   * 「進行中／歷史紀錄」切換影響。用篩選後的名單查，切到歷史紀錄時
   * 從看板點開的案件會突然變成找不到。
   */
  const offboardingById = useMemo(
    () =>
      new Map(
        buildOffboardingCases(
          allCases,
          MOCK_HR_MOVEMENT_PEOPLE,
          today,
          MOCK_HR_RESIGNATION_NOTICES,
        ).map((item) => [item.id, item]),
      ),
    [allCases, today],
  );

  // Info: (20260810 - Julian) 已填寫的考核結果覆寫回列，統計才會跟著動
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
   * Info: (20260810 - Julian) 員工 id → 案件，供「點姓名開抽屜」使用。
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

  const openOffboardingCase = openOffboardingId
    ? (offboardingById.get(openOffboardingId) ?? null)
    : null;

  /**
   * Info: (20260811 - Julian) 每次都由現在的任務重建表單，再疊上使用者的編輯。
   * 直接沿用存起來的那一份，會讓在別的畫面改過的勾選在 Modal 裡看不到。
   */
  const resolveOffboardingForm = useCallback(
    (item: IOffboardingCase): IOffboardingForm => {
      const base = buildOffboardingForm(item);
      const saved = offboardingForms[item.id];
      return saved ? mergeOffboardingForm(base, saved) : base;
    },
    [offboardingForms],
  );

  const openOffboardingForm = useMemo(
    () =>
      openOffboardingCase ? resolveOffboardingForm(openOffboardingCase) : null,
    [openOffboardingCase, resolveOffboardingForm],
  );

  /**
   * Info: (20260811 - Julian) 清單上的三段進度走的是同一組推導，
   * 因此表格的百分比與 Modal 底部的進度總覽永遠是同一個數字。
   */
  const offboardingProgressOf = useCallback(
    (item: IOffboardingCase) =>
      buildOffboardingProgress(resolveOffboardingForm(item)),
    [resolveOffboardingForm],
  );

  /**
   * Info: (20260811 - Julian) 已結案的案件預設唯讀。
   * 事後要補資料就按「重新開啟案件」，讓那次修改是一個明確的動作。
   */
  const isOffboardingReadOnly =
    openOffboardingCase !== null &&
    openOffboardingCase.isCompleted &&
    reopenedCaseId !== openOffboardingCase.id;

  /**
   * Info: (20260811 - Julian) 交接對象的候選人：同部門、在職、且不是本人。
   * 跨部門交接不是不可能，但預設列出全公司一百多人只會讓人更難選。
   */
  const handoverCandidates = useMemo(() => {
    if (!openOffboardingCase) return [];
    return MOCK_HR_MOVEMENT_PEOPLE.filter(
      (person) =>
        person.id !== openOffboardingCase.employeeId &&
        person.leaveDate === null &&
        person.departmentName === openOffboardingCase.departmentName,
    );
  }, [openOffboardingCase]);

  const handleToggleTask = (taskId: string, isDone: boolean) => {
    setTaskOverrides((prev) => ({ ...prev, [taskId]: isDone }));
  };

  const handleOffboardingChange = (patch: Partial<IOffboardingForm>) => {
    if (!openOffboardingCase || !openOffboardingForm) return;
    setOffboardingForms((prev) => ({
      ...prev,
      [openOffboardingCase.id]: { ...openOffboardingForm, ...patch },
    }));
  };

  /**
   * Info: (20260811 - Julian) 主管驗收的時間戳。
   *
   * 日期取 mock 基準日、時間取當下時鐘 —— 用真實日期的話，簽核時間
   * 會落在離職日的一年前後，看起來像資料錯亂。這段只在點擊時執行，
   * 不會造成 SSR 與客戶端的不一致。
   *
   * ToDo: (20260811 - Julian) 接 API 後改用伺服器時間，並附上簽核者的身分。
   */
  const handleApproveHandover = () => {
    if (!openOffboardingCase || !openOffboardingForm?.approvalTaskId) return;
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    // Info: (20260811 - Julian) 驗收是一筆任務，簽核同時把它標記完成，案件進度才對得起來
    handleToggleTask(openOffboardingForm.approvalTaskId, true);
    handleOffboardingChange({
      isApproved: true,
      approvedBy:
        openOffboardingCase.managerName ?? t("hr_management.value.none"),
      approvedAt: `${MOCK_HR_TODAY} ${hours}:${minutes}`,
    });
  };

  const handleRevokeApproval = () => {
    if (!openOffboardingForm?.approvalTaskId) return;
    handleToggleTask(openOffboardingForm.approvalTaskId, false);
    handleOffboardingChange({
      isApproved: false,
      approvedBy: null,
      approvedAt: null,
    });
  };

  /**
   * Info: (20260811 - Julian) 離職案件開新的流程 Modal，報到案件仍走滑出抽屜。
   * 兩者看的東西差很多：報到沒有退保、沒有資產序號，
   * 硬塞進同一個四分頁的殼裡會有兩頁是空的。
   */
  const handleOpenCase = (caseId: string) => {
    const found = allCases.find((item) => item.id === caseId);
    if (!found) return;
    if (found.taskType === ProcessTaskType.OFFBOARDING) {
      setOpenOffboardingId(caseId);
      return;
    }
    setOpenCaseId(caseId);
  };

  const handleOpenCaseByEmployee = (employeeId: string): boolean => {
    const found = caseByEmployeeId.get(employeeId);
    if (!found) return false;
    handleOpenCase(found.id);
    return true;
  };

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        {/* Info: (20260810 - Julian) 標題與兩個發起動作 */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-800">
              <Repeat className="h-6 w-6 text-orange-500" />
              {t("hr_management.movement.title")}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
              {t("hr_management.movement.subtitle")}
              <span className="mx-2 text-gray-300">|</span>
              {t("hr_management.dashboard.as_of", { date: MOCK_HR_TODAY })}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* ToDo: (20260810 - Julian) 發起流程的 API 完成後接上表單 Modal */}
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50"
            >
              <UserPlus className="h-4 w-4" />
              {t("hr_management.movement.action_new_onboarding")}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              <LogOut className="h-4 w-4" />
              {t("hr_management.movement.action_new_offboarding")}
            </button>
          </div>
        </div>

        {/* Info: (20260810 - Julian) 四個分頁 */}
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

        {/* Info: (20260810 - Julian) 共用篩選列 */}
        <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
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
              onSelect={(item) => handleOpenCase(item.id)}
              onMoveStage={(caseId, stage) =>
                setStageOverrides((prev) => ({ ...prev, [caseId]: stage }))
              }
            />
          ) : (
            <OnboardingTable
              rows={onboardingRows}
              activeFilter={onboardingFilter}
              onFilterChange={setOnboardingFilter}
              onOpenDetail={(row) => handleOpenCase(row.id)}
            />
          ))}

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
          <OffboardingTable
            cases={offboardingCases}
            listMode={offboardingMode}
            onListModeChange={setOffboardingMode}
            progressOf={offboardingProgressOf}
            onOpenCase={handleOpenCase}
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

      <OffboardingProcessModal
        offboardingCase={openOffboardingCase}
        form={openOffboardingForm}
        candidates={handoverCandidates}
        todayIso={MOCK_HR_TODAY}
        isReadOnly={isOffboardingReadOnly}
        onChange={handleOffboardingChange}
        onToggleTask={handleToggleTask}
        onApprove={handleApproveHandover}
        onRevokeApproval={handleRevokeApproval}
        onReopen={() => setReopenedCaseId(openOffboardingId)}
        onClose={() => {
          setOpenOffboardingId(null);
          // Info: (20260811 - Julian) 關掉就重新上鎖，解鎖不會跨越一次開啟
          setReopenedCaseId(null);
        }}
      />
    </div>
  );
};

export default MovementPageBody;
