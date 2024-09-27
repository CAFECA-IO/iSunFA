import { APIName } from '@/constants/api_connection';
import {
  certificateDeleteValidator,
  certificateGetOneValidator,
  certificateListValidator,
  certificatePostValidator,
  certificatePutValidator,
} from '@/lib/utils/zod_schema/certificate';
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
import { ledgerListValidator } from '@/lib/utils/zod_schema/ledger';
import {
  ocrDeleteValidator,
  ocrListValidator,
  ocrResultGetByIdValidator,
  ocrUploadValidator,
} from '@/lib/utils/zod_schema/ocr';
import { trialBalanceListValidator } from '@/lib/utils/zod_schema/trial_balance';
import {
  voucherCreateValidator,
  voucherDeleteValidatorV2,
  voucherGetAllValidatorV2,
  voucherGetOneValidatorV2,
  voucherPostValidatorV2,
  voucherUpdateValidator,
  voucherWasReadValidatorV2,
} from '@/lib/utils/zod_schema/voucher';
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

  // Info: (20240924 - Murky) V2 Down below
  [APIName.CERTIFICATE_LIST_V2]: certificateListValidator,
  [APIName.CERTIFICATE_GET_V2]: certificateGetOneValidator,
  [APIName.CERTIFICATE_POST_V2]: certificatePostValidator,
  [APIName.CERTIFICATE_PUT_V2]: certificatePutValidator,
  [APIName.CERTIFICATE_DELETE_V2]: certificateDeleteValidator,
  [APIName.VOUCHER_LIST_V2]: voucherGetAllValidatorV2,
  [APIName.VOUCHER_POST_V2]: voucherPostValidatorV2,
  [APIName.VOUCHER_WAS_READ_V2]: voucherWasReadValidatorV2,
  [APIName.VOUCHER_GET_BY_ID_V2]: voucherGetOneValidatorV2,
  [APIName.VOUCHER_DELETE_V2]: voucherDeleteValidatorV2,

  [APIName.TRIAL_BALANCE_LIST_V2]: trialBalanceListValidator,
  [APIName.LEDGER_LIST_V2]: ledgerListValidator,
};
