import { PaymentPeriodType, PaymentStatusType } from '@/constants/account';
import { ContractStatus } from '@/constants/contract';
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
    status: ContractStatus.VALID,
    progress: 100,
    serviceType: 'Service 1',
    period: {
      contractDuration: {
        start: '1657207525',
        end: '1661949180',
      },
      deadline: '1681949180',
      warrantyDuration: {
        start: '1673223499',
        end: '1672198180',
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
    status: ContractStatus.EXPIRED,
    progress: 23,
    serviceType: 'Service 2',
    period: {
      contractDuration: {
        start: '1680023499',
        end: '1687207525',
      },
      deadline: '1707207525',
      warrantyDuration: {
        start: '1681212494',
        end: '1689290009',
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
    status: ContractStatus.VALID,
    progress: 73,
    serviceType: 'Service 3',
    period: {
      contractDuration: {
        start: '1690124339',
        end: '16923104980',
      },
      deadline: '17023104980',
      warrantyDuration: {
        start: '1694391480',
        end: '1698120893',
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
  {
    contractId: '4',
    contractName: 'Contract 4',
    projectId: '4',
    projectName: 'Project 4',
    status: ContractStatus.IN_WARRANTY,
    progress: 10,
    serviceType: 'Service 4',
    period: {
      contractDuration: {
        start: '1710949180',
        end: '1711104980',
      },
      deadline: '1723104980',
      warrantyDuration: {
        start: '1710949180',
        end: '1710120893',
      },
    },
    payment: {
      isRevenue: true,
      price: 4000,
      hasTax: true,
      taxPercentage: 5,
      hasFee: true,
      fee: 5,
      status: PaymentStatusType.PAID,
      method: 'Cash',
      period: PaymentPeriodType.AT_ONCE,
      installmentPeriod: 0,
      alreadyPaid: 3000,
      progress: 75,
    },
    signatory: 'Signatory 4',
    signingDate: '1729812762',
    estimatedCost: {
      amount: 4000,
    },
  },
  {
    contractId: '5',
    contractName: 'Contract 5',
    projectId: '5',
    projectName: 'Project 5',
    status: ContractStatus.COMPLETED,
    progress: 82,
    serviceType: 'Service 5',
    period: {
      contractDuration: {
        start: '1711949180',
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
      price: 5000,
      hasTax: true,
      taxPercentage: 5,
      hasFee: true,
      fee: 5,
      status: PaymentStatusType.PAID,
      method: 'Cash',
      period: PaymentPeriodType.AT_ONCE,
      installmentPeriod: 0,
      alreadyPaid: 4000,
      progress: 80,
    },
    signatory: 'Signatory 5',
    signingDate: '1711949180',
    estimatedCost: {
      amount: 5000,
    },
  },
];
