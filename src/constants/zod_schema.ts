import { APIName } from '@/constants/api_connection';
import { askAIGetResultValidatorV2, askAIPostValidatorV2 } from '@/lib/utils/zod_schema/ask_ai';
import {
  certificateDeleteValidator,
  certificateGetOneValidator,
  certificateListValidator,
  certificatePostValidator,
  certificatePutValidator,
} from '@/lib/utils/zod_schema/certificate';
import {
  companyDeleteValidator,
  companyGetByIdValidator,
  companyListValidator,
  companyPostValidator,
  companyPutValidator,
  companySelectValidator,
} from '@/lib/utils/zod_schema/company';
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
import { newsListValidator, newsPostValidator } from '@/lib/utils/zod_schema/news';
import {
  ocrDeleteValidator,
  ocrListValidator,
  ocrResultGetByIdValidator,
  ocrUploadValidator,
} from '@/lib/utils/zod_schema/ocr';
import {
  companyPendingTaskValidator,
  userPendingTaskValidator,
} from '@/lib/utils/zod_schema/pending_task';
import { reportGetValidatorV2 } from '@/lib/utils/zod_schema/report';
import {
  roleListValidator,
  rolePostValidator,
  roleSelectValidator,
} from '@/lib/utils/zod_schema/role';
import { todoListValidator, todoPostValidator } from '@/lib/utils/zod_schema/todo';
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
import {
  accountingSettingGetValidator,
  accountingSettingPutValidator,
} from '@/lib/utils/zod_schema/accounting_setting';

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
  // Info: (20241016 - Jacky) V1 Validators
  [APIName.INVOICE_CREATE]: invoiceCreateValidator,
  [APIName.INVOICE_GET_BY_ID]: invoiceGetByIdValidator,
  [APIName.INVOICE_UPDATE]: invoiceUpdateValidator,
  [APIName.JOURNAL_DELETE]: journalDeleteValidator,
  [APIName.JOURNAL_GET_BY_ID]: journalGetByIdValidator,
  [APIName.JOURNAL_LIST]: journalListValidator,
  [APIName.KYC_UPLOAD]: kycUploadValidator,
  [APIName.OCR_DELETE]: ocrDeleteValidator,
  [APIName.OCR_LIST]: ocrListValidator,
  [APIName.OCR_RESULT_GET_BY_ID]: ocrResultGetByIdValidator,
  [APIName.OCR_UPLOAD]: ocrUploadValidator,
  [APIName.VOUCHER_CREATE]: voucherCreateValidator,
  [APIName.VOUCHER_UPDATE]: voucherUpdateValidator,
  [APIName.ZOD_EXAMPLE]: zodExampleValidator,

  // Info: (20241016 - Jacky) V2 Validators
  [APIName.AI_ASK_RESULT_V2]: askAIGetResultValidatorV2,
  [APIName.AI_ASK_V2]: askAIPostValidatorV2,
  [APIName.CERTIFICATE_DELETE_V2]: certificateDeleteValidator,
  [APIName.CERTIFICATE_GET_V2]: certificateGetOneValidator,
  [APIName.CERTIFICATE_LIST_V2]: certificateListValidator,
  [APIName.CERTIFICATE_POST_V2]: certificatePostValidator,
  [APIName.CERTIFICATE_PUT_V2]: certificatePutValidator,
  [APIName.COMPANY_LIST]: companyListValidator,
  [APIName.COMPANY_ADD]: companyPostValidator,
  [APIName.COMPANY_SELECT]: companySelectValidator,
  [APIName.COMPANY_GET_BY_ID]: companyGetByIdValidator,
  [APIName.COMPANY_UPDATE]: companyPutValidator,
  [APIName.COMPANY_DELETE]: companyDeleteValidator,
  [APIName.USER_PENDING_TASK_GET]: userPendingTaskValidator,
  [APIName.COMPANY_PENDING_TASK_GET]: companyPendingTaskValidator,
  [APIName.REPORT_GET_V2]: reportGetValidatorV2,
  [APIName.ROLE_LIST]: roleListValidator,
  [APIName.ROLE_SELECT]: roleSelectValidator,
  [APIName.CREATE_ROLE]: rolePostValidator,
  [APIName.CREATE_NEWS]: newsPostValidator,
  [APIName.TODO_LIST]: todoListValidator,
  [APIName.CREATE_TODO]: todoPostValidator,
  [APIName.NEWS_LIST]: newsListValidator,
  [APIName.VOUCHER_DELETE_V2]: voucherDeleteValidatorV2,
  [APIName.VOUCHER_GET_BY_ID_V2]: voucherGetOneValidatorV2,
  [APIName.VOUCHER_LIST_V2]: voucherGetAllValidatorV2,
  [APIName.VOUCHER_POST_V2]: voucherPostValidatorV2,
  [APIName.VOUCHER_WAS_READ_V2]: voucherWasReadValidatorV2,
  [APIName.GET_ACCOUNTING_SETTING]: accountingSettingGetValidator,
  [APIName.UPDATE_ACCOUNTING_SETTING]: accountingSettingPutValidator,
};
