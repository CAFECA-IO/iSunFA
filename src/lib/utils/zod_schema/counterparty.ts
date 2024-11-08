import { z } from 'zod';
import { zodStringToNumber, zodStringToNumberWithDefault } from '@/lib/utils/zod_schema/common';
import { paginatedDataSchema } from '@/lib/utils/zod_schema/pagination';
import { DEFAULT_PAGE_START_AT, DEFAULT_PAGE_LIMIT } from '@/constants/config';
import { CounterpartyType } from '@/constants/counterparty';

/**
 * Info: (20241105 - Murky)
 * @description 這個是給前端用的 ICounterparty
 */
export const ICounterpartyValidator = z.object({
  id: z.number(),
  companyId: z.number(),
  name: z.string(),
  taxId: z.string(),
  type: z.nativeEnum(CounterpartyType),
  note: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Info: (20241029 - Jacky) Counterparty null schema
const counterpartyNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241022 - Jacky) Counterparty list schema
const counterpartyListQuerySchema = z.object({
  companyId: zodStringToNumber,
  type: z.string().optional(),
  searchQuery: z.string().optional(),
  page: zodStringToNumberWithDefault(DEFAULT_PAGE_START_AT),
  pageSize: zodStringToNumberWithDefault(DEFAULT_PAGE_LIMIT),
});

// Info: (20241022 - Jacky) Counterparty post schema
const counterpartyPostQuerySchema = z.object({
  companyId: zodStringToNumber,
});
const counterpartyPostBodySchema = z.object({
  name: z.string(),
  taxId: z.string(),
  type: z.string(),
  note: z.string().optional(),
});

// Info: (20241022 - Jacky) Counterparty get schema
const counterpartyGetByIdQuerySchema = z.object({
  counterpartyId: zodStringToNumber,
});

// Info: (20241022 - Jacky) Counterparty put schema
const counterpartyPutQuerySchema = z.object({
  counterpartyId: zodStringToNumber,
});
const counterpartyPutBodySchema = z.object({
  name: z.string(),
  taxId: z.string(),
  type: z.string(),
  note: z.string(),
});

// Info: (20241022 - Jacky) Counterparty delete schema
const counterpartyDeleteQuerySchema = z.object({
  counterpartyId: zodStringToNumber,
});

const counterpartySchema = z.object({
  id: z.number().int(),
  companyId: z.number().int(),
  name: z.string(),
  taxId: z.string(),
  type: z.string(),
  note: z.string().default(''),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
});

// Info: (20241022 - Jacky) Paginated data schema
const paginatedCounterpartySchema = paginatedDataSchema(counterpartySchema);

export const counterpartyListSchema = {
  input: {
    querySchema: counterpartyListQuerySchema,
    bodySchema: counterpartyNullSchema,
  },
  outputSchema: paginatedCounterpartySchema,
  frontend: counterpartyNullSchema,
};

export const counterpartyPostSchema = {
  input: {
    querySchema: counterpartyPostQuerySchema,
    bodySchema: counterpartyPostBodySchema,
  },
  outputSchema: counterpartySchema,
  frontend: counterpartyPostBodySchema,
};

export const counterpartyGetByIdSchema = {
  input: {
    querySchema: counterpartyGetByIdQuerySchema,
    bodySchema: counterpartyNullSchema,
  },
  outputSchema: counterpartySchema,
  frontend: counterpartyNullSchema,
};

export const counterpartyPutSchema = {
  input: {
    querySchema: counterpartyPutQuerySchema,
    bodySchema: counterpartyPutBodySchema,
  },
  outputSchema: counterpartySchema,
  frontend: counterpartyNullSchema,
};

export const counterpartyDeleteSchema = {
  input: {
    querySchema: counterpartyDeleteQuerySchema,
    bodySchema: counterpartyNullSchema,
  },
  outputSchema: counterpartySchema,
  frontend: counterpartyNullSchema,
};
