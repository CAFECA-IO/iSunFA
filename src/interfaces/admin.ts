import { IUser } from './user';

export interface IAdmin extends IUser {
  companyId: string;
  companyName: string;
  permissions: string[];
  startDate: number;
  endDate: number;
}
