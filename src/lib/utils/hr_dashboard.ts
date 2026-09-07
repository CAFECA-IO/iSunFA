import {
  AGE_BUCKETS,
  DOCUMENT_ALERT_DAYS,
  DOCUMENT_URGENT_DAYS,
  EmployeeStatus,
  IHistogramBucket,
  PROBATION_ALERT_DAYS,
  PROBATION_MONTHS,
  PROBATION_URGENT_DAYS,
  ProcessTaskStatus,
  RECENT_HIRE_DAYS,
  TENURE_BUCKETS,
  TREND_MONTHS,
} from "@/constants/hr_management";
import {
  IDashboardData,
  IDashboardTaskItem,
  IDepartment,
  IDistributionPoint,
  IDocumentAlertItem,
  IEmployeeDocument,
  IEmployeeListItem,
  IEngagementItem,
  IProbationAlertItem,
  IProcessTask,
  ITrendPoint,
} from "@/interfaces/hr_management";
import {
  addMonths,
  differenceInDays,
  differenceInFullYears,
  isSameMonth,
  parseIsoDate,
  toIsoDate,
  toMonthKey,
} from "@/lib/utils/hr_date";
import { isHeadcountEmployee } from "@/lib/utils/hr_organization";

export interface IDashboardInput {
  employees: IEmployeeListItem[];
  documents: IEmployeeDocument[];
  tasks: IProcessTask[];
  departments: IDepartment[];
  /** Info: (20260810 - Julian) 所有相對日期的基準點，由呼叫端傳入以保持純函式 */
  today: Date;
  /**
   * Info: (20260810 - Julian) 限定部門（含所有子部門）；null 代表全公司。
   * 部門主管視角就是把這裡設成他管的部門，其餘計算完全共用同一段程式 ——
   * 兩種視角若各寫一份，遲早會出現「HR 看到的離職率和主管看到的算法不同」。
   */
  departmentScopeId: string | null;
}

/** Info: (20260810 - Julian) 蒐集某部門與其所有子孫部門的 id */
export function collectDepartmentScope(
  departments: IDepartment[],
  rootId: string,
): Set<string> {
  const scope = new Set<string>([rootId]);
  let changed = true;
  /**
   * Info: (20260810 - Julian) 反覆掃描直到沒有新增，而不是遞迴。
   * 部門資料若含環，遞迴會堆爆呼叫堆疊；這種寫法最多掃 N 輪就停。
   */
  while (changed) {
    changed = false;
    departments.forEach((department) => {
      if (
        department.parentId &&
        scope.has(department.parentId) &&
        !scope.has(department.id)
      ) {
        scope.add(department.id);
        changed = true;
      }
    });
  }
  return scope;
}

// Info: (20260810 - Julian) 依級距把數值分桶，回傳圖表用的資料點
function toHistogram(
  values: number[],
  buckets: IHistogramBucket[],
  translate: (key: string) => string,
): IDistributionPoint[] {
  return buckets.map((bucket) => ({
    key: bucket.key,
    label: translate(bucket.labelKey),
    value: values.filter(
      (value) =>
        value >= bucket.min && (bucket.max === null || value < bucket.max),
    ).length,
  }));
}

/**
 * Info: (20260810 - Julian) 一次算完儀表板要的所有數字。
 *
 * 分成十幾個小函式各自遍歷員工陣列也可以，但 120 筆要掃十幾遍，
 * 而且每個地方都要重新想一次「離職的算不算」。集中在這裡，
 * 口徑只有一份：`isHeadcountEmployee` 說了算。
 */
export function buildDashboardData(
  input: IDashboardInput,
  translate: (key: string) => string,
): IDashboardData {
  const { employees, documents, tasks, departments, today, departmentScopeId } =
    input;

  const scopeIds = departmentScopeId
    ? collectDepartmentScope(departments, departmentScopeId)
    : null;

  const scopedEmployees = scopeIds
    ? employees.filter(
        (employee) =>
          employee.departmentId !== null && scopeIds.has(employee.departmentId),
      )
    : employees;

  const employeeById = new Map(
    scopedEmployees.map((employee) => [employee.id, employee]),
  );
  const headcountEmployees = scopedEmployees.filter(isHeadcountEmployee);

  // Info: (20260810 - Julian) 本月新進與本月離職
  const hiredThisMonth = scopedEmployees.filter((employee) =>
    isSameMonth(parseIsoDate(employee.hireDate), today),
  ).length;
  const resignedThisMonth = scopedEmployees.filter(
    (employee) =>
      employee.leaveDate !== null &&
      isSameMonth(parseIsoDate(employee.leaveDate), today),
  ).length;

  /**
   * Info: (20260810 - Julian) 月離職率 = 本月離職 ÷ 月初在職人數。
   *
   * 分母用月初而不是月底：月中大量報到會把分母灌大、離職率灌小，
   * 那個數字會在招募旺季自動變好看，等於沒有預警作用。
   * 月初在職人數 = 目前在職 − 本月新進 + 本月離職。
   */
  const headcountAtMonthStart =
    headcountEmployees.length - hiredThisMonth + resignedThisMonth;
  const turnoverRate =
    headcountAtMonthStart > 0
      ? Math.round((resignedThisMonth / headcountAtMonthStart) * 1000) / 10
      : 0;

  // Info: (20260810 - Julian) 試用期考核提醒
  const probationAlerts: IProbationAlertItem[] = headcountEmployees
    .filter((employee) => employee.status === EmployeeStatus.PROBATION)
    .map((employee) => {
      const probationEnd = addMonths(
        parseIsoDate(employee.hireDate),
        PROBATION_MONTHS,
      );
      const daysLeft = differenceInDays(today, probationEnd);
      return {
        employeeId: employee.id,
        employeeName: employee.name,
        departmentName: employee.departmentName,
        jobTitle: employee.jobTitle,
        probationEndDate: toIsoDate(probationEnd),
        daysLeft,
        isUrgent: daysLeft <= PROBATION_URGENT_DAYS,
      };
    })
    .filter((item) => item.daysLeft <= PROBATION_ALERT_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Info: (20260810 - Julian) 未完成的報到／離職任務
  const processTasks: IDashboardTaskItem[] = tasks
    .filter((task) => task.status === ProcessTaskStatus.PENDING)
    .flatMap((task) => {
      const employee = employeeById.get(task.employeeId);
      if (!employee) return [];
      const daysLeft = differenceInDays(today, parseIsoDate(task.dueDate));
      return [
        {
          id: task.id,
          employeeId: employee.id,
          employeeName: employee.name,
          departmentName: employee.departmentName,
          title: task.title,
          taskType: task.taskType,
          dueDate: task.dueDate,
          daysLeft,
          isUrgent: daysLeft <= 0,
        },
      ];
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Info: (20260810 - Julian) 合約／證照到期，已過期者 daysLeft 為負，排在最前面
  const documentAlerts: IDocumentAlertItem[] = documents
    .flatMap((document) => {
      const employee = employeeById.get(document.employeeId);
      if (!employee || !document.expiredAt) return [];
      const daysLeft = differenceInDays(
        today,
        parseIsoDate(document.expiredAt),
      );
      if (daysLeft > DOCUMENT_ALERT_DAYS) return [];
      return [
        {
          id: document.id,
          employeeId: employee.id,
          employeeName: employee.name,
          departmentName: employee.departmentName,
          title: document.title,
          category: document.category,
          expiredAt: document.expiredAt,
          daysLeft,
          isUrgent: daysLeft <= DOCUMENT_URGENT_DAYS,
        },
      ];
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Info: (20260810 - Julian) 近 7 天報到的新夥伴
  const recentHires: IEngagementItem[] = headcountEmployees
    .flatMap((employee) => {
      const daysAgo = differenceInDays(parseIsoDate(employee.hireDate), today);
      if (daysAgo < 0 || daysAgo > RECENT_HIRE_DAYS) return [];
      return [
        {
          employeeId: employee.id,
          employeeName: employee.name,
          departmentName: employee.departmentName,
          jobTitle: employee.jobTitle,
          eventDate: employee.hireDate,
          anniversaryYears: null,
        },
      ];
    })
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  /**
   * Info: (20260812 - Julian) 本月壽星，依日期由小到大。
   *
   * 讀的是 `birthMonthDay`（`MM-DD`）而不是完整生日 —— 生日是 Tier 2 個資，
   * 而壽星清單需要的只有月與日（ADR 018 §7 已知取捨第 1 點）。
   */
  const currentMonthDay = String(today.getMonth() + 1).padStart(2, "0");
  const birthdays: IEngagementItem[] = headcountEmployees
    .flatMap((employee) => {
      if (!employee.birthMonthDay) return [];
      if (employee.birthMonthDay.slice(0, 2) !== currentMonthDay) return [];
      return [
        {
          employeeId: employee.id,
          employeeName: employee.name,
          departmentName: employee.departmentName,
          jobTitle: employee.jobTitle,
          eventDate: employee.birthMonthDay,
          anniversaryYears: null,
        },
      ];
    })
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  // Info: (20260810 - Julian) 本月工作週年，未滿一年不算
  const anniversaries: IEngagementItem[] = headcountEmployees
    .flatMap((employee) => {
      const hireDate = parseIsoDate(employee.hireDate);
      if (hireDate.getMonth() !== today.getMonth()) return [];
      const years = differenceInFullYears(hireDate, today);
      const yearsThisMonth =
        hireDate.getDate() <= today.getDate() ? years : years + 1;
      if (yearsThisMonth < 1) return [];
      return [
        {
          employeeId: employee.id,
          employeeName: employee.name,
          departmentName: employee.departmentName,
          jobTitle: employee.jobTitle,
          eventDate: employee.hireDate,
          anniversaryYears: yearsThisMonth,
        },
      ];
    })
    .sort((a, b) => a.eventDate.slice(8).localeCompare(b.eventDate.slice(8)));

  // Info: (20260810 - Julian) 部門人數分布，由多到少
  const departmentCount = new Map<string, number>();
  headcountEmployees.forEach((employee) => {
    const label = employee.departmentName ?? "";
    departmentCount.set(label, (departmentCount.get(label) ?? 0) + 1);
  });
  const departmentDistribution: IDistributionPoint[] = [...departmentCount]
    .map(([label, value]) => ({ key: label, label, value }))
    .sort((a, b) => b.value - a.value);

  /**
   * Info: (20260810 - Julian) 近 12 個月的招募與離職。
   *
   * 先建出 12 個空月份再累加，而不是從資料 group by ——
   * 沒有人進出的月份必須是 0 而不是消失，否則折線圖會把兩個相隔三個月的點
   * 直接連起來，看起來像是平滑下降。
   */
  const trendMap = new Map<string, ITrendPoint>();
  for (let offset = TREND_MONTHS - 1; offset >= 0; offset -= 1) {
    const month = addMonths(today, -offset);
    const key = toMonthKey(month);
    trendMap.set(key, { month: key, hired: 0, resigned: 0 });
  }
  scopedEmployees.forEach((employee) => {
    const hiredKey = toMonthKey(parseIsoDate(employee.hireDate));
    const hiredPoint = trendMap.get(hiredKey);
    if (hiredPoint) hiredPoint.hired += 1;

    if (employee.leaveDate) {
      const leftKey = toMonthKey(parseIsoDate(employee.leaveDate));
      const leftPoint = trendMap.get(leftKey);
      if (leftPoint) leftPoint.resigned += 1;
    }
  });

  // Info: (20260810 - Julian) 年資與年齡結構
  const tenureYears = headcountEmployees.map((employee) =>
    differenceInFullYears(parseIsoDate(employee.hireDate), today),
  );
  // Info: (20260812 - Julian) 年齡由 DTO 直接帶進來，前端不再持有完整生日
  const ages = headcountEmployees.flatMap((employee) =>
    employee.age === null ? [] : [employee.age],
  );

  return {
    kpi: {
      headcount: headcountEmployees.length,
      activeCount: headcountEmployees.filter(
        (employee) => employee.status === EmployeeStatus.ACTIVE,
      ).length,
      probationCount: headcountEmployees.filter(
        (employee) => employee.status === EmployeeStatus.PROBATION,
      ).length,
      hiredThisMonth,
      resignedThisMonth,
      turnoverRate,
      pendingTaskCount: processTasks.length + probationAlerts.length,
    },
    probationAlerts,
    processTasks,
    documentAlerts,
    recentHires,
    birthdays,
    anniversaries,
    departmentDistribution,
    trend: [...trendMap.values()],
    tenureDistribution: toHistogram(tenureYears, TENURE_BUCKETS, translate),
    ageDistribution: toHistogram(ages, AGE_BUCKETS, translate),
  };
}
