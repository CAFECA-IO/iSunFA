import {
  ChecklistState,
  EmployeeStatus,
  HANDOVER_CATEGORIES,
  MovementAlertLevel,
  MovementAlertReason,
  MovementStage,
  NOTICE_PERIOD_RULES,
  OFFBOARDING_CLOSING_DAYS,
  ONBOARDING_CONTRACT_KEYS,
  ONBOARDING_EQUIPMENT_KEYS,
  ONBOARDING_FIRST_WEEK_DAYS,
  ONBOARDING_FORM_KEYS,
  ONBOARDING_UPCOMING_DAYS,
  OffboardingTaskKey,
  OnboardingQuickFilter,
  PROBATION_MILESTONES,
  PROBATION_MILESTONE_DAYS,
  PROBATION_MONTHS,
  PROBATION_UNSETTLED_RESULTS,
  ProbationMilestone,
  ProbationResult,
  ProcessTaskStatus,
  ProcessTaskType,
} from "@/constants/hr_management";
import {
  IEmployeeListItem,
  IHandoverGroup,
  IMovementAlert,
  IMovementCase,
  IOffboardingCase,
  IOffboardingTask,
  IOnboardingRow,
  IProbationMetrics,
  IProbationRow,
  IProcessTask,
} from "@/interfaces/hr_management";
import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInFullMonths,
  isSameMonth,
  parseIsoDate,
  toIsoDate,
} from "@/lib/utils/hr_date";

/**
 * Info: (20260811 - Julian) 到離職的計算層。
 *
 * 四個分頁看的是同一批人與同一批任務，只是切法不同，因此所有推導集中在這裡：
 * 看板的分欄、報到列表的三個欄位、試用期的節點、離職的交接矩陣，
 * 各自寫一份的話「完成」的定義遲早會在某一頁走鐘。
 */

// Info: (20260811 - Julian) 任務是否算完成。跳過（SKIPPED）視同完成，它代表「這件事不用做」
function isTaskDone(task: IProcessTask): boolean {
  return task.status !== ProcessTaskStatus.PENDING;
}

/**
 * Info: (20260812 - Julian) 從合併的任務串裡認出離職任務。
 *
 * ADR 019 §5.2 說 `taskType` 存在的唯一理由是「合併列表要標示每一列的來源」。
 * 這支就是那個用途的完整形式：既然它已經標了來源，就讓 TypeScript
 * 也照著它分辨，而不是在需要 `assetNo` 的地方各寫一次 `as IOffboardingTask`。
 * 型別述詞與判別子綁在同一個欄位上，改 enum 時編譯器會一起提醒。
 */
export function isOffboardingTask(
  task: IProcessTask,
): task is IOffboardingTask {
  return task.taskType === ProcessTaskType.OFFBOARDING;
}

/**
 * Info: (20260811 - Julian) 由關鍵日期推導看板欄位。
 *
 * 報到：未來或今天 → 預備報到；到職第 1～7 天 → 首日報到／培訓中。
 * 離職：距離職日 3 天以內（含已過）→ 待結案／退保；其餘 → 交接中。
 */
export function resolveStage(
  taskType: ProcessTaskType,
  daysUntilKeyDate: number,
): MovementStage {
  if (taskType === ProcessTaskType.ONBOARDING) {
    return daysUntilKeyDate > 0
      ? MovementStage.PREPARING
      : MovementStage.FIRST_WEEK;
  }
  return daysUntilKeyDate <= OFFBOARDING_CLOSING_DAYS
    ? MovementStage.CLOSING
    : MovementStage.HANDOVER;
}

/**
 * Info: (20260811 - Julian) 案件的自動化警示。
 *
 * 判斷順序就是嚴重度：先看有沒有「現在會出事」的紅燈，再看能不能結案，
 * 其餘都是進行中。反過來寫（先判斷完成）會讓一個已全部完成的案件
 * 蓋掉它其實還有三天後才生效的停權問題 —— 雖然這裡不會發生，
 * 但順序是規則的一部分，不該靠巧合成立。
 *
 * 紅燈的兩個條件直接照規格：
 * 1. 離職日在 3 天內（含已過）而 IT 帳號停權任務還沒完成。
 *    帳號沒關掉的離職者是資安缺口，且過了最後一天就沒人會再想起這件事。
 * 2. 試用期逾期未考核（見 `resolveProbationAlert`）。
 */
export function resolveCaseAlert(
  taskType: ProcessTaskType,
  daysUntilKeyDate: number,
  tasks: IProcessTask[],
): IMovementAlert {
  const totalCount = tasks.length;
  const doneCount = tasks.filter(isTaskDone).length;

  const isAccountRevokePending = tasks.some(
    (task) =>
      task.templateKey === OffboardingTaskKey.ACCOUNT_REVOKE &&
      !isTaskDone(task),
  );
  const isClosingSoon = daysUntilKeyDate <= OFFBOARDING_CLOSING_DAYS;

  if (
    taskType === ProcessTaskType.OFFBOARDING &&
    isClosingSoon &&
    isAccountRevokePending
  ) {
    return {
      level: MovementAlertLevel.URGENT,
      reason: MovementAlertReason.IT_ACCOUNT_PENDING,
    };
  }

  if (totalCount > 0 && doneCount === totalCount) {
    return {
      level: MovementAlertLevel.COMPLETED,
      /**
       * Info: (20260811 - Julian) 離職沒有另一道結案手續 ——
       * 最後一項交接勾完，案件就結束了，因此是「已結案」而不是「可結案」。
       * 報到全做完則只是流程跑完，人還在，仍然是可結案。
       */
      reason:
        taskType === ProcessTaskType.OFFBOARDING
          ? MovementAlertReason.SETTLED
          : MovementAlertReason.READY_TO_CLOSE,
    };
  }

  return {
    level: MovementAlertLevel.IN_PROGRESS,
    reason: MovementAlertReason.IN_PROGRESS,
  };
}

/**
 * Info: (20260811 - Julian) 試用期的警示。
 *
 * 逾期又沒有結果才是紅燈；送出考核就不再催辦。
 * 但「送出」與「結案」是兩件事 —— 延長試用同樣是送出了考核，
 * 案件卻還要跑到新的期滿日，所以它留在進行中而不是可結案。
 */
export function resolveProbationAlert(
  isOverdue: boolean,
  result: ProbationResult | null,
): IMovementAlert {
  if (isOverdue && result === null) {
    return {
      level: MovementAlertLevel.URGENT,
      reason: MovementAlertReason.PROBATION_OVERDUE,
    };
  }
  if (result !== null && !PROBATION_UNSETTLED_RESULTS.includes(result)) {
    return {
      level: MovementAlertLevel.COMPLETED,
      reason: MovementAlertReason.READY_TO_CLOSE,
    };
  }
  return {
    level: MovementAlertLevel.IN_PROGRESS,
    reason: MovementAlertReason.IN_PROGRESS,
  };
}

function buildCase(
  employee: IEmployeeListItem,
  tasks: IProcessTask[],
  taskType: ProcessTaskType,
  keyDate: string,
  today: Date,
): IMovementCase {
  const daysUntilKeyDate = differenceInDays(today, parseIsoDate(keyDate));
  return {
    id: `${taskType}-${employee.id}`,
    employeeId: employee.id,
    employeeName: employee.name,
    employeeNo: employee.employeeNo,
    departmentName: employee.departmentName,
    jobTitle: employee.jobTitle,
    managerName: employee.managerName,
    taskType,
    keyDate,
    daysUntilKeyDate,
    tasks,
    completedTaskCount: tasks.filter(isTaskDone).length,
    totalTaskCount: tasks.length,
    stage: resolveStage(taskType, daysUntilKeyDate),
    alert: resolveCaseAlert(taskType, daysUntilKeyDate, tasks),
  };
}

/**
 * Info: (20260811 - Julian) 從名冊與任務組出所有「進行中」的到離職案件。
 *
 * 報到案件的收錄範圍是「未來 14 天內報到」到「報到後 7 天」，與看板的四欄一致；
 * 超出這個範圍的人已經是一般在職員工，不該再佔著看板。
 */
export function buildMovementCases(
  people: IEmployeeListItem[],
  tasks: IProcessTask[],
  today: Date,
): IMovementCase[] {
  const tasksByEmployee = new Map<string, IProcessTask[]>();
  tasks.forEach((task) => {
    const list = tasksByEmployee.get(task.employeeId) ?? [];
    list.push(task);
    tasksByEmployee.set(task.employeeId, list);
  });

  return people.flatMap((employee) => {
    const employeeTasks = tasksByEmployee.get(employee.id) ?? [];
    if (employeeTasks.length === 0) return [];

    const isOffboarding =
      employeeTasks[0].taskType === ProcessTaskType.OFFBOARDING;

    if (isOffboarding) {
      if (!employee.leaveDate) return [];
      return [
        buildCase(
          employee,
          employeeTasks,
          ProcessTaskType.OFFBOARDING,
          employee.leaveDate,
          today,
        ),
      ];
    }

    const daysUntilHire = differenceInDays(
      today,
      parseIsoDate(employee.hireDate),
    );
    const inWindow =
      daysUntilHire <= ONBOARDING_UPCOMING_DAYS &&
      daysUntilHire >= -ONBOARDING_FIRST_WEEK_DAYS;
    if (!inWindow) return [];

    return [
      buildCase(
        employee,
        employeeTasks,
        ProcessTaskType.ONBOARDING,
        employee.hireDate,
        today,
      ),
    ];
  });
}

// Info: (20260811 - Julian) 依範本鍵值彙總出一欄的狀態：全完成→已完成、部分→進行中、都沒動→待處理
export function resolveChecklistState(
  tasks: IProcessTask[],
  templateKeys: string[],
): ChecklistState {
  const scoped = tasks.filter((task) =>
    templateKeys.includes(task.templateKey),
  );
  if (scoped.length === 0) return ChecklistState.PENDING;
  const doneCount = scoped.filter(isTaskDone).length;
  if (doneCount === scoped.length) return ChecklistState.DONE;
  if (doneCount > 0) return ChecklistState.IN_PROGRESS;
  return ChecklistState.PENDING;
}

export function buildOnboardingRows(cases: IMovementCase[]): IOnboardingRow[] {
  return cases
    .filter((item) => item.taskType === ProcessTaskType.ONBOARDING)
    .map((item) => ({
      ...item,
      formState: resolveChecklistState(item.tasks, ONBOARDING_FORM_KEYS),
      equipmentState: resolveChecklistState(
        item.tasks,
        ONBOARDING_EQUIPMENT_KEYS,
      ),
      contractState: resolveChecklistState(
        item.tasks,
        ONBOARDING_CONTRACT_KEYS,
      ),
    }))
    .sort((a, b) => a.keyDate.localeCompare(b.keyDate));
}

/** Info: (20260811 - Julian) 報到列表的快速篩選。本週＝基準日起算 7 天內 */
export function applyOnboardingFilter(
  rows: IOnboardingRow[],
  filter: OnboardingQuickFilter,
): IOnboardingRow[] {
  switch (filter) {
    case OnboardingQuickFilter.THIS_WEEK:
      return rows.filter(
        (row) => row.daysUntilKeyDate >= 0 && row.daysUntilKeyDate <= 7,
      );
    case OnboardingQuickFilter.PENDING_EQUIPMENT:
      return rows.filter((row) => row.equipmentState !== ChecklistState.DONE);
    case OnboardingQuickFilter.PENDING_CONTRACT:
      return rows.filter((row) => row.contractState !== ChecklistState.DONE);
    case OnboardingQuickFilter.ALL:
    default:
      return rows;
  }
}

/**
 * Info: (20260811 - Julian) 試用期三個節點的狀態。
 *
 * 節點日已過即視為「已完成」，尚未到期為「待處理」，當天則是「進行中」——
 * 這是 mock 的推導；接 API 後應改讀實際的考核紀錄，因為「日子到了」
 * 不等於「主管真的談過了」。
 */
export function resolveMilestones(
  hireDate: Date,
  today: Date,
): Record<ProbationMilestone, ChecklistState> {
  const entries = PROBATION_MILESTONES.map((milestone) => {
    const dueDate = addDays(hireDate, PROBATION_MILESTONE_DAYS[milestone]);
    const daysLeft = differenceInDays(today, dueDate);
    const state =
      daysLeft < 0
        ? ChecklistState.DONE
        : daysLeft === 0
          ? ChecklistState.IN_PROGRESS
          : ChecklistState.PENDING;
    return [milestone, state] as const;
  });
  return Object.fromEntries(entries) as Record<
    ProbationMilestone,
    ChecklistState
  >;
}

export function buildProbationRows(
  people: IEmployeeListItem[],
  today: Date,
): IProbationRow[] {
  return people
    .filter((employee) => employee.status === EmployeeStatus.PROBATION)
    .map((employee) => {
      const hireDate = parseIsoDate(employee.hireDate);
      const probationEnd = addMonths(hireDate, PROBATION_MONTHS);
      const daysUntilEnd = differenceInDays(today, probationEnd);
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        employeeNo: employee.employeeNo,
        departmentName: employee.departmentName,
        jobTitle: employee.jobTitle,
        managerName: employee.managerName,
        hireDate: employee.hireDate,
        probationEndDate: toIsoDate(probationEnd),
        daysUntilEnd,
        milestones: resolveMilestones(hireDate, today),
        result: null,
        score: null,
        isOverdue: daysUntilEnd < 0,
        isDraft: false,
        alert: resolveProbationAlert(daysUntilEnd < 0, null),
      } satisfies IProbationRow;
    })
    .sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
}

/**
 * Info: (20260811 - Julian) 試用期分頁的三個統計。
 *
 * 「本月通過轉正」讀的是已送出考核且結果為通過者。mock 沒有歷史考核紀錄，
 * 因此改由呼叫端把當下已填寫的結果傳進來 —— 這樣切換視角或填完表單，
 * 上方數字會立刻跟著動，不會出現填完卻沒反應的空窗。
 */
export function buildProbationMetrics(
  rows: IProbationRow[],
  today: Date,
): IProbationMetrics {
  return {
    endingThisMonth: rows.filter((row) =>
      isSameMonth(parseIsoDate(row.probationEndDate), today),
    ).length,
    overdue: rows.filter((row) => row.isOverdue && row.result === null).length,
    passedThisMonth: rows.filter((row) => row.result === ProbationResult.PASS)
      .length,
  };
}

/**
 * Info: (20260811 - Julian) 依勞基法第 16 條，用年資推出應預告天數。
 * 規則表由長到短排序，取第一個符合的門檻。
 */
export function resolveRequiredNoticeDays(tenureMonths: number): number {
  const rule = NOTICE_PERIOD_RULES.find(
    (item) => tenureMonths >= item.minTenureMonths,
  );
  return rule?.days ?? 0;
}

export function buildOffboardingCases(
  cases: IMovementCase[],
  people: IEmployeeListItem[],
  today: Date,
  /**
   * Info: (20260811 - Julian) 員工 id → 提出離職日。
   * 缺漏時退回以基準日估算，並且該筆的「預告期符合」只能當參考。
   */
  noticeDates: Record<string, string>,
): IOffboardingCase[] {
  const employeeById = new Map(people.map((person) => [person.id, person]));

  return cases
    .filter((item) => item.taskType === ProcessTaskType.OFFBOARDING)
    .map((item) => {
      const employee = employeeById.get(item.employeeId);
      const hireDate = employee ? parseIsoDate(employee.hireDate) : today;
      const leaveDate = parseIsoDate(item.keyDate);

      /**
       * Info: (20260811 - Julian) 年資以「到最後一天為止」的足月數計算。
       * 用足年數 × 12 會讓到職 6 個月的人被算成 0 個月，應預告天數因此少算。
       */
      const tenureMonths = differenceInFullMonths(hireDate, leaveDate);
      const requiredNoticeDays = resolveRequiredNoticeDays(tenureMonths);

      /**
       * Info: (20260811 - Julian) 實際預告天數 = 提出離職日到最後一天。
       * 起點必須是提出日；用今天當起點的話，已經離職的人一律變成 0 天，
       * 於是每個人都被標成預告不足。
       */
      const noticeDate = noticeDates[item.employeeId];
      const actualNoticeDays = noticeDate
        ? Math.max(0, differenceInDays(parseIsoDate(noticeDate), leaveDate))
        : Math.max(0, item.daysUntilKeyDate);

      return {
        ...item,
        /**
         * Info: (20260812 - Julian) 這一行是型別收窄的執行期對應。
         *
         * 一個案件的任務全部來自同一張表（ADR 019 拆表後就是 `OffboardingTask`），
         * 因此這個 filter 不會篩掉任何東西；它的作用是把「案件已經是離職案件」
         * 這個事實帶到每一筆任務上，讓下游不必轉型。
         *
         * 真的篩掉了東西的話，`totalTaskCount` 會與 `tasks.length` 對不上 ——
         * 那代表上游把兩種任務混進同一個 employeeId，是資料錯誤而不是顯示問題。
         */
        tasks: item.tasks.filter(isOffboardingTask),
        requiredNoticeDays,
        actualNoticeDays,
        isNoticeSatisfied: actualNoticeDays >= requiredNoticeDays,
        isCompleted: item.completedTaskCount === item.totalTaskCount,
        /**
         * Info: (20260811 - Julian) 缺提出日時退回最後一天，讓實際預告天數變 0。
         * 樂觀補一個日期會讓一筆資料不全的案件看起來合規。
         */
        noticeDate: noticeDate ?? item.keyDate,
        tenureMonths,
        hireDate: employee?.hireDate ?? item.keyDate,
        email: employee?.email ?? "",
      } satisfies IOffboardingCase;
    })
    .sort((a, b) => a.keyDate.localeCompare(b.keyDate));
}

// Info: (20260811 - Julian) 把交接任務依四個面向分組，空的分類也保留，讓矩陣的列數固定
export function groupHandoverTasks(tasks: IProcessTask[]): IHandoverGroup[] {
  return HANDOVER_CATEGORIES.map((category) => {
    const scoped = tasks.filter((task) => task.category === category);
    return {
      category,
      tasks: scoped,
      completedCount: scoped.filter(isTaskDone).length,
    };
  });
}

// Info: (20260811 - Julian) 進度百分比，無任務時回 0 而不是 NaN
export function toProgressPercent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}
