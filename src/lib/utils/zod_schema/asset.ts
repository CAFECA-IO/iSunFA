import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import { z } from 'zod';

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 IRelatedVoucher, 放在 IAssetDetails 裡面
 */
const IRelatedVoucherValidator = z.object({
  id: z.number(),
  number: z.string(),
});

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 IAssetItem, 放在 IAssetDetails 裡面
 */
const IAssetItemValidator = z.object({
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
