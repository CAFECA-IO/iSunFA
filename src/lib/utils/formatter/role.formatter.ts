import { IRole } from '@/interfaces/role';
import { UserRole, Role } from '@prisma/client';

export function formatUserRoleList(userRoles: (UserRole & { role: Role })[]): IRole[] {
  return userRoles.map(({ role }) => role);
}
