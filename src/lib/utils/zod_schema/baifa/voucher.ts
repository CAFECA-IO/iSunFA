import { paginatedDataQuerySchema } from '@/lib/utils/zod_schema/pagination';
import { nullSchema } from '@/lib/utils/zod_schema/common';
import {
  voucherGetAllFrontendValidatorV2,
  voucherGetAllOutputValidatorV2,
} from '@/lib/utils/zod_schema/voucher';

export const listBaifaVoucherQuerySchema = paginatedDataQuerySchema;

export const listBaifaVoucherOutputSchema = voucherGetAllOutputValidatorV2; // TODO: (20250617 - Tzuhan) Define the output schema for the voucher list

export const listBaifaVoucherSchema = {
  input: {
    querySchema: listBaifaVoucherQuerySchema,
    bodySchema: nullSchema,
  },
  outputSchema: listBaifaVoucherOutputSchema,
  frontend: voucherGetAllFrontendValidatorV2,
};
