import prisma from '@/client';
import { AssetDepreciationMethod, AssetStatus } from '@/constants/asset';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  ICreateAssetBulkRepo,
  ICreateAssetBulkRepoResponse,
  ICreateAssetWithVouchersRepo,
  ICreateAssetWithVouchersRepoResponse,
} from '@/interfaces/asset';
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
  assetData: ICreateAssetWithVouchersRepo
): Promise<ICreateAssetWithVouchersRepoResponse> {
  const timestampNow = getTimestampNow();
  // ToDo: (20241204 - Luphia) Create the future Vouchers for asset by Murky's function
  /*
  residualValue?: number;
  remainingLife?: number; // Deprecated: (20241204 - Shirley) no use
  depreciationStart?: number;
  depreciationMethod?: string;
  usefulLife?: number;
  */
  // TODO: (20241205 - Shirley) 將 asset number 作為 prefix，加上 `-SERIAL_NUMBER` 後綴，這樣才是最後要 insert DB 的 asset number

  // Info: (20241204 - Luphia) Create the Asset
  const newAsset = {
    companyId: assetData.companyId,
    name: assetData.name,
    type: assetData.type,
    number: assetData.number,
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

export async function createManyAssets(
  assetData: ICreateAssetBulkRepo,
  amount: number
): Promise<ICreateAssetBulkRepoResponse> {
  const timestampNow = getTimestampNow();
  const assets = [];

  // TODO: (20241205 - Shirley) 將 asset number 作為 prefix，加上 `-SERIAL_NUMBER` 後綴
  // Info: (20241205 - Shirley) 解析原始 number 的數字部分和前綴
  const match = assetData.number.match(/^([A-Za-z-]*)(\d+)$/);
  if (!match) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const [, prefix, numberStr] = match;
  let currentNumber = parseInt(numberStr, 10);

  for (let i = 0; i < amount; i += 1) {
    const paddedNumber = currentNumber.toString().padStart(numberStr.length, '0');
    const newAssetNumber = `${prefix}${paddedNumber}`;

    const newAsset = {
      companyId: assetData.companyId,
      name: assetData.name,
      type: assetData.type,
      number: newAssetNumber,
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
    currentNumber += 1;
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
        { number: { startsWith: prefix } }, // Info: (20241205 - Shirley) 在 Jest extension 自動執行測試，會在同一毫秒根據多個測試建立資產，因此需要加上這個條件
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

  // eslint-disable-next-line no-console
  console.log('createdAssets in createManyAssets', createdAssets);

  if (!createdAssets.length) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  return createdAssets;
  // return [
  //   {
  //     id: 10060383,
  //     name: 'Dummy asset response',
  //     number: 'EQ-001',
  //     companyId: 10000003,
  //     status: 'normal',
  //     createdAt: 1733457629,
  //     updatedAt: 1733457629,
  //     note: 'Laptop for new employee',
  //   },
  // ];

  // 確保返回的是陣列格式
  // const response: ICreateAssetBulkRepoResponse = createdAssets.map((asset) => ({
  //   id: asset.id,
  //   name: asset.name,
  //   number: asset.number,
  //   companyId: asset.companyId,
  //   status: asset.status,
  //   createdAt: asset.createdAt,
  //   updatedAt: asset.updatedAt,
  //   note: asset.note,
  // }));

  // // eslint-disable-next-line no-console
  // console.log('response in createManyAssets', response);

  // return response;

  // const DUMMY_RES: ICreateAssetBulkRepoResponse = [
  //   {
  //     id: 10060428,
  //     name: 'New Office Laptop',
  //     number: 'EQ-001',
  //     companyId: 10000003,
  //     status: 'normal',
  //     createdAt: 1733458746,
  //     updatedAt: 1733458746,
  //     note: 'Laptop for new employee',
  //   },
  // ];

  // return DUMMY_RES;
}
