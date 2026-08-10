import {
  DocumentCategory,
  EmployeeStatus,
  ProcessTaskStatus,
  ProcessTaskType,
} from "@/constants/hr_management";
import {
  MOCK_HR_EMPLOYEES,
  MOCK_HR_TODAY,
} from "@/constants/mock_hr_employees";
import { IEmployeeDocument, IProcessTask } from "@/interfaces/hr_management";
import {
  addDays,
  differenceInDays,
  parseIsoDate,
  toIsoDate,
} from "@/lib/utils/hr_date";

/**
 * ToDo: (20260810 - Julian) 待 `/api/v1/hr/document`、`/api/v1/hr/process_task`
 * 上線後整檔移除。
 *
 * 產生方式刻意只用索引運算而不用亂數：文件與任務的數量少，
 * 用取模就能鋪出「有些已過期、有些快到期、大多還很久」的分布，
 * 不需要再引入一個亂數源（多一個就多一個要保證決定性的東西）。
 */

/**
 * Info: (20260810 - Julian) 到期日相對基準日的偏移；負數代表已經過期。
 *
 * 長度取質數 13 是刻意的。文件是「每 6 位員工發一份合約」這樣產生的，
 * 若偏移表長度也是 6 的倍數，`index % length` 會永遠落在同一格 ——
 * 實測 12 格時全部合約的到期日都是同一天，清單看起來像是壞掉的假資料。
 * 13 與 6、9 都互質，才會把每一種偏移都輪過一遍。
 */
const EXPIRY_OFFSET_DAYS = [
  -18, -6, 5, 12, 27, 41, 55, 88, 130, 190, 250, 310, 400,
];

const CONTRACT_TITLES = ["定期勞動契約", "外派服務約定書", "競業禁止協議"];

const CERTIFICATE_TITLES = [
  "勞工安全衛生管理員證照",
  "AWS Solutions Architect 證照",
  "記帳士證書",
  "堆高機操作證",
  "急救人員證照",
  "ISO 14064-1 主導查證員",
];

const today = parseIsoDate(MOCK_HR_TODAY);

// Info: (20260810 - Julian) 只有在編員工才需要追文件；離職者的合約到期沒有人要處理
const HEADCOUNT_EMPLOYEES = MOCK_HR_EMPLOYEES.filter(
  (employee) => employee.status !== EmployeeStatus.RESIGNED,
);

export const MOCK_HR_DOCUMENTS: IEmployeeDocument[] =
  HEADCOUNT_EMPLOYEES.flatMap((employee, index) => {
    const documents: IEmployeeDocument[] = [];

    if (index % 6 === 0) {
      documents.push({
        id: `doc-contract-${employee.id}`,
        employeeId: employee.id,
        title: CONTRACT_TITLES[index % CONTRACT_TITLES.length],
        category: DocumentCategory.CONTRACT,
        expiredAt: toIsoDate(
          addDays(today, EXPIRY_OFFSET_DAYS[index % EXPIRY_OFFSET_DAYS.length]),
        ),
      });
    }

    if (index % 9 === 4) {
      documents.push({
        id: `doc-cert-${employee.id}`,
        employeeId: employee.id,
        title: CERTIFICATE_TITLES[index % CERTIFICATE_TITLES.length],
        category: DocumentCategory.CERTIFICATE,
        expiredAt: toIsoDate(
          addDays(
            today,
            EXPIRY_OFFSET_DAYS[(index + 5) % EXPIRY_OFFSET_DAYS.length],
          ),
        ),
      });
    }

    return documents;
  });

/** Info: (20260810 - Julian) 報到勾稽項目：名稱與相對報到日的到期天數 */
const ONBOARDING_TASKS = [
  { title: "發放筆記型電腦與門禁卡", dueOffset: 1 },
  { title: "開通系統帳號與郵件信箱", dueOffset: 2 },
  { title: "繳交勞健保與扶養資料", dueOffset: 5 },
];

/** Info: (20260810 - Julian) 離職交接項目：相對離職日的天數，負值代表離職前要完成 */
const OFFBOARDING_TASKS = [
  { title: "收回公司設備與門禁卡", dueOffset: -1 },
  { title: "完成工作交接文件", dueOffset: -5 },
  { title: "辦理勞健保退保", dueOffset: 3 },
];

/** Info: (20260810 - Julian) 只有近 30 天報到或離職的人還會有未完成任務 */
const ACTIVE_PROCESS_WINDOW_DAYS = 30;

export const MOCK_HR_PROCESS_TASKS: IProcessTask[] = MOCK_HR_EMPLOYEES.flatMap(
  (employee, employeeIndex) => {
    const tasks: IProcessTask[] = [];

    const hiredDaysAgo = differenceInDays(
      parseIsoDate(employee.hireDate),
      today,
    );
    const isNewHire =
      employee.status !== EmployeeStatus.RESIGNED &&
      hiredDaysAgo >= 0 &&
      hiredDaysAgo <= ACTIVE_PROCESS_WINDOW_DAYS;

    if (isNewHire) {
      ONBOARDING_TASKS.forEach((task, taskIndex) => {
        tasks.push({
          id: `task-on-${employee.id}-${taskIndex}`,
          employeeId: employee.id,
          taskType: ProcessTaskType.ONBOARDING,
          title: task.title,
          /**
           * Info: (20260810 - Julian) 已經過了到期日的項目視為已完成，
           * 只留下還沒到期的當作待辦 —— 否則整份清單都是逾期，
           * 反而看不出哪一件真的該今天處理。
           */
          status:
            hiredDaysAgo > task.dueOffset + taskIndex
              ? ProcessTaskStatus.COMPLETED
              : ProcessTaskStatus.PENDING,
          dueDate: toIsoDate(
            addDays(parseIsoDate(employee.hireDate), task.dueOffset),
          ),
        });
      });
    }

    const leaveDate = employee.leaveDate;
    if (employee.status === EmployeeStatus.RESIGNED && leaveDate) {
      const leftDaysAgo = differenceInDays(parseIsoDate(leaveDate), today);
      if (leftDaysAgo <= ACTIVE_PROCESS_WINDOW_DAYS) {
        OFFBOARDING_TASKS.forEach((task, taskIndex) => {
          tasks.push({
            id: `task-off-${employee.id}-${taskIndex}`,
            employeeId: employee.id,
            taskType: ProcessTaskType.OFFBOARDING,
            title: task.title,
            status:
              (employeeIndex + taskIndex) % 3 === 0
                ? ProcessTaskStatus.COMPLETED
                : ProcessTaskStatus.PENDING,
            dueDate: toIsoDate(
              addDays(parseIsoDate(leaveDate), task.dueOffset),
            ),
          });
        });
      }
    }

    return tasks;
  },
);
