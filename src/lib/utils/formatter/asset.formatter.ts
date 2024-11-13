import { Asset as PrismaAsset } from '@prisma/client';
import { IAssetEntity } from '@/interfaces/asset';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { assetEntityValidator } from '@/lib/utils/zod_schema/asset';

/**
 * Info: (20241025 - Murky)
 * @description parse prisma asset to asset entity
 * @note please check assetEntityValidator for how validation is parsed
 */
export function parsePrismaAssetToAssetEntity(dto: PrismaAsset): IAssetEntity {
  const newDto = {
    assetVouchers: [],
    ...dto,
  };

  const { data, success, error } = assetEntityValidator.safeParse(newDto);

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
