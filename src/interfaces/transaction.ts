import { TransactionStatus } from "@/constants/account";

export interface ITeamPaymentTransaction {
  id?: number;
  orderId: number;
  paymentMethodId: number;
  data: unknown;
  amount: number;
  status: TransactionStatus;
  createdAt: number;
}
