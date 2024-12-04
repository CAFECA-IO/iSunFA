import prisma from '@/client';
import { AssetStatus } from '@/constants/asset';
import { ICreateAssetWithVouchersRepo } from '@/interfaces/asset';
import { getTimestampNow } from '@/lib/utils/common';

export async function getOneAssetByIdWithoutInclude(assetId: number) {
  const asset = await prisma.asset.findUnique({
    where: {
      id: assetId,
    },
  });

  return asset;
}

export async function createAssetWithVouchers(assetData: ICreateAssetWithVouchersRepo) {
  const timestampNow = getTimestampNow();
  // ToDo: (20241204 - Luphia) Create the future Vouchers for asset by Murky's function

  // Info: (20241204 - Luphia) Create the Asset
  const newAsset = {
    companyId: assetData.companyId,
    name: assetData.name,
    type: assetData.type,
    number: assetData.number,
    acquisitionDate: assetData.acquisitionDate,
    purchasePrice: assetData.purchasePrice,
    accumulatedDepreciation: assetData.accumulatedDepreciation,
    residualValue: assetData.residualValue,
    remainingLife: assetData.remainingLife,
    status: AssetStatus.NORMAL,
    depreciationStart: assetData.depreciationStart,
    depreciationMethod: assetData.depreciationMethod,
    usefulLife: assetData.usefulLife,
    note: assetData.note,
    createdAt: timestampNow,
    updatedAt: timestampNow,
  };
  const result = await prisma.asset.create({
    data: newAsset,
  });

  // ToDo: (20241204 - Luphia) Create the future Vouchers and Asset mapping

  return result;
}
