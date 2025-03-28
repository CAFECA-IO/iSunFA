import { IUser } from '@/interfaces/user';
import { IUserRole } from '@/interfaces/user_role';

export interface IAdmin {
  id: number;
  user: IUser;
  role: IUserRole;
  email: string;
  status: boolean;
  startDate: number;
  endDate: number;
  createdAt: number;
  updatedAt: number;
}
