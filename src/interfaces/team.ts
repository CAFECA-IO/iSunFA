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
  imageId: string;
  email: string;
  role: TeamRole;
  editable: boolean;
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

export interface IInviteMember {
  email: string;
  isSystemUser: boolean;
}

export interface IInviteMemberResponse {
  invitedCount: number;
  failedEmails: string[];
}
