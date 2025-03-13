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

// Info: (20250311 - Tzuhan) 🌟 帳本轉移狀態
export enum TransferStatus {
  PENDING = 'PENDING', // Info: (20250311 - Tzuhan) 移轉請求中
  COMPLETED = 'COMPLETED', // Info: (20250311 - Tzuhan) 轉移完成
  CANCELED = 'CANCELED', // Info: (20250311 - Tzuhan) 轉移取消
  DECLINED = 'DECLINED', // Info: (20250311 - Tzuhan) 目標團隊拒絕轉移
  FAILED = 'FAILED', // Info: (20250311 - Tzuhan) 轉移失敗
}

export interface ITransferAccountBook {
  accountBookId: number;
  fromTeamId: number;
  toTeamId: number;
  status: TransferStatus;
  transferredAt?: number;
}
