import { APIName } from '@/constants/api_connection';
import { askAIGetResultV2Schema, askAIPostValidatorV2 } from '@/lib/utils/zod_schema/ask_ai';
import {
  certificateDeleteValidator,
  certificateGetOneSchema,
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
import {
  todoDeleteSchema,
  todoGetSchema,
  todoListSchema,
  todoPostSchema,
  todoPutSchema,
} from '@/lib/utils/zod_schema/todo';
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
import { roleListSchema } from '@/lib/utils/zod_schema/role';
import { assetExportSchema } from '@/lib/utils/zod_schema/export_asset';
import { nullAPISchema } from '@/lib/utils/zod_schema/common';
import { ledgerListSchema } from '@/lib/utils/zod_schema/ledger';
import { roomDeleteSchema, roomGetSchema, roomPostSchema } from '@/lib/utils/zod_schema/room';
import { fileDeleteSchema, fileGetSchema, filePostSchema } from '@/lib/utils/zod_schema/file';
import { imageGetSchema } from '@/lib/utils/zod_schema/image';

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

// Info: (20241112 - Jacky) Cannot add type Record<APIName, ZodAPISchema> , because Record will make infer type to any
export const ZOD_SCHEMA_API = {
  [APIName.LIST_USER_COMPANY]: companyListSchema,
  [APIName.CREATE_USER_COMPANY]: companyPostSchema,
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
  [APIName.ROLE_LIST]: roleListSchema,
  [APIName.ROOM_ADD]: roomPostSchema,
  [APIName.ROOM_GET_BY_ID]: roomGetSchema,
  [APIName.ROOM_DELETE]: roomDeleteSchema,
  [APIName.NEWS_LIST]: newsListSchema,
  [APIName.CREATE_NEWS]: newsPostSchema,
  [APIName.NEWS_GET_BY_ID]: newsGetByIdSchema,
  [APIName.TODO_LIST]: todoListSchema,
  [APIName.CREATE_TODO]: todoPostSchema,
  [APIName.TODO_GET_BY_ID]: todoGetSchema,
  [APIName.TODO_UPDATE]: todoPutSchema,
  [APIName.TODO_DELETE]: todoDeleteSchema,
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
  [APIName.CERTIFICATE_GET_V2]: certificateGetOneSchema,
  [APIName.ASSET_LIST_EXPORT]: assetExportSchema,
  [APIName.FILE_EXPORT]: assetExportSchema, // ToDo: (20241112 - Luphia) need to define the schema for file export

  [APIName.AGREE_TO_TERMS]: nullAPISchema,
  [APIName.CREATE_CHALLENGE]: nullAPISchema,
  [APIName.SIGN_UP]: nullAPISchema,
  [APIName.SIGN_IN]: nullAPISchema,
  [APIName.SIGN_OUT]: nullAPISchema,
  [APIName.EMAIL]: nullAPISchema,
  [APIName.USER_GET_BY_ID]: nullAPISchema,
  [APIName.USER_UPDATE]: nullAPISchema,
  [APIName.COMPANY_ADD]: nullAPISchema,
  [APIName.COMPANY_GET]: nullAPISchema,
  [APIName.COMPANY_ADD_BY_INVITATION_CODE]: nullAPISchema,
  [APIName.CERTIFICATE_PUT_V2]: nullAPISchema,
  [APIName.CERTIFICATE_DELETE_V2]: nullAPISchema,
  [APIName.CERTIFICATE_DELETE__MULTIPLE_V2]: nullAPISchema,
  [APIName.PROFIT_GET_INSIGHT]: nullAPISchema,
  [APIName.INCOME_EXPENSE_GET_TREND_IN_PERIOD]: nullAPISchema,
  [APIName.LABOR_COST_CHART]: nullAPISchema,
  [APIName.PROFIT_GET_TREND_IN_PERIOD]: nullAPISchema,
  [APIName.PROJECT_LIST_PROGRESS]: nullAPISchema,
  [APIName.PROJECT_LIST_PROFIT_COMPARISON]: nullAPISchema,
  [APIName.ASSET_MANAGEMENT_LIST]: nullAPISchema,
  [APIName.ASSET_MANAGEMENT_ADD]: nullAPISchema,
  [APIName.ASSET_MANAGEMENT_GET_BY_ID]: nullAPISchema,
  [APIName.ASSET_MANAGEMENT_UPDATE]: nullAPISchema,
  [APIName.OCR_UPLOAD]: nullAPISchema,
  [APIName.OCR_DELETE]: nullAPISchema,
  [APIName.OCR_RESULT_GET_BY_ID]: nullAPISchema,
  [APIName.OCR_LIST]: nullAPISchema,
  [APIName.INVOICE_CREATE]: nullAPISchema,
  [APIName.INVOICE_UPDATE]: nullAPISchema,
  [APIName.INVOICE_GET_BY_ID]: nullAPISchema,
  [APIName.IMAGE_GET_BY_ID]: imageGetSchema,
  [APIName.ASK_AI_STATUS]: nullAPISchema,
  [APIName.ASK_AI_RESULT]: nullAPISchema,
  [APIName.ASK_AI_V2]: nullAPISchema,
  [APIName.VOUCHER_CREATE]: nullAPISchema,
  [APIName.VOUCHER_UPDATE]: nullAPISchema,
  [APIName.VOUCHER_WAS_READ_V2]: nullAPISchema,
  [APIName.JOURNAL_GET_BY_ID]: nullAPISchema,
  [APIName.JOURNAL_LIST]: nullAPISchema,
  // [APIName.JOURNAL_UPDATE]: nullAPISchema, // Info: (20240723 - Tzuhan)
  [APIName.JOURNAL_DELETE]: nullAPISchema,
  [APIName.REPORT_LIST]: nullAPISchema,
  [APIName.REPORT_GET_BY_ID]: nullAPISchema,
  [APIName.REPORT_GET_V2]: nullAPISchema,
  [APIName.REPORT_GENERATE]: nullAPISchema,
  [APIName.STATUS_INFO_GET]: nullAPISchema,
  [APIName.ACCOUNT_LIST]: nullAPISchema,
  [APIName.FILE_UPLOAD]: filePostSchema,
  [APIName.PUBLIC_FILE_UPLOAD]: nullAPISchema,
  [APIName.FILE_DELETE]: fileDeleteSchema,
  [APIName.FILE_GET]: fileGetSchema,
  [APIName.ROLE_GET_BY_ID]: nullAPISchema,
  [APIName.ROLE_DELETE]: nullAPISchema,
  [APIName.ROLE_UPDATE]: nullAPISchema,
  [APIName.KYC_UPLOAD]: nullAPISchema,
  [APIName.ACCOUNT_GET_BY_ID]: nullAPISchema,
  [APIName.CREATE_NEW_SUB_ACCOUNT]: nullAPISchema,
  [APIName.UPDATE_ACCOUNT_INFO_BY_ID]: nullAPISchema,
  [APIName.DELETE_ACCOUNT_BY_ID]: nullAPISchema,
  [APIName.TRANSFER_OWNER]: nullAPISchema,
  [APIName.PROJECT_LIST]: nullAPISchema,
  [APIName.CREATE_PROJECT]: nullAPISchema,
  [APIName.GET_PROJECT_BY_ID]: nullAPISchema,
  [APIName.UPDATE_PROJECT_BY_ID]: nullAPISchema,
  [APIName.PUBLIC_KEY_GET]: nullAPISchema,
  [APIName.ZOD_EXAMPLE]: nullAPISchema, // Info: (20240909 - Murky) This is a Zod example, to demonstrate how to use Zod schema to validate data.
  [APIName.CERTIFICATE_LIST]: nullAPISchema,
  [APIName.PUSHER]: nullAPISchema,
  [APIName.ENCRYPT]: nullAPISchema,
  [APIName.DECRYPT]: nullAPISchema,
  [APIName.ASSET_LIST_V2]: nullAPISchema,
  [APIName.ASSET_GET_BY_ID_V2]: nullAPISchema,
  [APIName.CREATE_ASSET_V2]: nullAPISchema,
  [APIName.DELETE_ASSET_V2]: nullAPISchema,
  [APIName.UPDATE_ASSET_V2]: nullAPISchema,
  [APIName.ASSET_SUGGESTED_NUMBER_GET_BY_TYPE]: nullAPISchema,
  [APIName.IP_LIST]: nullAPISchema,
  [APIName.LEDGER_LIST]: ledgerListSchema,
};
