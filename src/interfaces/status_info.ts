import { IAccountBook } from '@/interfaces/account_book';
import { IRole } from '@/interfaces/role';
import { IUser } from '@/interfaces/user';
import { ITeam } from '@/interfaces/team';

export interface IStatusInfo {
  user: IUser | null;
  company: IAccountBook | null;
  role: IRole | null;
  team: ITeam | null;
  teams: ITeam[] | null;
}
