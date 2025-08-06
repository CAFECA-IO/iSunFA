import { v4 as uuidv4 } from 'uuid';
import type { calculateAssetEntityDepreciation, IAssetEntity } from '@/interfaces/asset';
import type { IVoucherEntity } from '@/interfaces/voucher';
import type { IAccountBookWithoutTeamEntity } from '@/interfaces/account_book';
import { Prisma, Asset as PrismaAsset } from '@prisma/client';
import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import {
  getLastSecondsOfEachMonth,
  getTimestampNow,
  timestampInMilliSeconds,
} from '@/lib/utils/common';
import { assetListSortOptions, IAssetListSortOptions } from '@/lib/utils/zod_schema/asset';
import { SortBy, SortOrder } from '@/constants/sort';

/**
 * Info: (20241024 - Murky)
 * @description Initialize Asset Entity from scratch
 * @shirley 之後可以在這個function用zod檢查資料
 */
export function initAssetEntity(
  dto: Partial<PrismaAsset> & {
    companyId: number;
    name: string;
    type: AssetEntityType;
    number: string;
    acquisitionDate: number;
    purchasePrice: number;
    accumulatedDepreciation: number;
    residualValue: number;
    remainingLife: number;
    status: AssetStatus;
    depreciationStart: number;
    depreciationMethod: AssetDepreciationMethod;
    usefulLife: number;
    note: string;
    assetVouchers: IVoucherEntity[];
    company?: IAccountBookWithoutTeamEntity;
  }
): IAssetEntity {
  const nowInSecond = getTimestampNow();

  const assetEntity: IAssetEntity = {
    id: dto.id ?? 0,
    accountBookId: dto.companyId,
    name: dto.name,
    type: dto.type,
    number: dto.number,
    acquisitionDate: dto.acquisitionDate,
    purchasePrice: dto.purchasePrice,
    accumulatedDepreciation: dto.accumulatedDepreciation,
    residualValue: dto.residualValue,
    remainingLife: dto.remainingLife,
    status: dto.status,
    depreciationStart: dto.depreciationStart,
    depreciationMethod: dto.depreciationMethod,
    usefulLife: dto.usefulLife,
    note: dto.note,
    createdAt: dto.createdAt ?? nowInSecond,
    updatedAt: dto.updatedAt ?? nowInSecond,
    deletedAt: dto.deletedAt ?? null,
    assetVouchers: dto.assetVouchers,
    company: dto.company,
  };

  return assetEntity;
}

/**
 * Info: (20241029 - Murky)
 * @Shirley 直線法折舊
 * @note 不滿月者，當作一個月 (營利事業所得稅查核準則 第 95 條)
 */
export const calculateAssetStraightLineDepreciate: calculateAssetEntityDepreciation = (
  asset: IAssetEntity,
  { nowInSecond }
) => {
  const nowDate = new Date(timestampInMilliSeconds(nowInSecond));
  const currentPeriodMonth = nowDate.getMonth() + 1;
  const currentPeriodYear = nowDate.getFullYear();

  const depreciateStartDate = new Date(timestampInMilliSeconds(asset.depreciationStart));
  const depreciateStartMonth = depreciateStartDate.getMonth() + 1;
  const depreciateStartYear = depreciateStartDate.getFullYear();

  const lastUsedDate = new Date(timestampInMilliSeconds(asset.usefulLife));
  const lastUsedMonth = lastUsedDate.getMonth() + 1;
  const lastUsedYear = lastUsedDate.getFullYear();

  const isLastMonth = currentPeriodYear === lastUsedYear && currentPeriodMonth === lastUsedMonth;

  // Info: (20241029 - Murky) Calculate total months of useful life
  // ex: life long 2022/09 - 2024/8 (8 is last month of useful life): 2024 - 2022 = 2 years * 12 + 8 - 9 + 1(current month)= 24 months
  const totalMonthsOfUsefulLife =
    (lastUsedYear - depreciateStartYear) * 12 + (lastUsedMonth - depreciateStartMonth) + 1;

  // Info: (20241029 - Murky) ex: accumulated month 2022/09 - 2024/8 (8 is current month): 2024 - 2022 = 2 years * 12 + 8 - 9 = 23 months
  const totalMonthOfAccumulatedDepreciation =
    (currentPeriodYear - depreciateStartYear) * 12 + (currentPeriodMonth - depreciateStartMonth);

  const currentPeriodDepreciation = asset.purchasePrice / totalMonthsOfUsefulLife;

  const accumulatedDepreciation = currentPeriodDepreciation * totalMonthOfAccumulatedDepreciation;
  if (!isLastMonth) {
    return {
      currentPeriodYear,
      currentPeriodMonth,
      currentPeriodDepreciation,
      originalValue: asset.purchasePrice,
      accumulatedDepreciation,
      remainingValue: asset.purchasePrice - accumulatedDepreciation - currentPeriodDepreciation,
      residualValue: asset.residualValue,
      remainingLife: asset.remainingLife,
    };
  }

  const lastDepreciation = asset.purchasePrice - asset.residualValue - accumulatedDepreciation;
  return {
    currentPeriodYear,
    currentPeriodMonth,
    currentPeriodDepreciation: lastDepreciation,
    originalValue: asset.purchasePrice,
    accumulatedDepreciation,
    remainingValue: asset.residualValue,
    residualValue: asset.residualValue,
    remainingLife: asset.remainingLife,
  };
};

/**
 * Info: (20241029 - Murky)
 * @Shirley 折舊公式的Interface, 直接放一個assetEntity進來就可以用了
 * @param asset - IAssetEntity 用來計算折舊的資產Entity
 */
export const calculateAssetDepreciation: calculateAssetEntityDepreciation = (
  asset: IAssetEntity,
  {
    nowInSecond,
    // totalAmountOfDepreciationTarget,
    // amountOfDepreciationTargetHappenThisPeriod,
  }
) => {
  switch (asset.depreciationMethod) {
    case AssetDepreciationMethod.STRAIGHT_LINE:
      return calculateAssetStraightLineDepreciate(asset, { nowInSecond });
    default:
      return calculateAssetStraightLineDepreciate(asset, { nowInSecond });
  }
};

/**
 * Info: (20241029 - Murky)
 * @description Calculate asset depreciation for each month
 * start from max(depreciationStart, nowInSecond) to usefulLife
 */
export const calculateAssetDepreciationSerial = (
  asset: IAssetEntity,
  {
    nowInSecond,
    // totalAmountOfDepreciationTarget,
    // amountOfDepreciationTargetHappenEachPeriod,
  }: {
    nowInSecond: number;
    // totalAmountOfDepreciationTarget: number;
    // amountOfDepreciationTargetHappenEachPeriod: number[];
  }
) => {
  switch (asset.depreciationMethod) {
    default: {
      const startDateInSecond = Math.max(asset.depreciationStart, nowInSecond);
      const monthArray = getLastSecondsOfEachMonth(startDateInSecond, asset.usefulLife);
      return monthArray.map((month) => calculateAssetDepreciation(asset, { nowInSecond: month }));
    }
  }
};

/** Info: (20241206 - Shirley) 產出不重複的資產編號
 *
 * @param prefix - 原始資產編號
 * @param amount - 需要生成的資產編號數量
 * @returns 生成的資產編號陣列
 */
export function generateAssetNumbers(prefix: string, amount: number): string[] {
  const uuid = uuidv4().slice(0, 4); // Info: (20250115 - Shirley) 取 uuid 的前 4 個字元
  const ASSET_PAD_NUMBER = 6; // Info: (20250115 - Shirley) 資產編號的格式，預設是 6 位數，e.g. 000001

  const assetNumbers: string[] = [];
  for (let i = 0; i < amount; i += 1) {
    const serialNumber = (i + 1).toString().padStart(ASSET_PAD_NUMBER, '0');
    assetNumbers.push(`${prefix}-${uuid}-${serialNumber}`);
  }

  return assetNumbers;
}

/**
 * Info: (20241211 - Shirley) 根據 sortOption 公版的格式，整理出 prisma 的 orderBy 條件
 * @param sortOptions - 排序選項
 * @returns 排序條件
 */
export function createPrismaAssetOrderBy(sortOptions: { sortBy: SortBy; sortOrder: SortOrder }[]) {
  const orderBy: Prisma.AssetOrderByWithRelationInput[] = [];

  sortOptions.forEach((sort) => {
    const { sortBy, sortOrder } = sort;
    const isValidSortOption = assetListSortOptions.safeParse(sortBy);

    if (!isValidSortOption.success) {
      return;
    }

    switch (sortBy as IAssetListSortOptions) {
      case SortBy.ACQUISITION_DATE:
        orderBy.push({ acquisitionDate: sortOrder });
        break;
      case SortBy.PURCHASE_PRICE:
        orderBy.push({ purchasePrice: sortOrder });
        break;
      default:
        orderBy.push({ acquisitionDate: SortOrder.DESC });
        break;
    }
  });
  return orderBy;
}

export function calculateRemainingLife(
  asset: IAssetEntity,
  usefulMonths: number,
  depreciationMethod: AssetDepreciationMethod
) {
  // Info: (20250115 - Shirley) DB 的 useful_life 是 month 為單位，將 usefulMonths 轉為 timestamp in seconds，再去計算 remaining life
  const usefulLifeInSeconds = usefulMonths * 30 * 24 * 60 * 60;
  const nowInSeconds = getTimestampNow();
  const remainingLife =
    depreciationMethod === AssetDepreciationMethod.NONE
      ? Number.POSITIVE_INFINITY
      : usefulLifeInSeconds - (nowInSeconds - asset.acquisitionDate);
  return remainingLife;
}
