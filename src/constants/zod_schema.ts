import { APIName } from '@/constants/api_connection';
import { askAIGetResultV2Schema, askAIPostValidatorV2 } from '@/lib/utils/zod_schema/ask_ai';
import {
  certificateDeleteValidator,
  certificateGetOneValidator,
  certificateListSchema,
  certificateListValidator,
  certificatePostSchema,
  certificatePostValidator,
  certificatePutValidator,
} from '@/lib/utils/zod_schema/certificate';
import {
  companyDeleteSchema,
  companyGetByIdSchema,
  companyListSchema,
  companyPostSchema,
  companyPutSchema,
  companySelectSchema,
} from '@/lib/utils/zod_schema/company';
import { invoiceRequestValidators } from '@/lib/utils/zod_schema/invoice';
import { journalRequestValidators } from '@/lib/utils/zod_schema/journal';
import { kycRequestValidators } from '@/lib/utils/zod_schema/kyc';
import { newsGetByIdSchema, newsListSchema, newsPostSchema } from '@/lib/utils/zod_schema/news';
import { ocrRequestValidators } from '@/lib/utils/zod_schema/ocr';
import {
  companyPendingTaskSchema,
  userPendingTaskSchema,
} from '@/lib/utils/zod_schema/pending_task';
import { reportGetValidatorV2 } from '@/lib/utils/zod_schema/report';
import {
  userRoleListSchema,
  userRolePostSchema,
  userRoleSelectSchema,
} from '@/lib/utils/zod_schema/user_role';
import { todoListSchema, todoPostSchema } from '@/lib/utils/zod_schema/todo';
import {
  voucherDeleteSchema,
  voucherDeleteValidatorV2,
  voucherGetAllValidatorV2,
  voucherGetByAccountSchema,
  voucherGetOneSchema,
  voucherGetOneValidatorV2,
  voucherListSchema,
  voucherPostSchema,
  voucherPostValidatorV2,
  voucherPutSchema,
  voucherRequestValidatorsV1,
  voucherWasReadValidatorV2,
} from '@/lib/utils/zod_schema/voucher';
import { zodExampleValidators } from '@/lib/utils/zod_schema/zod_example';
import {
  accountingSettingGetSchema,
  accountingSettingPutSchema,
} from '@/lib/utils/zod_schema/accounting_setting';
import {
  counterpartyListSchema,
  counterpartyPostSchema,
  counterpartyGetByIdSchema,
  counterpartyPutSchema,
  counterpartyDeleteSchema,
} from '@/lib/utils/zod_schema/counterparty';
import { userSettingGetSchema, userSettingPutSchema } from '@/lib/utils/zod_schema/user_setting';
import {
  companySettingGetSchema,
  companySettingPutSchema,
} from '@/lib/utils/zod_schema/company_setting';
import { userActionLogListSchema } from '@/lib/utils/zod_schema/user_action_log';
import { trialBalanceListSchema } from '@/lib/utils/zod_schema/trial_balance';
import { lineItemGetByAccountSchema } from '@/lib/utils/zod_schema/line_item_account';

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
  [APIName.INVOICE_CREATE]: invoiceRequestValidators.POST,
  [APIName.INVOICE_GET_BY_ID]: invoiceRequestValidators.GET_ONE,
  [APIName.INVOICE_UPDATE]: invoiceRequestValidators.PUT,
  [APIName.JOURNAL_DELETE]: journalRequestValidators.DELETE,
  [APIName.JOURNAL_GET_BY_ID]: journalRequestValidators.GET_ONE,
  [APIName.JOURNAL_LIST]: journalRequestValidators.GET_LIST,
  [APIName.KYC_UPLOAD]: kycRequestValidators.POST,
  [APIName.OCR_DELETE]: ocrRequestValidators.DELETE,
  [APIName.OCR_LIST]: ocrRequestValidators.GET_LIST,
  [APIName.OCR_RESULT_GET_BY_ID]: ocrRequestValidators.GET_ONE,
  [APIName.OCR_UPLOAD]: ocrRequestValidators.POST,
  [APIName.VOUCHER_CREATE]: voucherRequestValidatorsV1.POST,
  [APIName.VOUCHER_UPDATE]: voucherRequestValidatorsV1.PUT,
  [APIName.ZOD_EXAMPLE]: zodExampleValidators.GET_ONE,

  // Info: (20241016 - Jacky) V2 Validators
  [APIName.ASK_AI_V2]: askAIPostValidatorV2,
  [APIName.CERTIFICATE_DELETE_V2]: certificateDeleteValidator,
  [APIName.CERTIFICATE_GET_V2]: certificateGetOneValidator,
  [APIName.CERTIFICATE_LIST_V2]: certificateListValidator,
  [APIName.CERTIFICATE_POST_V2]: certificatePostValidator,
  [APIName.CERTIFICATE_PUT_V2]: certificatePutValidator,
  [APIName.REPORT_GET_V2]: reportGetValidatorV2,
  [APIName.VOUCHER_DELETE_V2]: voucherDeleteValidatorV2,
  [APIName.VOUCHER_GET_BY_ID_V2]: voucherGetOneValidatorV2,
  [APIName.VOUCHER_LIST_V2]: voucherGetAllValidatorV2,
  [APIName.VOUCHER_POST_V2]: voucherPostValidatorV2,
  [APIName.VOUCHER_WAS_READ_V2]: voucherWasReadValidatorV2,
};

export const ZOD_SCHEMA_API = {
  [APIName.COMPANY_LIST]: companyListSchema,
  [APIName.CREATE_COMPANY]: companyPostSchema,
  [APIName.COMPANY_SELECT]: companySelectSchema,
  [APIName.COMPANY_GET_BY_ID]: companyGetByIdSchema,
  [APIName.COMPANY_UPDATE]: companyPutSchema,
  [APIName.COMPANY_DELETE]: companyDeleteSchema,
  [APIName.COMPANY_SETTING_GET]: companySettingGetSchema,
  [APIName.COMPANY_SETTING_UPDATE]: companySettingPutSchema,
  [APIName.COUNTERPARTY_LIST]: counterpartyListSchema,
  [APIName.COUNTERPARTY_ADD]: counterpartyPostSchema,
  [APIName.COUNTERPARTY_GET_BY_ID]: counterpartyGetByIdSchema,
  [APIName.COUNTERPARTY_UPDATE]: counterpartyPutSchema,
  [APIName.COUNTERPARTY_DELETE]: counterpartyDeleteSchema,
  [APIName.USER_PENDING_TASK_GET]: userPendingTaskSchema,
  [APIName.COMPANY_PENDING_TASK_GET]: companyPendingTaskSchema,
  [APIName.USER_ROLE_LIST]: userRoleListSchema,
  [APIName.USER_SELECT_ROLE]: userRoleSelectSchema,
  [APIName.USER_CREATE_ROLE]: userRolePostSchema,
  [APIName.NEWS_LIST]: newsListSchema,
  [APIName.CREATE_NEWS]: newsPostSchema,
  [APIName.NEWS_GET_BY_ID]: newsGetByIdSchema,
  [APIName.TODO_LIST]: todoListSchema,
  [APIName.CREATE_TODO]: todoPostSchema,
  [APIName.ACCOUNTING_SETTING_GET]: accountingSettingGetSchema,
  [APIName.ACCOUNTING_SETTING_UPDATE]: accountingSettingPutSchema,
  [APIName.USER_SETTING_GET]: userSettingGetSchema,
  [APIName.USER_SETTING_UPDATE]: userSettingPutSchema,
  [APIName.USER_ACTION_LOG_LIST]: userActionLogListSchema,
  [APIName.VOUCHER_POST_V2]: voucherPostSchema,
  [APIName.VOUCHER_LIST_V2]: voucherListSchema,
  [APIName.TRIAL_BALANCE_LIST]: trialBalanceListSchema,
  [APIName.VOUCHER_GET_BY_ID_V2]: voucherGetOneSchema,
  [APIName.VOUCHER_PUT_V2]: voucherPutSchema,
  [APIName.VOUCHER_DELETE_V2]: voucherDeleteSchema,
  [APIName.REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2]: lineItemGetByAccountSchema,
  [APIName.VOUCHER_LIST_GET_BY_ACCOUNT_V2]: voucherGetByAccountSchema,
  [APIName.ASK_AI_RESULT_V2]: askAIGetResultV2Schema,
  [APIName.CERTIFICATE_LIST_V2]: certificateListSchema,
  [APIName.CERTIFICATE_POST_V2]: certificatePostSchema,
};
