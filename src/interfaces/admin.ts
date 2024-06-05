export interface IAdmin {
  id: number;
  userId: number;
  companyId: number;
  roleId: number;
  email: string;
  status: boolean;
  startDate: number;
  endDate: number | null;
  createdAt: number;
  updatedAt: number;
}
