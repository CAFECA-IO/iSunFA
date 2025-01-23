import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import { z } from 'zod';
import { nullSchema, zodStringToNumber } from '@/lib/utils/zod_schema/common';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { SortBy } from '@/constants/sort';

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 IRelatedVoucher, 放在 IAssetDetails 裡面
 */
export const IRelatedVoucherValidator = z.object({
  id: z.number(),
  number: z.string(),
});

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 IAssetItem, 放在 IAssetDetails 裡面
 */
export const IAssetItemValidator = z.object({
  id: z.number(),
  currencyAlias: z.string(),
  acquisitionDate: z.number(),
  assetType: z.string(),
  assetNumber: z.string(),
  assetName: z.string(),
  purchasePrice: z.number(),
  accumulatedDepreciation: z.number(),
  residualValue: z.number(),
  remainingLife: z.number(),
  assetStatus: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 IAssetDetails
 */
export const IAssetDetailsValidator = IAssetItemValidator.extend({
  depreciationStart: z.number(),
  depreciationMethod: z.string(),
  usefulLife: z.number(),
  relatedVouchers: z.array(IRelatedVoucherValidator),
  note: z.string().optional(),
});

/**
 * Info: (20241025 - Murky)
 * @description schema for init asset entity or parsed prisma asset
 * @todo assetVouchers and company need to be implemented
 */
export const assetEntityValidator = z.object({
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

export const assetListSortOptions = z.enum([
  SortBy.ACQUISITION_DATE,
  SortBy.PURCHASE_PRICE,
  SortBy.ACCUMULATED_DEPRECIATION,
  SortBy.RESIDUAL_VALUE,
  SortBy.REMAINING_LIFE,
]);

export type IAssetListSortOptions = z.infer<typeof assetListSortOptions>;

// Info: (20241206 - Shirley) query for create single or bulk assets
const IAssetPostInputQueryValidator = z.object({
  companyId: zodStringToNumber,
});

// Info: (20241206 - Shirley) query for get asset by id
const IAssetGetInputQueryValidator = IAssetPostInputQueryValidator.extend({
  assetId: zodStringToNumber,
});

// Info: (20241206 - Shirley) query for delete asset by id
const IAssetDeleteInputQueryValidator = IAssetPostInputQueryValidator.extend({
  assetId: zodStringToNumber,
});

// Info: (20241206 - Shirley) query for list assets
const IAssetListInputQueryValidator = IAssetPostInputQueryValidator.extend({
  page: zodStringToNumber.optional(),
  pageSize: zodStringToNumber.optional(),
  // TODO: (20241210 - Shirley) 現在在 middleware 驗證用 z.string().optional()、進到 repo 再用 `parseSortOption` 去 parse 或給予預設 sort option；之後要改成用 zodFilterSectionSortingOptions 去 parse
  sortOption: z.string().optional(),
  type: z.nativeEnum(AssetEntityType).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  startDate: zodStringToNumber.optional(),
  endDate: zodStringToNumber.optional(),
  searchQuery: z.string().optional(),
});

const IAssetPutInputQueryValidator = IAssetPostInputQueryValidator.extend({
  assetId: zodStringToNumber,
});

export const IAssetPostInputBodyValidator = z.object({
  assetName: z.string(),
  assetType: z.nativeEnum(AssetEntityType),
  assetNumber: z.string(),
  acquisitionDate: z.number(),
  purchasePrice: z.number(),
  amount: z.number(),
  depreciationStart: z.number().optional(),
  depreciationMethod: z.nativeEnum(AssetDepreciationMethod).optional(),
  residualValue: z.number(),
  usefulLife: z.number().optional(),
  note: z.string().optional(),
});

const IAssetPostRepoOutputValidator = z.object({
  id: z.number(),
  name: z.string(),
  number: z.string(),
  companyId: z.number(),
  status: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  note: z.string(),
});

export const IAssetPutRepoInputValidator = z.object({
  assetName: z.string().optional(),
  assetStatus: z.nativeEnum(AssetStatus).optional(),
  acquisitionDate: z.number().optional(),
  purchasePrice: z.number().optional(),
  depreciationStart: z.number().optional(),
  depreciationMethod: z.nativeEnum(AssetDepreciationMethod).optional(),
  usefulLife: z.number().optional(),
  residualValue: z.number().optional(),
  note: z.string().optional(),
});

export const IAssetPostOutputValidator = IAssetPostRepoOutputValidator.extend({
  id: z.number(),
});

export const IAssetBulkPostInputBodyValidator = IAssetPostInputBodyValidator;

export const IAssetBulkPostOutputValidator = z.array(IAssetPostOutputValidator);

export const IAssetListOutputValidator = paginatedDataSchema(IAssetItemValidator);

export const IAssetPutInputBodyValidator = IAssetPutRepoInputValidator.extend({
  updateDate: z.number().optional(),
});

// Info: (20241204 - Luphia) define the schema for frontend (with api response)
export const assetPostSchema = {
  input: {
    querySchema: IAssetPostInputQueryValidator,
    bodySchema: IAssetPostInputBodyValidator,
  },
  outputSchema: IAssetPostOutputValidator,
  frontend: nullSchema,
};

export const assetBulkPostSchema = {
  input: {
    querySchema: IAssetPostInputQueryValidator,
    bodySchema: IAssetBulkPostInputBodyValidator,
  },
  outputSchema: IAssetBulkPostOutputValidator,
  frontend: nullSchema,
};

export const assetGetSchema = {
  input: {
    querySchema: IAssetGetInputQueryValidator,
    bodySchema: nullSchema,
  },
  outputSchema: IAssetDetailsValidator,
  frontend: nullSchema,
};

export const assetDeleteSchema = {
  input: {
    querySchema: IAssetDeleteInputQueryValidator,
    bodySchema: nullSchema,
  },
  outputSchema: IAssetDetailsValidator,
  frontend: nullSchema,
};

export const assetListSchema = {
  input: {
    querySchema: IAssetListInputQueryValidator,
    bodySchema: nullSchema,
  },
  outputSchema: IAssetListOutputValidator,
  frontend: nullSchema,
};

export const assetPutSchema = {
  input: {
    querySchema: IAssetPutInputQueryValidator,
    bodySchema: IAssetPutInputBodyValidator,
  },
  outputSchema: IAssetDetailsValidator,
  frontend: nullSchema,
};
