import { AccountType } from '@/constants/account';
import { z } from 'zod';

/**
 * Info: (20241025 - Murky)
 * @description schema for accountEntitySchema to validate recursively
 */
const basicAccountEntityValidator = z.object({
  id: z.number(),
  companyId: z.number(),
  system: z.string(), // Info: (20241023 - Murky) Change to enum ['IFRS', 'GAAP'] if needed
  type: z.nativeEnum(AccountType),
  debit: z.boolean(),
  liquidity: z.boolean(),
  code: z.string(),
  name: z.string(),
  forUser: z.boolean(),
  level: z.number(),
  parentCode: z.string(),
  rootCode: z.string(),
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
