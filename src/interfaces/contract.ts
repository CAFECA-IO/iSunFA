export interface IContract {
  contractId: string;
  contractName: string;
  projectId: string;
  projectName: string;
  status: string;
  progress: number;
  serviceType: string;
  period: {
    contractDuration: {
      start: string;
      end: string;
    };
    deadline: string;
    warrantyDuration: {
      start: string;
      end: string;
    };
  };
  payment: {
    paymentMethod: string;
    installment: string;
    totalPrice: number;
    paymentReceivable: number;
    paymentReceived: number;
    taxPercentage: number;
    fee: number;
    progress: number;
  };
  signatory: string;
  signingDate: string;
  estimatedCost: {
    amount: number;
  };
}
