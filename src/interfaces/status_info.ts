import { IAccountBook } from '@/interfaces/account_book';
import { IUser } from '@/interfaces/user';
import { ITeam } from '@/interfaces/team';
import { IUserRole } from './user_role';

export interface IStatusInfo {
  user: IUser | null;
  company: IAccountBook | null;
  role: IUserRole | null;
  teams: ITeam[] | null;
}
