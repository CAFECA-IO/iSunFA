import type { IAssetEntity } from '@/interfaces/asset';
import type { IVoucherEntity } from '@/interfaces/voucher';
import type { ICompanyEntity } from '@/interfaces/company';
import { Asset as PrismaAsset } from '@prisma/client';
import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import { getTimestampNow } from '@/lib/utils/common';

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
