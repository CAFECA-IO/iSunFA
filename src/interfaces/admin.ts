import { IAccountBook } from '@/interfaces/account_book';
import { IRole } from '@/interfaces/role';
import { IUser } from '@/interfaces/user';

export interface IAdmin {
  id: number;
  user: IUser;
  company: IAccountBook;
  role: IRole;
  email: string;
  status: boolean;
  startDate: number;
  endDate: number;
  createdAt: number;
  updatedAt: number;
}
