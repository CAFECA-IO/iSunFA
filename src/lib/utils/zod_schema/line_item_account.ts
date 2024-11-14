/**
 * Info: (20241106 - Murky)
 * @note 避免dependency cycle，將ILineItems
 */

import { z } from 'zod';
import { accountEntityValidator } from '@/lib/utils/zod_schema/account';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import {
  zodFilterSectionSortingOptions,
  zodStringToNumber,
  zodStringToNumberWithDefault,
} from '@/lib/utils/zod_schema/common';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { voucherEntityValidator } from '@/lib/utils/zod_schema/voucher';
import { IReverseItemValidator, lineItemEntityValidator } from '@/lib/utils/zod_schema/line_item';
// Info: (20241106 - Murky) api/v2/voucher/account/[accountId].ts
const nullSchema = z.union([z.object({}), z.string()]);
const lineItemGetByAccountQueryValidatorV2 = z.object({
  accountId: zodStringToNumber,
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
  // type: z.nativeEnum(EventType).optional(),
  // tab: z.nativeEnum(),
  startDate: zodStringToNumberWithDefault(0),
  endDate: zodStringToNumberWithDefault(Infinity),
  sortOption: zodFilterSectionSortingOptions(),
  searchQuery: z.string().optional(),
});

const lineItemGetByAccountBodyValidatorV2 = nullSchema;

const lineItemGetByAccountFrontendValidatorV2 = paginatedDataSchema(
  z.lazy(() => IReverseItemValidator)
);

const lineItemGetByAccountOutputValidatorV2 = paginatedDataSchema(
  z.lazy(() =>
    z.object({
      ...lineItemEntityValidator.shape,
      id: z.number(),
      account: accountEntityValidator,
      voucher: voucherEntityValidator,
    })
  )
).transform((data) => {
  const reverseItems = data.data.map((lineItem) => {
    // Info: (20241111 - Murky) [Warning] 需要確保每個voucher都只會回一筆lineItem
    return {
      voucherId: lineItem.voucher.id,
      voucherNo: lineItem.voucher.no,
      amount: lineItem.amount,
      description: lineItem.description,
      debit: lineItem.debit,
      lineItemBeReversedId: lineItem.id,
      account: {
        id: lineItem.account.id,
        companyId: lineItem.account.companyId,
        system: lineItem.account.system,
        type: lineItem.account.type,
        debit: lineItem.account.debit,
        liquidity: lineItem.account.liquidity,
        code: lineItem.account.code,
        name: lineItem.account.name,
        createdAt: lineItem.account.createdAt,
        updatedAt: lineItem.account.updatedAt,
        deletedAt: lineItem.account.deletedAt,
      },
    };
  });
  const reverseItemsPagination: z.infer<typeof lineItemGetByAccountFrontendValidatorV2> = {
    page: data.page,
    totalPages: data.totalPages,
    totalCount: data.totalCount,
    pageSize: data.pageSize,
    hasNextPage: data.hasNextPage,
    hasPreviousPage: data.hasPreviousPage,
    sort: data.sort,
    data: reverseItems,
  };

  return reverseItemsPagination;
});

// Info: (20241106 - Murky) api/v2/account/[accountId]/lineitem.ts
export const lineItemGetByAccountSchema = {
  input: {
    querySchema: lineItemGetByAccountQueryValidatorV2,
    bodySchema: lineItemGetByAccountBodyValidatorV2,
  },
  outputSchema: lineItemGetByAccountOutputValidatorV2,
  frontend: lineItemGetByAccountFrontendValidatorV2,
};
