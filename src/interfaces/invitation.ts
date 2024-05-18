export interface IInvitation {
  id: number;
  roleId: number;
  companyId: number;
  code: string;
  hasUsed: boolean;
  expiredAt: number;
}
