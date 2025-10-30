import type { IVoucherEntity } from '@/interfaces/voucher';
import type { IAccountBookWithoutTeamEntity } from '@/interfaces/account_book';
import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import { z } from 'zod';
import {
  IAssetPostInputBodyValidator,
  IAssetPostOutputValidator,
  IAssetPutInputBodyValidator,
  IAssetDetailsValidator,
  IAssetItemValidator,
  IRelatedVoucherValidator,
  IAssetPutRepoInputValidator,
} from '@/lib/utils/zod_schema/asset';
import { IPaginatedData } from '@/interfaces/pagination';
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

export type IAssetItem = z.infer<typeof IAssetItemValidator>;

export type IAssetDetails = z.infer<typeof IAssetDetailsValidator>;

export type IRelatedVoucher = z.infer<typeof IRelatedVoucherValidator>;

export type ICreateAssetInput = z.infer<typeof IAssetPostInputBodyValidator>;

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
  relatedVouchers: [],
  note: 'Main office computer',
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
 * @property id - number Asset ID, 0 if not yet saved in database
 * @property accountBookId - number company id of company that own the asset
 * @property name - string
 * @property type - AssetEntityType Asset type that is based on property, plant, equipment
 * @property number - string Property Serial number
 * @property acquisitionDate - number When the asset is acquired
 * @property purchasePrice - number The price (or consideration) to acquire the asset
 * @property accumulatedDepreciation - number Sum of depreciation expense from the acquisition date to the current date
 * @property residualValue - number The remaining value of the asset after depreciated through the useful life
 * @property remainingLife - number asset still in used or how it is disposed
 * @property status - AssetStatus asset still in used or how it is disposed
 * @property depreciationStart - number When the asset start to depreciate, normally is the acquisition date
 * @property depreciationMethod - AssetDepreciationMethod How the asset is depreciated
 * @property usefulLife - the last use date in second of the asset
 * @property note - string note input by user
 * @property createdAt - number When the asset is created in database
 * @property updatedAt - number When the asset is updated in database
 * @property deletedAt - number | null When the asset is deleted in database, null if not deleted
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
  accountBookId: number;

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
   * @description the last use date in second of the asset
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
  company?: IAccountBookWithoutTeamEntity;
}

/**
 * Info: (20241029 - Murky)
 * @param asset - IAssetEntity 用來計算折舊的資產Entity
 * @param option - { nowInSecond: number, totalAmountOfDepreciationTarget: number, amountOfDepreciationTargetHappenThisPeriod: number }
 * @param option.nowInSecond - number 現在的時間，如果是用直線法等需要時間的折舊公式使用
 * @param option.totalAmountOfDepreciationTarget - number? 要折舊的計算標的，像是總機器小時或總生產量, 非使用時間計算的折舊方法
 * @param option.amountOfDepreciationTargetHappenThisPeriod - number? 這個期間內發生的折舊標的數量，非使用時間計算的折舊方法
 * @return - {
 *  currentPeriodYear: number, 本期折舊是屬於哪一年
 *  currentPeriodMonth: number, 本期折舊是屬於哪一月
 *  currentPeriodDepreciation: number, 這個期間的折舊金額
 *  originalValue: number, 資產原始價值
 *  accumulatedDepreciation: number, 累計折舊金額
 *  remainingValue: number, 剩餘價值
 *  residualValue: number, 預估殘值
 * }
 * @Shirley 折舊公式的Interface
 */
export interface calculateAssetEntityDepreciation {
  (
    asset: IAssetEntity,
    {
      nowInSecond,
      totalAmountOfDepreciationTarget,
      amountOfDepreciationTargetHappenThisPeriod,
    }: {
      nowInSecond: number;
      totalAmountOfDepreciationTarget?: number;
      amountOfDepreciationTargetHappenThisPeriod?: number;
    }
  ): {
    currentPeriodYear: number;
    currentPeriodMonth: number;
    currentPeriodDepreciation: number;
    originalValue: number;
    accumulatedDepreciation: number;
    remainingValue: number;
    residualValue: number;
    remainingLife: number;
  };
}

export interface AssetHeader {
  acquisitionDate: number;
  name: string;
  purchasePrice: number;
  accumulatedDepreciation: number;
  residualValue: number;
  remainingLife: number;
  type: string;
  status: string;
  number: string;
}

export interface AssetHeaderWithStringDate extends Omit<AssetHeader, 'acquisitionDate'> {
  acquisitionDate: string;
}

// ToDo: (20241204 - Luphia) move to interface folder
export interface ICreateAssetWithVouchersRepoInput {
  accountBookId: number;
  name: string;
  type: string;
  number: string;
  acquisitionDate: number;
  purchasePrice: number;
  accumulatedDepreciation: number; // Deprecated: (20241204 - Shirley) no use
  residualValue?: number;
  remainingLife?: number; // Deprecated: (20241204 - Shirley) no use
  depreciationStart?: number;
  depreciationMethod?: string;
  usefulLife?: number;
  note?: string;
}

export type IAssetPostOutput = z.infer<typeof IAssetPostOutputValidator>;

export interface IAssetBulkPostRepoInput extends ICreateAssetWithVouchersRepoInput {
  id?: number;
}
export interface IAssetBulkPostRepoOutput extends Array<IAssetPostOutput> {
  id?: number;
}

export interface IPaginatedAsset extends IPaginatedData<IAssetItem[]> {
  id?: number;
}

export type IAssetPutRepoInput = z.infer<typeof IAssetPutRepoInputValidator>;

export type IAssetPutInputBody = z.infer<typeof IAssetPutInputBodyValidator>;
