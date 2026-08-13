/**
 * Info: (20260810 - Julian) 人事管理系統的共用常數。
 * 與 `prisma/schema.prisma` 的 `EmployeeStatus`、`Gender` 逐字對齊。
 */

// Info: (20260810 - Julian) 人事管理系統的路由表，側邊選單與麵包屑共用同一份
export const HR_MANAGEMENT_ROUTE = {
  DASHBOARD: "/hr_management",
  ORGANIZATION: "/hr_management/organization",
  EMPLOYEE: "/hr_management/employee",
  MOVEMENT: "/hr_management/movement",
  ATTENDANCE: "/hr_management/attendance",
  ATTENDANCE_PRESENCE: "/hr_management/attendance/presence",
  ATTENDANCE_RESULT: "/hr_management/attendance/result",
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

// Info: (20260812 - Julian) 性別選項與顯示文字（共三種）
export const GENDERS: Gender[] = [Gender.FEMALE, Gender.MALE, Gender.OTHER];

export const GENDER_I18N_KEY: Record<Gender, string> = {
  [Gender.FEMALE]: "hr_management.onboarding.gender_female",
  [Gender.MALE]: "hr_management.onboarding.gender_male",
  [Gender.OTHER]: "hr_management.onboarding.gender_other",
};

// Info: (20260810 - Julian) 篩選器的「全部」選項。
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
 * Info: (20260811 - Julian) 報到／離職任務類型。DTO 層的衍生值，DB 沒有這個欄位。
 *
 * 原本對齊 Prisma enum `ProcessTaskType`，但那個 enum 已隨 `ProcessTask` 拆成
 * `OnboardingTask` / `OffboardingTask` 一併移除 —— 儲存層裡任務屬於哪種流程
 * 由它在哪張表決定，存一個可以與外鍵矛盾的欄位只會製造第三種真相（見 ADR 019）。
 *
 * 這裡保留它的理由不同：待辦清單畫面把兩種任務併成一張列表，
 * 每一列需要標示自己來自哪邊。這個值由 service 層依來源表填入，
 * ⚠️ 不可以寫回資料庫。
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

// Info: (20260810 - Julian) 儀表板的各種天數的標色門檻。
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
  min: number; // Info: (20260810 - Julian) 下界（含）
  max: number | null; // Info: (20260810 - Julian) 上界（不含）；null 表示沒有上界
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

// Info: (20260811 - Julian) 到離職的三個分頁
export enum MovementTab {
  OVERVIEW = "OVERVIEW",
  PROBATION = "PROBATION",
  OFFBOARDING = "OFFBOARDING",
}

export const MOVEMENT_TABS: MovementTab[] = [
  MovementTab.OVERVIEW,
  MovementTab.PROBATION,
  MovementTab.OFFBOARDING,
];

export const MOVEMENT_TAB_I18N_KEY: Record<MovementTab, string> = {
  [MovementTab.OVERVIEW]: "hr_management.movement.tab_overview",
  [MovementTab.PROBATION]: "hr_management.movement.tab_probation",
  [MovementTab.OFFBOARDING]: "hr_management.movement.tab_offboarding",
};

// Info: (20260810 - Julian) 概覽的兩種檢視
export enum MovementViewMode {
  KANBAN = "KANBAN",
  LIST = "LIST",
}

export const MOVEMENT_VIEW_MODES: MovementViewMode[] = [
  MovementViewMode.KANBAN,
  MovementViewMode.LIST,
];

export const MOVEMENT_VIEW_MODE_I18N_KEY: Record<MovementViewMode, string> = {
  [MovementViewMode.KANBAN]: "hr_management.movement.view_kanban",
  [MovementViewMode.LIST]: "hr_management.movement.view_list",
};

/**
 * Info: (20260810 - Julian) 看板的四個欄位。
 *
 * 欄位是「由日期推導」出來的，不是資料庫欄位：預備報到＝未來 14 天內到職、
 * 首日報到＝到職第 1～7 天、交接中＝已提離職但未到最後 3 天、待結案＝離職前 3 天內。
 *
 * ToDo: (20260810 - Julian) 使用者手動拖拽會覆寫這個推導結果，目前只存在記憶體。
 * 接 API 後 `OnboardingProcess` / `OffboardingProcess` 需要一個欄位存放人工指定的階段，
 * 否則重整就會被日期規則覆蓋回去。
 */
export enum MovementStage {
  PREPARING = "PREPARING",
  FIRST_WEEK = "FIRST_WEEK",
  HANDOVER = "HANDOVER",
  CLOSING = "CLOSING",
}

export const MOVEMENT_STAGES: MovementStage[] = [
  MovementStage.PREPARING,
  MovementStage.FIRST_WEEK,
  MovementStage.HANDOVER,
  MovementStage.CLOSING,
];

export const MOVEMENT_STAGE_I18N_KEY: Record<MovementStage, string> = {
  [MovementStage.PREPARING]: "hr_management.movement.stage_preparing",
  [MovementStage.FIRST_WEEK]: "hr_management.movement.stage_first_week",
  [MovementStage.HANDOVER]: "hr_management.movement.stage_handover",
  [MovementStage.CLOSING]: "hr_management.movement.stage_closing",
};

// Info: (20260810 - Julian) 看板欄位的頂部色條，用來一眼分辨報到（綠）與離職（琥珀→紅）
export const MOVEMENT_STAGE_ACCENT: Record<MovementStage, string> = {
  [MovementStage.PREPARING]: "bg-sky-300",
  [MovementStage.FIRST_WEEK]: "bg-emerald-300",
  [MovementStage.HANDOVER]: "bg-amber-300",
  [MovementStage.CLOSING]: "bg-rose-300",
};

// Info: (20260810 - Julian) 分欄的天數門檻
export const ONBOARDING_UPCOMING_DAYS = 14;
export const ONBOARDING_FIRST_WEEK_DAYS = 7;
export const OFFBOARDING_CLOSING_DAYS = 3;

/**
 * Info: (20260810 - Julian) 離職交接矩陣的四個負責面向。
 *
 * ToDo: (20260812 - Julian) `OffboardingTask` 沒有分類欄位（見 ADR 019 的欄位清單）。
 * 接 API 前需要在 schema 補 `category`，否則交接清單分不了組。
 */
export enum HandoverCategory {
  WORK = "WORK",
  ASSET = "ASSET",
  IT = "IT",
  HR = "HR",
}

export const HANDOVER_CATEGORIES: HandoverCategory[] = [
  HandoverCategory.WORK,
  HandoverCategory.ASSET,
  HandoverCategory.IT,
  HandoverCategory.HR,
];

export const HANDOVER_CATEGORY_I18N_KEY: Record<HandoverCategory, string> = {
  [HandoverCategory.WORK]: "hr_management.movement.category_work",
  [HandoverCategory.ASSET]: "hr_management.movement.category_asset",
  [HandoverCategory.IT]: "hr_management.movement.category_it",
  [HandoverCategory.HR]: "hr_management.movement.category_hr",
};

/**
 * Info: (20260810 - Julian) 試用期的三個考核節點與其相對到職日的天數。
 *
 * ToDo: (20260810 - Julian) Prisma 的 `ProbationReview` 只有單筆 reviewDate / score /
 * result，存不下三個節點。接 API 前需要拆成多筆或加上節點欄位。
 */
export enum ProbationMilestone {
  CARE_30 = "CARE_30",
  INTERVIEW_60 = "INTERVIEW_60",
  FINAL_85 = "FINAL_85",
}

export const PROBATION_MILESTONES: ProbationMilestone[] = [
  ProbationMilestone.CARE_30,
  ProbationMilestone.INTERVIEW_60,
  ProbationMilestone.FINAL_85,
];

export const PROBATION_MILESTONE_DAYS: Record<ProbationMilestone, number> = {
  [ProbationMilestone.CARE_30]: 30,
  [ProbationMilestone.INTERVIEW_60]: 60,
  [ProbationMilestone.FINAL_85]: 85,
};

export const PROBATION_MILESTONE_I18N_KEY: Record<ProbationMilestone, string> =
  {
    [ProbationMilestone.CARE_30]: "hr_management.movement.milestone_care",
    [ProbationMilestone.INTERVIEW_60]:
      "hr_management.movement.milestone_interview",
    [ProbationMilestone.FINAL_85]: "hr_management.movement.milestone_final",
  };

export const PROBATION_RESULTS: ProbationResult[] = [
  ProbationResult.PASS,
  ProbationResult.EXTEND,
  ProbationResult.FAIL,
];

export const PROBATION_RESULT_I18N_KEY: Record<ProbationResult, string> = {
  [ProbationResult.PASS]: "hr_management.movement.result_pass",
  [ProbationResult.EXTEND]: "hr_management.movement.result_extend",
  [ProbationResult.FAIL]: "hr_management.movement.result_fail",
};

// Info: (20260811 - Julian) 考核結果的配色
export const PROBATION_RESULT_STYLE: Record<ProbationResult, string> = {
  [ProbationResult.PASS]: "bg-emerald-50 text-emerald-700",
  [ProbationResult.EXTEND]: "bg-amber-50 text-amber-700",
  [ProbationResult.FAIL]: "bg-red-50 text-red-600",
};

/**
 * Info: (20260811 - Julian) 考核已完成、但案件還沒結束的結果。
 * 「延長試用」是把試用期推到新的一天，流程還在跑，不能標成可結案。
 */
export const PROBATION_UNSETTLED_RESULTS: ProbationResult[] = [
  ProbationResult.EXTEND,
];

// Info: (20260810 - Julian) 評分區間（1～5 分）
export const PROBATION_SCORE_MIN = 1;
export const PROBATION_SCORE_MAX = 5;

// Info: (20260810 - Julian) 報到列表的快速篩選
export enum OnboardingQuickFilter {
  ALL = "ALL",
  THIS_WEEK = "THIS_WEEK",
  PENDING_EQUIPMENT = "PENDING_EQUIPMENT",
  PENDING_CONTRACT = "PENDING_CONTRACT",
}

export const ONBOARDING_QUICK_FILTERS: OnboardingQuickFilter[] = [
  OnboardingQuickFilter.ALL,
  OnboardingQuickFilter.THIS_WEEK,
  OnboardingQuickFilter.PENDING_EQUIPMENT,
  OnboardingQuickFilter.PENDING_CONTRACT,
];

export const ONBOARDING_QUICK_FILTER_I18N_KEY: Record<
  OnboardingQuickFilter,
  string
> = {
  [OnboardingQuickFilter.ALL]: "hr_management.movement.filter_all",
  [OnboardingQuickFilter.THIS_WEEK]: "hr_management.movement.filter_this_week",
  [OnboardingQuickFilter.PENDING_EQUIPMENT]:
    "hr_management.movement.filter_pending_equipment",
  [OnboardingQuickFilter.PENDING_CONTRACT]:
    "hr_management.movement.filter_pending_contract",
};

// Info: (20260810 - Julian) 報到三項行政事宜的狀態，對應表格的三個欄位
export enum ChecklistState {
  DONE = "DONE",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING = "PENDING",
}

export const CHECKLIST_STATE_I18N_KEY: Record<ChecklistState, string> = {
  [ChecklistState.DONE]: "hr_management.movement.state_done",
  [ChecklistState.IN_PROGRESS]: "hr_management.movement.state_in_progress",
  [ChecklistState.PENDING]: "hr_management.movement.state_pending",
};

export const CHECKLIST_STATE_STYLE: Record<ChecklistState, string> = {
  [ChecklistState.DONE]: "bg-emerald-50 text-emerald-700",
  [ChecklistState.IN_PROGRESS]: "bg-amber-50 text-amber-700",
  [ChecklistState.PENDING]: "bg-gray-100 text-gray-500",
};

// Info: (20260810 - Julian) 離職清單的兩種檢視
export enum OffboardingListMode {
  ACTIVE = "ACTIVE",
  HISTORY = "HISTORY",
}

export const OFFBOARDING_LIST_MODES: OffboardingListMode[] = [
  OffboardingListMode.ACTIVE,
  OffboardingListMode.HISTORY,
];

export const OFFBOARDING_LIST_MODE_I18N_KEY: Record<
  OffboardingListMode,
  string
> = {
  [OffboardingListMode.ACTIVE]: "hr_management.movement.offboarding_active",
  [OffboardingListMode.HISTORY]: "hr_management.movement.offboarding_history",
};

/**
 * Info: (20260810 - Julian) 勞基法第 16 條的預告期門檻（天）。
 * 三個月以上未滿一年 10 天、一年以上未滿三年 20 天、三年以上 30 天。
 */
export const NOTICE_PERIOD_RULES = [
  { minTenureMonths: 36, days: 30 },
  { minTenureMonths: 12, days: 20 },
  { minTenureMonths: 3, days: 10 },
  { minTenureMonths: 0, days: 0 },
];

/**
 * Info: (20260810 - Julian) 任務範本鍵值，對應 `OnboardingTask.templateKey`。
 *
 * ToDo: (20260812 - Julian) DB 端目前只約束成 `String?`，值域由這裡約定。
 * 範本改成可由使用者維護時，`templateKey` 要改成指向範本表的外鍵。
 */
export enum OnboardingTaskKey {
  FORM = "ONBOARDING_FORM",
  CONTRACT = "ONBOARDING_CONTRACT",
  ACCOUNT = "ONBOARDING_ACCOUNT",
  LAPTOP = "ONBOARDING_LAPTOP",
  BADGE = "ONBOARDING_BADGE",
  ORIENTATION = "ONBOARDING_ORIENTATION",
  DEV_ACCESS = "ONBOARDING_DEV_ACCESS",
  CRM_ACCESS = "ONBOARDING_CRM_ACCESS",
}

// Info: (20260812 - Julian) 任務標題。存進 `OnboardingTask.title` 的是這裡解析後的字串
export const ONBOARDING_TASK_TITLE_I18N_KEY: Record<OnboardingTaskKey, string> =
  {
    [OnboardingTaskKey.FORM]: "hr_management.onboarding.task_form",
    [OnboardingTaskKey.CONTRACT]: "hr_management.onboarding.task_contract",
    [OnboardingTaskKey.ACCOUNT]: "hr_management.onboarding.task_account",
    [OnboardingTaskKey.LAPTOP]: "hr_management.onboarding.task_laptop",
    [OnboardingTaskKey.BADGE]: "hr_management.onboarding.task_badge",
    [OnboardingTaskKey.ORIENTATION]:
      "hr_management.onboarding.task_orientation",
    [OnboardingTaskKey.DEV_ACCESS]: "hr_management.onboarding.task_dev_access",
    [OnboardingTaskKey.CRM_ACCESS]: "hr_management.onboarding.task_crm_access",
  };

/**
 * Info: (20260812 - Julian) 發起報到時的三個自動化開關。
 *
 * 不是「要不要顯示這一區」，而是「要不要建立那幾筆任務」。
 * 取消勾選採「不建立」而不是「建立後標 SKIPPED」——
 * `ProcessTaskStatus.SKIPPED` 在 `isTaskDone` 裡視同完成，
 * 標 SKIPPED 會讓沒準備電腦的新人顯示 IT 進度 100%。
 */
export enum OnboardingTrigger {
  IT_SETUP = "IT_SETUP",
  FACILITY_SETUP = "FACILITY_SETUP",
  PREONBOARDING_FORM = "PREONBOARDING_FORM",
}

export const ONBOARDING_TRIGGERS: OnboardingTrigger[] = [
  OnboardingTrigger.IT_SETUP,
  OnboardingTrigger.FACILITY_SETUP,
  OnboardingTrigger.PREONBOARDING_FORM,
];

export const ONBOARDING_TRIGGER_I18N_KEY: Record<OnboardingTrigger, string> = {
  [OnboardingTrigger.IT_SETUP]: "hr_management.onboarding.trigger_it",
  [OnboardingTrigger.FACILITY_SETUP]:
    "hr_management.onboarding.trigger_facility",
  [OnboardingTrigger.PREONBOARDING_FORM]:
    "hr_management.onboarding.trigger_form",
};

/**
 * Info: (20260812 - Julian) 報到範本。三份的差別只在 IT 要開哪些系統權限。
 *
 * ToDo: (20260812 - Julian) 真實系統的範本應該可由 HR 自行維護（範本表 + 明細表），
 * 這裡先寫死三份，讓「選了不同範本會產生不同任務」這條路徑成立。
 */
export enum OnboardingTemplateKey {
  GENERAL = "GENERAL",
  ENGINEERING = "ENGINEERING",
  SALES = "SALES",
}

export const ONBOARDING_TEMPLATE_KEYS: OnboardingTemplateKey[] = [
  OnboardingTemplateKey.GENERAL,
  OnboardingTemplateKey.ENGINEERING,
  OnboardingTemplateKey.SALES,
];

export const ONBOARDING_TEMPLATE_I18N_KEY: Record<
  OnboardingTemplateKey,
  string
> = {
  [OnboardingTemplateKey.GENERAL]: "hr_management.onboarding.template_general",
  [OnboardingTemplateKey.ENGINEERING]:
    "hr_management.onboarding.template_engineering",
  [OnboardingTemplateKey.SALES]: "hr_management.onboarding.template_sales",
};

/**
 * Info: (20260812 - Julian) 三份範本共用的六項，陣列順序即畫面順序。
 *
 * 排序依負責單位分組（HR → IT → 總務 → 用人部門）而不是依到期日 ——
 * 這份清單的讀者是各單位窗口，他們找的是「我要做哪幾件」，
 * 不是「今天該做哪一件」。到期日另外顯示在每一列上。
 */
const ONBOARDING_COMMON_TASKS = [
  {
    key: OnboardingTaskKey.FORM,
    category: HandoverCategory.HR,
    dueOffset: -3,
    trigger: null,
  },
  {
    key: OnboardingTaskKey.CONTRACT,
    category: HandoverCategory.HR,
    dueOffset: 1,
    trigger: null,
  },
  {
    key: OnboardingTaskKey.ACCOUNT,
    category: HandoverCategory.IT,
    dueOffset: 0,
    trigger: OnboardingTrigger.IT_SETUP,
  },
  {
    key: OnboardingTaskKey.LAPTOP,
    category: HandoverCategory.IT,
    dueOffset: 0,
    trigger: OnboardingTrigger.IT_SETUP,
  },
  {
    key: OnboardingTaskKey.BADGE,
    category: HandoverCategory.ASSET,
    dueOffset: 1,
    trigger: OnboardingTrigger.FACILITY_SETUP,
  },
  {
    key: OnboardingTaskKey.ORIENTATION,
    category: HandoverCategory.WORK,
    dueOffset: 3,
    trigger: null,
  },
];

/**
 * Info: (20260812 - Julian) 職務別的系統權限插在 IT 那一組的最後，而不是接在整份清單後面。
 *
 * 位置用 `findIndex` 算而不是寫死索引：共用清單將來多一項或少一項，
 * 這裡不會安靜地把研發權限插到總務那一組去。
 */
const ONBOARDING_IT_GROUP_END =
  ONBOARDING_COMMON_TASKS.findIndex(
    (task) => task.key === OnboardingTaskKey.LAPTOP,
  ) + 1;

const withRoleAccess = (
  key: OnboardingTaskKey,
): (typeof ONBOARDING_COMMON_TASKS)[number][] => [
  ...ONBOARDING_COMMON_TASKS.slice(0, ONBOARDING_IT_GROUP_END),
  {
    key,
    category: HandoverCategory.IT,
    dueOffset: 1,
    trigger: OnboardingTrigger.IT_SETUP,
  },
  ...ONBOARDING_COMMON_TASKS.slice(ONBOARDING_IT_GROUP_END),
];

export const ONBOARDING_TEMPLATES: Record<
  OnboardingTemplateKey,
  (typeof ONBOARDING_COMMON_TASKS)[number][]
> = {
  [OnboardingTemplateKey.GENERAL]: ONBOARDING_COMMON_TASKS,
  [OnboardingTemplateKey.ENGINEERING]: withRoleAccess(
    OnboardingTaskKey.DEV_ACCESS,
  ),
  [OnboardingTemplateKey.SALES]: withRoleAccess(OnboardingTaskKey.CRM_ACCESS),
};

/**
 * Info: (20260812 - Julian) 各分類的預設經辦窗口。
 *
 * ToDo: (20260812 - Julian) 真實系統應由部門設定決定（每個部門的 IT / 總務窗口不同），
 * 且應存 `assigneeId` 而不是姓名 —— 目前 `IProcessTask` 只有姓名，改名就對不上了。
 */
export const ONBOARDING_ASSIGNEE_BY_CATEGORY: Record<HandoverCategory, string> =
  {
    [HandoverCategory.HR]: "林巧芯",
    [HandoverCategory.IT]: "許庭瑋",
    [HandoverCategory.ASSET]: "蔡宜臻",
    [HandoverCategory.WORK]: "蔡宜臻",
  };

/**
 * Info: (20260812 - Julian) 工號格式。自動帶號與格式驗證共用同一份。
 */
export const EMPLOYEE_NO_PREFIX = "EMP";
export const EMPLOYEE_NO_DIGITS = 3;
export const EMPLOYEE_NO_PATTERN = /^EMP\d{3,}$/;

/**
 * Info: (20260812 - Julian) Email 與台灣手機號碼的格式檢查。
 *
 * 兩者都刻意寬鬆：Email 只擋「明顯不是 Email」的輸入（沒有 @ 或沒有網域）。
 *
 * Info: (20260813 - Julian) 手機號碼要求 10 個數字，分隔符只是可選的裝飾。
 *
 * 原本寫成 `/^09[\d\-\s]{8,12}$/`，把數字與分隔符放進同一個字元集，
 * 於是 `09--------` 這種一個數字都沒有的輸入也會通過 —— 而它接著會被
 * `maskPiiTail` 原樣存進 `maskedPhone`（可見字元不足 3 碼時遮不掉任何東西），
 * 變成一筆沒有任何後續檢查會攔的無效電話。
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const TW_MOBILE_PATTERN = /^09\d{2}[-\s]?\d{3}[-\s]?\d{3}$/;

// Info: (20260811 - Julian) 離職交接的任務範本鍵值
export enum OffboardingTaskKey {
  DOCUMENT_HANDOVER = "OFFBOARDING_DOCUMENT_HANDOVER",
  CUSTOMER_HANDOVER = "OFFBOARDING_CUSTOMER_HANDOVER",
  HANDOVER_APPROVAL = "OFFBOARDING_HANDOVER_APPROVAL",
  ACCESS_CARD = "OFFBOARDING_ACCESS_CARD",
  CAR_KEY = "OFFBOARDING_CAR_KEY",
  LAPTOP_RETURN = "OFFBOARDING_LAPTOP_RETURN",
  MONITOR_RETURN = "OFFBOARDING_MONITOR_RETURN",
  ACCOUNT_REVOKE = "OFFBOARDING_ACCOUNT_REVOKE",
  VPN_REVOKE = "OFFBOARDING_VPN_REVOKE",
  LABOR_INSURANCE = "OFFBOARDING_LABOR_INSURANCE",
  HEALTH_INSURANCE = "OFFBOARDING_HEALTH_INSURANCE",
  PENSION_STOP = "OFFBOARDING_PENSION_STOP",
  CERTIFICATE = "OFFBOARDING_CERTIFICATE",
  CODE_HANDOVER = "OFFBOARDING_CODE_HANDOVER",
  PIPELINE_HANDOVER = "OFFBOARDING_PIPELINE_HANDOVER",
  LAYOFF_REPORT = "OFFBOARDING_LAYOFF_REPORT",
}

// Info: (20260812 - Julian) 任務標題。存進 `OffboardingTask.title` 的是這裡解析後的字串
export const OFFBOARDING_TASK_TITLE_I18N_KEY: Record<
  OffboardingTaskKey,
  string
> = {
  [OffboardingTaskKey.DOCUMENT_HANDOVER]:
    "hr_management.offboarding.task_document_handover",
  [OffboardingTaskKey.CUSTOMER_HANDOVER]:
    "hr_management.offboarding.task_customer_handover",
  [OffboardingTaskKey.HANDOVER_APPROVAL]:
    "hr_management.offboarding.task_handover_approval",
  [OffboardingTaskKey.ACCESS_CARD]:
    "hr_management.offboarding.task_access_card",
  [OffboardingTaskKey.CAR_KEY]: "hr_management.offboarding.task_car_key",
  [OffboardingTaskKey.LAPTOP_RETURN]:
    "hr_management.offboarding.task_laptop_return",
  [OffboardingTaskKey.MONITOR_RETURN]:
    "hr_management.offboarding.task_monitor_return",
  [OffboardingTaskKey.ACCOUNT_REVOKE]:
    "hr_management.offboarding.task_account_revoke",
  [OffboardingTaskKey.VPN_REVOKE]: "hr_management.offboarding.task_vpn_revoke",
  [OffboardingTaskKey.LABOR_INSURANCE]:
    "hr_management.offboarding.task_labor_insurance",
  [OffboardingTaskKey.HEALTH_INSURANCE]:
    "hr_management.offboarding.task_health_insurance",
  [OffboardingTaskKey.PENSION_STOP]:
    "hr_management.offboarding.task_pension_stop",
  [OffboardingTaskKey.CERTIFICATE]:
    "hr_management.offboarding.task_certificate",
  [OffboardingTaskKey.CODE_HANDOVER]:
    "hr_management.offboarding.task_code_handover",
  [OffboardingTaskKey.PIPELINE_HANDOVER]:
    "hr_management.offboarding.task_pipeline_handover",
  [OffboardingTaskKey.LAYOFF_REPORT]:
    "hr_management.offboarding.task_layoff_report",
};

/**
 * Info: (20260812 - Julian) 離職的「法律類型」，對齊 Prisma enum ResignationType。
 *
 * 與 `ResignationReason`（個人原因）是兩個軸：原因是「為什麼走」，
 * 類型是「依什麼法律關係終止」，只有後者會產生資遣費與通報義務。
 *
 * 最實際的差別在預告期：勞基法第 16 條的預告是「雇主資遣勞工」時的義務，
 * 第 15 條讓勞工自請離職時準用同一組天數（方向相反、天數相同）；
 * 而定期契約期滿不續約根本不適用預告期 —— 契約本來就到那天為止。
 * 三者用同一張表算，會讓約聘期滿的人被標成「預告期不足」。
 */
export enum ResignationType {
  VOLUNTARY = "VOLUNTARY",
  LAYOFF = "LAYOFF",
  CONTRACT_END = "CONTRACT_END",
}

export const RESIGNATION_TYPES: ResignationType[] = [
  ResignationType.VOLUNTARY,
  ResignationType.LAYOFF,
  ResignationType.CONTRACT_END,
];

export const RESIGNATION_TYPE_I18N_KEY: Record<ResignationType, string> = {
  [ResignationType.VOLUNTARY]: "hr_management.offboarding.type_voluntary",
  [ResignationType.LAYOFF]: "hr_management.offboarding.type_layoff",
  [ResignationType.CONTRACT_END]: "hr_management.offboarding.type_contract_end",
};

/**
 * Info: (20260812 - Julian) 離職交接範本。GENERAL 就是原本那 13 項，順序不變 ——
 * 既有 mock 的 `skipIndexes` 是依索引挑的，改順序會讓每個人的進度整批位移。
 */
export enum OffboardingTemplateKey {
  GENERAL = "GENERAL",
  ENGINEERING = "ENGINEERING",
  SALES = "SALES",
}

export const OFFBOARDING_TEMPLATE_KEYS: OffboardingTemplateKey[] = [
  OffboardingTemplateKey.GENERAL,
  OffboardingTemplateKey.ENGINEERING,
  OffboardingTemplateKey.SALES,
];

export const OFFBOARDING_TEMPLATE_I18N_KEY: Record<
  OffboardingTemplateKey,
  string
> = {
  [OffboardingTemplateKey.GENERAL]:
    "hr_management.offboarding.template_general",
  [OffboardingTemplateKey.ENGINEERING]:
    "hr_management.offboarding.template_engineering",
  [OffboardingTemplateKey.SALES]: "hr_management.offboarding.template_sales",
};

/**
 * Info: (20260812 - Julian) 離職各分類的預設經辦窗口。
 *
 * 與報到那份的差別只在 WORK：報到的「部門介紹」是總務排的，
 * 離職的「工作交接」則由用人主管驗收。共用一份會讓其中一邊指派錯人。
 *
 * ToDo: (20260812 - Julian) 同報到端：真實系統應由部門設定決定，且存 id 不存姓名。
 */
export const OFFBOARDING_ASSIGNEE_BY_CATEGORY: Record<
  HandoverCategory,
  string
> = {
  [HandoverCategory.WORK]: "王大明",
  [HandoverCategory.ASSET]: "蔡宜臻",
  [HandoverCategory.IT]: "許庭瑋",
  [HandoverCategory.HR]: "林巧芯",
};

/**
 * Info: (20260812 - Julian) 三份範本共用的十三項，陣列順序即畫面順序。
 *
 * `assetPrefix` 有值的是實體資產，會出現在資產回收表並依員工產生序號；
 * `isScheduled` 為真的是排程停權，顯示的是預定生效時間而不是完成日 ——
 * 停權由排程執行，「今天勾了」與「幾點生效」是兩件不同的事。
 */
const OFFBOARDING_COMMON_TASKS = [
  {
    key: OffboardingTaskKey.DOCUMENT_HANDOVER,
    category: HandoverCategory.WORK,
    dueOffset: -7,
    assetPrefix: null as string | null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.CUSTOMER_HANDOVER,
    category: HandoverCategory.WORK,
    dueOffset: -5,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.HANDOVER_APPROVAL,
    category: HandoverCategory.WORK,
    dueOffset: -3,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.ACCESS_CARD,
    category: HandoverCategory.ASSET,
    dueOffset: 0,
    assetPrefix: "ID-",
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.CAR_KEY,
    category: HandoverCategory.ASSET,
    dueOffset: 0,
    assetPrefix: "KEY-",
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.LAPTOP_RETURN,
    category: HandoverCategory.IT,
    dueOffset: 0,
    assetPrefix: "C02X",
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.MONITOR_RETURN,
    category: HandoverCategory.IT,
    dueOffset: 0,
    assetPrefix: "MON-",
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.ACCOUNT_REVOKE,
    category: HandoverCategory.IT,
    dueOffset: 0,
    assetPrefix: null,
    isScheduled: true,
  },
  {
    key: OffboardingTaskKey.VPN_REVOKE,
    category: HandoverCategory.IT,
    dueOffset: 0,
    assetPrefix: null,
    isScheduled: true,
  },
  {
    key: OffboardingTaskKey.LABOR_INSURANCE,
    category: HandoverCategory.HR,
    dueOffset: 3,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.HEALTH_INSURANCE,
    category: HandoverCategory.HR,
    dueOffset: 3,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.PENSION_STOP,
    category: HandoverCategory.HR,
    dueOffset: 3,
    assetPrefix: null,
    isScheduled: false,
  },
  {
    key: OffboardingTaskKey.CERTIFICATE,
    category: HandoverCategory.HR,
    dueOffset: 1,
    assetPrefix: null,
    isScheduled: false,
  },
];

/**
 * Info: (20260812 - Julian) 職務別的交接項目插在「主管驗收」之前。
 *
 * 位置用 `findIndex` 算而不是寫死：驗收的定義是「上面那些都做完了」，
 * 排到它後面的項目等於沒有被驗收到，而那不會有任何地方報錯。
 */
const OFFBOARDING_APPROVAL_INDEX = OFFBOARDING_COMMON_TASKS.findIndex(
  (task) => task.key === OffboardingTaskKey.HANDOVER_APPROVAL,
);

const withRoleHandover = (
  key: OffboardingTaskKey,
): (typeof OFFBOARDING_COMMON_TASKS)[number][] => [
  ...OFFBOARDING_COMMON_TASKS.slice(0, OFFBOARDING_APPROVAL_INDEX),
  {
    key,
    category: HandoverCategory.WORK,
    dueOffset: -5,
    assetPrefix: null,
    isScheduled: false,
  },
  ...OFFBOARDING_COMMON_TASKS.slice(OFFBOARDING_APPROVAL_INDEX),
];

/**
 * Info: (20260812 - Julian) 資遣通報的法定期限：離職生效日前 10 天（就業服務法第 33 條）。
 *
 * ToDo: (20260812 - Julian) 天災事變等立即終止的情形是「離職日起 3 日內」，
 * 期限方向相反。目前沒有欄位可以表示那種情形，補上時這個常數要跟著分岔。
 */
export const LAYOFF_REPORT_DUE_OFFSET = -10;

/**
 * Info: (20260812 - Julian) 只有資遣才會產生的通報任務，不屬於任何範本。
 *
 * 它由離職類型決定而不是由範本決定，所以不放進 `OFFBOARDING_TEMPLATES` ——
 * 三份範本各塞一份等於同一件事寫三次，而漏掉其中一份沒有任何地方會報錯。
 *
 * 自請離職與契約期滿沒有這個義務，硬塞一筆永遠不用做的任務，
 * 人會學會忽略它，然後連該做的那次也一起忽略。
 *
 * ToDo: (20260812 - Julian) 資遣還有第二個有期限的法定義務：資遣費應於
 * 終止勞動契約後 30 日內發給（勞退條例第 12 條第 2 項）。它應該用同一個模式
 * 做成 `SEVERANCE_PAYMENT`（dueOffset +30、同樣只在 LAYOFF 產生）——
 * 待決事項與資遣費試算的整體設計見 ADR 020 §5.2。
 */
export const OFFBOARDING_LAYOFF_REPORT_TASK = {
  key: OffboardingTaskKey.LAYOFF_REPORT,
  category: HandoverCategory.HR,
  dueOffset: LAYOFF_REPORT_DUE_OFFSET,
  assetPrefix: null as string | null,
  isScheduled: false,
};

export const OFFBOARDING_TEMPLATES: Record<
  OffboardingTemplateKey,
  (typeof OFFBOARDING_COMMON_TASKS)[number][]
> = {
  [OffboardingTemplateKey.GENERAL]: OFFBOARDING_COMMON_TASKS,
  [OffboardingTemplateKey.ENGINEERING]: withRoleHandover(
    OffboardingTaskKey.CODE_HANDOVER,
  ),
  [OffboardingTemplateKey.SALES]: withRoleHandover(
    OffboardingTaskKey.PIPELINE_HANDOVER,
  ),
};

/**
 * Info: (20260811 - Julian) 會被畫成「資產回收表」一列的任務。
 * 帳號停權雖然也歸 IT，但它沒有實體可以回收、也沒有序號，
 * 因此走「停權設定」而不是資產表。
 */
export const OFFBOARDING_ASSET_KEYS: string[] = [
  OffboardingTaskKey.LAPTOP_RETURN,
  OffboardingTaskKey.MONITOR_RETURN,
  OffboardingTaskKey.ACCESS_CARD,
  OffboardingTaskKey.CAR_KEY,
];

// Info: (20260811 - Julian) 走「自動停權時間」設定的任務
export const OFFBOARDING_REVOKE_KEYS: string[] = [
  OffboardingTaskKey.ACCOUNT_REVOKE,
  OffboardingTaskKey.VPN_REVOKE,
];

/**
 * Info: (20260811 - Julian) 主管驗收也是一筆任務，不是 Modal 裡的一個旗標。
 * 只活在表單裡的話，案件完成度（由任務推導）會跟交接進度對不起來，
 * 可能出現「已結案，但工作交接 67%」這種自相矛盾的一列。
 */
export const OFFBOARDING_APPROVAL_KEY: string =
  OffboardingTaskKey.HANDOVER_APPROVAL;

// Info: (20260811 - Julian) 三項退保申報，各自一張表、各自一個生效日
export const OFFBOARDING_INSURANCE_KEYS: string[] = [
  OffboardingTaskKey.LABOR_INSURANCE,
  OffboardingTaskKey.HEALTH_INSURANCE,
  OffboardingTaskKey.PENSION_STOP,
];

/**
 * Info: (20260811 - Julian) 帳號停權的預設時間：離職日當天 18:00。
 *
 * 不用 23:59 是因為最後一天下班後就不該再進得去系統，
 * 而把停權排在午夜等於多給了一個沒人看著的空窗。
 */
export const ACCOUNT_REVOKE_DEFAULT_TIME = "18:00";

/**
 * Info: (20260811 - Julian) 離職流程 Modal 的四個分頁。
 *
 * 分頁順序就是流程順序：先確認離職本身成立（原因與預告期），
 * 再交接工作、收回資產，最後才是 HR 結算。倒過來做的話，
 * 會出現「證明書都發了才發現預告期不足」的情形。
 */
export enum OffboardingModalTab {
  APPLICATION = "APPLICATION",
  HANDOVER = "HANDOVER",
  ASSET = "ASSET",
  FINALIZATION = "FINALIZATION",
}

export const OFFBOARDING_MODAL_TABS: OffboardingModalTab[] = [
  OffboardingModalTab.APPLICATION,
  OffboardingModalTab.HANDOVER,
  OffboardingModalTab.ASSET,
  OffboardingModalTab.FINALIZATION,
];

export const OFFBOARDING_MODAL_TAB_I18N_KEY: Record<
  OffboardingModalTab,
  string
> = {
  [OffboardingModalTab.APPLICATION]:
    "hr_management.offboarding.tab_application",
  [OffboardingModalTab.HANDOVER]: "hr_management.offboarding.tab_handover",
  [OffboardingModalTab.ASSET]: "hr_management.offboarding.tab_asset",
  [OffboardingModalTab.FINALIZATION]:
    "hr_management.offboarding.tab_finalization",
};

/**
 * Info: (20260811 - Julian) 離職原因。
 * 資遣與自願離職在法律上是兩件事（資遣要發資遣費、要通報）。
 *
 * ToDo: (20260811 - Julian) Prisma 的 `OffboardingProcess.reason` 是自由字串，
 * 接 API 前應改成 enum，否則統計離職原因時每個人的拼法都不一樣。
 */
export enum ResignationReason {
  CAREER = "CAREER",
  HEALTH = "HEALTH",
  NEW_JOB = "NEW_JOB",
  LAYOFF = "LAYOFF",
  OTHER = "OTHER",
}

export const RESIGNATION_REASONS: ResignationReason[] = [
  ResignationReason.CAREER,
  ResignationReason.HEALTH,
  ResignationReason.NEW_JOB,
  ResignationReason.LAYOFF,
  ResignationReason.OTHER,
];

export const RESIGNATION_REASON_I18N_KEY: Record<ResignationReason, string> = {
  [ResignationReason.CAREER]: "hr_management.offboarding.reason_career",
  [ResignationReason.HEALTH]: "hr_management.offboarding.reason_health",
  [ResignationReason.NEW_JOB]: "hr_management.offboarding.reason_new_job",
  [ResignationReason.LAYOFF]: "hr_management.offboarding.reason_layoff",
  [ResignationReason.OTHER]: "hr_management.offboarding.reason_other",
};

/**
 * Info: (20260812 - Julian) 由類型推出離職原因的預設值。
 *
 * 兩者不是同一件事，但選了類型之後原因的合理起點是確定的 ——
 * 讓離職流程 Modal 的原因下拉有個對的初值，而不是一個與類型矛盾的值
 * （「公司資遣」配上「生涯規劃」）。使用者仍可在那裡改成更精確的原因。
 */
export const RESIGNATION_TYPE_DEFAULT_REASON: Record<
  ResignationType,
  ResignationReason
> = {
  [ResignationType.VOLUNTARY]: ResignationReason.CAREER,
  [ResignationType.LAYOFF]: ResignationReason.LAYOFF,
  [ResignationType.CONTRACT_END]: ResignationReason.OTHER,
};

// Info: (20260811 - Julian) 工作交接項目的狀態：未完成／已交接
export enum HandoverItemState {
  PENDING = "PENDING",
  DONE = "DONE",
}

export const HANDOVER_ITEM_STATE_I18N_KEY: Record<HandoverItemState, string> = {
  [HandoverItemState.PENDING]: "hr_management.offboarding.item_pending",
  [HandoverItemState.DONE]: "hr_management.offboarding.item_done",
};

export const HANDOVER_ITEM_STATE_STYLE: Record<HandoverItemState, string> = {
  [HandoverItemState.PENDING]: "bg-gray-100 text-gray-500",
  [HandoverItemState.DONE]: "bg-emerald-50 text-emerald-700",
};

/**
 * Info: (20260811 - Julian) 離職證明書的三個狀態。
 *
 * 「已預覽」單獨成一態是因為它代表 HR 看過內容但還沒寄出 ——
 * 少了這一態，畫面上只有「未發放」，HR 無從分辨是還沒做還是做到一半。
 */
export enum CertificateState {
  NOT_ISSUED = "NOT_ISSUED",
  PREVIEWED = "PREVIEWED",
  SENT = "SENT",
}

export const CERTIFICATE_STATE_I18N_KEY: Record<CertificateState, string> = {
  [CertificateState.NOT_ISSUED]: "hr_management.offboarding.certificate_none",
  [CertificateState.PREVIEWED]:
    "hr_management.offboarding.certificate_previewed",
  [CertificateState.SENT]: "hr_management.offboarding.certificate_sent",
};

export const CERTIFICATE_STATE_STYLE: Record<CertificateState, string> = {
  [CertificateState.NOT_ISSUED]: "bg-gray-100 text-gray-500",
  [CertificateState.PREVIEWED]: "bg-amber-50 text-amber-700",
  [CertificateState.SENT]: "bg-emerald-50 text-emerald-700",
};

/**
 * Info: (20260811 - Julian) 未休特休折算工資的分母。
 *
 * 勞基法施行細則第 24-1 條：一日工資 = 月薪 ÷ 30。
 * 這個 30 是法定的固定數，不是「一個月大約幾天」，因此寫成常數而不是取當月天數。
 */
export const MONTHLY_PAYROLL_DAYS = 30;

/**
 * Info: (20260812 - Julian) 尚未開發的動作按鈕。
 *
 * 側邊選單早就用灰字加 `cursor-not-allowed` 表示「這一頁還沒有」，
 * 這裡沿用同一種說法，只是換成 button 的 `disabled` 變體 ——
 * 一個看起來能按、按下去沒反應的按鈕，比一個明講還沒好的按鈕糟。
 *
 * ToDo: (20260812 - Julian) 各自的 API 或頁面完成後，連同 `disabled`
 * 與 `title` 一起移除，不要留著這個樣式當長期狀態。
 */
export const HR_PENDING_ACTION_CLASS =
  "disabled:cursor-not-allowed disabled:border-gray-100 disabled:bg-gray-50 disabled:text-gray-300 disabled:shadow-none";

/**
 * Info: (20260812 - Julian) 從儀表板深連到到離職頁的試用期分頁。
 *
 * 用 hash 而不是 query string：兩個頁面都是 client component，
 * 讀 query 要走 `useSearchParams`，那在 Next 15 需要 Suspense 邊界才過得了預渲染。
 * hash 不進伺服器請求，`useEffect` 讀就好，沒有那個限制。
 */
export const MOVEMENT_HASH_PROBATION = "probation";

/**
 * Info: (20260811 - Julian) 人事模組表單輸入框的共用樣式。
 * 抽成常數是因為它已經被三個 Modal 各抄了一份，
 * 而抄本之間的 focus 樣式已經開始不一樣了。
 */
export const HR_INPUT_CLASS =
  "rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-all placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none";

// Info: (20260810 - Julian) 報到列表三個欄位各自看哪些任務；IT 欄同時看帳號與筆電
export const ONBOARDING_FORM_KEYS: string[] = [OnboardingTaskKey.FORM];
export const ONBOARDING_CONTRACT_KEYS: string[] = [OnboardingTaskKey.CONTRACT];
export const ONBOARDING_EQUIPMENT_KEYS: string[] = [
  OnboardingTaskKey.ACCOUNT,
  OnboardingTaskKey.LAPTOP,
];

/**
 * Info: (20260810 - Julian) 案件的自動化警示等級。
 *
 * 紅色「非常重要，現在就會出事」，如：離職日在三天內但 IT 帳號還沒停權、試用期已過卻沒人考核。
 * 綠色「可以結案」。
 * 其餘皆為黃色。
 * 判斷收斂在 `resolveCaseAlert`各畫面只負責上色，不各自判斷。
 */
export enum MovementAlertLevel {
  URGENT = "URGENT",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
}

export const MOVEMENT_ALERT_STYLE: Record<MovementAlertLevel, string> = {
  [MovementAlertLevel.URGENT]: "bg-red-50 text-red-600 ring-red-200",
  [MovementAlertLevel.IN_PROGRESS]: "bg-amber-50 text-amber-700 ring-amber-200",
  [MovementAlertLevel.COMPLETED]:
    "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

/**
 * Info: (20260810 - Julian) 警示原因。
 *
 * 徽章上顯示原因而不是「緊急」兩個字 —— 使用者要知道的是該做什麼，
 * 而「IT 帳號未停權」本身就是那件待辦。
 */
export enum MovementAlertReason {
  IT_ACCOUNT_PENDING = "IT_ACCOUNT_PENDING",
  PROBATION_OVERDUE = "PROBATION_OVERDUE",
  READY_TO_CLOSE = "READY_TO_CLOSE",
  /**
   * Info: (20260811 - Julian) 離職全部完成 = 已結案，不是「可結案」。
   * 報到做完人還在，離職勾完最後一項，案件就結束了。
   */
  SETTLED = "SETTLED",
  IN_PROGRESS = "IN_PROGRESS",
}

export const MOVEMENT_ALERT_REASON_I18N_KEY: Record<
  MovementAlertReason,
  string
> = {
  [MovementAlertReason.IT_ACCOUNT_PENDING]:
    "hr_management.movement.alert_it_account",
  [MovementAlertReason.PROBATION_OVERDUE]:
    "hr_management.movement.alert_probation_overdue",
  [MovementAlertReason.READY_TO_CLOSE]: "hr_management.movement.alert_ready",
  [MovementAlertReason.SETTLED]: "hr_management.movement.alert_settled",
  [MovementAlertReason.IN_PROGRESS]: "hr_management.movement.alert_in_progress",
};

/**
 * Info: (20260811 - Julian) 試用期考核的四個評分項。
 *
 * ToDo: (20260811 - Julian) Prisma 的 `ProbationReview` 只有單一 `score`，
 * 存不下四個分項。接 API 前需要拆成子表或改成 JSON 欄位，
 * 否則主管填的四個分數只會剩下一個平均值，事後無法回頭看是哪一項不足。
 */
export enum ProbationScoreItem {
  PROFESSIONAL = "PROFESSIONAL",
  TEAMWORK = "TEAMWORK",
  INITIATIVE = "INITIATIVE",
  DISCIPLINE = "DISCIPLINE",
}

export const PROBATION_SCORE_ITEMS: ProbationScoreItem[] = [
  ProbationScoreItem.PROFESSIONAL,
  ProbationScoreItem.TEAMWORK,
  ProbationScoreItem.INITIATIVE,
  ProbationScoreItem.DISCIPLINE,
];

export const PROBATION_SCORE_ITEM_I18N_KEY: Record<ProbationScoreItem, string> =
  {
    [ProbationScoreItem.PROFESSIONAL]:
      "hr_management.movement.score_professional",
    [ProbationScoreItem.TEAMWORK]: "hr_management.movement.score_teamwork",
    [ProbationScoreItem.INITIATIVE]: "hr_management.movement.score_initiative",
    [ProbationScoreItem.DISCIPLINE]: "hr_management.movement.score_discipline",
  };

/**
 * Info: (20260811 - Julian) 通過轉正的預設生效日 = 試用期滿日的隔天。
 * 試用期最後一天仍屬試用，轉正從次日起算；主管仍可在表單上改。
 */
export const PROBATION_EFFECTIVE_DAY_OFFSET = 1;
