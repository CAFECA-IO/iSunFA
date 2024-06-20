import { PaymentPeriodType, PaymentStatusType } from '@/constants/account';
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

// ToDo: (20240619 - Julian) Remove this after API integration
export const dummyContracts: IContract[] = [
  {
    contractId: '1',
    contractName: 'Contract 1',
    projectId: '1',
    projectName: 'Project 1',
    status: 'Active',
    progress: 50,
    serviceType: 'Service 1',
    period: {
      contractDuration: {
        start: '1717207525',
        end: '1721949180',
      },
      deadline: '1711949180',
      warrantyDuration: {
        start: '1713223499',
        end: '1721949180',
      },
    },
    payment: {
      isRevenue: true,
      price: 1000,
      hasTax: true,
      taxPercentage: 5,
      hasFee: true,
      fee: 5,
      status: PaymentStatusType.PAID,
      method: 'Cash',
      period: PaymentPeriodType.AT_ONCE,
      installmentPeriod: 0,
      alreadyPaid: 1000,
      progress: 100,
    },
    signatory: 'Signatory 1',
    signingDate: '1717207525',
    estimatedCost: {
      amount: 1000,
    },
  },
  {
    contractId: '2',
    contractName: 'Contract 2',
    projectId: '2',
    projectName: 'Project 2',
    status: 'Expired',
    progress: 50,
    serviceType: 'Service 2',
    period: {
      contractDuration: {
        start: '1710023499',
        end: '1707207525',
      },
      deadline: '1707207525',
      warrantyDuration: {
        start: '1711212494',
        end: '1712890009',
      },
    },
    payment: {
      isRevenue: true,
      price: 2000,
      hasTax: true,
      taxPercentage: 5,
      hasFee: true,
      fee: 5,
      status: PaymentStatusType.PAID,
      method: 'Cash',
      period: PaymentPeriodType.AT_ONCE,
      installmentPeriod: 0,
      alreadyPaid: 180,
      progress: 9,
    },
    signatory: 'Signatory 2',
    signingDate: '1710023499',
    estimatedCost: {
      amount: 2000,
    },
  },
  {
    contractId: '3',
    contractName: 'Contract 3',
    projectId: '3',
    projectName: 'Project 3',
    status: 'In Process',
    progress: 50,
    serviceType: 'Service 3',
    period: {
      contractDuration: {
        start: '1697124339',
        end: '1723104980',
      },
      deadline: '1723104980',
      warrantyDuration: {
        start: '1711949180',
        end: '1718120893',
      },
    },
    payment: {
      isRevenue: true,
      price: 3000,
      hasTax: true,
      taxPercentage: 5,
      hasFee: true,
      fee: 5,
      status: PaymentStatusType.PAID,
      method: 'Cash',
      period: PaymentPeriodType.AT_ONCE,
      installmentPeriod: 0,
      alreadyPaid: 2000,
      progress: 66.67,
    },
    signatory: 'Signatory 3',
    signingDate: '1697124339',
    estimatedCost: {
      amount: 3000,
    },
  },
];
