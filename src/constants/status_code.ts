enum SuccessCode {
  SUCCESS = '200ISF0000',
  SUCCESS_LIST = '200ISF0001',
  SUCCESS_GET = '200ISF0002',
  SUCCESS_UPDATE = '200ISF0003',
  SUCCESS_DELETE = '200ISF0004',
  SUCCESS_GET_WITH_INVALID_INVITATION = '200ISF0005',
  CREATED = '201ISF0000',
  CREATED_INVITATION = '201ISF0001',
  CREATED_WITH_INVALID_INVITATION = '201ISF0002',
}

enum ErrorCode {
  BAD_REQUEST = '400ISF0000',
  OCR_PROCESS_STATUS_IS_NOT_IN_PROGRESS = '400ISF0001',
  UNSUPPORTED_EXPORT_TYPE = '400ISF0002',
  INVALID_EXPORT_TYPE = '400ISF0003',
  INVALID_FILE_TYPE = '400ISF0004',
  INVALID_COMPANY_ID = '400ISF0005',
  UNSUPPORTED_FILE_TYPE = '400ISF0006',
  INVALID_TIMESTAMP = '400ISF0007',
  INVALID_TIMEZONE_FORMAT = '400ISF0008',
  UNBALANCED_DEBIT_CREDIT = '400ISF0009',
  UNAUTHORIZED_ACCESS = '401ISF0000',
  FORBIDDEN = '403ISF0000',
  RESOURCE_NOT_FOUND = '404ISF0000',
  AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL = '404ISF0001',
  AICH_API_NOT_FOUND = '404ISF0002',
  API_NOT_DEFINED = '404ISF0003',
  METHOD_NOT_ALLOWED = '405ISF0000',
  CONFLICT = '409ISF0000',
  INVITATION_CONFLICT = '409ISF0001',
  DUPLICATE_COMPANY = '409ISF0002',
  DUPLICATE_COMPANY_KYC_DONE = '409ISF0003',
  DUPLICATE_ROLE = '409ISF0004',
  INVALID_INPUT_PARAMETER = '422ISF0000',
  INVALID_INPUT_FORM_DATA_IMAGE = '422ISF0001',
  INVALID_INPUT_INVOICE_BODY_TO_VOUCHER = '422ISF0002',
  INVALID_INPUT_VOUCHER_BODY_TO_JOURNAL = '422ISF0003',
  INVALID_ENUM_VALUE = '422ISF0004',
  INVALID_INPUT_TYPE = '422ISF0005',
  INVALID_VOUCHER_AMOUNT = '422ISF0006',
  INVALID_OUTPUT_DATA = '422ISF0007',
  INVALID_CONTENT_TYPE = '422ISF0008',
  INVALID_FILE_FORMAT = '422ISF0009',
  INTERNAL_SERVICE_ERROR = '500ISF0000',
  IMAGE_UPLOAD_FAILED_ERROR = '500ISF0001',
  DATABASE_CREATE_FAILED_ERROR = '500ISF0002',
  DATABASE_READ_FAILED_ERROR = '500ISF0003',
  PARSE_JSON_FAILED_ERROR = '500ISF0004',
  DATABASE_UPDATE_FAILED_ERROR = '500ISF0005',
  BAD_GATEWAY_PRISMA_ERROR = '500ISF0006',
  INTERNAL_SERVICE_ERROR_AICH_FAILED = '500ISF0007',
  INTERNAL_SERVICE_ERROR_DATA_FROM_AICH_IS_INVALID_TYPE = '500ISF0008',
  INTERNAL_SERVICE_ERROR_PRISMA_ERROR = '500ISF0009',
  MISSING_ERROR_FROM_BACKEND_API = '500ISF0010',
  BAD_GATEWAY = '502ISF0000',
  GATEWAY_TIMEOUT = '504ISF0000',
  DUPLICATE_COUNTERPARTY_NAME = '409ISF0005',
  DUPLICATE_COUNTERPARTY_TAX_ID = '409ISF0006',
}

enum SuccessMessage {
  SUCCESS = 'Success',
  SUCCESS_LIST = 'List successfully',
  SUCCESS_GET = 'Get successfully',
  SUCCESS_UPDATE = 'Update successfully',
  SUCCESS_DELETE = 'Delete successfully',
  SUCCESS_GET_WITH_INVALID_INVITATION = 'Get successfully with invalid invitation',
  CREATED = 'Created successfully',
  CREATED_INVITATION = 'Created invitation successfully',
  CREATED_WITH_INVALID_INVITATION = 'Created successfully with invalid invitation',
  REDIRECT = 'Redirect',
}

enum ErrorMessage {
  BAD_REQUEST = 'Bad request',
  OCR_PROCESS_STATUS_IS_NOT_IN_PROGRESS = 'OCR process status is not in progress',
  UNSUPPORTED_EXPORT_TYPE = 'Unsupported export type',
  INVALID_EXPORT_TYPE = 'Invalid export type for handleAssetExport',
  INVALID_FILE_TYPE = 'Invalid file type',
  INVALID_COMPANY_ID = 'Invalid companyId',
  UNSUPPORTED_FILE_TYPE = 'Unsupported file type',
  INVALID_TIMESTAMP = 'Invalid timestamp',
  INVALID_TIMEZONE_FORMAT = 'Invalid timezone format, should be +HHMM or -HHMM',
  UNBALANCED_DEBIT_CREDIT = 'Debit Amount Must Equal Credit Amount',
  UNAUTHORIZED_ACCESS = 'Unauthorized access',
  RESOURCE_NOT_FOUND = 'Resource not found',
  FORBIDDEN = 'Forbidden',
  AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL = 'AICH successful return but result is null',
  AICH_API_NOT_FOUND = 'AICH API not found',
  API_NOT_DEFINED = 'API is not defined',
  METHOD_NOT_ALLOWED = 'Method not allowed',
  CONFLICT = 'Conflict',
  INVITATION_CONFLICT = 'Invitation has been used',
  DUPLICATE_COMPANY = 'Duplicate company',
  DUPLICATE_COMPANY_KYC_DONE = 'Duplicate company KYC done',
  DUPLICATE_ROLE = 'Duplicate role',
  INVALID_INPUT_PARAMETER = 'Invalid input parameter',
  INVALID_INPUT_FORM_DATA_IMAGE = 'Invalid input form data image',
  INVALID_INPUT_INVOICE_BODY_TO_VOUCHER = 'Invalid input invoice body to voucher',
  INVALID_INPUT_VOUCHER_BODY_TO_JOURNAL = 'Invalid input voucher body to journal',
  INVALID_ENUM_VALUE = 'Invalid enum value',
  INVALID_INPUT_TYPE = 'Invalid input type',
  INVALID_VOUCHER_AMOUNT = 'Voucher amount is not greater or equal to Payment amount, Debit and Credit should be equal and greater than Price * (1 + Tax Rate) + Fee',
  INVALID_OUTPUT_DATA = 'Invalid output data',
  INVALID_CONTENT_TYPE = 'Invalid content type',
  INVALID_FILE_FORMAT = 'Invalid file format',
  INTERNAL_SERVICE_ERROR = 'Internal service error',
  IMAGE_UPLOAD_FAILED_ERROR = 'Image upload failed',
  DATABASE_CREATE_FAILED_ERROR = 'Database create failed',
  DATABASE_READ_FAILED_ERROR = 'Database read failed',
  DATABASE_UPDATE_FAILED_ERROR = 'Database update failed',
  PARSE_JSON_FAILED_ERROR = 'Parse JSON failed',
  BAD_GATEWAY = 'Bad gateway',
  INTERNAL_SERVICE_ERROR_AICH_FAILED = 'Bad gateway connect AICH failed',
  INTERNAL_SERVICE_ERROR_DATA_FROM_AICH_IS_INVALID_TYPE = 'Bad gateway data from AICH is invalid type',
  INTERNAL_SERVICE_ERROR_PRISMA_ERROR = 'Prisma related error',
  GATEWAY_TIMEOUT = 'Gateway timeout',
  MISSING_ERROR_FROM_BACKEND_API = 'Missing error from backend API',
  DUPLICATE_COUNTERPARTY_NAME = 'Duplicate counterparty name',
  DUPLICATE_COUNTERPARTY_TAX_ID = 'Duplicate counterparty tax ID',
}

export const STATUS_MESSAGE = {
  ...SuccessMessage,
  ...ErrorMessage,
};

export const STATUS_CODE = {
  [STATUS_MESSAGE.SUCCESS]: SuccessCode.SUCCESS,
  [STATUS_MESSAGE.SUCCESS_LIST]: SuccessCode.SUCCESS_LIST,
  [STATUS_MESSAGE.SUCCESS_GET]: SuccessCode.SUCCESS_GET,
  [STATUS_MESSAGE.SUCCESS_UPDATE]: SuccessCode.SUCCESS_UPDATE,
  [STATUS_MESSAGE.SUCCESS_DELETE]: SuccessCode.SUCCESS_DELETE,
  [STATUS_MESSAGE.SUCCESS_GET_WITH_INVALID_INVITATION]:
    SuccessCode.SUCCESS_GET_WITH_INVALID_INVITATION,
  [STATUS_MESSAGE.CREATED]: SuccessCode.CREATED,
  [STATUS_MESSAGE.CREATED_INVITATION]: SuccessCode.CREATED_INVITATION,
  [STATUS_MESSAGE.CREATED_WITH_INVALID_INVITATION]: SuccessCode.CREATED_WITH_INVALID_INVITATION,
  [STATUS_MESSAGE.BAD_REQUEST]: ErrorCode.BAD_REQUEST,
  [STATUS_MESSAGE.OCR_PROCESS_STATUS_IS_NOT_IN_PROGRESS]:
    ErrorCode.OCR_PROCESS_STATUS_IS_NOT_IN_PROGRESS,
  [STATUS_MESSAGE.UNSUPPORTED_EXPORT_TYPE]: ErrorCode.UNSUPPORTED_EXPORT_TYPE,
  [STATUS_MESSAGE.INVALID_EXPORT_TYPE]: ErrorCode.INVALID_EXPORT_TYPE,
  [STATUS_MESSAGE.INVALID_FILE_TYPE]: ErrorCode.INVALID_FILE_TYPE,
  [STATUS_MESSAGE.INVALID_COMPANY_ID]: ErrorCode.INVALID_COMPANY_ID,
  [STATUS_MESSAGE.UNSUPPORTED_FILE_TYPE]: ErrorCode.UNSUPPORTED_FILE_TYPE,
  [STATUS_MESSAGE.INVALID_TIMESTAMP]: ErrorCode.INVALID_TIMESTAMP,
  [STATUS_MESSAGE.INVALID_TIMEZONE_FORMAT]: ErrorCode.INVALID_TIMEZONE_FORMAT,
  [STATUS_MESSAGE.UNBALANCED_DEBIT_CREDIT]: ErrorCode.UNBALANCED_DEBIT_CREDIT,
  [STATUS_MESSAGE.UNAUTHORIZED_ACCESS]: ErrorCode.UNAUTHORIZED_ACCESS,
  [STATUS_MESSAGE.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [STATUS_MESSAGE.RESOURCE_NOT_FOUND]: ErrorCode.RESOURCE_NOT_FOUND,
  [STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL]:
    ErrorCode.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL,
  [STATUS_MESSAGE.AICH_API_NOT_FOUND]: ErrorCode.AICH_API_NOT_FOUND,
  [STATUS_MESSAGE.API_NOT_DEFINED]: ErrorCode.API_NOT_DEFINED,
  [STATUS_MESSAGE.METHOD_NOT_ALLOWED]: ErrorCode.METHOD_NOT_ALLOWED,
  [STATUS_MESSAGE.CONFLICT]: ErrorCode.CONFLICT,
  [STATUS_MESSAGE.INVITATION_CONFLICT]: ErrorCode.INVITATION_CONFLICT,
  [STATUS_MESSAGE.DUPLICATE_COMPANY]: ErrorCode.DUPLICATE_COMPANY,
  [STATUS_MESSAGE.DUPLICATE_COMPANY_KYC_DONE]: ErrorCode.DUPLICATE_COMPANY_KYC_DONE,
  [STATUS_MESSAGE.DUPLICATE_ROLE]: ErrorCode.DUPLICATE_ROLE,
  [STATUS_MESSAGE.INVALID_INPUT_PARAMETER]: ErrorCode.INVALID_INPUT_PARAMETER,
  [STATUS_MESSAGE.INVALID_INPUT_INVOICE_BODY_TO_VOUCHER]:
    ErrorCode.INVALID_INPUT_INVOICE_BODY_TO_VOUCHER,
  [STATUS_MESSAGE.INVALID_INPUT_VOUCHER_BODY_TO_JOURNAL]:
    ErrorCode.INVALID_INPUT_VOUCHER_BODY_TO_JOURNAL,
  [STATUS_MESSAGE.INVALID_INPUT_FORM_DATA_IMAGE]: ErrorCode.INVALID_INPUT_FORM_DATA_IMAGE,
  [STATUS_MESSAGE.INVALID_ENUM_VALUE]: ErrorCode.INVALID_ENUM_VALUE,
  [STATUS_MESSAGE.INVALID_INPUT_TYPE]: ErrorCode.INVALID_INPUT_TYPE,
  [STATUS_MESSAGE.INVALID_VOUCHER_AMOUNT]: ErrorCode.INVALID_VOUCHER_AMOUNT,
  [STATUS_MESSAGE.INVALID_OUTPUT_DATA]: ErrorCode.INVALID_OUTPUT_DATA,
  [STATUS_MESSAGE.INVALID_CONTENT_TYPE]: ErrorCode.INVALID_CONTENT_TYPE,
  [STATUS_MESSAGE.INVALID_FILE_FORMAT]: ErrorCode.INVALID_FILE_FORMAT,
  [STATUS_MESSAGE.INTERNAL_SERVICE_ERROR]: ErrorCode.INTERNAL_SERVICE_ERROR,
  [STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR]: ErrorCode.DATABASE_CREATE_FAILED_ERROR,
  [STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR]: ErrorCode.DATABASE_READ_FAILED_ERROR,
  [STATUS_MESSAGE.DATABASE_UPDATE_FAILED_ERROR]: ErrorCode.DATABASE_UPDATE_FAILED_ERROR,
  [STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR]: ErrorCode.PARSE_JSON_FAILED_ERROR,
  [STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR]: ErrorCode.IMAGE_UPLOAD_FAILED_ERROR,
  [STATUS_MESSAGE.BAD_GATEWAY]: ErrorCode.BAD_GATEWAY,
  [STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_AICH_FAILED]: ErrorCode.INTERNAL_SERVICE_ERROR_AICH_FAILED,
  [STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_DATA_FROM_AICH_IS_INVALID_TYPE]:
    ErrorCode.INTERNAL_SERVICE_ERROR_DATA_FROM_AICH_IS_INVALID_TYPE,
  [STATUS_MESSAGE.INTERNAL_SERVICE_ERROR_PRISMA_ERROR]:
    ErrorCode.INTERNAL_SERVICE_ERROR_PRISMA_ERROR,
  [STATUS_MESSAGE.GATEWAY_TIMEOUT]: ErrorCode.GATEWAY_TIMEOUT,
  [STATUS_MESSAGE.MISSING_ERROR_FROM_BACKEND_API]: ErrorCode.MISSING_ERROR_FROM_BACKEND_API,
  [STATUS_MESSAGE.DUPLICATE_COUNTERPARTY_NAME]: ErrorCode.DUPLICATE_COUNTERPARTY_NAME,
  [STATUS_MESSAGE.DUPLICATE_COUNTERPARTY_TAX_ID]: ErrorCode.DUPLICATE_COUNTERPARTY_TAX_ID,
};
