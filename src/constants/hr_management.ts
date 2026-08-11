/**
 * Info: (20260810 - Julian) 人事管理系統的共用常數。
 *
 * 狀態值與 `prisma/schema.prisma` 的 `EmployeeStatus`、`Gender` 逐字對齊，
 * 但刻意不從 `@/generated/prisma` 匯入：那份 client 會把 Node 端的相依
 * 拉進 client component 的 bundle，而前端只需要「字串長什麼樣」。
 * 兩邊若日後不同步，`src/__tests__` 的 schema 對照測試會擋下來。
 */

// Info: (20260810 - Julian) 人事管理系統的路由表，側邊選單與麵包屑共用同一份
export const HR_MANAGEMENT_ROUTE = {
  DASHBOARD: "/hr_management",
  ORGANIZATION: "/hr_management/organization",
  EMPLOYEE: "/hr_management/employee",
  MOVEMENT: "/hr_management/movement",
  DOCUMENT: "/hr_management/document",
  SETTING: "/hr_management/setting",
} as const;

// Info: (20260810 - Julian) 員工在職狀態，對齊 Prisma enum EmployeeStatus
export enum EmployeeStatus {
  ACTIVE = "ACTIVE",
  PROBATION = "PROBATION",
  LEAVE_WITHOUT_PAY = "LEAVE_WITHOUT_PAY",
  RESIGNED = "RESIGNED",
}

// Info: (20260810 - Julian) 性別，對齊 Prisma enum Gender
export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

/**
 * Info: (20260810 - Julian) 篩選器的「全部」選項。
 * 用一個不可能與部門 id / 狀態值相撞的字串，避免用空字串當哨兵值 ——
 * 空字串在 `<select>` 與 URL query 中都會與「沒有值」混淆。
 */
export const HR_FILTER_ALL = "__ALL__";

// Info: (20260810 - Julian) 列表可排序的欄位。字串同時是 DataTable 的 column key 與未來 API 的 sortBy 參數
export enum EmployeeSortKey {
  EMPLOYEE = "employeeNo",
  DEPARTMENT = "department",
  STATUS = "status",
  HIRE_DATE = "hireDate",
}

// Info: (20260810 - Julian) 列表每頁筆數
export const EMPLOYEE_LIST_PAGE_SIZE = 10;

/**
 * Info: (20260810 - Julian) 狀態標籤配色。
 *
 * 只用 50 / 100 / 700 這幾階：深色主題下 `globals.css` 會把彩色 50–300 階
 * 依比例混入頁面底色，700 階則走中性色盤反轉，兩種主題都不必另外處理。
 */
export const EMPLOYEE_STATUS_STYLE: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  [EmployeeStatus.PROBATION]: "bg-amber-50 text-amber-700 ring-amber-200",
  [EmployeeStatus.LEAVE_WITHOUT_PAY]: "bg-sky-50 text-sky-700 ring-sky-200",
  [EmployeeStatus.RESIGNED]: "bg-gray-100 text-gray-600 ring-gray-200",
};

// Info: (20260810 - Julian) 狀態的 i18n key 後綴，避免在 JSX 內拼字串
export const EMPLOYEE_STATUS_I18N_KEY: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: "hr_management.status.active",
  [EmployeeStatus.PROBATION]: "hr_management.status.probation",
  [EmployeeStatus.LEAVE_WITHOUT_PAY]: "hr_management.status.leave_without_pay",
  [EmployeeStatus.RESIGNED]: "hr_management.status.resigned",
};

// Info: (20260810 - Julian) 統計卡要呈現的狀態與順序
export const EMPLOYEE_SUMMARY_STATUSES: EmployeeStatus[] = [
  EmployeeStatus.ACTIVE,
  EmployeeStatus.PROBATION,
  EmployeeStatus.LEAVE_WITHOUT_PAY,
  EmployeeStatus.RESIGNED,
];

// Info: (20260810 - Julian) 組織架構頁的分頁
export enum OrganizationTab {
  DEPARTMENT = "DEPARTMENT",
  JOB_TITLE = "JOB_TITLE",
}

// Info: (20260810 - Julian) 部門架構的兩種檢視：清單（左樹右詳情）與組織圖（上下式卡片）
export enum OrganizationViewMode {
  LIST = "LIST",
  CHART = "CHART",
}

export const ORGANIZATION_TAB_I18N_KEY: Record<OrganizationTab, string> = {
  [OrganizationTab.DEPARTMENT]: "hr_management.organization.tab_department",
  [OrganizationTab.JOB_TITLE]: "hr_management.organization.tab_job_title",
};

export const ORGANIZATION_VIEW_MODE_I18N_KEY: Record<
  OrganizationViewMode,
  string
> = {
  [OrganizationViewMode.LIST]: "hr_management.organization.view_list",
  [OrganizationViewMode.CHART]: "hr_management.organization.view_chart",
};

// Info: (20260810 - Julian) 分頁與檢視模式的顯示順序
export const ORGANIZATION_TABS: OrganizationTab[] = [
  OrganizationTab.DEPARTMENT,
  OrganizationTab.JOB_TITLE,
];

export const ORGANIZATION_VIEW_MODES: OrganizationViewMode[] = [
  OrganizationViewMode.LIST,
  OrganizationViewMode.CHART,
];

/**
 * Info: (20260810 - Julian) 儀表板視角。
 *
 * ToDo: (20260810 - Julian) 目前由頁面上的切換器決定，是為了在沒有後端的情況下
 * 也能驗收兩種版型。接上權限後改為讀取 `useAuth()` 的角色，切換器整個移除。
 */
export enum HrDashboardRole {
  HR = "HR",
  MANAGER = "MANAGER",
}

export const HR_DASHBOARD_ROLES: HrDashboardRole[] = [
  HrDashboardRole.HR,
  HrDashboardRole.MANAGER,
];

export const HR_DASHBOARD_ROLE_I18N_KEY: Record<HrDashboardRole, string> = {
  [HrDashboardRole.HR]: "hr_management.dashboard.role_hr",
  [HrDashboardRole.MANAGER]: "hr_management.dashboard.role_manager",
};

/**
 * Info: (20260811 - Julian) 報到／離職任務類型。**DTO 層的衍生值，DB 沒有這個欄位。**
 *
 * 原本對齊 Prisma enum `ProcessTaskType`，但那個 enum 已隨 `ProcessTask` 拆成
 * `OnboardingTask` / `OffboardingTask` 一併移除 —— 儲存層裡任務屬於哪種流程
 * 由它在哪張表決定，存一個可以與外鍵矛盾的欄位只會製造第三種真相
 * （見 ADR 019）。
 *
 * 這裡保留它的理由不同：待辦清單畫面把兩種任務併成一張列表，
 * 每一列需要標示自己來自哪邊。這個值由 service 層依來源表填入，
 * **不可以寫回資料庫**。
 */
export enum ProcessTaskType {
  ONBOARDING = "ONBOARDING",
  OFFBOARDING = "OFFBOARDING",
}

// Info: (20260810 - Julian) 任務狀態，對齊 Prisma enum ProcessTaskStatus
export enum ProcessTaskStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  SKIPPED = "SKIPPED",
}

/**
 * Info: (20260811 - Julian) 試用期考核結果，對齊 Prisma enum ProbationResult。
 *
 * 三個值都會進判斷：EXTEND 延長試用期並重排考核日、FAIL 觸發離職流程、
 * PASS 把 `EmployeeStatus` 從 PROBATION 轉成 ACTIVE。
 */
export enum ProbationResult {
  PASS = "PASS",
  EXTEND = "EXTEND",
  FAIL = "FAIL",
}

// Info: (20260810 - Julian) 文件分類，對齊 Prisma enum DocumentCategory
export enum DocumentCategory {
  CONTRACT = "CONTRACT",
  NDA = "NDA",
  CERTIFICATE = "CERTIFICATE",
  OTHER = "OTHER",
}

export const PROCESS_TASK_TYPE_I18N_KEY: Record<ProcessTaskType, string> = {
  [ProcessTaskType.ONBOARDING]: "hr_management.dashboard.task_onboarding",
  [ProcessTaskType.OFFBOARDING]: "hr_management.dashboard.task_offboarding",
};

export const DOCUMENT_CATEGORY_I18N_KEY: Record<DocumentCategory, string> = {
  [DocumentCategory.CONTRACT]: "hr_management.dashboard.doc_contract",
  [DocumentCategory.NDA]: "hr_management.dashboard.doc_nda",
  [DocumentCategory.CERTIFICATE]: "hr_management.dashboard.doc_certificate",
  [DocumentCategory.OTHER]: "hr_management.dashboard.doc_other",
};

/**
 * Info: (20260810 - Julian) 儀表板的各種天數門檻。
 *
 * 全部集中在此，因為它們同時被「要不要出現在清單」與「要不要標成紅色」
 * 兩處判斷使用，分散寫死會讓清單裡出現一筆卻不標色這種說不出理由的狀況。
 */
export const PROBATION_MONTHS = 3;
export const PROBATION_ALERT_DAYS = 30;
export const PROBATION_URGENT_DAYS = 14;
export const DOCUMENT_ALERT_DAYS = 60;
export const DOCUMENT_URGENT_DAYS = 14;
export const RECENT_HIRE_DAYS = 7;
export const TREND_MONTHS = 12;

// Info: (20260810 - Julian) 待辦與提醒清單一次最多顯示幾筆，其餘收在「查看全部」後面
export const DASHBOARD_LIST_LIMIT = 5;

export interface IHistogramBucket {
  key: string;
  labelKey: string;
  /** Info: (20260810 - Julian) 下界（含） */
  min: number;
  /** Info: (20260810 - Julian) 上界（不含）；null 表示沒有上界 */
  max: number | null;
}

// Info: (20260810 - Julian) 年資級距（單位：年）
export const TENURE_BUCKETS: IHistogramBucket[] = [
  {
    key: "lt1",
    labelKey: "hr_management.dashboard.tenure_lt1",
    min: 0,
    max: 1,
  },
  {
    key: "1to3",
    labelKey: "hr_management.dashboard.tenure_1to3",
    min: 1,
    max: 3,
  },
  {
    key: "3to5",
    labelKey: "hr_management.dashboard.tenure_3to5",
    min: 3,
    max: 5,
  },
  {
    key: "5to10",
    labelKey: "hr_management.dashboard.tenure_5to10",
    min: 5,
    max: 10,
  },
  {
    key: "gte10",
    labelKey: "hr_management.dashboard.tenure_gte10",
    min: 10,
    max: null,
  },
];

// Info: (20260810 - Julian) 年齡級距（單位：歲）
export const AGE_BUCKETS: IHistogramBucket[] = [
  {
    key: "lt30",
    labelKey: "hr_management.dashboard.age_lt30",
    min: 0,
    max: 30,
  },
  {
    key: "30to39",
    labelKey: "hr_management.dashboard.age_30to39",
    min: 30,
    max: 40,
  },
  {
    key: "40to49",
    labelKey: "hr_management.dashboard.age_40to49",
    min: 40,
    max: 50,
  },
  {
    key: "50to59",
    labelKey: "hr_management.dashboard.age_50to59",
    min: 50,
    max: 60,
  },
  {
    key: "gte60",
    labelKey: "hr_management.dashboard.age_gte60",
    min: 60,
    max: null,
  },
];

// Info: (20260810 - Julian) 結構圖的兩種維度
export enum StructureDimension {
  TENURE = "TENURE",
  AGE = "AGE",
}

export const STRUCTURE_DIMENSIONS: StructureDimension[] = [
  StructureDimension.TENURE,
  StructureDimension.AGE,
];

export const STRUCTURE_DIMENSION_I18N_KEY: Record<StructureDimension, string> =
  {
    [StructureDimension.TENURE]: "hr_management.dashboard.dimension_tenure",
    [StructureDimension.AGE]: "hr_management.dashboard.dimension_age",
  };
