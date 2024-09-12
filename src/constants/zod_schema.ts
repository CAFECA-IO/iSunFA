import { APIName } from '@/constants/api_connection';
import {
  invoiceCreateValidator,
  invoiceGetByIdValidator,
  invoiceUpdateValidator,
} from '@/lib/utils/zod_schema/invoice';
import {
  journalDeleteValidator,
  journalGetByIdValidator,
  journalListValidator,
} from '@/lib/utils/zod_schema/journal';
import { kycUploadValidator } from '@/lib/utils/zod_schema/kyc';
import {
  ocrDeleteValidator,
  ocrListValidator,
  ocrResultGetByIdValidator,
  ocrUploadValidator,
} from '@/lib/utils/zod_schema/ocr';
import { voucherCreateValidator, voucherUpdateValidator } from '@/lib/utils/zod_schema/voucher';
import { zodExampleValidator } from '@/lib/utils/zod_schema/zod_example';

/*
 * Info: (20240909 - Murky) Record need to implement all the keys of the enum,
 * it will cause error when not implement all the keys
 * use code below after all the keys are implemented
 */

// import { IZodValidator } from "@/interfaces/zod_validator";
// export const API_ZOD_SCHEMA: Record<APIName, IZodValidator> = {
//     [APIName.ZOD_EXAMPLE]: zodExampleValidator,
// };

export const API_ZOD_SCHEMA = {
  [APIName.ZOD_EXAMPLE]: zodExampleValidator,
  [APIName.OCR_LIST]: ocrListValidator,
  [APIName.OCR_UPLOAD]: ocrUploadValidator,
  [APIName.OCR_RESULT_GET_BY_ID]: ocrResultGetByIdValidator,
  [APIName.OCR_DELETE]: ocrDeleteValidator,
  [APIName.INVOICE_CREATE]: invoiceCreateValidator,
  [APIName.INVOICE_UPDATE]: invoiceUpdateValidator,
  [APIName.INVOICE_GET_BY_ID]: invoiceGetByIdValidator,
  [APIName.VOUCHER_CREATE]: voucherCreateValidator,
  [APIName.VOUCHER_UPDATE]: voucherUpdateValidator,
  [APIName.JOURNAL_LIST]: journalListValidator,
  [APIName.JOURNAL_GET_BY_ID]: journalGetByIdValidator,
  [APIName.JOURNAL_DELETE]: journalDeleteValidator,
  [APIName.KYC_UPLOAD]: kycUploadValidator,
};
