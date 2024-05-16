import { IPayment } from '@/interfaces/payment';

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
  payment: IPayment;
  signatory: string;
  signingDate: string;
  estimatedCost: {
    amount: number;
  };
}
