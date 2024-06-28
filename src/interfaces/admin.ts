import { ICompany } from '@/interfaces/company';
import { IRole } from '@/interfaces/role';
import { IUser } from '@/interfaces/user';

export interface IAdmin {
  id: number;
  user: IUser;
  company: ICompany;
  role: IRole;
  email: string;
  status: boolean;
  startDate: number;
  endDate: number;
  createdAt: number;
  updatedAt: number;
}
