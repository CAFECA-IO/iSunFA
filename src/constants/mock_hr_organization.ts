import { IDepartment, IJobTitle } from "@/interfaces/hr_management";

/**
 * ToDo: (20260810 - Julian) 待 `/api/v1/hr/department`、`/api/v1/hr/job_title`
 * 上線後移除，改由 API 取得。
 *
 * 刻意做成三層（總經理室 → 部門 → 組），而不是一層攤平：
 * 樹狀 UI 的縮排、連線與「含子部門人數」在只有一層時全都看不出對錯，
 * mock 要能踩到真實資料會踩到的形狀。
 */
export const MOCK_HR_DEPARTMENTS: IDepartment[] = [
  {
    id: "dep-000",
    code: "DEP-000",
    name: "總經理室",
    description: "公司最高決策單位",
    parentId: null,
    managerId: "emp-000",
  },
  {
    id: "dep-001",
    code: "DEP-001",
    name: "技術部",
    description: "產品研發與系統維運",
    parentId: "dep-000",
    managerId: "emp-001",
  },
  {
    id: "dep-101",
    code: "DEP-101",
    name: "前端組",
    description: "網頁與行動端介面開發",
    parentId: "dep-001",
    managerId: "emp-002",
  },
  {
    id: "dep-102",
    code: "DEP-102",
    name: "後端組",
    description: "API、資料庫與資料管線",
    parentId: "dep-001",
    managerId: null,
  },
  {
    id: "dep-002",
    code: "DEP-002",
    name: "財會部",
    description: "帳務處理、財務報表與稅務",
    parentId: "dep-000",
    managerId: "emp-003",
  },
  {
    id: "dep-003",
    code: "DEP-003",
    name: "營運部",
    description: "客戶服務與日常營運",
    parentId: "dep-000",
    managerId: "emp-012",
  },
  {
    id: "dep-004",
    code: "DEP-004",
    name: "人資部",
    description: "招募、教育訓練與薪酬制度",
    parentId: "dep-000",
    managerId: "emp-005",
  },
  {
    id: "dep-005",
    code: "DEP-005",
    name: "業務部",
    description: "業務開發與通路經營",
    parentId: "dep-000",
    managerId: "emp-011",
  },
];

// Info: (20260810 - Julian) 職稱職等。level 數字越大職等越高，用於簽核門檻與差旅標準
export const MOCK_HR_JOB_TITLES: IJobTitle[] = [
  {
    id: "jt-001",
    code: "JT-GM",
    title: "總經理",
    level: 10,
    description: "綜理公司營運",
  },
  {
    id: "jt-002",
    code: "JT-MGR",
    title: "部門經理",
    level: 8,
    description: "部門營運與人員管理",
  },
  {
    id: "jt-003",
    code: "JT-LEAD",
    title: "主任 / 組長",
    level: 6,
    description: "帶領小組並負責日常派工",
  },
  {
    id: "jt-004",
    code: "JT-SR",
    title: "資深專業人員",
    level: 5,
    description: "獨立負責複雜任務並指導新人",
  },
  {
    id: "jt-005",
    code: "JT-ENG",
    title: "工程師",
    level: 4,
    description: "依規格完成開發與測試",
  },
  {
    id: "jt-006",
    code: "JT-SPEC",
    title: "專員",
    level: 3,
    description: "執行部門例行業務",
  },
];
