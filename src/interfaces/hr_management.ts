import {
  DocumentCategory,
  EmployeeStatus,
  Gender,
  ProcessTaskStatus,
  ProcessTaskType,
} from "@/constants/hr_management";

/**
 * Info: (20260810 - Julian) 員工列表的一列。
 *
 * 這是「列表視圖」的 DTO，不是 Prisma model 的鏡射：部門、職稱、主管在
 * DB 是關聯，但列表只需要顯示名稱，因此在此攤平。日期一律用 ISO 字串，
 * 讓它與未來 API 的 JSON 回傳完全一致，接上 API 時不必改型別。
 *
 * `departmentId` / `jobTitleId` 保留原始關聯鍵：組織架構頁要靠它們回頭
 * 統計人數，只有顯示用的名稱是算不回去的。
 */
export interface IEmployeeListItem {
  id: string;
  employeeNo: string;
  name: string;
  englishName: string | null;
  gender: Gender;
  birthday: string | null;
  email: string;
  phone: string;
  status: EmployeeStatus;
  hireDate: string;
  leaveDate: string | null;
  departmentId: string | null;
  departmentName: string | null;
  jobTitleId: string | null;
  jobTitle: string | null;
  managerName: string | null;
}

/**
 * Info: (20260810 - Julian) 部門，對應 Prisma model Department。
 *
 * `parentId` 是自關聯的樹狀結構，`managerId` 指向 Employee ——
 * 兩者都可能為 null（根部門沒有父層、部門可能還沒指派主管）。
 */
export interface IDepartment {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parentId: string | null;
  managerId: string | null;
}

/**
 * Info: (20260810 - Julian) 由 `IDepartment[]` 組出來的樹節點。
 *
 * 人數分成兩個：`directHeadcount` 只算掛在這一層的員工，
 * `totalHeadcount` 含所有子孫部門。技術部這種有分組的單位，
 * 只顯示其中一個都會讓人誤判編制大小。
 */
export interface IDepartmentTreeNode extends IDepartment {
  depth: number;
  children: IDepartmentTreeNode[];
  managerName: string | null;
  directHeadcount: number;
  totalHeadcount: number;
}

// Info: (20260810 - Julian) 職稱職等，對應 Prisma model JobTitle
export interface IJobTitle {
  id: string;
  code: string;
  title: string;
  level: number;
  description: string | null;
}

// Info: (20260810 - Julian) 職稱列表的一列：職稱本身加上統計出來的在職人數
export interface IJobTitleListItem extends IJobTitle {
  headcount: number;
}

// Info: (20260810 - Julian) 列表的篩選條件，之後可直接序列化成 API query string
export interface IEmployeeListFilter {
  keyword: string;
  departmentId: string;
  status: string;
}

/**
 * Info: (20260810 - Julian) 員工文件，對應 Prisma model EmployeeDocument。
 * 儀表板只關心到期日，因此不含檔案本身的 `fileId`。
 */
export interface IEmployeeDocument {
  id: string;
  employeeId: string;
  title: string;
  category: DocumentCategory;
  expiredAt: string | null;
}

// Info: (20260810 - Julian) 報到／離職流程的細項任務，對應 Prisma model ProcessTask
export interface IProcessTask {
  id: string;
  employeeId: string;
  taskType: ProcessTaskType;
  title: string;
  status: ProcessTaskStatus;
  dueDate: string;
}

// Info: (20260810 - Julian) 待辦清單的一列（任務或試用期考核），已解析出員工姓名與剩餘天數
export interface IDashboardTaskItem {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  title: string;
  taskType: ProcessTaskType;
  dueDate: string;
  daysLeft: number;
  isUrgent: boolean;
}

// Info: (20260810 - Julian) 試用期考核提醒
export interface IProbationAlertItem {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  jobTitle: string | null;
  probationEndDate: string;
  daysLeft: number;
  isUrgent: boolean;
}

// Info: (20260810 - Julian) 文件／證照到期提醒
export interface IDocumentAlertItem {
  id: string;
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  title: string;
  category: DocumentCategory;
  expiredAt: string;
  daysLeft: number;
  isUrgent: boolean;
}

// Info: (20260810 - Julian) 近期動態的一列（新人報到、壽星、工作週年共用）
export interface IEngagementItem {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  jobTitle: string | null;
  /** Info: (20260810 - Julian) 事件日期；報到為到職日、壽星為生日、週年為到職紀念日 */
  eventDate: string;
  /** Info: (20260810 - Julian) 工作週年才有值，代表滿幾年 */
  anniversaryYears: number | null;
}

// Info: (20260810 - Julian) 儀表板 KPI
export interface IDashboardKpi {
  headcount: number;
  activeCount: number;
  probationCount: number;
  hiredThisMonth: number;
  resignedThisMonth: number;
  /** Info: (20260810 - Julian) 本月離職率（百分比，已四捨五入到小數一位） */
  turnoverRate: number;
  pendingTaskCount: number;
}

// Info: (20260810 - Julian) 圖表資料點
export interface IDistributionPoint {
  key: string;
  label: string;
  value: number;
}

export interface ITrendPoint {
  /** Info: (20260810 - Julian) YYYY-MM */
  month: string;
  hired: number;
  resigned: number;
}

// Info: (20260810 - Julian) 儀表板一次算完的所有資料，避免各區塊各自遍歷員工陣列
export interface IDashboardData {
  kpi: IDashboardKpi;
  probationAlerts: IProbationAlertItem[];
  processTasks: IDashboardTaskItem[];
  documentAlerts: IDocumentAlertItem[];
  recentHires: IEngagementItem[];
  birthdays: IEngagementItem[];
  anniversaries: IEngagementItem[];
  departmentDistribution: IDistributionPoint[];
  trend: ITrendPoint[];
  tenureDistribution: IDistributionPoint[];
  ageDistribution: IDistributionPoint[];
}
