// Info: (20241007 - Liz) 角色 id 的概念，用來區分不同的角色，但與後端給的 Role id 不同
export enum RoleName {
  BOOKKEEPER = 'bookkeeper',
  EDUCATIONAL_TRIAL_VERSION = 'educational_trial_version',
  ACCOUNTANT = 'accountant',
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
