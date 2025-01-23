import { IRole } from '@/interfaces/role';

export interface IUserRole {
  id: number;
  userId: number;
  role: IRole;
  lastLoginAt: number;
  createdAt: number;
  updatedAt: number;
}
