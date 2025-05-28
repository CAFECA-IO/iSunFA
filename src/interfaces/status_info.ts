import { IUser } from '@/interfaces/user';
import { ITeam } from '@/interfaces/team';
import { IAccountBookWithoutTeamEntity as IAccountBookWithTeamEntity } from '@/interfaces/account_book';
import { IUserRole } from '@/interfaces/user_role';

export interface IStatusInfo {
  user: IUser | null;
  company: IAccountBookWithTeamEntity | null;
  role: IUserRole | null;
  teams: ITeam[] | null;
}
