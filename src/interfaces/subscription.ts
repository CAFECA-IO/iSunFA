export interface ISubscription {
  id: number;
  companyId: number;
  planId: number;
  startDate: number;
  expiredDate: number;
  status: boolean;
  createdAt: number;
  updatedAt: number;
}
