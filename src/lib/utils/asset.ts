import type { calculateAssetEntityDepreciation, IAssetEntity } from '@/interfaces/asset';
import type { IVoucherEntity } from '@/interfaces/voucher';
import type { ICompanyEntity } from '@/interfaces/company';
import { Asset as PrismaAsset } from '@prisma/client';
import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import {
  getLastSecondsOfEachMonth,
  getTimestampNow,
  timestampInMilliSeconds,
} from '@/lib/utils/common';

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
    company?: ICompanyEntity;
  }
): IAssetEntity {
  const nowInSecond = getTimestampNow();

  const assetEntity: IAssetEntity = {
    id: dto.id ?? 0,
    companyId: dto.companyId,
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
