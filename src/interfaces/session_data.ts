import { ICompany } from '@/interfaces/company';
import { IUser } from '@/interfaces/user';

export interface ISessionData {
  user: IUser;
  company: ICompany;
}
