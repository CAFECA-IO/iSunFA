import { APIName } from '@/constants/api_connection';
import {
  askAIGetResultV2Schema,
  askAiPostSchema,
  askAIPostValidatorV2,
  askAIStatusSchema,
} from '@/lib/utils/zod_schema/ask_ai';
import {
  certificateDeleteValidator,
  certificateGetOneSchema,
  certificateGetOneValidator,
  certificateListSchema,
  certificateListValidator,
  certificatePostSchema,
  certificatePostValidator,
  certificatePutValidator,
  invoicePutV2Schema,
  invoicePostV2Schema,
  certificateMultiDeleteSchema,
} from '@/lib/utils/zod_schema/certificate';
import { journalRequestValidators } from '@/lib/utils/zod_schema/journal';
import { kycRequestValidators, kycBookkeeperUploadSchema } from '@/lib/utils/zod_schema/kyc';
import { newsGetByIdSchema, newsListSchema, newsPostSchema } from '@/lib/utils/zod_schema/news';
import {
  accountBookPendingTaskSchema,
  userPendingTaskSchema,
} from '@/lib/utils/zod_schema/pending_task';
import {
  generatePublicReportSchemaV2,
  getPublicReportSchemaV2,
  reportGetValidatorV2,
  reportGetSchemaV2,
} from '@/lib/utils/zod_schema/report';
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
  voucherGetAllValidatorV2,
  voucherGetByAccountSchema,
  voucherGetOneSchema,
  voucherGetOneValidatorV2,
  voucherListSchema,
  voucherPostSchema,
  voucherPostValidatorV2,
  voucherPutSchema,
  voucherRestoreSchema,
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

import { userActionLogListSchema } from '@/lib/utils/zod_schema/user_action_log';
import {
  trialBalanceListSchema,
  trialBalanceExportSchema,
} from '@/lib/utils/zod_schema/trial_balance';
import { lineItemGetByAccountSchema } from '@/lib/utils/zod_schema/line_item_account';
import { roleListSchema } from '@/lib/utils/zod_schema/role';
import { assetExportSchema } from '@/lib/utils/zod_schema/export_asset';
import { nullAPISchema } from '@/lib/utils/zod_schema/common';
import { ledgerListSchema } from '@/lib/utils/zod_schema/ledger';
import {
  roomDeleteSchema,
  roomGetPublicKeySchema,
  roomGetSchema,
  roomPostSchema,
} from '@/lib/utils/zod_schema/room';
import {
  fileDeleteSchema,
  fileGetSchema,
  filePostSchema,
  filePutSchema,
} from '@/lib/utils/zod_schema/file';
import { imageGetByIdSchema, imageGetSchema } from '@/lib/utils/zod_schema/image';
import { userGetSchema, userListSchema, userPutSchema } from '@/lib/utils/zod_schema/user';
import { statusInfoGetSchema } from '@/lib/utils/zod_schema/status_info';
import { UserAgreementPostSchema } from '@/lib/utils/zod_schema/user_agreement';
import {
  accountGetV2Schema,
  accountPostV2Schema,
  accountGetByIdSchema,
  accountUpdateSchema,
  accountDeleteSchema,
} from '@/lib/utils/zod_schema/account';
import {
  assetBulkPostSchema,
  assetDeleteSchema,
  assetGetSchema,
  assetListSchema,
  assetPostSchema,
  assetPutSchema,
} from '@/lib/utils/zod_schema/asset';
import { exportLedgerPostSchema } from '@/lib/utils/zod_schema/export_ledger';
import { subscriptionSchemas } from '@/lib/utils/zod_schema/subscription';
import { teamSchemas } from '@/lib/utils/zod_schema/team';
import { paymentPlanListSchema } from '@/lib/utils/zod_schema/payment_plan';
import {
  accountBookCreateSchema,
  accountBookListSchema,
  connectAccountBookSchema,
  getAccountBookInfoSchema,
  updateAccountBookSchema,
  updateAccountBookInfoSchema,
  listAccountBooksByTeamIdSchema,
  deleteAccountBookSchema,
  disconnectAccountBookSchema,
  accountBookListSimpleSchema,
  accountBookPutIconSchema,
  accountBookSearchSchema,
} from '@/lib/utils/zod_schema/account_book';
import {
  createInvoiceRC2Input,
  createInvoiceRC2Output,
  deleteInvoiceRC2Input,
  deleteInvoiceRC2Output,
  getInvoiceRC2Input,
  getInvoiceRC2Output,
  listInvoiceRC2Grouped,
  listInvoiceRC2Input,
  listInvoiceRC2Output,
  updateInvoiceRC2Input,
  updateInvoiceRC2Output,
} from '@/lib/utils/zod_schema/invoice_rc2';
import { publicKeyGetSchema } from '@/lib/utils/zod_schema/public_key';
import {
  getNotificationByIdSchema,
  listNotificationByUserIdSchema,
  readNotificationSchema,
} from '@/lib/utils/zod_schema/notification';
import { listBaifaAccountBookSchema } from '@/lib/utils/zod_schema/baifa/account_book';
import { listBaifaVoucherSchema } from '@/lib/utils/zod_schema/baifa/voucher';

/*
 * Info: (20240909 - Murky) Record need to implement all the keys of the enum,
 * it will cause error when not implement all the keys
 * use code below after all the keys are implemented
 */

// import { IZodValidator } from "@/interfaces/zod_validator";
// export const API_ZOD_SCHEMA: Record<APIName, IZodValidator> = {
//     [APIName.ZOD_EXAMPLE]: zodExampleValidator,
// };

// ToDo: (20241204 - Luphia) unknown for zod schema
export const API_ZOD_SCHEMA = {
  // Info: (20241016 - Jacky) V1 Validators
  [APIName.JOURNAL_LIST]: journalRequestValidators.GET_LIST,
  [APIName.KYC_UPLOAD]: kycRequestValidators.POST,
  [APIName.ZOD_EXAMPLE]: zodExampleValidators.GET_ONE,

  // Info: (20241016 - Jacky) V2 Validators
  [APIName.ASK_AI_V2]: askAIPostValidatorV2,
  [APIName.CERTIFICATE_DELETE_V2]: certificateDeleteValidator,
  [APIName.CERTIFICATE_GET_V2]: certificateGetOneValidator,
  [APIName.CERTIFICATE_LIST_V2]: certificateListValidator,
  [APIName.CERTIFICATE_POST_V2]: certificatePostValidator,
  [APIName.CERTIFICATE_PUT_V2]: certificatePutValidator,
  [APIName.REPORT_GET_V2]: reportGetValidatorV2,
  [APIName.VOUCHER_GET_BY_ID_V2]: voucherGetOneValidatorV2,
  [APIName.VOUCHER_LIST_V2]: voucherGetAllValidatorV2,
  [APIName.VOUCHER_POST_V2]: voucherPostValidatorV2,
};

// Info: (20241112 - Jacky) Cannot add type Record<APIName, ZodAPISchema> , because Record will make infer type to any
export const ZOD_SCHEMA_API = {
  [APIName.CREATE_ACCOUNT_BOOK]: accountBookCreateSchema,
  [APIName.DELETE_ACCOUNT_BOOK]: deleteAccountBookSchema,
  [APIName.ACCOUNT_BOOK_SEARCH_BY_NAME_OR_TAX_ID]: accountBookSearchSchema,
  [APIName.ACCOUNT_BOOK_PENDING_TASK_GET]: accountBookPendingTaskSchema,
  [APIName.COUNTERPARTY_LIST]: counterpartyListSchema,
  [APIName.COUNTERPARTY_ADD]: counterpartyPostSchema,
  [APIName.COUNTERPARTY_GET_BY_ID]: counterpartyGetByIdSchema,
  [APIName.COUNTERPARTY_UPDATE]: counterpartyPutSchema,
  [APIName.COUNTERPARTY_DELETE]: counterpartyDeleteSchema,
  [APIName.USER_PENDING_TASK_GET]: userPendingTaskSchema,
  [APIName.USER_ROLE_LIST]: userRoleListSchema,
  [APIName.USER_SELECT_ROLE]: userRoleSelectSchema,
  [APIName.USER_CREATE_ROLE]: userRolePostSchema,
  [APIName.ROLE_LIST]: roleListSchema,
  [APIName.ROOM_ADD]: roomPostSchema,
  [APIName.ROOM_GET_BY_ID]: roomGetSchema,
  [APIName.ROOM_GET_PUBLIC_KEY_BY_ID]: roomGetPublicKeySchema,
  [APIName.ROOM_DELETE]: roomDeleteSchema,
  [APIName.NEWS_LIST]: newsListSchema,
  [APIName.CREATE_NEWS]: newsPostSchema,
  [APIName.NEWS_GET_BY_ID]: newsGetByIdSchema,
  [APIName.TODO_LIST]: todoListSchema,
  [APIName.CREATE_TODO]: todoPostSchema,
  [APIName.TODO_GET_BY_ID]: todoGetSchema,
  [APIName.UPDATE_TODO]: todoPutSchema,
  [APIName.DELETE_TODO]: todoDeleteSchema,
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
  [APIName.VOUCHER_RESTORE_V2]: voucherRestoreSchema,
  [APIName.REVERSE_LINE_ITEM_GET_BY_ACCOUNT_V2]: lineItemGetByAccountSchema,
  [APIName.VOUCHER_LIST_GET_BY_ACCOUNT_V2]: voucherGetByAccountSchema,
  [APIName.ASK_AI_RESULT_V2]: askAIGetResultV2Schema,
  [APIName.CERTIFICATE_LIST_V2]: certificateListSchema,
  [APIName.LIST_INVOICE_RC2]: listInvoiceRC2Grouped,
  [APIName.LIST_INVOICE_RC2_INPUT]: listInvoiceRC2Input,
  [APIName.CREATE_INVOICE_RC2_INPUT]: createInvoiceRC2Input,
  [APIName.GET_INVOICE_RC2_INPUT]: getInvoiceRC2Input,
  [APIName.UPDATE_INVOICE_RC2_INPUT]: updateInvoiceRC2Input,
  [APIName.DELETE_INVOICE_RC2_INPUT]: deleteInvoiceRC2Input,
  [APIName.LIST_INVOICE_RC2_OUTPUT]: listInvoiceRC2Output,
  [APIName.CREATE_INVOICE_RC2_OUTPUT]: createInvoiceRC2Output,
  [APIName.GET_INVOICE_RC2_OUTPUT]: getInvoiceRC2Output,
  [APIName.UPDATE_INVOICE_RC2_OUTPUT]: updateInvoiceRC2Output,
  [APIName.DELETE_INVOICE_RC2_OUTPUT]: deleteInvoiceRC2Output,

  [APIName.CERTIFICATE_POST_V2]: certificatePostSchema,
  [APIName.CERTIFICATE_GET_V2]: certificateGetOneSchema,
  [APIName.CERTIFICATE_DELETE_MULTIPLE_V2]: certificateMultiDeleteSchema,
  [APIName.ASSET_LIST_EXPORT]: assetExportSchema,
  [APIName.FILE_EXPORT]: assetExportSchema, // ToDo: (20241112 - Luphia) need to define the schema for file export

  [APIName.AGREE_TO_TERMS]: UserAgreementPostSchema,
  [APIName.EMAIL]: nullAPISchema,
  [APIName.USER_LIST]: userListSchema,
  [APIName.USER_GET_BY_ID]: userGetSchema,
  [APIName.USER_UPDATE]: userPutSchema,
  [APIName.CERTIFICATE_PUT_V2]: nullAPISchema,
  [APIName.INVOICE_POST_V2]: invoicePostV2Schema,
  [APIName.INVOICE_PUT_V2]: invoicePutV2Schema,
  [APIName.CERTIFICATE_DELETE_V2]: nullAPISchema,
  [APIName.IMAGE_GET_BY_ID]: imageGetByIdSchema,
  [APIName.GET_IMAGE]: imageGetSchema,
  [APIName.ASK_AI_STATUS]: askAIStatusSchema,
  [APIName.ASK_AI_V2]: askAiPostSchema,
  [APIName.JOURNAL_LIST]: nullAPISchema,
  [APIName.REPORT_LIST]: nullAPISchema,
  [APIName.REPORT_GET_BY_ID]: getPublicReportSchemaV2,
  [APIName.REPORT_GET_V2]: reportGetSchemaV2,
  [APIName.REPORT_GENERATE]: generatePublicReportSchemaV2,
  [APIName.STATUS_INFO_GET]: statusInfoGetSchema,
  [APIName.ACCOUNT_LIST]: accountGetV2Schema,
  [APIName.FILE_UPLOAD]: filePostSchema,
  [APIName.FILE_DELETE]: fileDeleteSchema,
  [APIName.FILE_DELETE_V2]: fileDeleteSchema,
  [APIName.FILE_GET]: fileGetSchema,
  [APIName.FILE_PUT_V2]: filePutSchema,
  [APIName.KYC_UPLOAD]: kycBookkeeperUploadSchema,
  [APIName.ACCOUNT_GET_BY_ID]: accountGetByIdSchema,
  [APIName.CREATE_NEW_SUB_ACCOUNT]: accountPostV2Schema,
  [APIName.UPDATE_ACCOUNT_INFO_BY_ID]: accountUpdateSchema,
  [APIName.DELETE_ACCOUNT_BY_ID]: accountDeleteSchema,
  [APIName.PUBLIC_KEY_GET]: publicKeyGetSchema,
  [APIName.ZOD_EXAMPLE]: nullAPISchema, // Info: (20240909 - Murky) This is a Zod example, to demonstrate how to use Zod schema to validate data.
  [APIName.CERTIFICATE_LIST]: nullAPISchema,
  [APIName.PUSHER_AUTH]: nullAPISchema,
  [APIName.ASSET_LIST_V2]: assetListSchema,
  [APIName.ASSET_GET_BY_ID_V2]: assetGetSchema,
  [APIName.CREATE_ASSET_V2]: assetPostSchema,
  [APIName.DELETE_ASSET_V2]: assetDeleteSchema,
  [APIName.UPDATE_ASSET_V2]: assetPutSchema,
  [APIName.LEDGER_LIST]: ledgerListSchema,
  [APIName.SIGN_IN]: nullAPISchema,
  [APIName.SIGN_OUT]: nullAPISchema,
  [APIName.TRIAL_BALANCE_EXPORT]: trialBalanceExportSchema,
  [APIName.CREATE_ASSET_BULK]: assetBulkPostSchema,
  [APIName.LEDGER_EXPORT]: exportLedgerPostSchema,
  [APIName.LIST_LOGIN_DEVICE]: nullAPISchema,
  [APIName.REMOVE_LOGIN_DEVICE]: nullAPISchema,

  [APIName.CREATE_TEAM]: teamSchemas.create,
  [APIName.LIST_TEAM]: teamSchemas.list,
  [APIName.GET_TEAM_BY_ID]: teamSchemas.get,
  [APIName.UPDATE_TEAM_BY_ID]: teamSchemas.update,
  [APIName.UPDATE_MEMBER]: teamSchemas.updateMember,
  [APIName.DELETE_MEMBER]: teamSchemas.deleteMember,
  [APIName.LIST_ACCOUNT_BOOK_BY_TEAM_ID]: listAccountBooksByTeamIdSchema,
  [APIName.LIST_MEMBER_BY_TEAM_ID]: teamSchemas.listMember,
  [APIName.INVITE_MEMBER_TO_TEAM]: teamSchemas.addMember,
  [APIName.ACCEPT_TEAM_INVITATION]: teamSchemas.acceptInvitation,
  [APIName.DECLINE_TEAM_INVITATION]: teamSchemas.declineInvitation,
  [APIName.REQUEST_TRANSFER_ACCOUNT_BOOK]: teamSchemas.requestTransferAccountBook,
  [APIName.CANCEL_TRANSFER_ACCOUNT_BOOK]: teamSchemas.cancelTransferAccountBook,
  [APIName.ACCEPT_TRANSFER_ACCOUNT_BOOK]: teamSchemas.acceptTransferAccountBook,
  [APIName.DECLINE_TRANSFER_ACCOUNT_BOOK]: teamSchemas.declineTransferAccountBook,
  [APIName.LEAVE_TEAM]: teamSchemas.leaveTeam,

  [APIName.LIST_TEAM_SUBSCRIPTION]: subscriptionSchemas.list,
  [APIName.GET_SUBSCRIPTION_BY_TEAM_ID]: subscriptionSchemas.get,
  [APIName.UPDATE_SUBSCRIPTION]: subscriptionSchemas.update,
  [APIName.LIST_TEAM_INVOICE]: subscriptionSchemas.listInvoiceList,
  [APIName.GET_SUBSCRIPTION_INVOICE_BY_TEAM_ID]: subscriptionSchemas.getInvoice,

  [APIName.GET_CREDIT_CARD_INFO]: subscriptionSchemas.getCreditCard,

  [APIName.LIST_PAYMENT_PLAN]: paymentPlanListSchema,

  [APIName.LIST_ACCOUNT_BOOK_BY_USER_ID]: accountBookListSchema,
  [APIName.LIST_SIMPLE_ACCOUNT_BOOK_BY_USER_ID]: accountBookListSimpleSchema,
  [APIName.CONNECT_ACCOUNT_BOOK_BY_ID]: connectAccountBookSchema,
  [APIName.GET_ACCOUNT_BOOK_INFO_BY_ID]: getAccountBookInfoSchema,
  [APIName.GET_ACCOUNT_BOOK_BY_ID]: getAccountBookInfoSchema,
  [APIName.PUT_TEAM_ICON]: teamSchemas.putIcon,
  [APIName.UPDATE_ACCOUNT_BOOK]: updateAccountBookSchema,
  [APIName.UPDATE_ACCOUNT_BOOK_INFO]: updateAccountBookInfoSchema,
  [APIName.DISCONNECT_ACCOUNT_BOOK]: disconnectAccountBookSchema,
  [APIName.ACCOUNT_BOOK_PUT_ICON]: accountBookPutIconSchema,

  [APIName.USER_PAYMENT_METHOD_LIST]: nullAPISchema,
  [APIName.USER_PAYMENT_METHOD_CHARGE]: nullAPISchema,
  [APIName.PAYMENT_METHOD_REGISTER_REDIRECT]: nullAPISchema,
  [APIName.PAYMENT_METHOD_REGISTER_CALLBACK_OEN]: nullAPISchema,

  [APIName.SEND_VERIFICATION_EMAIL]: nullAPISchema, // ToDo: (20250509 - Liz) need to define the schema for send verification email
  [APIName.VERIFY_CODE]: nullAPISchema, // ToDo: (20250509 - Liz) need to define the schema for verify code

  [APIName.LIST_NOTIFICATION]: listNotificationByUserIdSchema,
  [APIName.GET_NOTIFICATION_BY_ID]: getNotificationByIdSchema,
  [APIName.READ_NOTIFICATION]: readNotificationSchema,
  [APIName.LIST_BAIFA_ACCOUNT_BOOK]: listBaifaAccountBookSchema,
  [APIName.LIST_BAIFA_VOUCHER]: listBaifaVoucherSchema,
  [APIName.GET_VACANCY_BY_ID]: nullAPISchema, // ToDo: (20250704 - Julian) need to define the schema for get vacancy by id
};
