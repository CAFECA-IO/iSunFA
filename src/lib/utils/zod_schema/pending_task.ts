import { z } from 'zod';
import { zodStringToNumber } from '@/lib/utils/zod_schema/common';

// Info: (20241029 - Jacky) Pending task null schema
const pendingTaskNullSchema = z.union([z.object({}), z.string()]);

// Info: (20241015 - Jacky) User pending task schema
const userPendingTaskQuerySchema = z.object({
  userId: zodStringToNumber,
});

// Info: (20241015 - Jacky) accountBook pending task schema
const accountBookPendingTaskQuerySchema = z.object({
  accountBookId: zodStringToNumber,
});

const missingCertificateSchema = z.object({
  accountBookId: z.number().int(),
  accountBookName: z.string(),
  count: z.number().int(),
  accountBookLogoSrc: z.string(),
});

const unpostedVoucherSchema = z.object({
  accountBookId: z.number().int(),
  accountBookName: z.string(),
  count: z.number().int(),
  accountBookLogoSrc: z.string(),
});

const pendingTaskSchema = z.object({
  accountBookId: z.number().int(),
  missingCertificate: missingCertificateSchema,
  missingCertificatePercentage: z.number(),
  unpostedVoucher: unpostedVoucherSchema,
  unpostedVoucherPercentage: z.number(),
});

const pendingTaskTotalSchema = z.object({
  userId: z.number().int(),
  totalMissingCertificate: z.number().int(),
  totalMissingCertificatePercentage: z.number(),
  missingCertificateList: z.array(missingCertificateSchema),
  totalUnpostedVoucher: z.number().int(),
  totalUnpostedVoucherPercentage: z.number(),
  unpostedVoucherList: z.array(unpostedVoucherSchema),
});

export const userPendingTaskSchema = {
  input: {
    querySchema: userPendingTaskQuerySchema,
    bodySchema: pendingTaskNullSchema,
  },
  outputSchema: pendingTaskTotalSchema,
  frontend: pendingTaskNullSchema,
};

export const accountBookPendingTaskSchema = {
  input: {
    querySchema: accountBookPendingTaskQuerySchema,
    bodySchema: pendingTaskNullSchema,
  },
  outputSchema: pendingTaskSchema,
  frontend: pendingTaskNullSchema,
};
