import { IRole } from '@/interfaces/role';
import { IUser } from '@/interfaces/user';

export interface IUserRole {
  id: number;
  user: IUser;
  role: IRole;
  lastLoginAt: number;
  createdAt: number;
  updatedAt: number;
}
