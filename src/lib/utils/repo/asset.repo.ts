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
