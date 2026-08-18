import { ApiCode } from "@/lib/utils/status";
import { DEMO_ATTENDANCE_MAX_RANGE_DAYS } from "@/constants/attendance";

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
  // Info: (20260715 - Luphia) 附件大小超過上限（語意明確，取代先前借用的 VL_SCHEMA_ERROR）
  VA_FILE_TOO_LARGE: {
    code: "VA000041",
    message: "File is too large",
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
  // Info: (20260809 - Luphia) AU000009 ~ AU000015：第三方（OAuth）登入
  AUTH_PROVIDER_UNSUPPORTED: {
    code: "AU000009",
    message: "Unsupported login provider",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  AUTH_PROVIDER_NOT_CONFIGURED: {
    code: "AU000010",
    message: "Login provider not configured",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  AUTH_OAUTH_STATE_INVALID: {
    code: "AU000011",
    message: "Invalid or expired login state",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,
  AUTH_OAUTH_EXCHANGE_FAILED: {
    code: "AU000012",
    message: "Failed to exchange authorization code",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,
  AUTH_OAUTH_EMAIL_UNVERIFIED: {
    code: "AU000013",
    message: "Provider email is not verified",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  AUTH_IDENTITY_ALREADY_LINKED: {
    code: "AU000014",
    message: "Identity already linked to another account",
    status: ApiCode.CONFLICT,
  } as IErrorDef,
  AUTH_IDENTITY_NOT_LINKED: {
    code: "AU000015",
    message: "Identity is not linked to this account",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  AUTH_LAST_LOGIN_METHOD: {
    code: "AU000016",
    message: "Cannot remove the last login method",
    status: ApiCode.CONFLICT,
  } as IErrorDef,
  /**
   * Info: (20260810 - Luphia) 託管代簽只接受本站發出過的 challenge。
   * 這是「不成為簽章預言機」的關鍵防線：對不上就拒絕，絕不代簽來源不明的雜湊。
   */
  AUTH_CHALLENGE_NOT_RECOGNISED: {
    code: "AU000021",
    message: "Challenge was not issued by this server",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  AUTH_CUSTODIAL_KEY_MISSING: {
    code: "AU000017",
    message: "Custodial signing key not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  AUTH_REDIRECT_URI_NOT_ALLOWED: {
    code: "AU000018",
    message: "Redirect URI is not allowed",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  // Info: (20260809 - Luphia) AU000019 ~ AU000020：DB 系統設定的管理員簽章
  AUTH_SETTING_SIGNATURE_INVALID: {
    code: "AU000019",
    message: "Invalid super admin config signature",
    status: ApiCode.UNAUTHORIZED,
  } as IErrorDef,
  AUTH_SUPER_ADMIN_REQUIRED: {
    code: "AU000020",
    message: "Super admin access required",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  CF_SETTING_VERSION_CONFLICT: {
    code: "CF000001",
    message: "Settings changed, please reload",
    status: ApiCode.CONFLICT,
  } as IErrorDef,
  /**
   * Info: (20260810 - Luphia) 現有設定讀不出來時拒絕寫入。
   * 寫入是全量替換，若讀不到現況就覆寫，等於用「看不見的狀態」刪掉既有設定
   * （20260810 曾因此遺失 Google OAuth 設定）。
   */
  /**
   * Info: (20260811 - Luphia) 狀態改為 500：根因是伺服器端讀不到現況（保險庫主密鑰
   * 不可用、設定遭竄改），不是客戶端拿著過期版本。回 409 會讓前端走「重新載入後重試」，
   * 而那條路永遠不會成功——版本衝突請用 CF_SETTING_VERSION_CONFLICT。
   */
  CF_SETTING_STATE_UNREADABLE: {
    code: "CF000002",
    message: "Current settings unreadable, refusing to overwrite",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  CF_VAULT_KEY_WOULD_ORPHAN: {
    code: "CF000003",
    message: "Existing ciphertext would become unreadable",
    status: ApiCode.CONFLICT,
  } as IErrorDef,
  /**
   * Info: (20260809 - Luphia) 與泛用的 IS_CONFIG_MISSING 分開：
   * 這個錯誤有明確的處理方式（設定 SECRET_VAULT_MASTER_KEY 後重新簽署 .env），
   * 混在「設定缺失」裡會讓管理員無從下手。
   */
  IS_SECRET_VAULT_MISSING: {
    code: "IS000098",
    message: "Secret vault master key not configured",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  /**
   * Info: (20260811 - Luphia) 資料庫裡有設定，但驗簽 / digest / 加密狀態對不上。
   * 這種情況不退回 env（那等於讓一行 SQL 就能把系統換回輪替前的舊憑證），
   * 一律拒絕服務並告警，由管理員重新簽署設定或還原資料。
   */
  IS_SETTING_STATE_UNTRUSTED: {
    code: "IS000097",
    message: "Stored system settings failed verification",
    status: ApiCode.INTERNAL_SERVER_ERROR,
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
  // Info: (20260714 - Tzuhan) 報告草稿樂觀鎖衝突(另一分頁/裝置已更新,須重新載入)
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
  // Info: (20260730 - Tzuhan) 碳盤查會話(Chatroom)不存在:封存/還原時明確回報,不假裝成功
  NF_CARBON_SESSION: {
    code: "NF000016",
    message: "Carbon session not found",
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
  /**
   * Info: (20260812 - Luphia) 訊息不再只說 environment variable。
   * 金鑰的正式保管位置已是資料庫的系統設定（/admin/settings），env 只是尚未遷移時的
   * fallback —— 說成環境變數會把維運送去改一個可能根本不生效的地方。
   */
  IS_GEMINI_API_KEY_UNDEFINED: {
    code: "IS000008",
    message: "No LLM API key is configured in system settings or environment",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260714 - Tzuhan) LLM 結構化輸出未通過後端 Zod 護欄(非 JSON 或欄位不符)
  IS_LLM_OUTPUT_INVALID: {
    code: "IS000009",
    message: "LLM structured output failed validation",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260714 - Tzuhan) 段落草稿生成失敗(LLM 呼叫錯誤的包裝,不透傳原始錯誤)
  IS_PARAGRAPH_DRAFT_FAILED: {
    code: "IS000010",
    message: "Failed to generate paragraph draft",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260714 - Tzuhan) LLM 額度耗盡(429/RESOURCE_EXHAUSTED):與一般錯誤區分,前端可提示稍候重試
  IS_LLM_QUOTA_EXCEEDED: {
    code: "IS000011",
    message: "AI service quota exceeded; please retry shortly",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260716 - Tzuhan) 同步路徑 LLM 逾時(#6515):後端不得無限期掛著;與一般錯誤區分,前端提示重試
  IS_LLM_TIMEOUT: {
    code: "IS000012",
    message: "AI service timed out; please retry",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260716 - Tzuhan) API 限流(#6516):IS000012 預留給 #6515 的 IS_LLM_TIMEOUT,本碼取 13 避免撞號
  IS_RATE_LIMITED: {
    code: "IS000013",
    message: "Too many requests; please slow down and retry",
    status: ApiCode.RATE_LIMIT,
  } as IErrorDef,
  // Info: (20260716 - Tzuhan) 附件安全(#6517): 檔頭與宣告 MIME 不符(疑似偽裝檔)
  IS_ATTACHMENT_TYPE_MISMATCH: {
    code: "IS000014",
    message: "File content does not match its declared type",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  // Info: (20260716 - Tzuhan) 附件安全(#6517): 掃毒命中
  IS_ATTACHMENT_INFECTED: {
    code: "IS000015",
    message: "File rejected by malware scan",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  // Info: (20260716 - Tzuhan) 附件安全(#6517): 儲存配額耗盡(每 address 5GB 常數)
  IS_STORAGE_QUOTA_EXCEEDED: {
    code: "IS000016",
    message: "Storage quota exceeded",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  // Info: (20260716 - Tzuhan) #56 報告匯入失敗(LLM 呼叫錯誤的包裝,不透傳原始錯誤)
  IS_REPORT_IMPORT_FAILED: {
    code: "IS000017",
    message: "Failed to import the report",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260720 - Tzuhan) #6520 質量守恆勾稽違反:報告數據段落凍結,待使用者澄清缺口(防漂綠護欄)
  IS_MASS_CONSERVATION_VIOLATED: {
    code: "IS000018",
    message: "Mass conservation check failed; data sections are frozen",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  // Info: (20260730 - Tzuhan) 輸出被 token 上限截斷:與「模型輸出無效」區分,
  // Info: (20260730 - Tzuhan) 前者呼叫端可靠縮小範圍重試解決,後者重試無用
  IS_LLM_OUTPUT_TRUNCATED: {
    code: "IS000019",
    message: "LLM output was truncated by the token limit",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260731 - Tzuhan) 運輸報告向量列印失敗(Chrome 排版/列印階段)。
  // Info: (20260731 - Tzuhan) 取 20 而非 17:IS000017~19 已由 feature/esg_report_ingestion 佔用
  // Info: (20260731 - Tzuhan) (LLM 截斷/逾時/額度),兩分支都會併入 develop,跳號以避免撞碼。
  IS_PDF_GENERATION_FAILED: {
    code: "IS000020",
    message: "Failed to generate PDF report",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  // Info: (20260731 - Julian) 使用者於伺服器回應前主動中止請求；非伺服器故障，與 IS_UNKNOWN 區隔以免污染 5xx 指標
  // Info: (20260801 - Luphia) 原取 IS000017，但該碼已由 #6569 的 IS_REPORT_IMPORT_FAILED 佔用；
  // Info: (20260801 - Luphia) develop 現已用到 IS000020，故改取 21 以避免撞碼。
  IS_REQUEST_ABORTED: {
    code: "IS000021",
    message: "Request aborted by client",
    status: ApiCode.CLIENT_CLOSED_REQUEST,
  } as IErrorDef,
  /**
   * Info: (20260801 - Luphia) 列印環境缺少中文字形。與 IS_PDF_GENERATION_FAILED 區隔,
   * 因為兩者的處置完全不同:後者是 Chrome 排版/列印故障,重試有意義;
   * 前者是主機沒有安裝 CJK 字型,重試一萬次都一樣,必須由維運安裝字型。
   * 混為同一碼會讓「裝字型」這個唯一解法被埋在通用的列印失敗裡。
   */
  IS_PDF_FONT_UNAVAILABLE: {
    code: "IS000022",
    message: "PDF rendering environment has no CJK font installed",
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

  /**
   * Info: (20260807 - Luphia) 團隊錢包與訂閱額度（TW 前綴），
   * 設計書 documents/architecture/team_wallet_and_subscription_quota.md §5 / §7。
   */
  TW_QUOTA_EXCEEDED: {
    code: "TW000001",
    message: "Team subscription quota exceeded",
    status: ApiCode.PAYMENT_REQUIRED,
  } as IErrorDef,
  TW_ALLOCATION_INSUFFICIENT: {
    code: "TW000002",
    message: "Allocated team credits insufficient",
    status: ApiCode.PAYMENT_REQUIRED,
  } as IErrorDef,
  TW_WALLET_INSUFFICIENT: {
    code: "TW000003",
    message: "Team wallet unallocated balance insufficient",
    status: ApiCode.PAYMENT_REQUIRED,
  } as IErrorDef,
  TW_WALLET_FORBIDDEN: {
    code: "TW000004",
    message: "Only team owner or admin can manage the team wallet",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  TW_WALLET_FROZEN: {
    code: "TW000005",
    message: "Team wallet is frozen pending audit",
    status: ApiCode.CONFLICT,
  } as IErrorDef,
  TW_SUBSCRIPTION_NOT_FOUND: {
    code: "TW000006",
    message: "Team subscription not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  TW_INVALID_SPEND_AMOUNT: {
    code: "TW000007",
    message: "Spend amount must be a positive integer",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  TW_NOT_TEAM_MEMBER: {
    code: "TW000008",
    message: "User is not a member of the team",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  TW_OPERATION_FAILED: {
    code: "TW000009",
    message: "Team wallet operation failed",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  TW_INVALID_CREDIT_PLAN: {
    code: "TW000010",
    message: "Unknown credit plan id",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260813 - Julian) ===== 簽到系統 (Time & Attendance) =====

  /**
   * Info: (20260813 - Julian) 登入的 Google 帳號對不到任何員工檔。
   *
   * 「這個人是別的帳本的員工」也回這一個，而不是 403 —— 回「你是員工但不屬於
   * 這個帳本」會洩漏一個不該由未授權者得知的事實：這個信箱在系統裡有員工檔。
   */
  NF_EMPLOYEE_FOR_USER: {
    code: "NF000017",
    message: "No employee record is linked to this account",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  // Info: (20260813 - Julian) 該員工檔已綁給另一個系統帳號
  CF_EMPLOYEE_ALREADY_LINKED: {
    code: "CF000004",
    message: "This employee record is already linked to another account",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 定位精度不足以判定。
   *
   * 訊息刻意寫成「請重試」而不是「你不在現場」：這是**證據品質不足**
   * （還無法判定他到了），不是**判他沒到**。對站在工地上打不了卡的人，
   * 這兩句話的意思完全不同。
   */
  VA_PUNCH_LOW_ACCURACY: {
    code: "VA000042",
    message: "Location accuracy is too low, please try again",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260813 - Julian) 重複上班卡，或未上班就先下班
  VA_PUNCH_INVALID_STATE: {
    code: "VA000043",
    message: "Punch does not match the current attendance state",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 不在任何打卡地點的圍欄內。
   *
   * 圍欄是「到班」這個事實的定義本身 —— 人不在登記的地點，
   * 不是「到班了但有疑慮」，是到班這件事沒有發生。
   * 回應以 `jsonFailWithPayload` 帶上最近地點與距離：收到這個 403 的人
   * 正站在某處試圖上班，「離工區 340 公尺」比「不能打卡」有用得多。
   */
  FO_PUNCH_OUT_OF_FENCE: {
    code: "FO000009",
    message: "You are outside every registered work location",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  // Info: (20260813 - Julian) 帳本尚未設定任何打卡地點：設定問題，不是位置問題
  NF_WORK_LOCATION: {
    code: "NF000018",
    message: "No work location is configured for this account book",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 判定結果的查詢區間超過上限。
   *
   * 訊息帶出上限值，因為收到它的人下一步就是把區間改小 ——
   * 一句「區間太大」會讓他要嘗試幾次才知道界線在哪。
   */
  VA_ATTENDANCE_RANGE_TOO_LARGE: {
    code: "VA000044",
    message: `Attendance query range exceeds ${DEMO_ATTENDANCE_MAX_RANGE_DAYS} days`,
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 指定的打卡地點不存在，或不屬於這個帳本。
   *
   * 與 `NF_WORK_LOCATION`（帳本一個地點都沒設定）分開：後者是設定問題。
   * 這一條刻意**不回空名單** —— 一個打錯的地點 id 若回「現場 0 人」，
   * 在職安場景下與「這個工區真的沒有人」長得一模一樣，而看的人會相信後者。
   */
  NF_WORK_LOCATION_UNKNOWN: {
    code: "NF000019",
    message: "No such work location in this account book",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 排班日的型別與班別不一致（不變式轉譯）。
   *
   * 走 API 的正常路徑到不了這裡 —— zod 的可辨識聯集已讓非法組合送不進來
   * （ADR 019：能讓它不可表示，就不要退而求其次讓它可被拒絕）。
   * 這個碼服務的是**繞過 API 的寫入**：種子腳本、資料遷移、排班表匯入。
   * 沒有它，那些路徑違反不變式時會得到一個與成因無關的 500。
   */
  VA_SCHEDULE_DAY_INVALID: {
    code: "VA000045",
    message: "Work days must carry a shift pattern; other day types must not",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260813 - Julian) 指定的員工不存在，或不屬於這個帳本
  NF_EMPLOYEE: {
    code: "NF000020",
    message: "No such employee in this account book",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 指定的班別不存在，或不屬於這個帳本。
   *
   * 跨帳本那一半不是理論顧慮：`EmployeeShiftDay.shiftPatternId` 在資料庫層
   * 沒有任何跨帳本約束，光靠 id 查得到就寫下去，等於租戶隔離破了一個洞。
   */
  NF_SHIFT_PATTERN: {
    code: "NF000021",
    message: "No such shift pattern in this account book",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 同一帳本內有多筆員工檔的公司信箱只差大小寫。
   *
   * `@@unique([accountBookId, email])` 大小寫敏感，因此這種資料寫得進去。
   * 此時任選一筆綁定，就是讓某人以另一個人的身分打卡 —— 而出勤紀錄是法定文件，
   * 所以擋住並要求 HR 先清理，不猜。
   */
  CF_EMPLOYEE_EMAIL_AMBIGUOUS: {
    code: "CF000005",
    message:
      "Multiple employee records share this e-mail; resolve before linking",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260813 - Julian) 假勤（銷假徵詢）

  // Info: (20260813 - Julian) 指定的請假日不存在、不在生效中，或不屬於這個帳本
  NF_LEAVE_DAY: {
    code: "NF000022",
    message: "No such active leave day in this account book",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  NF_LEAVE_RECALL: {
    code: "NF000023",
    message: "No such leave recall request",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 已過去的請假日不得徵詢銷假。
   *
   * 把過去的假日改回上班日，會讓那一天的判定從 OFF_DAY 變成曠職 ——
   * 一個人的歷史出勤紀錄因為今天的一次操作而多出一筆異常。
   * 這是計畫書 §7.3 第 3 順位那個洞（排班異動會無聲改寫歷史判定）
   * 從「理論上的」變成「每天在用的」的最短路徑，因此擋在 validator 之後、service 之內。
   */
  VA_LEAVE_RECALL_PAST: {
    code: "VA000046",
    message: "A leave day in the past cannot be recalled",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260813 - Julian) 同一個請假日已經有一張待回應的徵詢
  CF_LEAVE_RECALL_PENDING: {
    code: "CF000006",
    message: "This leave day already has a pending recall request",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260813 - Julian) 徵詢已被回應過；同意與婉拒都是終局，不可覆寫
  CF_LEAVE_RECALL_ANSWERED: {
    code: "CF000007",
    message: "This recall request has already been answered",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  /**
   * Info: (20260813 - Julian) 只有被徵詢的本人能回應。
   *
   * 回 403 而不是 404：這裡不必隱藏徵詢的存在 —— 呼叫者手上就有 id，
   * 而「這不是你的」正是他需要知道的事。與 NF_EMPLOYEE_FOR_USER 的取捨不同，
   * 因為那一個洩漏的是「這個信箱在系統裡有員工檔」，這一個沒有等價的洩漏。
   */
  FO_LEAVE_RECALL_NOT_OWNER: {
    code: "FO000010",
    message: "Only the employee on leave can answer this recall request",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  /**
   * Info: (20260814 - Julian) 同一人同一天的排班被並行寫入。
   *
   * `EmployeeShiftDay` 的 `@@unique([accountBookId, employeeId, workDate])` 在
   * Prisma upsert 的競態下會撞 P2002。回 409 讓呼叫端知道「重試一次就好」——
   * 轉成 500 會讓人以為資料庫壞了。
   */
  CF_SCHEDULE_DAY_CONFLICT: {
    code: "CF000008",
    message: "This schedule day was modified concurrently; retry",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260813 - Julian) 只有主管（任一部門的 managerId）能發起徵詢或看地圖
  // Info: (20260817 - Julian) ===== 假勤模組（計畫書 §11）=====

  // Info: (20260817 - Julian) 額度不足。送出時即回饋，但**不預扣**——扣減發生在最後一關通過的交易內（ADR 023 §6）
  VA_LEAVE_INSUFFICIENT_BALANCE: {
    code: "VA000047",
    message: "Insufficient leave balance",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 請假時間不符該假別的最小單位（半小時／半天／整天）
  VA_LEAVE_UNIT_NOT_ALIGNED: {
    code: "VA000048",
    message: "Leave duration does not align with the minimum unit",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 該簽核節點已被決定。同 VA_REQUEST_ALREADY_REVIEWED 的語意，對象換成假單
  VA_LEAVE_ALREADY_REVIEWED: {
    code: "VA000049",
    message: "This approval step has already been decided",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 曆年制給假低於週年制同期應有（ADR 021 §3.1）。
   * 這條護欄的性質與財務的 A = L + E 相同：越過它代表設定有錯，不是需要人判斷的警示。
   */
  VA_LEAVE_CYCLE_DISADVANTAGEOUS: {
    code: "VA000050",
    message:
      "Calendar-year accrual grants fewer days than the anniversary basis",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 逾單日 12 小時（勞動基準法 §32 II）
  VA_OVERTIME_EXCEEDS_DAILY_LIMIT: {
    code: "VA000051",
    message: "Overtime exceeds the statutory 12-hour daily total",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 逾單月 46 小時；帳本已記載工會或勞資會議同意者為 54 小時（§32 II、III）
  VA_OVERTIME_EXCEEDS_MONTHLY_LIMIT: {
    code: "VA000052",
    message: "Overtime exceeds the statutory monthly limit",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 逾三個月 138 小時（§32 III）。區間定義暫採滾動三個月（較嚴）
  VA_OVERTIME_EXCEEDS_QUARTERLY_LIMIT: {
    code: "VA000053",
    message: "Overtime exceeds the statutory three-month limit",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  // Info: (20260817 - Julian) 事前／事後與時序不符。「事前申請卻在下班後才送出」不是一種可選的填法，是一個謊
  VA_OVERTIME_FILING_TYPE_MISMATCH: {
    code: "VA000054",
    message: "Filing type contradicts the submission time",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260818 - Julian) 這張加班單已經被決行過。
   *
   * 與假單的 `VA_LEAVE_ALREADY_REVIEWED` 分開一個碼：加班單是單關決行，
   * 兩者的下一步不同 —— 假單要看鏈上現在輪到誰，加班單重新整理就看得到結果。
   */
  VA_OVERTIME_ALREADY_REVIEWED: {
    code: "VA000060",
    message: "This overtime request has already been decided",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260818 - Julian) 帳本尚未協商補休期限，因此換不了補休。
   *
   * §32-1 只說「期限由勞雇雙方協商」，沒有法定日數，系統不預設一個數字
   * （同 `proofThresholdDays` 留 null 的理由）。猜一個月數的後果是補休在一個
   * 沒有人同意過的日期失效，而失效的補休要折現成錢。
   * 這條只擋 `COMPENSATORY_LEAVE`，選 `PAYMENT` 的加班單不受影響。
   */
  VA_OVERTIME_COMP_EXPIRY_UNSET: {
    code: "VA000061",
    message:
      "The account book has not agreed a compensatory-leave expiry period (Article 32-1)",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260818 - Julian) 那一天沒有排班，因此定不出加成標準。
   *
   * 與 `VA_OVERTIME_PREMIUM_UNDEFINED` 分開：這一個的解法在人資手上
   * （把那天排進班表），另一個要等法源核對。折成同一句話會讓使用者
   * 對著一個他自己補得起來的缺口乾等。
   */
  VA_OVERTIME_DAY_NOT_SCHEDULED: {
    code: "VA000062",
    message: "That work date has no schedule, so no statutory premium applies",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260818 - Julian) 該日別的加成標準尚未定義（請假日、停工日）。
   *
   * 停工日（因雨／颱風／災害）在工程業是常態不是例外，而它既不是例假、
   * 不是休息日、也不是國定假日 —— 加成標準待法源核對（計畫書 §8.1 #8）。
   * 在核對完成前擋下而不猜一個級距：猜錯的方向是少付工資。
   */
  VA_OVERTIME_PREMIUM_UNDEFINED: {
    code: "VA000063",
    message:
      "No statutory overtime premium is defined for that day type yet (pending legal review)",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 在非上班日請假。
   * 判定引擎看非 WORK 就回 OFF_DAY，因此這種假單不會產生任何效果，
   * 卻會扣掉額度 —— 使用者付出了代價卻什麼也沒換到。
   */
  VA_LEAVE_ON_NON_WORKING_DAY: {
    code: "VA000055",
    message: "Leave cannot be taken on a day without a working shift",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 該假別不適用銷假徵詢。
   *
   * §38 III 的「雇主基於企業經營上急迫需求得與勞工協商調整」只寫在特休，
   * 因此 `LeavePolicy.recallable` 只有特休為 true。第一版沒有讀這個欄位 ——
   * 主管可以對產假、病假、生理假發起徵詢，而那不只是沒有法源。
   *
   * 歸類為 VALIDATION 而不是 FORBIDDEN：擋下來的不是「這個人不能做」，
   * 是「這個假別不能被這樣對待」—— 換一個主管來也一樣不行。
   */
  VA_LEAVE_NOT_RECALLABLE: {
    code: "VA000056",
    message: "This leave type cannot be subject to a recall request",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 簽核規則整組不合法（區間有洞／重疊／最後一條有上界／空鏈）。
   *
   * `message` 會被 service 以不變式的原文覆寫 —— 「區間有洞 [3, 5)」與
   * 「最後一條不得有上界」是兩個不同的修法，共用一句泛用訊息等於
   * 只告訴使用者「存不進去」。
   */
  VA_LEAVE_APPROVAL_RULE_INVALID: {
    code: "VA000057",
    message: "The approval rule set is not a valid partition of [0, ∞)",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 通則不得為空。
   *
   * 假別專屬規則清空是合法的（退回走通則），但通則清空的效果是
   * **這個帳本從此沒有任何假單送得出去** —— 而那要到有人請假時才顯現，
   * 屆時錯誤訊息會指向「您尚未設定直屬主管」（同 ADR 023 §3 拒絕空鏈的理由）。
   */
  VA_LEAVE_GENERAL_RULE_REQUIRED: {
    code: "VA000058",
    message: "The general approval rule set cannot be empty",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 授予額度時找不到這名員工的班別。
   *
   * 「一天是幾分鐘」沒有預設值 —— 引擎明確拒絕猜（`dayEquivalentMinutes <= 0`
   * 直接丟）。猜錯的後果是每一批額度的面額都錯，而且錯得看不出來：
   * 餘額畫面會顯示一個看起來正常的數字。
   */
  VA_LEAVE_NO_SHIFT_FOR_ACCRUAL: {
    code: "VA000059",
    message:
      "Cannot accrue leave for an employee with no scheduled shift; the day-equivalent minutes are unknown",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 逾越假單的可見範圍：想看的不是自己的單，
   * 而呼叫者也不在那張單的簽核鏈上。
   *
   * 與 `FO_LEAVE_CALENDAR_SCOPE` 分開：行事曆的範圍是「哪個部門、哪段期間」，
   * 這裡是「這張單是不是你的事」，兩者的訊息與修法都不同。
   *
   * 刻意回 403 而不是 404：「這不是你的」正是呼叫者需要知道的事
   * （取捨同 `FO_LEAVE_RECALL_NOT_OWNER`，與 `NF_EMPLOYEE_FOR_USER` 相反）。
   */
  FO_LEAVE_REQUEST_SCOPE: {
    code: "FO000016",
    message:
      "This leave request is not yours and you are not on its approval chain",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  // Info: (20260817 - Julian) 逾越行事曆的可見範圍（計畫書 §9.2）
  FO_LEAVE_CALENDAR_SCOPE: {
    code: "FO000012",
    message: "You may not view this scope of the leave calendar",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 例假日加班須依勞動基準法 §40 程序（天災事變或突發事件、
   * 24 小時內通報主管機關、事後補假）。系統尚未實作通報與補假，故一律擋下 ——
   * 放行會讓一個違法的排班看起來像一筆正常的加班（ADR 024 §4.5）。
   */
  FO_OVERTIME_ON_REGULAR_OFF: {
    code: "FO000013",
    message:
      "Overtime on a statutory rest day requires the Article 40 procedure",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 不得自我核准（職責分離第 1 條，ADR 023 §5）。
   *
   * 出勤模組計畫書 §D9 早就點名這個代碼，但補登單未實作，因此它從未被建立 ——
   * 假勤模組是第一個真的需要它的地方。
   *
   * 與 `escalatedReason` 的自動上升是同一件事的兩面：本條擋的是
   * 「繞過鏈去簽自己的單」，上升處理的是「鏈本身正當地指向了自己」。
   * 混為一談會得到「老闆不能請假」這個荒謬的結果。
   */
  FO_SELF_APPROVAL_FORBIDDEN: {
    code: "FO000014",
    message: "You may not approve your own request",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 非當前簽核節點不得代簽（職責分離第 2 條）。
   *
   * 訊息刻意說「你不是目前這一關的簽核者」而不是「你沒有權限」——
   * 後者會讓一個排在第二關的主管以為自己被排除在流程外。
   */
  FO_NOT_AUTHORIZED_REVIEWER: {
    code: "FO000015",
    message: "You are not the current approver for this request",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 銷假徵詢的對象不在該主管的部門範圍內。
   *
   * 與 `FO_ATTENDANCE_SUPERVISOR_ONLY` 是兩件事：那個說「你不是主管」，
   * 這個說「你是主管，但這個人不歸你管」。第一版把兩者混在同一個檢查裡
   * （`isDepartmentManager` 只問「有沒有管任何部門」），結果是第一工務段的
   * 主管可以對第五工務段的員工發起徵詢。
   *
   * 回 403 而不是把它偽裝成 404：今日請假名單（A11）本來就對全體員工開放，
   * 「這一天有人請假」不是秘密，藏起來只會讓主管看不懂為什麼按鈕沒有反應。
   */
  /**
   * Info: (20260818 - Julian) 這個動作需要 HR 職能，而呼叫者沒有（甲-1）。
   *
   * 與 `FO_ATTENDANCE_SUPERVISOR_ONLY` 是不同的軸線：那個問「你是不是主管」
   * （組織關係），這個問「你有沒有被指派人事職能」（`EmployeeHrFunctionAssignment`）。
   * 一位工務段主管兩者兼具，一位人資承辦則只有後者 —— 合成同一個碼會讓
   * 「我明明是主管為什麼不行」變成一個無法自己排解的問題。
   *
   * 訊息不列出缺哪一個職能：職能清單本身是組織內部資訊，而呼叫者的下一步
   * 一律是「找人資要權限」，知道是 `HR_ADMIN` 還是 `TIMEKEEPER` 不改變那一步。
   */
  /**
   * Info: (20260818 - Julian) 你是主管，但這個人不歸你管（排班寫入）。
   *
   * 與 `FO_ATTENDANCE_SUPERVISOR_ONLY` 分開的理由，同 `FO_LEAVE_RECALL_SCOPE`
   * 與它分開的理由：那個說「你不是主管」，這個說「你是主管，但範圍不對」。
   * 混為一談會讓一位工務段主管看著「這個動作只有部門主管可以執行」百思不解。
   *
   * 一個刻意的後果：`managesEmployee()` 對「管自己」回 false，所以**主管改不了
   * 自己的排班**，會落到這個碼。那是對的 —— 排班是判定的比較基準，
   * 自己改自己的基準正是職責分離要防的那件事（ADR 023 §5）。
   * 需要改時由具 `HR_ADMIN` / `TIMEKEEPER` 職能的人代為處理。
   */
  FO_ATTENDANCE_SCHEDULE_SCOPE: {
    code: "FO000019",
    message: "This employee is not in your department scope",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  FO_HR_FUNCTION_REQUIRED: {
    code: "FO000018",
    message: "This action requires an HR function assignment",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  FO_LEAVE_RECALL_SCOPE: {
    code: "FO000017",
    message: "This employee is not in your department scope",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,

  // Info: (20260817 - Julian) 假別不存在或已停用
  NF_LEAVE_POLICY: {
    code: "NF000024",
    message: "Leave policy not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  // Info: (20260817 - Julian) 額度批次不存在
  NF_LEAVE_GRANT: {
    code: "NF000025",
    message: "Leave grant not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  // Info: (20260817 - Julian) 加班單不存在
  NF_OVERTIME_REQUEST: {
    code: "NF000026",
    message: "Overtime request not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  // Info: (20260817 - Julian) 假單不存在（或不屬於本帳本）
  NF_LEAVE_REQUEST: {
    code: "NF000027",
    message: "Leave request not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,

  /**
   * Info: (20260817 - Julian) 簽核鏈展開為空（ADR 023 §3）。
   * **不自動核准** —— 那會讓一個設定缺口靜默地變成一張看起來正常的生效假單。
   * 訊息須指出缺什麼（沒有主管／部門沒有經理／帳本沒有 HR），因為解法在 HR 手上不在員工手上。
   */
  CF_LEAVE_APPROVAL_CHAIN_UNRESOLVED: {
    code: "CF000009",
    message: "No approver could be resolved for this request",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260817 - Julian) 同人同日已有生效假單（LeaveDay.activeKey 撞擊）
  CF_LEAVE_DAY_ALREADY_ACTIVE: {
    code: "CF000010",
    message: "An active leave already exists for this employee on this date",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260817 - Julian) 併休超限且該假別可硬擋（employerMayReject = true）。特休永遠走不到這裡
  CF_LEAVE_CONCURRENCY_EXCEEDED: {
    code: "CF000011",
    message: "Too many concurrent leaves in this department",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  // Info: (20260817 - Julian) 核准當下額度被他單先扣（ADR 023 §6.4 的 updateMany count === 0）
  CF_LEAVE_BALANCE_RACE: {
    code: "CF000012",
    message: "Leave balance was consumed by another request",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  FO_ATTENDANCE_SUPERVISOR_ONLY: {
    code: "FO000011",
    message: "This action is limited to department managers",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
};
