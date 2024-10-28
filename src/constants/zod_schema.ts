import { APIName } from '@/constants/api_connection';
import { askAIGetAllValidatorsV2 } from '@/lib/utils/zod_schema/ask_ai';
import { certificateRequestValidators } from '@/lib/utils/zod_schema/certificate';
import {
  companyDeleteValidator,
  companyGetByIdValidator,
  companyListValidator,
  companyPostValidator,
  companyPutValidator,
  companySelectValidator,
} from '@/lib/utils/zod_schema/company';
import { invoiceRequestValidators } from '@/lib/utils/zod_schema/invoice';
import { journalRequestValidators } from '@/lib/utils/zod_schema/journal';
import { kycRequestValidators } from '@/lib/utils/zod_schema/kyc';
import {
  newsGetValidator,
  newsListValidator,
  newsPostValidator,
} from '@/lib/utils/zod_schema/news';
import { ocrRequestValidators } from '@/lib/utils/zod_schema/ocr';
import {
  companyPendingTaskValidator,
  userPendingTaskValidator,
} from '@/lib/utils/zod_schema/pending_task';
import { reportRequestValidatorsV2 } from '@/lib/utils/zod_schema/report';
import {
  roleListValidator,
  rolePostValidator,
  roleSelectValidator,
} from '@/lib/utils/zod_schema/role';
import { todoListValidator, todoPostValidator } from '@/lib/utils/zod_schema/todo';
import {
  voucherRequestValidatorsV1,
  voucherRequestValidatorsV2,
} from '@/lib/utils/zod_schema/voucher';
import { zodExampleValidators } from '@/lib/utils/zod_schema/zod_example';
import {
  accountingSettingGetValidator,
  accountingSettingPutValidator,
} from '@/lib/utils/zod_schema/accounting_setting';
import {
  counterpartyListValidator,
  counterpartyPostValidator,
  counterpartyGetByIdValidator,
  counterpartyPutValidator,
  counterpartyDeleteValidator,
} from '@/lib/utils/zod_schema/counterparty';
import {
  userSettingGetValidator,
  userSettingPutValidator,
} from '@/lib/utils/zod_schema/user_setting';
import {
  companySettingGetValidator,
  companySettingPutValidator,
} from '@/lib/utils/zod_schema/company_setting';
import { userActionLogListValidator } from '@/lib/utils/zod_schema/user_action_log';

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
  [APIName.ASK_AI_RESULT_V2]: askAIGetAllValidatorsV2.GET,
  [APIName.ASK_AI_V2]: askAIGetAllValidatorsV2.POST,
  [APIName.CERTIFICATE_DELETE_V2]: certificateRequestValidators.DELETE,
  [APIName.CERTIFICATE_GET_V2]: certificateRequestValidators.GET_ONE,
  [APIName.CERTIFICATE_LIST_V2]: certificateRequestValidators.GET_LIST,
  [APIName.CERTIFICATE_POST_V2]: certificateRequestValidators.POST,
  [APIName.CERTIFICATE_PUT_V2]: certificateRequestValidators.PUT,
  [APIName.COMPANY_LIST]: companyListValidator,
  [APIName.COMPANY_ADD]: companyPostValidator,
  [APIName.COMPANY_SELECT]: companySelectValidator,
  [APIName.COMPANY_GET_BY_ID]: companyGetByIdValidator,
  [APIName.COMPANY_UPDATE]: companyPutValidator,
  [APIName.COMPANY_DELETE]: companyDeleteValidator,
  [APIName.COMPANY_SETTING_GET]: companySettingGetValidator,
  [APIName.COMPANY_SETTING_UPDATE]: companySettingPutValidator,
  [APIName.COUNTERPARTY_LIST]: counterpartyListValidator,
  [APIName.COUNTERPARTY_ADD]: counterpartyPostValidator,
  [APIName.COUNTERPARTY_GET_BY_ID]: counterpartyGetByIdValidator,
  [APIName.COUNTERPARTY_UPDATE]: counterpartyPutValidator,
  [APIName.COUNTERPARTY_DELETE]: counterpartyDeleteValidator,
  [APIName.USER_PENDING_TASK_GET]: userPendingTaskValidator,
  [APIName.COMPANY_PENDING_TASK_GET]: companyPendingTaskValidator,
  [APIName.REPORT_GET_V2]: reportRequestValidatorsV2.GET_ONE,
  [APIName.ROLE_LIST]: roleListValidator,
  [APIName.ROLE_SELECT]: roleSelectValidator,
  [APIName.CREATE_ROLE]: rolePostValidator,
  [APIName.NEWS_LIST]: newsListValidator,
  [APIName.CREATE_NEWS]: newsPostValidator,
  [APIName.NEWS_GET_BY_ID]: newsGetValidator,
  [APIName.TODO_LIST]: todoListValidator,
  [APIName.CREATE_TODO]: todoPostValidator,
  [APIName.VOUCHER_DELETE_V2]: voucherRequestValidatorsV2.DELETE,
  [APIName.VOUCHER_GET_BY_ID_V2]: voucherRequestValidatorsV2.GET_ONE,
  [APIName.VOUCHER_LIST_V2]: voucherRequestValidatorsV2.GET_LIST,
  [APIName.VOUCHER_POST_V2]: voucherRequestValidatorsV2.POST,
  [APIName.VOUCHER_WAS_READ_V2]: voucherRequestValidatorsV2.WAS_READ,
  [APIName.ACCOUNTING_SETTING_GET]: accountingSettingGetValidator,
  [APIName.ACCOUNTING_SETTING_UPDATE]: accountingSettingPutValidator,
  [APIName.USER_SETTING_GET]: userSettingGetValidator,
  [APIName.USER_SETTING_UPDATE]: userSettingPutValidator,
  [APIName.USER_ACTION_LOG_LIST]: userActionLogListValidator,
};
