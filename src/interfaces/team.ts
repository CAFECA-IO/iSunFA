import { TPlanType } from '@/interfaces/subscription';
import { IEditable } from '@/interfaces/editable';

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
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
  name: IEditable<string>;
  about: IEditable<string>;
  profile: IEditable<string>;
  planType: IEditable<TPlanType>;
  totalMembers: number;
  totalAccountBooks: number;
  bankAccount: IEditable<string>;
}

export interface IInviteMember {
  email: string;
  isSystemUser: boolean;
}

export interface IInviteMemberResponse {
  invitedCount: number;
  failedEmails: string[];
}

export enum LeaveStatus {
  LEFT = 'LEFT',
  FAILED = 'FAILED',
}

export interface ILeaveTeam {
  teamId: string;
  userId: number;
  role: TeamRole;
  status: LeaveStatus;
  leavedAt?: number;
}

export enum TransferStatus {
  TRANSFER = 'TRANSFER',
  FAILED = 'FAILED',
}

export interface ITransferLedger {
  accountBookId: string;
  previousTeamId: string;
  targetTeamId: string;
  status: TransferStatus;
  transferedAt?: number;
}
