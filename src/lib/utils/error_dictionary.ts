import { ApiCode } from "@/lib/utils/status";

export interface IErrorDef {
  code: string;
  message: string;
  status: ApiCode;
}

export const API_ERRORS = {
  // Info: (20260421 - Luphia) AU: Auth & Permissions (000001 ~ 000099)
  AUTH_INVALID_TOKEN: { code: "AU000001", message: "Invalid or expired token", status: ApiCode.UNAUTHORIZED } as IErrorDef,
  AUTH_MISSING_HEADER: { code: "AU000002", message: "Missing auth header", status: ApiCode.UNAUTHORIZED } as IErrorDef,
  AUTH_ADMIN_REQUIRED: { code: "AU000003", message: "Admin access required", status: ApiCode.FORBIDDEN } as IErrorDef,
  AUTH_NOT_IN_TEAM: { code: "AU000004", message: "Team membership required", status: ApiCode.FORBIDDEN } as IErrorDef,
  AUTH_PERMISSION_DENIED: { code: "AU000005", message: "Permission denied", status: ApiCode.FORBIDDEN } as IErrorDef,
  AUTH_LOGIN_FAILED: { code: "AU000006", message: "Login failed", status: ApiCode.UNAUTHORIZED } as IErrorDef,
  AUTH_INVALID_ROLE: { code: "AU000007", message: "Invalid role", status: ApiCode.VALIDATION_ERROR } as IErrorDef, // Could be VL

  // Info: (20260421 - Luphia) VL: Validation & Input (000001 ~ 000099)
  VL_MISSING_PARAMS: { code: "VL000001", message: "Missing required parameters", status: ApiCode.VALIDATION_ERROR } as IErrorDef,
  VL_INVALID_JSON: { code: "VL000002", message: "Invalid JSON payload", status: ApiCode.VALIDATION_ERROR } as IErrorDef,
  VL_INVALID_ID: { code: "VL000003", message: "Missing required ID", status: ApiCode.VALIDATION_ERROR } as IErrorDef,
  VL_MISSING_FIDO2: { code: "VL000004", message: "Missing FIDO2 signature", status: ApiCode.VALIDATION_ERROR } as IErrorDef,
  VL_BAD_AMOUNT: { code: "VL000005", message: "Invalid amount or credits", status: ApiCode.VALIDATION_ERROR } as IErrorDef,
  VL_INSUFFICIENT_PENDING: { code: "VL000006", message: "Insufficient pending balance", status: ApiCode.VALIDATION_ERROR } as IErrorDef,
  VL_INVALID_ADDRESS: { code: "VL000007", message: "Invalid address", status: ApiCode.VALIDATION_ERROR } as IErrorDef,

  // Info: (20260421 - Luphia) NF: Not Found Resources (000001 ~ 000099)
  NF_USER: { code: "NF000001", message: "User not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_ORDER: { code: "NF000002", message: "Order not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_ACCOUNT_BOOK: { code: "NF000003", message: "Account book not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_JOURNAL: { code: "NF000004", message: "Journal not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_VOUCHER: { code: "NF000005", message: "Voucher not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_ESG: { code: "NF000006", message: "ESG record not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_FILE: { code: "NF000007", message: "File not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_ANALYSIS: { code: "NF000008", message: "Analysis not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_DOCUMENT: { code: "NF000009", message: "Document not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_THREAD: { code: "NF000010", message: "Consulting thread not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_COMMENT: { code: "NF000011", message: "Comment not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_PAYMENT_METHOD: { code: "NF000012", message: "Payment method not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_COEFFICIENT: { code: "NF000013", message: "Coefficient not found", status: ApiCode.NOT_FOUND } as IErrorDef,
  NF_ACTION: { code: "NF000014", message: "Action not found", status: ApiCode.NOT_FOUND } as IErrorDef,

  // Info: (20260421 - Luphia) IS: Internal Server Errors (000001 ~ 000099)
  IS_DB_FAILED: { code: "IS000001", message: "Database operation failed", status: ApiCode.INTERNAL_SERVER_ERROR } as IErrorDef,
  IS_UPLOAD_FAILED: { code: "IS000002", message: "File upload failed", status: ApiCode.INTERNAL_SERVER_ERROR } as IErrorDef,
  IS_CONFIG_MISSING: { code: "IS000003", message: "Server configuration missing", status: ApiCode.INTERNAL_SERVER_ERROR } as IErrorDef,
  IS_BLOCKCHAIN_FAILED: { code: "IS000004", message: "Blockchain contract failed", status: ApiCode.INTERNAL_SERVER_ERROR } as IErrorDef,
  IS_DOCKER_FAILED: { code: "IS000005", message: "Docker operation failed", status: ApiCode.INTERNAL_SERVER_ERROR } as IErrorDef,
  IS_KEY_FAILED: { code: "IS000006", message: "Key generation failed", status: ApiCode.INTERNAL_SERVER_ERROR } as IErrorDef,
  IS_UNKNOWN: { code: "IS000099", message: "Internal Server Error", status: ApiCode.INTERNAL_SERVER_ERROR } as IErrorDef,
};
