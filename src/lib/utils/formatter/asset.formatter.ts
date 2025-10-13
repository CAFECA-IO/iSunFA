import { Asset as PrismaAsset } from '@prisma/client';
import { IAssetEntity, IAssetItem, IPaginatedAsset } from '@/interfaces/asset';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { assetEntityValidator } from '@/lib/utils/zod_schema/asset';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { ISortOption } from '@/interfaces/sort';
import { pageToOffset } from '@/lib/utils/common';

/**
 * Info: (20241025 - Murky)
 * @description parse prisma asset to asset entity
 * @note please check assetEntityValidator for how validation is parsed
 */
export function parsePrismaAssetToAssetEntity(dto: PrismaAsset): IAssetEntity {
  const newDto = {
    assetVouchers: [],
    accumulatedDepreciation: 0, // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，開發相關功能的時候需要檢查或重構
    remainingLife: 0, // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，開發相關功能的時候需要檢查或重構
    ...dto,
  };

  const { data, success, error } = assetEntityValidator.safeParse(newDto);

  if (!success) {
    throw new FormatterError('parsePrismaAssetToAssetEntity', {
      dto,
      zodErrorMessage: error.message,
      issues: error.issues,
    });
  }

  const assetEntity: IAssetEntity = {
    ...data,
    assetVouchers: data.assetVouchers ?? [],
  };

  return assetEntity;
}

export function formatPaginatedAsset(
  data: IAssetItem[],
  sortOption: ISortOption[],
  page: number,
  pageSize: number = DEFAULT_PAGE_LIMIT
) {
  const skip = pageToOffset(page, pageSize);
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedData = data.slice(skip, skip + pageSize);
  const hasNextPage = skip + pageSize < totalCount;
  const hasPreviousPage = page > 1;

  const paginatedAsset: IPaginatedAsset = {
    data: paginatedData,
    page,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    sort: sortOption,
  };

  return paginatedAsset;
}
