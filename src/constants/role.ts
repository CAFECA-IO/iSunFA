// Deprecated: (20250422 - Liz) 舊版 RoleName
// export enum RoleName {
//   BOOKKEEPER = 'BOOKKEEPER',
//   EDUCATIONAL_TRIAL_VERSION = 'EDUCATIONAL_TRIAL_VERSION',
//   ENTERPRISE = 'ENTERPRISE',
// }

// Info: (20250422 - Liz) 新版 RoleName (RC2)
export enum RoleName {
  INDIVIDUAL = 'INDIVIDUAL',
  ACCOUNTING_FIRMS = 'ACCOUNTING_FIRMS',
  ENTERPRISE = 'ENTERPRISE',
  BOOKKEEPER = 'BOOKKEEPER', // Deprecated: (20250423 - Liz) 等後端修改相關 API 以及 DB 資料後，將會移除
  EDUCATIONAL_TRIAL_VERSION = 'EDUCATIONAL_TRIAL_VERSION', // Deprecated: (20250423 - Liz) 等後端修改相關 API 以及 DB 資料後，將會移除
}

export enum CompanyRoleName {
  SUPER_ADMIN = 'Super Admin',
  ADMIN = 'Admin',
  OWNER = 'Owner',
  ACCOUNTANT = 'Accountant',
  BOOKKEEPER = 'Bookkeeper',
  FINANCE = 'Finance',
  VIEWER = 'Viewer',
  TEST = 'Test',
}

// Info: (20250328 - Liz) RoleType 由原先的 Capital Case 改為 CONSTANT_CASE
export enum RoleType {
  COMPANY = 'COMPANY',
  USER = 'USER',
  SYSTEM = 'SYSTEM',
}
