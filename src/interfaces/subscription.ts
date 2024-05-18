export interface ISubscription {
  id: number;
  companyId: number;
  companyName: string;
  plan: string;
  cardId: number;
  price: string;
  autoRenew: boolean;
  startDate: number; // timestamp
  expireDate: number; // timestamp
  status: string;
}
