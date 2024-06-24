export interface IPaymentRecord {
  id: number;
  orderId: number;
  transactionId: string;
  date: number;
  description: string;
  amount: number;
  method: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}
