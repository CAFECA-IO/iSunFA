import { TPlanType } from '@/interfaces/subscription';

export enum TeamRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export interface ITeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
}

export interface ITeam {
  id: string;
  imageId: string;
  role: TeamRole;
  name: {
    value: string;
    editable: boolean;
  };
  about: {
    value: string;
    editable: boolean;
  };
  profile: {
    value: string;
    editable: boolean;
  };
  planType: {
    value: TPlanType;
    editable: boolean;
  };
  totalMembers: number;
  totalAccountBooks: number;
  bankAccount: {
    value: string;
    editable: boolean;
  };
}
