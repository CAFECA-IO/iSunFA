import { RoleName, RoleType } from '@/constants/role';

export interface IUserRole {
  id: number;
  userId: number;
  roleName: RoleName;
  type: RoleType;
  lastLoginAt: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}
