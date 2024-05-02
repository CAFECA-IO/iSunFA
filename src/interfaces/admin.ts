export interface IAdmin {
  id: string;
  companyId: string;
  companyName: string;
  userId: string;
  userName: string;
  email: string;
  startDate: number; // timestamp
  auditing: string;
  accounting: string;
  internalControl: string;
}
