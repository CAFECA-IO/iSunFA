import { RoleName } from '@/constants/role';
import { RoleType } from '@prisma/client';

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
