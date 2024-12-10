import prisma from '@/client';
import { AssetDepreciationMethod, AssetStatus } from '@/constants/asset';
import { SortBy, SortOrder } from '@/constants/sort';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  ICreateAssetBulkRepoInput,
  ICreateAssetBulkRepoResponse,
  ICreateAssetWithVouchersRepoInput,
  ICreateAssetWithVouchersRepoResponse,
  IUpdateAssetRepoInput,
} from '@/interfaces/asset';
import { generateAssetNumbers } from '@/lib/utils/asset';
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
): Promise<ICreateAssetWithVouchersRepoResponse> {
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

// TODO: (20241206 - Shirley) 建立 voucher，綁定 voucher 跟 asset
export async function createManyAssets(
  assetData: ICreateAssetBulkRepoInput,
  amount: number
): Promise<ICreateAssetBulkRepoResponse> {
  const timestampNow = getTimestampNow();
  const assets = [];

  const assetNumbers = generateAssetNumbers(assetData.number, amount);

  for (let i = 0; i < amount; i += 1) {
    const newAsset = {
      companyId: assetData.companyId,
      name: assetData.name,
      type: assetData.type,
      number: assetNumbers[i],
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
        { number: { startsWith: assetData.number.match(/^(.*?(?=\d))/)?.[1] || '' } },
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
    return { id: v.id, number: v.voucher.no };
  });
  return vouchers;
};

export async function deleteAsset(assetId: number) {
  const deletedAsset = await prisma.asset.delete({
    where: {
      id: assetId,
    },
  });

  return deletedAsset;
}

export async function deleteManyAssets(assetIds: number[]) {
  const deletedAssets = await prisma.asset.deleteMany({
    where: {
      id: { in: assetIds },
    },
  });

  return deletedAssets;
}

function createOrderByList(sortOptions: { sortBy: SortBy; sortOrder: SortOrder }[]) {
  const orderBy: Prisma.AssetOrderByWithRelationInput[] = [];
  sortOptions.forEach((sort) => {
    const { sortBy, sortOrder } = sort;
    switch (sortBy) {
      case SortBy.ACQUISITION_DATE:
        orderBy.push({ acquisitionDate: sortOrder });
        break;
      case SortBy.PURCHASE_PRICE:
        orderBy.push({ purchasePrice: sortOrder });
        break;
      case SortBy.ACCUMULATED_DEPRECIATION:
        orderBy.push({ accumulatedDepreciation: sortOrder });
        break;
      case SortBy.RESIDUAL_VALUE:
        orderBy.push({ residualValue: sortOrder });
        break;
      case SortBy.REMAINING_LIFE:
        orderBy.push({ remainingLife: sortOrder });
        break;
      default:
        break;
    }
  });
  return orderBy;
}

/**
 * Info: (20241206 - Shirley) 獲取所有具有 voucher 的資產列表
 * @param companyId 公司ID
 * @returns 資產列表
 */
export async function getAllAssetsByCompanyId(
  companyId: number,
  options: {
    sortOption?: { sortBy: SortBy; sortOrder: SortOrder }[];
    filterCondition?: Prisma.AssetWhereInput;
    searchQuery?: string;
  }
) {
  const { sortOption, filterCondition, searchQuery } = options;

  const where: Prisma.AssetWhereInput = {
    companyId,
    deletedAt: null,
    assetVouchers: { some: {} }, // Info: (20241206 - Shirley) 獲取具有 voucher 的資產
    ...(filterCondition || {}),
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

  const orderBy = createOrderByList(sortOption || []) || {
    createdAt: 'desc',
  };

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
  assetData: IUpdateAssetRepoInput
) {
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
  };

  const updatedAsset = await prisma.asset.update({
    where: { id: assetId, companyId },
    data: dataForUpdate,
  });
  return updatedAsset;
}
