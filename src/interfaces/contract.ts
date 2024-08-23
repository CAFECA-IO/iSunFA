import { PaymentPeriodType, PaymentStatusType } from '@/constants/account';
import { IPayment } from '@/interfaces/payment';

/*
Todo: (20240603 - Jacky) [Beta] Should change whole interface to the new format.
Besides, the contract content should be added.
*/
export interface IContract {
  id: number;
  projectId: number;
  projectName: string;
  companyId: number;
  companyName: string;
  status: string;
  progress: number;
  name: string;
  signatory: string;
  signatoryDate: number;
  payment: IPayment;
  hasContractDate: boolean;
  contractStartDate: number;
  contractEndDate: number;
  hasDeadlineDate: boolean;
  deadlineDate: number;
  hasWarrantyDate: boolean;
  warrantyStartDate: number;
  warrantyEndDate: number;
  serviceType: string;
  estimatedCost: number;
  createdAt: number;
  updatedAt: number;
}

// ToDo: (20240619 - Jacky) [Beta] New mock data for interface change
export const newDummyContracts: IContract[] = [
  {
    id: 1,
    projectId: 1,
    projectName: 'Project 1',
    companyId: 1,
    companyName: 'Company 1',
    status: 'Valid',
    progress: 100,

    name: 'Contract 1',
    signatory: 'Predovic - Beahan',
    signatoryDate: 1717207525,
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
    hasContractDate: true,
    contractStartDate: 1657207525,
    contractEndDate: 1661949180,
    hasDeadlineDate: true,
    deadlineDate: 1681949180,
    hasWarrantyDate: true,
    warrantyStartDate: 1673223499,
    warrantyEndDate: 1672198180,
    serviceType: 'Service 1',
    estimatedCost: 1000,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 2,
    projectId: 2,
    projectName: 'Project 2',
    companyId: 2,
    companyName: 'Company 2',
    status: 'Expired',
    progress: 23,
    name: 'Contract 2',
    signatory: 'Predovic - Beahan',
    signatoryDate: 1710023499,
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
    hasContractDate: true,
    contractStartDate: 1680023499,
    contractEndDate: 1687207525,
    hasDeadlineDate: true,
    deadlineDate: 1707207525,
    hasWarrantyDate: true,
    warrantyStartDate: 1681212494,
    warrantyEndDate: 1689290009,
    serviceType: 'Service 2',
    estimatedCost: 2000,
    createdAt: 0,
    updatedAt: 0,
  },
  // Info: (20240619 - Jacky) Add more dummy contracts here...
];
