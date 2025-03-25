import { IAccountBookForUserWithTeam } from '@/interfaces/account_book';
import { IRole } from '@/interfaces/role';
import { IUser } from '@/interfaces/user';
import { ITeam } from '@/interfaces/team';

export interface IStatusInfo {
  user: IUser | null;
  company: IAccountBookForUserWithTeam | null;
  role: IRole | null;
  teams: ITeam[] | null;
}
