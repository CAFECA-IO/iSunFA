export interface ISubscription {
  id: string;
  companyId: string;
  companyName: string;
  plan: string;
  paymentId: string;
  price: string;
  autoRenew: boolean;
  expireDate: number; // timestamp
  status: string;
}
