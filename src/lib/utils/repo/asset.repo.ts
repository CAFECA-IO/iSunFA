import prisma from '@/client';
import { AssetDepreciationMethod, AssetStatus } from '@/constants/asset';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  ICreateAssetBulkRepoInput,
  ICreateAssetBulkRepoResponse,
  ICreateAssetWithVouchersRepoInput,
  ICreateAssetWithVouchersRepoResponse,
} from '@/interfaces/asset';
import { generateAssetNumbers } from '@/lib/utils/asset';
import { getTimestampNow } from '@/lib/utils/common';

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

/** Info: (20241206 - Shirley) 獲取資產，限制有 voucher 或者建立時間與當下不超過 1 天的資產
 * 獲取資產，限制條件：
 * 1. 資產必須存在相關的 voucher，或
 * 2. 資產的建立時間在最近24小時內
 * @param assetId 資產ID
 */
export async function getAssetByIdLimited(assetId: number) {
  const oneDayAgo = getTimestampNow() - 1000 * 60 * 60 * 24;

  const asset = await prisma.asset.findFirst({
    where: {
      id: assetId,
      OR: [
        { assetVouchers: { some: {} } }, // Info: (20241206 - Shirley) 檢查是否有關聯的 voucher
        { createdAt: { gt: oneDayAgo } }, // Info: (20241206 - Shirley) 檢查是否在24小時內創建
      ],
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  return asset;
}

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

/**
 * Info: (20241206 - Shirley) 獲取所有具有 voucher 的資產列表
 * @param companyId 公司ID（可選）
 * @returns 資產列表
 */
export async function getAllAssetsWithVouchers(companyId: number) {
  const where = {
    assetVouchers: {
      some: {}, // Info: (20241206 - Shirley) 確保至少有一個關聯的 voucher
    },
    companyId, // Info: (20241206 - Shirley) 如果提供了 companyId，則加入篩選條件
  };

  const assets = await prisma.asset.findMany({
    where,
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
    orderBy: {
      createdAt: 'desc', // Info: (20241206 - Shirley) 依建立時間降序排序
    },
  });

  return assets;
}
