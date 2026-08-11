import {
  ChecklistState,
  DocumentCategory,
  EmployeeStatus,
  Gender,
  HandoverCategory,
  MovementAlertLevel,
  MovementAlertReason,
  MovementStage,
  ProbationMilestone,
  ProbationResult,
  ProbationScoreItem,
  ProcessTaskStatus,
  ProcessTaskType,
} from "@/constants/hr_management";

/**
 * Info: (20260811 - Julian) 員工列表的一列。
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
 * Info: (20260811 - Julian) 部門，對應 Prisma model Department。
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
 * Info: (20260811 - Julian) 由 `IDepartment[]` 組出來的樹節點。
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

// Info: (20260811 - Julian) 職稱職等，對應 Prisma model JobTitle
export interface IJobTitle {
  id: string;
  code: string;
  title: string;
  level: number;
  description: string | null;
}

// Info: (20260811 - Julian) 職稱列表的一列：職稱本身加上統計出來的在職人數
export interface IJobTitleListItem extends IJobTitle {
  headcount: number;
}

// Info: (20260811 - Julian) 列表的篩選條件，之後可直接序列化成 API query string
export interface IEmployeeListFilter {
  keyword: string;
  departmentId: string;
  status: string;
}

/**
 * Info: (20260811 - Julian) 員工文件，對應 Prisma model EmployeeDocument。
 * 儀表板只關心到期日，因此不含檔案本身的 `fileId`。
 */
export interface IEmployeeDocument {
  id: string;
  employeeId: string;
  title: string;
  category: DocumentCategory;
  expiredAt: string | null;
}

/**
 * Info: (20260811 - Julian) 報到／離職流程的細項任務，對應 Prisma model ProcessTask。
 *
 * ToDo: (20260811 - Julian) `category` 與 `assigneeName` 在 Prisma 沒有對應欄位
 * （ProcessTask 只有 title / status / assigneeId）。離職交接矩陣要靠 category 分組、
 * 篩選列的「負責人」要靠 assigneeName，接 API 前 schema 需要補上。
 */
export interface IProcessTask {
  id: string;
  employeeId: string;
  taskType: ProcessTaskType;
  title: string;
  status: ProcessTaskStatus;
  dueDate: string;
  category: HandoverCategory;
  /** Info: (20260811 - Julian) 任務範本鍵值，見 OnboardingTaskKey / OffboardingTaskKey */
  templateKey: string;
  assigneeName: string;
  /** Info: (20260811 - Julian) 補充說明，例如「預定 8/31 23:59 停權」 */
  note: string | null;
}

// Info: (20260811 - Julian) 待辦清單的一列（任務或試用期考核），已解析出員工姓名與剩餘天數
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

// Info: (20260811 - Julian) 試用期考核提醒
export interface IProbationAlertItem {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  jobTitle: string | null;
  probationEndDate: string;
  daysLeft: number;
  isUrgent: boolean;
}

// Info: (20260811 - Julian) 文件／證照到期提醒
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

// Info: (20260811 - Julian) 近期動態的一列（新人報到、壽星、工作週年共用）
export interface IEngagementItem {
  employeeId: string;
  employeeName: string;
  departmentName: string | null;
  jobTitle: string | null;
  /** Info: (20260811 - Julian) 事件日期；報到為到職日、壽星為生日、週年為到職紀念日 */
  eventDate: string;
  /** Info: (20260811 - Julian) 工作週年才有值，代表滿幾年 */
  anniversaryYears: number | null;
}

// Info: (20260811 - Julian) 儀表板 KPI
export interface IDashboardKpi {
  headcount: number;
  activeCount: number;
  probationCount: number;
  hiredThisMonth: number;
  resignedThisMonth: number;
  /** Info: (20260811 - Julian) 本月離職率（百分比，已四捨五入到小數一位） */
  turnoverRate: number;
  pendingTaskCount: number;
}

// Info: (20260811 - Julian) 圖表資料點
export interface IDistributionPoint {
  key: string;
  label: string;
  value: number;
}

export interface ITrendPoint {
  /** Info: (20260811 - Julian) YYYY-MM */
  month: string;
  hired: number;
  resigned: number;
}

// Info: (20260811 - Julian) 儀表板一次算完的所有資料，避免各區塊各自遍歷員工陣列
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

// Info: (20260811 - Julian) 自動化警示：等級決定顏色、原因決定文字
export interface IMovementAlert {
  level: MovementAlertLevel;
  reason: MovementAlertReason;
}

/**
 * Info: (20260811 - Julian) 到離職案件的共通形狀。
 *
 * 報到與離職在畫面上是同一種卡片、同一個抽屜，差別只在關鍵日期的語意
 * （預定報到日 vs 預定離職日）與任務類型，因此收斂成一個型別，
 * 由 `taskType` 區分。分成兩個型別會讓看板與抽屜各寫兩份幾乎一樣的程式。
 */
export interface IMovementCase {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  departmentName: string | null;
  jobTitle: string | null;
  managerName: string | null;
  taskType: ProcessTaskType;
  /** Info: (20260811 - Julian) 報到案件為到職日、離職案件為預定離職日 */
  keyDate: string;
  /** Info: (20260811 - Julian) 相對基準日的天數，負數代表已經過去 */
  daysUntilKeyDate: number;
  tasks: IProcessTask[];
  completedTaskCount: number;
  totalTaskCount: number;
  /** Info: (20260811 - Julian) 由日期推導出的看板欄位，可被使用者拖拽覆寫 */
  stage: MovementStage;
  alert: IMovementAlert;
}

// Info: (20260811 - Julian) 報到列表的一列：案件加上三項行政事宜的彙總狀態
export interface IOnboardingRow extends IMovementCase {
  formState: ChecklistState;
  equipmentState: ChecklistState;
  contractState: ChecklistState;
}

// Info: (20260811 - Julian) 試用期考核的一列
export interface IProbationRow {
  employeeId: string;
  employeeName: string;
  employeeNo: string;
  departmentName: string | null;
  jobTitle: string | null;
  managerName: string | null;
  hireDate: string;
  probationEndDate: string;
  daysUntilEnd: number;
  /** Info: (20260811 - Julian) 三個節點各自的完成狀態，key 為節點列舉 */
  milestones: Record<ProbationMilestone, ChecklistState>;
  /** Info: (20260811 - Julian) 已送出的考核結果；未考核為 null */
  result: ProbationResult | null;
  /** Info: (20260811 - Julian) 四項分項的平均；未送出考核為 null */
  score: number | null;
  /** Info: (20260811 - Julian) 試用期已滿但尚未送出考核 */
  isOverdue: boolean;
  /** Info: (20260811 - Julian) 已暫存但尚未提交；草稿不算完成考核 */
  isDraft: boolean;
  alert: IMovementAlert;
}

/**
 * Info: (20260811 - Julian) 試用期考核表單的完整內容。
 *
 * 四個分項、兩段評語、結果與其附帶欄位、兩項調整全部放在同一個物件，
 * 因為它們是一次送出的同一份文件；拆成多個 state 只會讓「暫存草稿」
 * 需要各自記得存哪幾個欄位。
 *
 * ToDo: (20260811 - Julian) `newSalary` / `newJobTitle` 在 Prisma 完全沒有對應欄位。
 * 薪資與職務異動實際上要寫回 Employee 與薪資紀錄，接 API 前需要決定
 * 是由考核流程直接改，還是產生一張待簽核的異動單。
 */
export interface IProbationReviewForm {
  scores: Record<ProbationScoreItem, number>;
  strengths: string;
  improvements: string;
  result: ProbationResult | null;
  /** Info: (20260811 - Julian) 通過轉正的正式生效日 */
  effectiveDate: string;
  /** Info: (20260811 - Julian) 延長試用期的到期日與原因 */
  extendUntil: string;
  extendReason: string;
  /** Info: (20260811 - Julian) 不予錄用的預定離職日 */
  lastDay: string;
  isSalaryAdjusted: boolean;
  newSalary: string;
  isPositionAdjusted: boolean;
  newJobTitle: string;
  /** Info: (20260811 - Julian) true 代表這份只是暫存，尚未提交 */
  isDraft: boolean;
}

// Info: (20260811 - Julian) 試用期分頁頂部的三個統計
export interface IProbationMetrics {
  endingThisMonth: number;
  overdue: number;
  passedThisMonth: number;
}

// Info: (20260811 - Julian) 離職案件，含預告期是否符合
export interface IOffboardingCase extends IMovementCase {
  /** Info: (20260811 - Julian) 依勞基法第 16 條依年資推得的應預告天數 */
  requiredNoticeDays: number;
  actualNoticeDays: number;
  isNoticeSatisfied: boolean;
  isCompleted: boolean;
}

// Info: (20260811 - Julian) 交接矩陣的一組：分類與其下的任務
export interface IHandoverGroup {
  category: HandoverCategory;
  tasks: IProcessTask[];
  completedCount: number;
}
