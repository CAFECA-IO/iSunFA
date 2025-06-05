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
}

// Info: (20250522 - Liz) 每個角色對應的卡片圖片
export const ROLES_IMAGE: Record<RoleName, string> = {
  [RoleName.INDIVIDUAL]: '/images/individual_image.svg',
  [RoleName.ACCOUNTING_FIRMS]: '/images/accounting_firms_image.svg',
  [RoleName.ENTERPRISE]: '/images/enterprise_image.svg',
};

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
