import prisma from '@/client';
import {
  AssetDepreciationMethod,
  AssetEntityType,
  AssetStatus,
  DEFAULT_SORT_OPTIONS,
} from '@/constants/asset';
import { SortBy, SortOrder } from '@/constants/sort';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  IAssetBulkPostRepoInput,
  IAssetBulkPostRepoOutput,
  ICreateAssetWithVouchersRepoInput,
  IAssetPostOutput,
  IAssetPutRepoInput,
} from '@/interfaces/asset';
import { createAssetOrderBy, generateAssetNumbers } from '@/lib/utils/asset';
import { getTimestampNow } from '@/lib/utils/common';
import { Prisma } from '@prisma/client';

export async function getOneAssetByIdWithoutInclude(assetId: number) {
  const asset = await prisma.asset.findUnique({
    where: {
      id: assetId,
    },
  });

  return asset;
}

export async function createAssetWithVouchers(
  assetData: ICreateAssetWithVouchersRepoInput
): Promise<IAssetPostOutput> {
  const timestampNow = getTimestampNow();
  const assetNumber = generateAssetNumbers(assetData.number, 1)[0];
  // ToDo: (20241204 - Luphia) Create the future Vouchers for asset by Murky's function
  /*
  residualValue?: number;
  remainingLife?: number; // Deprecated: (20241204 - Shirley) no use
  depreciationStart?: number;
  depreciationMethod?: string;
  usefulLife?: number;
  */

  // Info: (20241204 - Luphia) Create the Asset
  const newAsset = {
    userId: assetData.userId,
    companyId: assetData.companyId,
    name: assetData.name,
    type: assetData.type,
    number: assetNumber,
    acquisitionDate: assetData.acquisitionDate,
    purchasePrice: assetData.purchasePrice,
    accumulatedDepreciation: assetData.accumulatedDepreciation,
    residualValue: assetData.residualValue || assetData.purchasePrice,
    remainingLife: assetData.usefulLife || 0,
    status: AssetStatus.NORMAL,
    depreciationStart: assetData.depreciationStart || assetData.acquisitionDate,
    depreciationMethod: assetData.depreciationMethod || AssetDepreciationMethod.NONE,
    usefulLife: assetData.usefulLife || 0,
    note: assetData.note || '',
    createdAt: timestampNow,
    updatedAt: timestampNow,
  };
  const result = await prisma.asset.create({
    data: newAsset,
  });

  // ToDo: (20241204 - Luphia) Create the future Vouchers and Asset mapping
  // lib/utils/asset.ts

  return result;
}

/**
 * Info: (20241206 - Shirley) 殘值 === 剩餘帳面價值
 * 批量建立資產，每個資產的購買價格為總價除以建立的資產數量，殘值為總殘值除以建立的資產數量，如果殘值為undefined (不為0)，則殘值為總價除以建立的資產數量；總價跟總殘值除不盡的餘數會加在則最後一個資產上
 * @param assetData 資產資料
 * @param amount 建立的資產數量
 * @returns 建立的資產列表
 */
// TODO: (20241206 - Shirley) 建立 voucher，綁定 voucher 跟 asset
export async function createManyAssets(
  assetData: IAssetBulkPostRepoInput,
  amount: number
): Promise<IAssetBulkPostRepoOutput> {
  const timestampNow = getTimestampNow();
  const assets = [];
  const assetNumbers = generateAssetNumbers(assetData.number, amount);

  const pricePerAsset = Math.floor(assetData.purchasePrice / amount);

  const residualValuePerAsset =
    assetData.residualValue !== undefined
      ? Math.floor(assetData.residualValue / amount)
      : pricePerAsset;

  const remainder = assetData.purchasePrice % amount;

  const remainderResidualValue =
    assetData.residualValue !== undefined ? assetData.residualValue % amount : remainder;

  for (let i = 0; i < amount; i += 1) {
    const newAsset = {
      userId: assetData.userId,
      companyId: assetData.companyId,
      name: assetData.name,
      type: assetData.type,
      number: assetNumbers[i],
      acquisitionDate: assetData.acquisitionDate,
      purchasePrice: i === amount - 1 ? pricePerAsset + remainder : pricePerAsset,
      // accumulatedDepreciation: assetData.accumulatedDepreciation,
      residualValue:
        i === amount - 1 ? residualValuePerAsset + remainderResidualValue : residualValuePerAsset,
      // remainingLife: assetData.usefulLife || 0,
      status: AssetStatus.NORMAL,
      depreciationStart: assetData.depreciationStart || assetData.acquisitionDate,
      depreciationMethod: assetData.depreciationMethod || AssetDepreciationMethod.NONE,
      usefulLife: assetData.usefulLife || 0,
      note: assetData.note || '',
      createdAt: timestampNow,
      updatedAt: timestampNow,
    };
    assets.push(newAsset);
  }

  await prisma.asset.createMany({
    data: assets,
  });

  // Info: (20241205 - Shirley) 查詢所有剛才創建的資產
  const createdAssets = await prisma.asset.findMany({
    where: {
      AND: [
        { companyId: assetData.companyId },
        { createdAt: timestampNow },
        // Info: (20241205 - Shirley) 在 Jest extension 自動執行測試，會在同一秒根據多個測試建立資產，因此需要加上這個條件
        { number: { startsWith: assetData.number || '' } },
      ],
    },
    orderBy: {
      id: 'asc',
    },
    select: {
      id: true,
      name: true,
      number: true,
      companyId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      note: true,
    },
  });

  if (!createdAssets.length) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  return createdAssets;
}

/** Info: (20241206 - Shirley) 獲取公司單一資產，限制有 voucher 或者建立時間與當下不超過 1 天的資產
 * 獲取資產，限制條件：
 * 1. 資產必須存在相關的 voucher，或
 * 2. 資產的建立時間在最近24小時內
 * @param assetId 資產ID
 */
export async function getLegitAssetById(assetId: number, companyId: number) {
  const oneDayAgo = getTimestampNow() - 60 * 60 * 24;

  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      companyId,
      deletedAt: null,
      OR: [
        { assetVouchers: { some: {} } }, // Info: (20241206 - Shirley) 檢查是否有關聯的 voucher
        { createdAt: { gt: oneDayAgo } }, // Info: (20241206 - Shirley) 檢查是否在24小時內創建
      ],
    },
  });

  return asset;
}

export const getVouchersByAssetId = async (assetId: number) => {
  const voucher = await prisma.assetVoucher.findMany({
    where: {
      assetId,
    },
    select: {
      id: true,
      voucher: true,
    },
  });
  const vouchers = voucher.map((v) => {
    return { id: v.voucher.id, number: v.voucher.no };
  });
  return vouchers;
};

// Info: (20241211 - Shirley) hard delete asset
export async function deleteAssetForTesting(assetId: number) {
  const deletedAsset = await prisma.asset.delete({
    where: {
      id: assetId,
    },
  });

  return deletedAsset;
}

// Info: (20241211 - Shirley) hard delete assets
export async function deleteManyAssetsForTesting(assetIds: number[]) {
  const deletedAssets = await prisma.asset.deleteMany({
    where: {
      id: { in: assetIds },
    },
  });

  return deletedAssets;
}

// Info: (20241211 - Shirley) soft delete asset
export async function deleteAsset(assetId: number) {
  const now = getTimestampNow();
  const deletedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: { deletedAt: now },
  });
  return deletedAsset;
}

// Info: (20241211 - Shirley) soft delete assets
export async function deleteManyAssets(assetIds: number[]) {
  const now = getTimestampNow();
  const deletedAssets = await prisma.asset.updateMany({
    where: { id: { in: assetIds } },
    data: { deletedAt: now },
  });
  return deletedAssets;
}

/**
 * Info: (20241206 - Shirley) 獲取所有具有 voucher 的資產列表
 * @param companyId 公司ID
 * @returns 資產列表
 */
export async function listAssetsByCompanyId(
  companyId: number,
  options: {
    sortOption?: { sortBy: SortBy; sortOrder: SortOrder }[];
    filterCondition?: Prisma.AssetWhereInput;
    searchQuery?: string;
  }
) {
  const { sortOption, filterCondition, searchQuery } = options;

  const cleanedFilterCondition = {
    ...filterCondition,
    ...(filterCondition?.type === AssetEntityType.ALL
      ? { type: undefined }
      : { type: filterCondition?.type }),
    ...(filterCondition?.status === AssetStatus.ALL
      ? { status: undefined }
      : { status: filterCondition?.status }),
  };

  const where: Prisma.AssetWhereInput = {
    companyId,
    deletedAt: null,
    assetVouchers: { some: {} },
    ...cleanedFilterCondition,
    OR: searchQuery
      ? [
          { name: { contains: searchQuery, mode: 'insensitive' } },
          { number: { contains: searchQuery, mode: 'insensitive' } },
          { type: { contains: searchQuery, mode: 'insensitive' } },
          { status: { contains: searchQuery, mode: 'insensitive' } },
          { note: { contains: searchQuery, mode: 'insensitive' } },
        ]
      : undefined,
  };

  // Info: (20241211 - Shirley) 根據 sortOption 公版的格式，整理出 prisma 的 asset table orderBy 條件
  const orderBy = createAssetOrderBy(sortOption || DEFAULT_SORT_OPTIONS);

  const assets = await prisma.asset.findMany({
    where,
    orderBy,
    select: {
      id: true,
      name: true,
      number: true,
      type: true,
      status: true,
      purchasePrice: true,
      acquisitionDate: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          assetVouchers: true, // Info: (20241206 - Shirley) 獲取關聯的 voucher 數量
        },
      },
    },
  });

  return assets;
}

/**
 * Info: (20241210 - Shirley) 更新資產
 * @param companyId 公司ID
 * @param assetId 資產ID
 * @param assetData 可以更新的資產欄位
 * @returns 更新後的資產
 */
export async function updateAsset(
  companyId: number,
  assetId: number,
  assetData: IAssetPutRepoInput
) {
  const now = getTimestampNow();
  const dataForUpdate = {
    name: assetData.assetName,
    acquisitionDate: assetData.acquisitionDate,
    purchasePrice: assetData.purchasePrice,
    status: assetData.assetStatus,
    depreciationStart: assetData.depreciationStart,
    depreciationMethod: assetData.depreciationMethod,
    usefulLife: assetData.usefulLife,
    residualValue: assetData.residualValue,
    note: assetData.note,
    updatedAt: now,
  };

  const updatedAsset = await prisma.asset.update({
    where: { id: assetId, companyId, deletedAt: null },
    data: dataForUpdate,
  });
  return updatedAsset;
}
