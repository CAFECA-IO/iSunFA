export interface IInvitation {
  id: number;
  roleId: number;
  companyId: number;
  createdUserId: number;
  code: string;
  email: string;
  phone: string;
  hasUsed: boolean;
  expiredAt: number;
  createdAt: number;
  updatedAt: number;
}
