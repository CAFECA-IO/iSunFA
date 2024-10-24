import { z } from 'zod';
import { Asset as PrismaAsset } from '@prisma/client';
import { IAssetEntity } from '@/interfaces/asset';
import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import { FormatterError } from '@/lib/utils/error/formatter_error';

export function parsePrismaAssetToAssetEntity(dto: PrismaAsset): IAssetEntity {
  const assetEntitySchema = z.object({
    id: z.number(),
    companyId: z.number(),
    name: z.string(),
    type: z.nativeEnum(AssetEntityType),
    number: z.string(),
    acquisitionDate: z.number(),
    purchasePrice: z.number(),
    accumulatedDepreciation: z.number(),
    residualValue: z.number(),
    remainingLife: z.number(),
    status: z.nativeEnum(AssetStatus),
    depreciationStart: z.number(),
    depreciationMethod: z.nativeEnum(AssetDepreciationMethod),
    usefulLife: z.number(),
    note: z.string(),
    createdAt: z.number(),
    updatedAt: z.number(),
    deletedAt: z.number().nullable(),
    assetVouchers: z.array(z.any()).optional(), // Info: (20241024 - Murky) @Shirley 目前沒有檢查
    company: z.any().optional(), // Info: (20241024 - Murky) @Shirley 目前沒有檢查
  });

  const { data, success, error } = assetEntitySchema.safeParse(dto);

  if (!success) {
    throw new FormatterError('parsePrismaAssetToAssetEntity', {
      dto,
      zodErrorMessage: error.message,
      issues: error.errors,
    });
  }

  const assetEntity: IAssetEntity = {
    ...data,
    assetVouchers: data.assetVouchers ?? [],
  };

  return assetEntity;
}
