import { IPayment } from '@/interfaces/payment';

/*
Todo: (20240603 - Jacky) Should change whole interface to the new format.
Besides, the contract content should be added.
*/
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
