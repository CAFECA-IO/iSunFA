import { ICompany } from './company';
import { IRole } from './role';
import { IUser } from './user';

export interface IAdmin {
  id: number;
  user: IUser;
  company: ICompany;
  role: IRole;
  email: string;
  status: boolean;
  startDate: number;
  endDate: number | null;
  createdAt: number;
  updatedAt: number;
}
