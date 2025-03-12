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
  editable: boolean; // Info: (20250312 - Liz) 可以編輯成員權限、可以刪除成員
}

export interface ITeam {
  id: number;
  imageId: string;
  role: TeamRole;
  name: IEditable<string>;
  about: IEditable<string>;
  profile: IEditable<string>;
  planType: IEditable<TPlanType>;
  totalMembers: number;
  totalAccountBooks: number;
  bankAccount: IEditable<string>;
  // Info: (20250312 - Liz) 以下為待討論項目
  // isAbleToEditPrivacy: boolean;
  // isAbleToEditPlan: boolean;
  // isAbleToEditBankAccount: boolean; // 可以編輯就表示可以查看(共用查看權限)
  // bankAccount: string; // 不能查看就回傳空字串
}

export interface IInviteMember {
  email: string;
  isSystemUser: boolean;
}

export interface IInviteMemberResponse {
  invitedCount: number;
  failedEmails: string[];
}

// Info: (20250303 - Shirley) 定義 Team 與 File 的關聯介面
export interface ITeamWithImage {
  id: number;
  name: string;
  imageId: string;
  createdAt: number;
  updatedAt: number;
}

export enum LeaveStatus {
  NOT_IN_TEAM = 'NOT_IN_TEAM',
  IN_TEAM = 'IN_TEAM',
}

export interface ILeaveTeam {
  teamId: number;
  userId: number;
  role: TeamRole;
  status: LeaveStatus;
  leftAt?: number;
}

export enum TransferStatus {
  TRANSFER = 'TRANSFER',
  FAILED = 'FAILED',
}

export interface ITransferLedger {
  accountBookId: string;
  previousTeamId: number;
  targetTeamId: number;
  status: TransferStatus;
  transferredAt?: number;
}
