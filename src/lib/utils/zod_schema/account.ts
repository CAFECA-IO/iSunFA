import { AccountSystem, AccountType, EquityType } from '@/constants/account';
import { ReportSheetType } from '@/constants/report';
import { z } from 'zod';
import {
  nullSchema,
  zodStringToBooleanOptional,
  zodStringToNumberOptional,
  zodStringToNumber,
} from '@/lib/utils/zod_schema/common';
import { SortOrder } from '@/constants/sort';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';

/**
 * Info: (20241025 - Murky)
 * @description schema for accountEntitySchema to validate recursively
 */
const basicAccountEntityValidator = z.object({
  id: z.number(),
  companyId: z.number(),
  system: z.nativeEnum(AccountSystem),
  type: z.nativeEnum(AccountType),
  debit: z.boolean(),
  liquidity: z.boolean(),
  code: z.string(),
  name: z.string(),
  note: z.string().nullable(),
  forUser: z.boolean(),
  level: z.number(),
  parentCode: z.string(),
  rootCode: z.string(),
  parentId: z.number(),
  rootId: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

type AccountEntity = z.infer<typeof basicAccountEntityValidator> & {
  parent?: AccountEntity;
  root?: AccountEntity;
};

/**
 * Info: (20241025 - Murky)
 * @description schema for init account entity or parsed prisma account
 */
export const accountEntityValidator: z.ZodType<AccountEntity> = basicAccountEntityValidator.extend({
  parent: z.lazy(() => accountEntityValidator.optional()),
  root: z.lazy(() => accountEntityValidator.optional()),
});

/**
 * Info: (20241105 - Murky)
 * @description IAccount is used in IVoucherBeta => ILineItemBeta => IAccount
 */
export const IAccountValidator = z.object({
  id: z.number(),
  companyId: z.number(),
  system: z.nativeEnum(AccountSystem),
  type: z.nativeEnum(AccountType),
  debit: z.boolean().describe('false will be credit'),
  liquidity: z.boolean(),
  code: z.string(),
  name: z.string(),
  note: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
});

const accountGetQueryV2Schema = z.object({
  accountBookId: zodStringToNumber,
  includeDefaultAccount: zodStringToBooleanOptional,
  liquidity: zodStringToBooleanOptional,
  type: z.nativeEnum(AccountType).optional(),
  reportType: z.nativeEnum(ReportSheetType).optional(),
  equityType: z.nativeEnum(EquityType).optional(),
  forUser: zodStringToBooleanOptional,
  page: zodStringToNumberOptional,
  limit: zodStringToNumberOptional,
  sortBy: z.enum(['code', 'createdAt']).optional(),
  sortOrder: z.nativeEnum(SortOrder).optional(),
  searchKey: z.string().optional(),
  isDeleted: zodStringToBooleanOptional,
});

export const accountGetV2Schema = {
  input: {
    querySchema: accountGetQueryV2Schema,
    bodySchema: nullSchema,
  },
  outputSchema: paginatedDataSchema(IAccountValidator),
  frontend: paginatedDataSchema(IAccountValidator),
};

const accountPostBodyV2Schema = z.object({
  accountId: z.number(),
  name: z.string(),
  note: z.string().nullable(),
});

const accountPostQueryV2Schema = z.object({
  accountBookId: z.string(),
});

export const accountPostV2Schema = {
  input: {
    querySchema: accountPostQueryV2Schema,
    bodySchema: accountPostBodyV2Schema,
  },
  outputSchema: IAccountValidator.strip(), // Info: (20241203 - Murky)  多的部分會被刪掉要用stript 不是strict
  frontend: IAccountValidator,
};

// Info: (20250424 - Shirley) 以下為帳戶模塊的 API schema

/**
 * Info: (20250424 - Shirley) GET account by ID schema
 */
const accountGetByIdQuerySchema = z.object({
  accountBookId: zodStringToNumber,
  accountId: zodStringToNumber,
});

export const accountGetByIdSchema = {
  input: {
    querySchema: accountGetByIdQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: IAccountValidator,
  frontend: nullSchema,
};

/**
 * Info: (20250424 - Shirley) UPDATE account info by ID schema
 */
const accountUpdateBodySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  note: z.string().optional(),
});

export const accountUpdateSchema = {
  input: {
    querySchema: accountGetByIdQuerySchema,
    bodySchema: accountUpdateBodySchema,
  },
  outputSchema: IAccountValidator,
  frontend: nullSchema,
};

/**
 * Info: (20250424 - Shirley) DELETE account by ID schema
 */
export const accountDeleteSchema = {
  input: {
    querySchema: accountGetByIdQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: IAccountValidator,
  frontend: nullSchema,
};
