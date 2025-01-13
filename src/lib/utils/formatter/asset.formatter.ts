import { Asset as PrismaAsset } from '@prisma/client';
import { IAssetEntity, IAssetItem, IPaginatedAsset } from '@/interfaces/asset';
import { FormatterError } from '@/lib/utils/error/formatter_error';
import { assetEntityValidator } from '@/lib/utils/zod_schema/asset';
import { DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { ISortOption } from '@/interfaces/sort';
import { pageToOffset } from '@/lib/utils/common';
import { DefaultValue } from '@/constants/default_value';

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
    createdUserId: DefaultValue.USER_ID.SYSTEM, // TODO: (20250113 - Shirley) 在 asset db schema 更改之後，需要紀錄建立資產的 user id
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
