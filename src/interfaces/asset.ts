import { timestampInSeconds } from '@/lib/utils/common';

/* Info: (20240927 - Shirley) asset v1 介面 */
export interface IAsset {
  id: number;
  voucherId: number;
  projectId: number;
  contractId: number;
  name: string;
  tag: string;
  type: string;
  description: string;
  startDate: string;
  endDate: string;
  price: string;
  residualValue: string;
  estimatedUsefulLife: number;
  depreciationMethod: string;
  createdAt: number;
  updatedAt: number;
}
export const mockAssetData: IAsset[] = [
  {
    id: 1,
    voucherId: 123,
    projectId: 456,
    contractId: 789,
    name: 'Asset 1',
    tag: 'Tag 1',
    type: 'Type 1',
    description: 'Description 1',
    startDate: '2022-01-01',
    endDate: '2023-01-01',
    price: '1000',
    residualValue: '100',
    estimatedUsefulLife: 5,
    depreciationMethod: 'Straight Line',
    createdAt: 1640995200,
    updatedAt: 1640995200,
  },
  {
    id: 2,
    voucherId: 456,
    projectId: 789,
    contractId: 123,
    name: 'Asset 2',
    tag: 'Tag 2',
    type: 'Type 2',
    description: 'Description 2',
    startDate: '2022-02-01',
    endDate: '2023-02-01',
    price: '2000',
    residualValue: '200',
    estimatedUsefulLife: 10,
    depreciationMethod: 'Double Declining Balance',
    createdAt: 1640995200,
    updatedAt: 1640995200,
  },
];
/* Info: (20240927 - Shirley) asset v1 介面 */

export interface IBriefAssetV2 {
  id: number;
  acquireDate: number;
  type: string;
  propertyNumber: string;
  name: string;
  purchaseAmount: number;
  depreciation: number;
  residualValue: number;
  remainingDays: number;
  status: string;
}

export interface IDetailedAssetV2 {
  id: number;
  name: string;
  propertyNumber: string;
  accountingSubject: string;
  acquireDate: number;
  depreciationStart: number;
  depreciationMethod: string;
  usefulLife: number;
  purchasePrice: number;
  currency: string;
  accumulatedDepreciation: number;
  residualValue: number;
  remainingLife: number;
  note: string;
  relatedVouchers: IRelatedVoucherV2[];
  status: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface ITotalV2 {
  beginningCreditAmount: number;
  beginningDebitAmount: number;
  midtermCreditAmount: number;
  midtermDebitAmount: number;
  endingCreditAmount: number;
  endingDebitAmount: number;
  createAt: number;
  updateAt: number;
}

export interface IRelatedVoucherV2 {
  id: number;
  number: string;
}

export interface ICreateAssetInputV2 {
  name: string;
  propertyNumber: string;
  accountingSubject: string;
  acquireDate: number;
  depreciationStart: number;
  depreciationMethod: string;
  usefulLife: number;
  purchasePrice: number;
  currency: string;
  note?: string;
}

export interface IUpdateAssetInputV2 extends Partial<ICreateAssetInputV2> {
  status?: string;
}

export const mockBriefAssetV2: IBriefAssetV2 = {
  id: 1001,
  acquireDate: 1672531200,
  type: '設備',
  propertyNumber: 'EQ-001',
  name: '辦公電腦',
  purchaseAmount: 50000,
  depreciation: 10000,
  residualValue: 40000,
  remainingDays: 1460,
  status: '使用中',
};

export const mockDetailedAssetV2: IDetailedAssetV2 = {
  id: 1001,
  name: '辦公電腦',
  propertyNumber: 'EQ-001',
  accountingSubject: '設備',
  acquireDate: 1672531200,
  depreciationStart: 1672617600,
  depreciationMethod: '直線法',
  usefulLife: 157680000,
  purchasePrice: 50000,
  currency: 'TWD',
  accumulatedDepreciation: 10000,
  residualValue: 40000,
  remainingLife: 126144000,
  note: '主要辦公電腦',
  relatedVouchers: [
    { id: 101, number: 'V-2023-001' },
    { id: 102, number: 'V-2023-002' },
  ],
  status: '正常',
  createdAt: 1672531200,
  updatedAt: 1672617600,
  deletedAt: null,
};

export const mockRelatedVoucherV2: IRelatedVoucherV2 = {
  id: 103,
  number: 'V2023-0503',
};

export const mockTotalV2: ITotalV2 = {
  beginningCreditAmount: 0,
  beginningDebitAmount: 35000,
  midtermCreditAmount: 0,
  midtermDebitAmount: 0,
  endingCreditAmount: 5833,
  endingDebitAmount: 35000,
  createAt: timestampInSeconds(Date.now() - 31 * 24 * 60 * 60 * 1000),
  updateAt: timestampInSeconds(Date.now()),
};
