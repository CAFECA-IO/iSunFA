import { RoleName } from '@/constants/role';
import { IUserRole } from '@/interfaces/user_role';

// Deprecated: (20250328 - Liz)
// // Info: (20250328 - Liz) 篩選出尚未被使用的角色
// export const findUnusedRoles = (systemRoles: IRole[], userRoles: IUserRole[]): IRole[] => {
//   // Info: (20241122 - Liz) 將 userRoles 中的角色 ID 建立為一個 Set
//   const userRoleIds = new Set(userRoles.map((userRole) => userRole.role.id));

//   // Info: (20241122 - Liz) 從 systemRoles 中篩選出尚未被 userRoles 使用的角色
//   return systemRoles.filter((role) => !userRoleIds.has(role.id));
// };

// Info: (20250328 - Liz) 篩選出尚未被使用的角色名稱
export const findUnusedRoles = (systemRoles: RoleName[], userRoles: IUserRole[]): RoleName[] => {
  // Info: (20250328 - Liz) 將 userRoles 中的 roleName 建立為 Set
  const usedRoleNames = new Set(userRoles.map((userRole) => userRole.roleName));

  // Info: (20250328 - Liz) 從 systemRoles 中篩選出尚未被 userRoles 使用的角色名稱
  return systemRoles.filter((roleName) => !usedRoleNames.has(roleName));
};
