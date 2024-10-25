import type { IVoucherEntity } from '@/interfaces/voucher';
import type { ICompanyEntity } from '@/interfaces/company';
import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
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

/* Info: (20240927 - Shirley) asset v2 介面 */

export interface IAssetItem {
  id: number;
  currencyAlias: string;
  acquisitionDate: number;
  assetType: string;
  assetNumber: string;
  assetName: string;
  purchasePrice: number;
  accumulatedDepreciation: number;
  residualValue: number;
  remainingLife: number;
  assetStatus: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface IAssetDetails extends IAssetItem {
  depreciationStart: number;
  depreciationMethod: string;
  usefulLife: number;
  relatedVouchers: IRelatedVoucher[];
  note?: string;
}

export interface IRelatedVoucher {
  id: number;
  number: string;
}

export interface ICreateAssetInput {
  assetName: string;
  assetType: string;
  assetNumber: string;
  acquisitionDate: number;
  purchasePrice: number;
  currencyAlias: string;
  amount: number;
  depreciationStart?: number;
  depreciationMethod?: string;
  usefulLife?: number;
  note?: string;
}

export interface IUpdateAssetInput {
  updatedAt: number;
  assetStatus?: string;
  note?: string;
}

export const mockAssetItem: IAssetItem = {
  id: 1,
  currencyAlias: 'TWD',
  acquisitionDate: 1632511200,
  assetType: '123 Machinery',
  assetNumber: 'A-000010',
  assetName: 'MackBook',
  purchasePrice: 100000,
  accumulatedDepreciation: 5000,
  residualValue: 95000,
  remainingLife: 61580800,
  assetStatus: 'normal',
  createdAt: 1632511200,
  updatedAt: 1632511200,
  deletedAt: null,
};

// Info: (20241024 - Julian) For UI
export interface IAssetItemUI extends IAssetItem {
  isSelected: boolean;
}

export const mockAssetDetails: IAssetDetails = {
  ...mockAssetItem,
  depreciationStart: 1632511200,
  depreciationMethod: 'straight-line',
  usefulLife: 36000,
  relatedVouchers: [
    { id: 101, number: 'V-2023-001' },
    { id: 102, number: 'V-2023-002' },
  ],
  note: 'Main office computer',
};

export const mockCreateAssetInput: ICreateAssetInput = {
  assetName: 'New Office Laptop',
  assetType: 'Equipment',
  assetNumber: 'EQ-002',
  acquisitionDate: 1632511200,
  purchasePrice: 30000,
  currencyAlias: 'TWD',
  amount: 30000,
  depreciationStart: 1632511200,
  depreciationMethod: 'straight-line',
  usefulLife: 36000,
  note: 'Laptop for new employee',
};

export const mockUpdateAssetInput: IUpdateAssetInput = {
  updatedAt: 1632511200,
  note: 'Updated: Laptop for marketing team',
  assetStatus: 'missing',
};

/* Info: (20240927 - Shirley) asset v2 介面 */

/**
 * Info: (20241024 - Murky)
 * @description Asset Entity Interface specify  for backend
 * @note use parsePrismaAssetToAssetEntity to convert Asset in prisma to IAssetEntity
 * @note use initAssetEntity to create new Asset Entity
 */
export interface IAssetEntity {
  /**
   * Info: (20241024 - Murky)
   * @description Asset ID, 0 if not yet saved in database
   */
  id: number;

  /**
   * Info: (20241024 - Murky)
   * @description company id of company that own the asset
   */
  companyId: number;

  name: string;

  /**
   * Info: (20241024 - Murky)
   * @description Asset type that is based on property, plant, equipment
   * @note value is Account Code of asset
   * @shirley 目前我只有寫一個type，不確定要有哪些type
   */
  type: AssetEntityType;
  /**
   * Info: (20241024 - Murky)
   * @description Property Serial number
   */
  number: string;
  /**
   * Info: (20241024 - Murky)
   * @description When the asset is acquired
   * @note need to be in seconds
   */
  acquisitionDate: number;

  /**
   * Info: (20241024 - Murky)
   * @Float
   * @description The price (or consideration) to acquire the asset
   */
  purchasePrice: number;

  /**
   * Info: (20241024 - Murky)
   * @Float
   * @description Sum of depreciation expense from the acquisition date to the current date
   */
  accumulatedDepreciation: number;

  /**
   * Info: (20241024 - Murky)
   * @Float
   * @description The remaining value of the asset after depreciated through the useful life
   */
  residualValue: number;

  /**
   * Info: (20241024 - Murky)
   * @description The remaining useful life of the asset,
   * decrease when time pass
   * @note need to be in seconds
   */
  remainingLife: number;

  /**
   * Info: (20241024 - Murky)
   * @description asset still in used or how it is disposed
   */
  status: AssetStatus;

  /**
   * Info: (20241024 - Murky)
   * @description When the asset start to depreciate,
   * normally is the acquisition date
   * @note need to be in seconds
   */
  depreciationStart: number;

  /**
   * Info: (20241024 - Murky)
   * @description How the asset is depreciated
   */
  depreciationMethod: AssetDepreciationMethod;

  /**
   * Info: (20241024 - Murky)
   * @description Total useful life of the asset,
   * won't decrease when time pass
   * @note need to be in seconds
   */
  usefulLife: number;

  /**
   * Info: (20241024 - Murky)
   * @description note input by user
   */
  note: string;

  /**
   * Info: (20241024 - Murky)
   * @description When the asset is created in database
   * @note need to be in seconds
   */
  createdAt: number;

  /**
   * Info: (20241024 - Murky)
   * @description When the asset is updated in database
   * @note need to be in seconds
   */
  updatedAt: number;

  /**
   * Info: (20241024 - Murky)
   * @description When the asset is deleted in database,
   * null if not deleted
   * @note need to be in seconds
   */
  deletedAt: number | null;

  /**
   * Info: (20241024 - Murky)
   * @description Vouchers that related to this asset,
   * ex: depreciation voucher, disposal voucher, acquisition voucher
   */
  assetVouchers: IVoucherEntity[];

  /**
   * Info: (20241024 - Murky)
   * @description Company that own the asset
   */
  company?: ICompanyEntity;
}
