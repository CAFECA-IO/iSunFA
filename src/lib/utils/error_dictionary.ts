import { ApiCode } from "@/lib/utils/status";

export interface IErrorDef {
  code: string;
  message: string;
  status: ApiCode;
}

export class ApiError extends Error {
  public code: string;
  public status: ApiCode;

  constructor(
    code: string,
    message: string,
    status: ApiCode = ApiCode.INTERNAL_SERVER_ERROR,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

export const API_ERRORS = {
  VA_INVALID_MINING_STATE: {
    code: "VA000011",
    message: "Invalid mining state",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_INVALID_MINTING_AMOUNT: {
    code: "VA000012",
    message: "Invalid minting amount",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IS_MISSING_ENODEURL: {
    code: "IS000007",
    message: "Missing enodeUrl",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  FO_SYSTEM_INITIALIZED_ALREADY: {
    code: "FO000001",
    message: "System initialized already",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  VA_ISSUE_AMOUNT_MUST_BE_GREATE: {
    code: "VA000013",
    message: "Issue amount must be greate...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_USER_NOT_FOUND: {
    code: "IN000001",
    message: "User not found",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_REACTION_IS_REQUIRED: {
    code: "IN000002",
    message: "Reaction is required",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_COMMENT_NOT_FOUND: {
    code: "IN000003",
    message: "Comment not found",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_AUTHOR_NOT_FOUND: {
    code: "IN000004",
    message: "Author not found",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_INVALID_THREAD_ID: {
    code: "VA000014",
    message: "Invalid thread ID",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_CONTENT_IS_REQUIRED: {
    code: "IN000005",
    message: "Content is required",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_THREAD_NOT_FOUND: {
    code: "IN000006",
    message: "Thread not found",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_THREADID_IS_REQUIRED: {
    code: "IN000007",
    message: "ThreadId is required",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_GENERATE_AUTH_OPT: {
    code: "IN000008",
    message: "Failed to generate auth opt...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_FAILED_TO_PARSE_PASSKEY_CRE: {
    code: "VA000015",
    message: "Failed to parse passkey cre...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_ENTRYPOINTADDRESS_IS_REQUIRED: {
    code: "VA000016",
    message: "entryPointAddress is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_INVALID_USEROPERATION_STRUC: {
    code: "VA000017",
    message: "Invalid UserOperation struc...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_SERVER_CONFIGURATION_ERROR: {
    code: "IN000009",
    message: "Server configuration error",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_QUERY_PARAMETER_IS_REQUIRED: {
    code: "VA000018",
    message: "Query parameter is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_INVALID_DOCUMENT_TYPE: {
    code: "VA000019",
    message: "Invalid document type",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_STORAGE_DOMAIN_IS_NOT_DEFINED: {
    code: "IN000010",
    message: "STORAGE_DOMAIN is not defined",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_NO_FILE_UPLOADED: {
    code: "VA000020",
    message: "No file uploaded",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_PRICING_PLANS: {
    code: "IN000011",
    message: "Failed to fetch pricing plans",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_FILE_IS_REQUIRED: {
    code: "VA000021",
    message: "File is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_CREATE_AI_ANALYSIS: {
    code: "IN000012",
    message: "Failed to create AI analysis",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_GENERATE_DASHBOAR: {
    code: "IN000013",
    message: "Failed to generate dashboar...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_ESG_RECORD: {
    code: "IN000014",
    message: "Failed to fetch esg record",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_UPDATE_ESG_RECORD: {
    code: "IN000015",
    message: "Failed to update esg record",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_COEFFICIENT: {
    code: "IN000016",
    message: "Failed to fetch coefficient",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_COEFFICIENT_IS_REQUIRED: {
    code: "VA000022",
    message: "Coefficient is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_UPDATE_COEFFICIENT: {
    code: "IN000017",
    message: "Failed to update coefficient",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_CREATE_ESG_COEFFI: {
    code: "IN000018",
    message: "Failed to create esg coeffi...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_ESG_COEFFIC: {
    code: "IN000019",
    message: "Failed to fetch esg coeffic...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_EMISSION_SOURC: {
    code: "IN000020",
    message: "Failed to fetch emission sources",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_EMISSION_SOURCES_IS_REQUIRED: {
    code: "VA000023",
    message: "Emission sources is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_UPDATE_EMISSION_SOUR: {
    code: "IN000021",
    message: "Failed to update emission sources",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_ESG_EMISSION_S: {
    code: "IN000022",
    message: "Failed to fetch esg emission sources",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_NAME_IS_REQUIRED: {
    code: "VA000024",
    message: "Name is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_CREATE_ESG_EMISSION_: {
    code: "IN000023",
    message: "Failed to create esg emission source",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_EMISSION_SO: {
    code: "IN000024",
    message: "Failed to fetch emission so...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_CREATE_ESG_RECORD: {
    code: "IN000025",
    message: "Failed to create esg record",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_ESG_RECORDS: {
    code: "IN000026",
    message: "Failed to fetch esg records",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  NO_ACCOUNTBOOK_NOT_FOUND_OR_NO: {
    code: "NO000001",
    message: "Accountbook not found or no...",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_ESG_SUMMARY: {
    code: "IN000027",
    message: "Failed to fetch ESG summary",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  FO_NO_PERMISSION_TO_VIEW_THIS: {
    code: "FO000002",
    message: "No permission to view this ...",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  VA_YEAR_IS_REQUIRED: {
    code: "VA000025",
    message: "Year is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_VERIFY_ESG_RECORDS: {
    code: "IN000028",
    message: "Failed to verify ESG records",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_JOURNAL_SUM: {
    code: "IN000029",
    message: "Failed to fetch Journal sum...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_VERIFY_JOURNALS: {
    code: "IN000030",
    message: "Failed to verify journals",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_GET_COUNT_OF_VERIFIED_VOUCH: {
    code: "IN000031",
    message: "Get count of verified vouch...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  FO_ONLY_THE_OWNER_CAN_EDIT_THE: {
    code: "FO000003",
    message: "Only the owner can edit the...",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  VA_INVALID_INPUT_DATA: {
    code: "VA000026",
    message: "Invalid input data",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_VOUCHER_SUM: {
    code: "IN000032",
    message: "Failed to fetch Voucher sum...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_VERIFY_VOUCHERS: {
    code: "IN000033",
    message: "Failed to verify vouchers",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  FO_YOU_DO_NOT_HAVE_PERMISSION: {
    code: "FO000004",
    message: "You do not have permission ...",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  IN_FAILED_TO_REVOKE_TOKEN_MAY: {
    code: "IN000034",
    message: "Failed to revoke. Token may...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_GENERATE_SHARE_LINK: {
    code: "IN000035",
    message: "Failed to generate share link",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_ANALYSIS_HI: {
    code: "IN000036",
    message: "Failed to fetch analysis hi...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  ISDPP_MISSING_ACCOUNTBOOKID: {
    code: "ISDPP000001",
    message: "Missing accountBookId",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  ISDPP_NO_FILES_PROVIDED_FOR_SKU_PARS: {
    code: "ISDPP000002",
    message: "No files provided for SKU parsing",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_UPDATE_IDENTITY_A: {
    code: "IN000037",
    message: "Failed to update identity a...",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_ORDER_DETAILS: {
    code: "IN000038",
    message: "Failed to fetch order details",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_PAYMENTMETHODID_IS_REQUIRED: {
    code: "VA000027",
    message: "paymentMethodId is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_MISSING_REQUIRED_FIELDS_FOR: {
    code: "VA000028",
    message: "Missing required fields for...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_INVALID_ORDER_TYPE: {
    code: "VA000029",
    message: "Invalid order type",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_MISSING_ORDERID_OR_FIDO_AUT: {
    code: "VA000030",
    message: "Missing orderId or FIDO aut...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  NO_PAYMENT_METHOD_NOT_FOUND_OR: {
    code: "NO000002",
    message: "Payment method not found or...",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  VA_INVALID_OR_EXPIRED_ORDER: {
    code: "VA000031",
    message: "Invalid or expired order",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  UN_ERROR: {
    code: "UN000001",
    message: "FIDO2 Signature verificatio...",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,
  IN_FAILED_TO_FETCH_POINT_HISTORY: {
    code: "IN000039",
    message: "Failed to fetch point history",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  FO_PERMISSION_DENIED_ONLY_OWN: {
    code: "FO000005",
    message: "Permission denied. Only OWN...",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  UN_MISSING_WEBAUTHN_CHALLENGE: {
    code: "UN000002",
    message: "Missing WebAuthn challenge....",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,
  VA_USER_IS_ALREADY_A_MEMBER_OF: {
    code: "VA000032",
    message: "User is already a member of...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_AN_INVITATION_IS_ALREADY_PE: {
    code: "VA000033",
    message: "An invitation is already pe...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_CANNOT_CHANGE_ROLE_OF_THE_L: {
    code: "VA000034",
    message: "Cannot change role of the l...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  FO_PERMISSION_DENIED_YOU_ARE: {
    code: "FO000006",
    message: "Permission denied. You are ...",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  FO_ADMIN_CANNOT_REMOVE_OTHER_A: {
    code: "FO000007",
    message: "ADMIN cannot remove other A...",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  VA_CANNOT_REMOVE_THE_LAST_OWNE: {
    code: "VA000035",
    message: "Cannot remove the last OWNE...",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_INVALID_TEAM_NAME: {
    code: "VA000036",
    message: "Invalid team name",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  NO_INVITATION_NOT_FOUND_OR_NO: {
    code: "NO000003",
    message: "Invitation not found or no ...",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  FO_YOU_ARE_NOT_THE_INTENDED_RE: {
    code: "FO000008",
    message: "You are not the intended re...",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  VA_TEAM_NAME_IS_REQUIRED: {
    code: "VA000037",
    message: "Team name is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260421 - Luphia) AU: Auth & Permissions (000001 ~ 000099)
  AUTH_INVALID_TOKEN: {
    code: "AU000001",
    message: "Invalid or expired token",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,
  AUTH_MISSING_HEADER: {
    code: "AU000002",
    message: "Missing auth header",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,
  AUTH_ADMIN_REQUIRED: {
    code: "AU000003",
    message: "Admin access required",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  AUTH_NOT_IN_TEAM: {
    code: "AU000004",
    message: "Team membership required",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  AUTH_PERMISSION_DENIED: {
    code: "AU000005",
    message: "Permission denied",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  AUTH_LOGIN_FAILED: {
    code: "AU000006",
    message: "Login failed",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,
  AUTH_INVALID_ROLE: {
    code: "AU000007",
    message: "Invalid role",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef, // Could be VL
  AUTH_USER_CANCELED: {
    code: "AU000008",
    message: "User canceled",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,

  // Info: (20260421 - Luphia) VL: Validation & Input (000001 ~ 000099)
  VL_MISSING_PARAMS: {
    code: "VL000001",
    message: "Missing required parameters",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_INVALID_JSON: {
    code: "VL000002",
    message: "Invalid JSON payload",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_INVALID_ID: {
    code: "VL000003",
    message: "Missing required ID",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_MISSING_FIDO2: {
    code: "VL000004",
    message: "Missing FIDO2 signature",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_BAD_AMOUNT: {
    code: "VL000005",
    message: "Invalid amount or credits",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_INSUFFICIENT_PENDING: {
    code: "VL000006",
    message: "Insufficient pending balance",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_INVALID_ADDRESS: {
    code: "VL000007",
    message: "Invalid address",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_CAMPAIGN_EXPIRED: {
    code: "VL000008",
    message: "Campaign is expired or not active",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_CAMPAIGN_ALREADY_REGISTERED: {
    code: "VL000009",
    message: "User has already registered for this campaign",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_SCHEMA_ERROR: {
    code: "VL000010",
    message: "Schema validation failed",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_INVALID_ORDER_STATUS: {
    code: "VL000011",
    message: "Invalid order status for this operation",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_MISSING_COMPANY_INFO: {
    code: "VL000012",
    message: "Missing required company information",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_PREREQUISITE_FAILED: {
    code: "VL000013",
    message: "Prerequisite task or condition not met",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_EXPIRED_DATA: {
    code: "VL000014",
    message: "Prerequisite data is expired",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_NO_ESG_DATA: {
    code: "VL000015",
    message: "No associated ESG or financial data found",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VL_VOUCHER_IMBALANCED: {
    code: "VL000016",
    message: "Voucher debits and credits are imbalanced",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  // Info: (20260714 - Emily) 報告草稿樂觀鎖衝突(另一分頁/裝置已更新,須重新載入)
  VL_DRAFT_VERSION_CONFLICT: {
    code: "VL000017",
    message: "Report draft version conflict; reload the latest draft",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260421 - Luphia) NF: Not Found Resources (000001 ~ 000099)
  NF_USER: {
    code: "NF000001",
    message: "User not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_ORDER: {
    code: "NF000002",
    message: "Order not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_ACCOUNT_BOOK: {
    code: "NF000003",
    message: "Account book not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_JOURNAL: {
    code: "NF000004",
    message: "Journal not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_VOUCHER: {
    code: "NF000005",
    message: "Voucher not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_ESG: {
    code: "NF000006",
    message: "ESG record not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_FILE: {
    code: "NF000007",
    message: "File not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_ANALYSIS: {
    code: "NF000008",
    message: "Analysis not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_DOCUMENT: {
    code: "NF000009",
    message: "Document not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_THREAD: {
    code: "NF000010",
    message: "Consulting thread not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_COMMENT: {
    code: "NF000011",
    message: "Comment not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_PAYMENT_METHOD: {
    code: "NF000012",
    message: "Payment method not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_COEFFICIENT: {
    code: "NF000013",
    message: "Coefficient not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_ACTION: {
    code: "NF000014",
    message: "Action not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  NF_CAMPAIGN: {
    code: "NF000015",
    message: "Campaign not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  // Info: (20260421 - Luphia) IS: Internal Server Errors (000001 ~ 000099)
  IS_DB_FAILED: {
    code: "IS000001",
    message: "Database operation failed",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IS_UPLOAD_FAILED: {
    code: "IS000002",
    message: "File upload failed",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IS_CONFIG_MISSING: {
    code: "IS000003",
    message: "Server configuration missing",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IS_BLOCKCHAIN_FAILED: {
    code: "IS000004",
    message: "Blockchain contract failed",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IS_DOCKER_FAILED: {
    code: "IS000005",
    message: "Docker operation failed",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IS_KEY_FAILED: {
    code: "IS000006",
    message: "Key generation failed",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IS_GEMINI_API_KEY_UNDEFINED: {
    code: "IS000008",
    message: "GEMINI_API_KEY environment variable is not defined",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260714 - Emily) LLM 結構化輸出未通過後端 Zod 護欄(非 JSON 或欄位不符)
  IS_LLM_OUTPUT_INVALID: {
    code: "IS000009",
    message: "LLM structured output failed validation",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260714 - Emily) 段落草稿生成失敗(LLM 呼叫錯誤的包裝,不透傳原始錯誤)
  IS_PARAGRAPH_DRAFT_FAILED: {
    code: "IS000010",
    message: "Failed to generate paragraph draft",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260714 - Emily) LLM 額度耗盡(429/RESOURCE_EXHAUSTED):與一般錯誤區分,前端可提示稍候重試
  IS_LLM_QUOTA_EXCEEDED: {
    code: "IS000011",
    message: "AI service quota exceeded; please retry shortly",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IS_UNKNOWN: {
    code: "IS000099",
    message: "Internal Server Error",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,

  // Info: (20260703 - Julian) AC: Accounting Account Errors
  IN_FAILED_TO_FETCH_ACCOUNT: {
    code: "AC000001",
    message: "Failed to fetch accounting account",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  IN_FAILED_TO_CREATE_ACCOUNT: {
    code: "AC000002",
    message: "Failed to create accounting account",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  VA_CODE_ALREADY_EXISTS: {
    code: "AC000003",
    message: "Account code already exists",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  NF_PARENT_ACCOUNT: {
    code: "AC000004",
    message: "Parent account not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  VA_STATUS_IS_REQUIRED: {
    code: "VA000038",
    message: "Status is required",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_ACCOUNT_HAS_CHILDREN: {
    code: "VA000039",
    message: "Account has children",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  VA_ACCOUNT_NOT_FOUND: {
    code: "VA000040",
    message: "Account not found",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
};
