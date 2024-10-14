export interface IPaymentRecord {
  id: number;
  orderId: number;
  transactionId: string;
  action: string;
  amount: number;
  fee: number;
  method: string;
  cardIssuerCountry: string;
  status: string;
  paymentCreatedAt: string;
  refundAmount: number;
  authCode: string;
  createdAt: number;
  updatedAt: number;
}
