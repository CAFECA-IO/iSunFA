import { IUser } from '@/interfaces/user';
import { ITeam } from '@/interfaces/team';
import { IAccountBookWithTeam } from '@/interfaces/account_book';
import { IUserRole } from '@/interfaces/user_role';

export interface IStatusInfo {
  user: IUser | null;
  company: IAccountBookWithTeam | null;
  role: IUserRole | null;
  teams: ITeam[] | null;
}
