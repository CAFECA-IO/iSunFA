import { ICompany } from './company';
import { IUser } from './user';

export interface ISessionData {
  user: IUser;
  company: ICompany;
}
