import {
  ACCOUNT_REVOKE_DEFAULT_TIME,
  EmployeeStatus,
  Gender,
  HandoverCategory,
  OFFBOARDING_CLOSING_DAYS,
  OffboardingTaskKey,
  OnboardingTaskKey,
  OnboardingTemplateKey,
  ONBOARDING_ASSIGNEE_BY_CATEGORY,
  ONBOARDING_TASK_TITLE_I18N_KEY,
  ONBOARDING_TEMPLATES,
  ONBOARDING_UPCOMING_DAYS,
  ProcessTaskStatus,
  ProcessTaskType,
} from "@/constants/hr_management";
import { hrManagement as hrManagementZhTw } from "@/i18n/locales/zh_tw/hr_management";
import {
  MOCK_HR_EMPLOYEES,
  MOCK_HR_TODAY,
} from "@/constants/mock_hr_employees";
import {
  IEmployeeListItem,
  IOffboardingTask,
  IProcessTask,
} from "@/interfaces/hr_management";
import {
  addDays,
  differenceInDays,
  differenceInFullMonths,
  parseIsoDate,
  toIsoDate,
} from "@/lib/utils/hr_date";
import { maskPiiTail } from "@/lib/utils/hr_pii_mask";
import { resolveRequiredNoticeDays } from "@/lib/utils/hr_movement";

/**
 * ToDo: (20260810 - Julian) 待 `/api/v1/hr/onboarding`、`/api/v1/hr/offboarding`
 * 上線後整檔移除。
 */

const today = parseIsoDate(MOCK_HR_TODAY);

/**
 * Info: (20260810 - Julian) 尚未報到的準員工，刻意**不放進** `MOCK_HR_EMPLOYEES`。
 *
 * Prisma 的 `EmployeeStatus` 沒有「待報到」這一態，若把他們併進全公司名冊，
 * 在職人數、部門編制、年資分布會全部把還沒上班的人算進去 —— 那是錯的數字，
 * 而且錯得很安靜。分開放，到離職頁自己把兩份合起來用。
 *
 * ToDo: (20260810 - Julian) 這是 schema 的缺口，不是 mock 的權宜：
 * 接 API 前需要決定用新的 EmployeeStatus 值，還是靠 `hireDate > now` 當約定。
 */
export const MOCK_HR_INCOMING_EMPLOYEES: IEmployeeListItem[] = [
  {
    id: "emp-inc-01",
    employeeNo: "EMP045",
    name: "陳小明",
    englishName: "Ming Chen",
    gender: Gender.MALE,
    birthMonthDay: "04-12",
    age: 29,
    email: "emp045@isunfa.com",
    maskedPhone: maskPiiTail("0918-334-770"),
    status: EmployeeStatus.PROBATION,
    hireDate: toIsoDate(addDays(today, 10)),
    leaveDate: null,
    departmentId: "dep-101",
    departmentName: "前端組",
    jobTitleId: "jt-005",
    jobTitle: "前端工程師",
    managerName: "張小明",
  },
  {
    id: "emp-inc-02",
    employeeNo: "EMP046",
    name: "楊思妤",
    englishName: "Sylvia Yang",
    gender: Gender.FEMALE,
    birthMonthDay: "11-23",
    age: 27,
    email: "emp046@isunfa.com",
    maskedPhone: maskPiiTail("0927-118-455"),
    status: EmployeeStatus.PROBATION,
    hireDate: toIsoDate(addDays(today, 4)),
    leaveDate: null,
    departmentId: "dep-002",
    departmentName: "財會部",
    jobTitleId: "jt-006",
    jobTitle: "財會專員",
    managerName: "李佳蓉",
  },
  {
    id: "emp-inc-03",
    employeeNo: "EMP047",
    name: "何柏睿",
    englishName: "Bruce Ho",
    gender: Gender.MALE,
    birthMonthDay: "07-08",
    age: 32,
    email: "emp047@isunfa.com",
    maskedPhone: maskPiiTail("0933-620-149"),
    status: EmployeeStatus.PROBATION,
    hireDate: toIsoDate(addDays(today, 13)),
    leaveDate: null,
    departmentId: "dep-005",
    departmentName: "業務部",
    jobTitleId: "jt-006",
    jobTitle: "業務代表",
    managerName: "劉冠宇",
  },
];

/**
 * Info: (20260811 - Julian) 離職交接範本：四個面向對應規格的交接矩陣。
 *
 * `assetPrefix` 有值的是實體資產，會出現在資產回收表並依員工產生序號；
 * `isScheduled` 為真的是排程停權，顯示的是預定生效時間而不是完成日 ——
 * 停權由排程執行，「今天勾了」與「幾點生效」是兩件不同的事。
 */
const OFFBOARDING_TEMPLATE = [
  {
    key: OffboardingTaskKey.DOCUMENT_HANDOVER,
    title: "專案文件轉移",
    category: HandoverCategory.WORK,
    assignee: "王大明",
    dueOffset: -7,
    note: null,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.CUSTOMER_HANDOVER,
    title: "業務客戶移交",
    category: HandoverCategory.WORK,
    assignee: "王大明",
    dueOffset: -5,
    note: null,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.HANDOVER_APPROVAL,
    title: "主管驗收交接完成",
    category: HandoverCategory.WORK,
    assignee: "王大明",
    dueOffset: -3,
    note: null,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.ACCESS_CARD,
    title: "繳回門禁識別證",
    category: HandoverCategory.ASSET,
    assignee: "蔡宜臻",
    dueOffset: 0,
    note: null,
    assetPrefix: "ID-",
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.CAR_KEY,
    title: "清空個人座位與公務車鑰匙",
    category: HandoverCategory.ASSET,
    assignee: "蔡宜臻",
    dueOffset: 0,
    note: null,
    assetPrefix: "KEY-",
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.LAPTOP_RETURN,
    title: '回收 MacBook Pro 16"',
    category: HandoverCategory.IT,
    assignee: "許庭瑋",
    dueOffset: 0,
    note: null,
    assetPrefix: "C02X",
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.MONITOR_RETURN,
    title: "回收外接螢幕與擴充埠",
    category: HandoverCategory.IT,
    assignee: "許庭瑋",
    dueOffset: 0,
    note: null,
    assetPrefix: "MON-",
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.ACCOUNT_REVOKE,
    title: "Google Workspace 帳號停權",
    category: HandoverCategory.IT,
    assignee: "許庭瑋",
    dueOffset: 0,
    note: null,
    assetPrefix: null,
    isScheduled: true,
  },
  {
    key: OffboardingTaskKey.VPN_REVOKE,
    title: "停用 VPN 與 AWS 權限",
    category: HandoverCategory.IT,
    assignee: "許庭瑋",
    dueOffset: 0,
    note: null,
    assetPrefix: null,
    isScheduled: true,
  },
  {
    key: OffboardingTaskKey.LABOR_INSURANCE,
    title: "勞保退保申報",
    category: HandoverCategory.HR,
    assignee: "林巧芯",
    dueOffset: 3,
    note: null,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.HEALTH_INSURANCE,
    title: "健保退保申報",
    category: HandoverCategory.HR,
    assignee: "林巧芯",
    dueOffset: 3,
    note: null,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.PENSION_STOP,
    title: "勞退停提申報",
    category: HandoverCategory.HR,
    assignee: "林巧芯",
    dueOffset: 3,
    note: null,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.CERTIFICATE,
    title: "離職證明書發放",
    category: HandoverCategory.HR,
    assignee: "林巧芯",
    dueOffset: 1,
    note: null,
    assetPrefix: null,
    isScheduled: false,
  },
];

/**
 * Info: (20260810 - Julian) 任務完成與否由「到期日是否已過」推導，不用亂數。
 *
 * 這樣產生的清單自洽：還沒到期的不會莫名其妙已完成，而未來才報到的人
 * 也不會出現一堆逾期未做的任務。`skipIndexes` 用來刻意留幾筆逾期未完成，
 * 讓「已逾期」那條路徑在畫面上看得到。
 */
function resolveStatus(
  dueDate: Date,
  index: number,
  skipIndexes: number[],
): ProcessTaskStatus {
  if (skipIndexes.includes(index)) return ProcessTaskStatus.PENDING;
  /**
   * Info: (20260810 - Julian) `differenceInDays(a, b)` 回傳的是 b − a，
   * 因此「到期日已過」是 today − dueDate > 0。寫成 < 0 會整個顛倒過來：
   * 還沒報到的人任務幾乎全完成、已經報到一週的人一項都沒做。
   */
  return differenceInDays(dueDate, today) > 0
    ? ProcessTaskStatus.COMPLETED
    : ProcessTaskStatus.PENDING;
}

/** Info: (20260811 - Julian) 工號裡的數字，當作各種衍生值的固定種子 */
function employeeSerial(employee: IEmployeeListItem): number {
  return Number(employee.employeeNo.replace(/\D/g, ""));
}

/**
 * Info: (20260811 - Julian) 實際完成日：到期日往前推 0～2 天。
 *
 * 直接用到期日的話，整張清單的「經辦人 (日期)」會是同一天，
 * 看起來像批次匯入而不是有人真的一件一件去收。
 */
function resolveCompletedDate(dueDate: Date, index: number): string {
  return toIsoDate(addDays(dueDate, -(index % 3)));
}

/**
 * Info: (20260812 - Julian) mock 的任務標題直接讀正體中文字典。
 *
 * `OnboardingTask.title` 存的是建立當下解析好的字串快照，不是 i18n key ——
 * 而這份 mock 扮演的是「一個以正體中文建檔的資料庫」，所以它讀 zh_tw。
 * 這樣改標題只要改字典一處，mock 與 Modal 新建的任務不會各說各話。
 *
 * 字典是巢狀物件而 `ONBOARDING_TASK_TITLE_I18N_KEY` 是點分路徑，
 * 因此這裡只取最後一段當鍵，避免在 mock 裡再寫一份路徑解析。
 */
function resolveMockTaskTitle(key: OnboardingTaskKey): string {
  const leafKey = ONBOARDING_TASK_TITLE_I18N_KEY[key].split(".").pop() ?? "";
  const titles = hrManagementZhTw.onboarding as Record<string, string>;
  return titles[leafKey] ?? key;
}

/**
 * Info: (20260812 - Julian) 報到任務只填共用核心。
 *
 * 交接對象、資產序號、停權時間、完成人這四個欄位已經隨 ADR 019 移到
 * `IOffboardingTask`。它們在報到端本來就恆為 null，也沒有任何報到畫面讀過 ——
 * 補一排 null 只是讓型別看起來還在共用，實際上不是。
 */
function buildOnboardingTasks(employee: IEmployeeListItem): IProcessTask[] {
  const hireDate = parseIsoDate(employee.hireDate);
  // Info: (20260810 - Julian) 依工號末碼決定哪幾項卡住，讓每個人的進度不一樣但固定
  const seed = employeeSerial(employee) % 3;
  const skipIndexes = seed === 0 ? [1] : seed === 1 ? [3, 5] : [2];

  return ONBOARDING_TEMPLATES[OnboardingTemplateKey.GENERAL].map(
    (template, index) => {
      const dueDate = addDays(hireDate, template.dueOffset);
      const status = resolveStatus(dueDate, index, skipIndexes);
      return {
        id: `task-on-${employee.id}-${template.key}`,
        employeeId: employee.id,
        taskType: ProcessTaskType.ONBOARDING,
        title: resolveMockTaskTitle(template.key),
        status,
        dueDate: toIsoDate(dueDate),
        category: template.category,
        templateKey: template.key,
        assigneeName: ONBOARDING_ASSIGNEE_BY_CATEGORY[template.category],
        note: null,
      } satisfies IProcessTask;
    },
  );
}

/** Info: (20260810 - Julian) 離職滿這麼多天後，交接視為全部結清 */
const OFFBOARDING_SETTLED_DAYS = 7;

function buildOffboardingTasks(
  employee: IEmployeeListItem,
): IOffboardingTask[] {
  if (!employee.leaveDate) return [];
  const leaveDate = parseIsoDate(employee.leaveDate);

  /**
   * Info: (20260810 - Julian) 離職超過一週的人，交接全部完成。
   *
   * 少了這一條，沒有任何案件會是 100% ——「可結案」的綠燈與
   * 「歷史離職紀錄」那個分頁就永遠是空的，兩條路徑都不會被畫面驗證到。
   */
  const isSettled =
    differenceInDays(leaveDate, today) > OFFBOARDING_SETTLED_DAYS;

  /**
   * Info: (20260810 - Julian) 已進入結案窗口（離職日 3 天內）但尚未結清的人，
   * 一律讓「帳號停權」留著沒做。
   *
   * 這不是為了讓畫面好看：帳號停權本來就是最容易被拖到最後、
   * 而且過了最後一天就沒人會再想起的一項，它同時是規格裡紅燈的主要觸發條件。
   * 不釘住它的話，紅燈會隨著其他 mock 參數飄移而時有時無，
   * 那條路徑就等於沒有被驗證過。
   */
  const isClosingSoon =
    !isSettled &&
    differenceInDays(today, leaveDate) <= OFFBOARDING_CLOSING_DAYS;
  const accountRevokeIndex = OFFBOARDING_TEMPLATE.findIndex(
    (template) => template.key === OffboardingTaskKey.ACCOUNT_REVOKE,
  );

  const serial = employeeSerial(employee);
  const seed = serial % 4;
  const baseSkips =
    seed === 0
      ? [4, 10]
      : seed === 1
        ? [1, 7, 11]
        : seed === 2
          ? [6, 9]
          : [3, 8, 12];
  const skipIndexes = isSettled
    ? []
    : [
        ...new Set(
          isClosingSoon ? [...baseSkips, accountRevokeIndex] : baseSkips,
        ),
      ];

  return OFFBOARDING_TEMPLATE.map((template, index) => {
    const dueDate = addDays(leaveDate, template.dueOffset);
    const status = resolveStatus(dueDate, index, skipIndexes);
    const isDone = status !== ProcessTaskStatus.PENDING;
    return {
      id: `task-off-${employee.id}-${template.key}`,
      employeeId: employee.id,
      taskType: ProcessTaskType.OFFBOARDING,
      title: template.title,
      status,
      dueDate: toIsoDate(dueDate),
      category: template.category,
      templateKey: template.key,
      assigneeName: template.assignee,
      completedBy: isDone ? template.assignee : null,
      completedDate: isDone ? resolveCompletedDate(dueDate, index) : null,
      /**
       * Info: (20260811 - Julian) 序號由工號推導，同一個人每次進畫面都一樣。
       * 用亂數的話，重新整理後同一台筆電會換一組序號。
       */
      assetNo: template.assetPrefix
        ? `${template.assetPrefix}${1000 + ((serial * 37 + index * 131) % 9000)}`
        : null,
      scheduledAt: template.isScheduled
        ? `${toIsoDate(leaveDate)}T${ACCOUNT_REVOKE_DEFAULT_TIME}`
        : null,
      note: template.note,
    } satisfies IOffboardingTask;
  });
}

/** Info: (20260810 - Julian) 離職滿 30 天後就不再出現在交接清單 */
const OFFBOARDING_WINDOW_DAYS = 30;

/**
 * Info: (20260810 - Julian) 到離職頁面看得到的完整名冊 = 在職名冊 + 待報到準員工。
 * 其他頁面只用 `MOCK_HR_EMPLOYEES`，避免把還沒上班的人算進編制。
 */
export const MOCK_HR_MOVEMENT_PEOPLE: IEmployeeListItem[] = [
  ...MOCK_HR_EMPLOYEES,
  ...MOCK_HR_INCOMING_EMPLOYEES,
];

export const MOCK_HR_MOVEMENT_TASKS: IProcessTask[] =
  MOCK_HR_MOVEMENT_PEOPLE.flatMap((employee) => {
    const hiredDaysAgo = differenceInDays(
      parseIsoDate(employee.hireDate),
      today,
    );

    // Info: (20260810 - Julian) 未來 14 天內報到、或報到未滿 30 天者有報到流程
    const hasOnboarding =
      employee.status !== EmployeeStatus.RESIGNED &&
      hiredDaysAgo >= -ONBOARDING_UPCOMING_DAYS &&
      hiredDaysAgo <= 30;

    if (hasOnboarding) return buildOnboardingTasks(employee);

    /**
     * Info: (20260810 - Julian) 有離職日就有交接流程，不限於狀態已是 RESIGNED。
     *
     * 已提出離職但還沒到最後一天的人，狀態仍然是在職 —— 而那正是交接進行中的階段，
     * 也是看板「離職交接中」那一欄的來源。只看 RESIGNED 會讓那一欄永遠空著。
     */
    if (employee.leaveDate) {
      const daysUntilLeave = differenceInDays(
        today,
        parseIsoDate(employee.leaveDate),
      );
      if (daysUntilLeave >= -OFFBOARDING_WINDOW_DAYS) {
        return buildOffboardingTasks(employee);
      }
    }

    return [];
  });

/**
 * Info: (20260810 - Julian) 每位離職者「提出離職」的日期。
 *
 * 預告期要從提出日算到最後一天，不是從今天算 —— 用今天當起點的話，
 * 已經離職的人預告天數永遠是 0，而所有人都會被標成「預告期不足」，
 * 那個徽章就變成純裝飾。
 *
 * 這裡由應預告天數往前推，並讓約三分之一的人刻意不足，
 * 使「符合」與「不足」兩條路徑在畫面上都看得到。
 *
 * ToDo: (20260810 - Julian) 接 API 後改讀 `OffboardingProcess.createdAt`。
 */
export const MOCK_HR_RESIGNATION_NOTICES: Record<string, string> =
  Object.fromEntries(
    MOCK_HR_MOVEMENT_PEOPLE.filter(
      (employee) => employee.leaveDate !== null,
    ).map((employee) => {
      const leaveDate = parseIsoDate(employee.leaveDate as string);
      const tenureMonths = differenceInFullMonths(
        parseIsoDate(employee.hireDate),
        leaveDate,
      );
      const requiredDays = resolveRequiredNoticeDays(tenureMonths);
      const serial = Number(employee.employeeNo.replace(/\D/g, ""));
      // Info: (20260810 - Julian) 三分之一提前不足，其餘多給 8 天
      const gap = serial % 3 === 0 ? requiredDays - 12 : requiredDays + 8;
      return [employee.id, toIsoDate(addDays(leaveDate, -Math.max(0, gap)))];
    }),
  );
