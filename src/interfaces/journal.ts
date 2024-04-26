export interface IJournal {
  id: string;
  basicInfo: {
    dateStartTimestamp: number;
    dateEndTimestamp: number;
    eventType: string;
    paymentReason: string;
    description: string;
    vendor: string;
  };
  payment: {
    totalPrice: number;
    tax?: number;
    fee?: number;
    paymentMethod: string;
    bankAccount: string;
    paymentPeriod: number;
    paymentState: string;
  };
  project: {
    project: string;
    contract: string;
  };
}
