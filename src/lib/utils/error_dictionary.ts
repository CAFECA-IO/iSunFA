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
  /**
   * Info: (20260813 - Luphia) 團隊不存在（後台發放點數等以 teamId 定址的操作）。
   *
   * Info: (20260818 - Luphia) 由 `NF000017` 改為 `NF000024`（第五輪 B-1）。
   *
   * develop 在 PR #6651 以同一個碼定義了 `NF_EMPLOYEE_FOR_USER`（「這個人不是這個
   * 帳本的員工」，刻意不回 403 以免洩漏「這個信箱在系統裡有員工檔」）。
   * `API_ERRORS` 以**鍵**索引，兩個鍵並存不會有型別錯誤——只有 code 字串撞號，
   * 而任何依 `errorCode` 分流的前端文案、i18n 映射與支援文件都分不出這兩件事。
   * 對方那條的存在理由正是「不要洩漏」，被映射成「團隊不存在」等於保護失效。
   *
   * 兩邊都是新增的碼，改動哪一邊都行；改這邊是因為 develop 已經合併、
   * 而這條分支還沒有。
   */
  NF_TEAM: {
    code: "NF000024",
    message: "Team not found",
    status: ApiCode.NOT_FOUND,
  } as IErrorDef,
  /**
   * Info: (20260813 - Luphia) 碳盤查會話未綁定帳本（產品拍板 20260813：一律綁帳本）。
   * 沒有帳本就沒有計費團隊，扣不了額度；此時 fail closed 而非放行不計費，
   * 並以專屬錯誤碼讓前端能引導用戶把會話綁到帳本，而不是丟一句「系統錯誤」。
   */
  /**
   * Info: (20260818 - Luphia) 由 `VA000041` 改為 `VA000047`（第五輪自查）。
   *
   * 這個碼在**同一個檔案**裡已經被 `VA_FILE_TOO_LARGE`（既有）用掉了——
   * 本 PR 新增這一條時沿用了一個已在使用中的號碼。不是跨分支的問題，
   * 是這條分支自己的重複，而在此之前沒有任何機制會發現
   * （見 `error_dictionary_codes.test.ts`）。
   */
  VA_CARBON_SESSION_NOT_BOUND: {
    code: "VA000047",
    message: "Carbon session is not bound to an account book",
    status: ApiCode.VALIDATION_ERROR,
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
  /**
   * Info: (20260813 - Luphia) 無帳本會話改扣個人點數時，尚未完成付款（產品拍板 20260813）。
   * 個人點數在鏈上，扣款需簽章：伺服器先建單並以此錯誤回傳 orderId，
   * 前端走既有 useOrderTransaction 完成付款後重送同一則訊息（冪等鍵相同，不會重複建單）。
   * 託管帳號的簽章由伺服器代行，體感上就是直接扣。
   */
  /**
   * Info: (20260813 - Luphia) 用戶屬於多個團隊卻未指定付款團隊（設計書 §5.6）。
   * 歧義不該由系統猜——猜錯的後果是某個團隊莫名其妙被扣了額度。
   * 前端據此出團隊選單，而不是隨便挑一個。
   */
  TW_TEAM_AMBIGUOUS: {
    code: "TW000011",
    message: "Multiple teams available; specify which team pays",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  /**
   * Info: (20260818 - Luphia) 由 `TW000010` 改為 `TW000021`（第五輪自查）。
   *
   * 同上：`TW_INVALID_CREDIT_PLAN`（既有）已經使用 `TW000010`。
   * 這一條是 402 的付款要求，前端會依它切換到「以個人點數支付」的流程；
   * 與「方案代碼無效」共用同一個字串，前端只能靠其他欄位猜。
   */
  TW_PERSONAL_PAYMENT_REQUIRED: {
    code: "TW000021",
    message: "Personal credit payment required",
    status: ApiCode.PAYMENT_REQUIRED,
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
  /**
   * Info: (20260814 - Luphia) 付費團隊加人需先補收席次費用（規範 P3）：
   * 找不到可扣款的卡就不能加人——否則等於免費加席，帳永遠補不回來。
   */
  /**
   * Info: (20260818 - Luphia) 由 `TW000011` 改為 `TW000022`（第五輪自查）。
   *
   * `TW_TEAM_AMBIGUOUS`（同一位使用者屬於多個團隊、無法決定由誰付款）已經用了
   * `TW000011`。兩者都由本 PR 新增，而且**兩邊各有一條測試斷言 `TW000011`**
   * ——它們之所以同時通過，正是因為撞號。
   */
  TW_SEAT_PAYMENT_METHOD_MISSING: {
    code: "TW000022",
    message: "No payment method on record for seat charge",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  /**
   * Info: (20260814 - Luphia) 同一把冪等鍵的工作已經扣過款且尚未退還（重放）。
   * 冪等鍵保護的是扣款，不是工作——照跑等於同一筆錢買到無限次 LLM 呼叫。
   */
  TW_DUPLICATE_REQUEST: {
    code: "TW000013",
    message: "This request was already processed",
    status: ApiCode.CONFLICT,
  } as IErrorDef,
  /**
   * Info: (20260814 - Luphia) 分配點數要鑄到成員自己的區塊鏈錢包，
   * 成員沒有錢包位址就無處可鑄——與其扣了池卻沒人收到，不如當場擋下。
   */
  TW_MEMBER_WALLET_MISSING: {
    code: "TW000014",
    message: "Member has no wallet address for on-chain allocation",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,
  /**
   * Info: (20260814 - Luphia) 付費訂閱查無單價（unit_price 為 0）：
   * 這是資料異常而非零元零頭，放行等於整個週期內加人全部免費且無聲。
   */
  TW_SEAT_PRICE_MISSING: {
    code: "TW000015",
    message: "Subscription has no unit price on record",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  /**
   * Info: (20260814 - Luphia) 單期席次補收總額超過上限（PR #6652 第二輪 B-2）：
   * 扣的是訂閱那張卡而發起者可能是 ADMIN，上限是防「替他人的卡連刷」的護欄。
   */
  TW_SEAT_CHARGE_CAP_EXCEEDED: {
    code: "TW000016",
    message: "Seat charges for this period exceeded the allowed cap",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  /**
   * Info: (20260819 - Luphia) `TW_FREE_PLAN_MEMBER_LIMIT`（TW000017）已移除。
   *
   * 免費版人數上限於 2026-08-19 取消：上限存在的理由是免費額度逐成員各一份，
   * 而免費方案的額度已改為**全隊共用一份**，加人不再產生額度。
   * 這個碼因此不再有任何丟出點；號碼不重用（對外契約的碼一旦用過就不再回收）。
   */
  // Info: (20260814 - Luphia) 席次補收扣款失敗：fail-closed，不建立邀請也不加人
  TW_SEAT_CHARGE_FAILED: {
    code: "TW000012",
    message: "Seat charge failed",
    status: ApiCode.PAYMENT_REQUIRED,
  } as IErrorDef,
  /**
   * Info: (20260815 - Luphia) 尚未設定寄信（規範 §4 / P4：email 邀請）。
   * 屬設定缺漏而非使用者輸入錯誤，因此給 500 而非 400——
   * 邀請者沒有任何事情做錯，要動的是後台設定。
   */
  TW_MAIL_NOT_CONFIGURED: {
    code: "TW000018",
    message: "Mail delivery is not configured",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  /**
   * Info: (20260815 - Luphia) 邀請信寄送失敗：邀請已回滾，席次留給下一次使用。
   * 與 TW000018 分開是因為處置不同——這個重試可能就會過。
   */
  TW_INVITATION_MAIL_FAILED: {
    code: "TW000019",
    message: "Failed to deliver the invitation email",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  /**
   * Info: (20260818 - Luphia) 收回分配點數已停用（調查 20260818）。
   *
   * 點數在成員自己的鏈上錢包裡，移出必須有**持有人的簽章**，而收回的對象不會去簽。
   * 不是缺一個平台可呼叫的 `burn(address, uint256)`——扣款那條路以持有人簽章做到了
   * （見 `ensurePersonalCreditCharge`）。條款 §3.5 已改為「分配後不可收回」。
   *
   * 給一個**專屬的錯誤碼**而不是讓它走到鏈上失敗回 `TW000010`：
   * 通用的「操作失敗」會讓客服以為重試就好，而這件事重試一百次也一樣。
   */
  /**
   * Info: (20260819 - Luphia) 同時未接受的邀請數已達上限（產品決定 20260819）。
   *
   * 免費版人數上限移除之後，這是「一次撒出幾百封」的煞車。訊息刻意說得出**下一步**
   * （撤回或等對方回應），因為使用者能自己解決——不像額度用罄只能等重置。
   */
  TW_PENDING_INVITE_LIMIT: {
    code: "TW000023",
    message:
      "Too many invitations are waiting to be accepted; revoke some or wait for a response",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  /**
   * Info: (20260819 - Luphia) 今日寄出的邀請數已達上限（產品決定 20260819）。
   *
   * 與上一條分工：這條擋的是「撤回再邀、撤回再邀」的迴圈——只看同時未接受數的話，
   * 那個迴圈可以無限寄信而同時數永遠是 1。計數以**已建立的邀請列**為準，
   * 撤回或被拒絕的仍然算（信已經寄出去了）。
   */
  TW_INVITE_DAILY_LIMIT: {
    code: "TW000024",
    message: "Daily invitation limit reached for this team; try again tomorrow",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  /**
   * Info: (20260819 - Luphia) 送出時帶的試算金額與服務端重算的結果不符（review #6682 高）。
   *
   * 試算是在對話框開啟時算的，送出是在使用者填完欄位、走完 FIDO2 簽章之後——
   * 中間的兩個輸入都會變：席次佔用（另一位管理者同時邀了人）、以及計費週期
   * （8/31 23:58 試算「本期即將結束、不收費」，00:02 完成簽章時已是新週期，
   * 比例計價回近乎全額）。同一支實作在兩個時點給出不同答案，而先前沒有任何
   * 一端再確認一次——畫面說 0、卡被刷 840，且事後提示只讀 `reusedPaidSeat`，
   * 使用者完全看不出來。
   *
   * 因此金額不符時**擋下並要求重新試算**，而不是照新價扣款。
   *
   * 號碼跳過 23 / 24：那兩個號碼由邀請量上限那條分支（#6684）先取用，
   * 而兩條分支是兄弟。跨 PR 撞號會讓對外的錯誤碼契約在合併後才爆
   * （見 `error_dictionary_codes.test.ts` 的由來）。
   */
  TW_SEAT_QUOTE_STALE: {
    code: "TW000025",
    message:
      "The seat charge changed since it was shown; please review it again",
    status: ApiCode.CONFLICT,
  } as IErrorDef,
  /**
   * Info: (20260819 - Luphia) 一個人只能擁有一個免費團隊（產品決定 20260819）。
   *
   * 邀請量的兩道上限是 **per-team** 的，而建立團隊先前沒有數量上限也沒有限流——
   * 一個帳號建 10 個免費團隊，就有 10 份 20 封／50 封的額度（review #6684 中）。
   * 「擁有」指 OWNER：被別人邀請加入的團隊不算，那不是他能開的量。
   */
  TW_FREE_TEAM_LIMIT: {
    code: "TW000026",
    message: "You can only own one team on the free plan",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  /**
   * Info: (20260819 - Luphia) 邀請寄送的冷卻時間（產品決定 20260819）。
   *
   * 每分鐘 10 封的限流擋的是「狂點」，而冷卻擋的是「穩定地一直寄」：
   * 兩者的差別在於後者看起來像正常使用。payload 帶 `retryAfterSeconds`，
   * 前端據此顯示倒數——只說「請稍後再試」而不說多久，使用者只能一直按。
   */
  TW_INVITE_COOLDOWN: {
    code: "TW000027",
    message: "Please wait before sending another invitation",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  /**
   * Info: (20260821 - Luphia) 展延購買的時間閘門（產品裁定 20260821）：
   * 當期剩餘超過 30 天時不得購買延長／換方案。沒有這道閘門，展延語意對
   * 「換方案」是一個約四折買到高階方案的漏洞（review #6687 二輪阻擋-1）。
   */
  TW_SUBSCRIPTION_EXTENSION_TOO_EARLY: {
    code: "TW000028",
    message:
      "Subscription can only be extended within 30 days of the current period end",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  /**
   * Info: (20260821 - Luphia) 訂閱列的計費週期缺漏或認不得（review #6687 三輪）：
   * 期中加人的補收分母是「一期的天數」，猜錯就是對綁定的卡多收十二倍。
   * 尚未回填 `billing_interval` 的既有列會走到這裡（檢查表 §3.8），
   * 因此訊息要指向真正的原因——借用 `TW_SEAT_PRICE_MISSING` 會讓運維去查單價。
   */
  TW_SEAT_BILLING_INTERVAL_MISSING: {
    code: "TW000029",
    message: "Subscription has no billing interval on record",
    status: ApiCode.INTERNAL_SERVER_ERROR,
  } as IErrorDef,
  TW_ALLOCATION_REVOKE_DISABLED: {
    code: "TW000020",
    message: "Revoking allocated credits is no longer supported",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
  // Info: (20260815 - Luphia) 邀請信箱格式不正確（規範 §4 / P4）
  VL_INVALID_EMAIL: {
    code: "VL000018",
    message: "Invalid email address",
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
    code: "VA000069",
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
   * Info: (20260820 - Julian) 核准算到一半被 §32 IV 認定改寫（review 第 3 條）。
   *
   * 不與 `VA_OVERTIME_ALREADY_REVIEWED` 共用：那一句要主管**不要再管**這張單，
   * 而這一句要主管**重新看一次再按** —— 工資標準已經從普通級距跳到加倍發給，
   * 而他剛才在畫面上看到的金額不是現在會寫進去的那個。
   */
  /**
   * Info: (20260820 - Julian) §32 IV 認定的兩種落空（review 第 3 輪第 2 條）。
   *
   * 都不與 `VA_OVERTIME_ALREADY_REVIEWED` 共用：那一句的下一步是「不用管了」，
   * 這兩句分別是「要先撤回既有的那份」與「本來就沒有可撤回的認定」。
   */
  VA_OVERTIME_EMERGENCY_ALREADY_DECLARED: {
    code: "VA000071",
    message:
      "This overtime request already carries an Article 32 IV determination; revoke the existing one before filing a new record",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260820 - Julian) 報備時點落在可能的區間之外（review 第 4 輪第 2 條）。
   *
   * 不共用 `VA_INVALID_INPUT_DATA`：那一句說的是「格式不對」，而這裡格式
   * 完全正確 —— 是那個時刻不可能是這次加班的報備（在未來，或早於加班那一天）。
   * 兩者的下一步不同：一個是重打，一個是回去確認公文上的時間。
   */
  VA_OVERTIME_REPORTED_AT_OUT_OF_RANGE: {
    code: "VA000073",
    message:
      "The Article 32 IV filing time must not be in the future, nor earlier than the day the overtime took place",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  VA_OVERTIME_EMERGENCY_NOT_DECLARED: {
    code: "VA000072",
    message:
      "This overtime request carries no Article 32 IV determination to revoke",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  VA_OVERTIME_RECLASSIFIED_MIDWAY: {
    code: "VA000070",
    message:
      "This overtime request was declared an emergency (Article 32 IV) while you were approving it; reload and confirm the doubled premium before approving",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260820 - Julian) 反方向的重新分類（review 第 4 輪第 3 條）。
   *
   * `VA_OVERTIME_RECLASSIFIED_MIDWAY` 只講得出「被認定 → 加倍發給」。撤回
   * 落地之後另一個方向是真的：工資**降回**普通級距。用同一個碼的話，主管
   * 會讀到一句與事實相反的說明，而這個方向對勞工不利 —— 恰是最需要他在
   * 按下去之前看清楚的那一個。
   */
  /**
   * Info: (20260820 - Julian) 併休規則本身設定壞了（review 第 5 輪 M2）。
   *
   * 這不是請假的人做錯了什麼 —— 是那條規則沒說出一個可執行的上限
   * （兩欄皆空、兩欄都填、比例非正數，或把 `BLOCK` 綁在特休上）。
   * 先前這種列會被讀成「上限 0 人」，於是整個部門請不了假，
   * 而畫面說的是「同時請假人數已達上限」：一句把設定錯誤講成使用者問題的話。
   */
  VA_LEAVE_CONCURRENCY_RULE_INVALID: {
    code: "VA000075",
    message:
      "a concurrency rule in this account book does not state an enforceable limit; ask HR to correct the rule",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260820 - Julian) 算不出「這個人的一天有多長」（review 第 5 輪 M7／M8）。
   *
   * 補休折換要拿它把分鐘換成天數，加班費折現要把它寫進事件供薪資模組換算日薪。
   * 兩條路徑先前各自用 `?? 0` 與 `?? regularWorkMinutes` 頂替 ——
   * 前者往下撞成 500，後者在非上班日會寫進一個 0，而 0 是薪資模組的除數。
   *
   * 觸發條件是這個人當天沒有排班，且最近也找不到一個有班別的上班日。
   * 處置在人資手上：排一格班就有答案了。
   */
  /**
   * Info: (20260820 - Julian) 放寬到 54 小時卻沒留下記載（review 第 5 輪 M9）。
   *
   * §32 III 的前提是「經工會同意，如事業單位無工會者，經勞資會議同意」，
   * 而一個沒有記載的「已同意」等於沒有同意 —— 系統會據此多放 8 小時。
   * 這是一個表單漏填（勾了同意、沒貼會議紀錄連結，或沒填同意日期），
   * 先前它以 **500** 呈現，畫面上沒有任何線索指向那一格。
   */
  VA_OVERTIME_AGREEMENT_RECORD_REQUIRED: {
    code: "VA000077",
    message:
      "extending the monthly cap to 54 hours (Article 32 III) requires a recorded agreement: an http(s) link to the minutes and the date it was made",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260820 - Julian) 同一天已經有一張時段重疊的加班單（review 第 13 輪第 2 條）。
   *
   * 重疊意味著同一段時間被算兩次工資。相鄰不算重疊 ——
   * 17:00–19:00 與 19:00–21:00 是本模組最常見的合法形狀。
   */
  VA_OVERTIME_OVERLAPS_EXISTING: {
    code: "VA000078",
    message:
      "another overtime request already covers part of this time range on that day",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260821 - Julian) 事後補一張**比已核准者更早**的加班單（review 第 15 輪）。
   *
   * §24 I 的級距在核准當下算一次就落地，而它只看得到那一刻已經存在的單。
   * 先核准 19:00–21:00、再補一張 17:00–19:00，兩張都從 0 起算、都拿 1/3：
   * 實測 80 個工資單位，法定下限 120 —— **少付 40**，且沒有任何路徑會回頭
   * 更正（更正流程未實作）。
   *
   * 因此擋在送出而不是核准：核准當下才擋的話，那張已核准的單早就落地了，
   * 使用者被擋卻無事可做。擋在這裡，下一步是明確的 —— 撤回較晚那張，
   * 兩張一起重送，級距就會正確地切成 1/3 + 2/3。
   *
   * `PENDING` 的手足單不觸發：它還沒定級距，在自己被核准時會重新讀一次。
   */
  /**
   * Info: (20260821 - Julian) 這張單不在 `APPROVED`，沒有核准可以撤銷
   * （review 第 7 輪 B1）。
   */
  /**
   * Info: (20260821 - Julian) 這個假別要併入另一個假別，而併計扣減尚未實作
   * （review 第 10 輪 B2）。
   *
   * `LeavePolicy.mergesIntoPolicyId` 是計畫書 §6.5 的實作載體（家庭照顧假
   * 併入事假，性平法 §20），而它在扣減路徑上**沒有任何讀取端**。放行等於
   * 讓法定上限被繞過：請滿 7 日家庭照顧假之後事假仍是完整 14 日。
   *
   * 對使用者而言這不是「輸入錯了」，是「這個假別還不能用」——
   * 文案因此要指向人資而不是叫他改時段。
   */
  VA_LEAVE_MERGE_NOT_IMPLEMENTED: {
    code: "VA000082",
    message:
      "this leave type is configured to also draw down another leave type (LeavePolicy.mergesIntoPolicyId), and that cross-type deduction is not implemented yet; the request is refused rather than silently granting quota beyond the statutory cap",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  VA_OVERTIME_NOT_APPROVED: {
    code: "VA000080",
    message:
      "this overtime request is not in the approved state, so there is no approval to revoke; reload and check its current status",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260821 - Julian) 核准的後果已經不可逆（review 第 7 輪 B1）。
   *
   * 補休批次已被請掉／過期／折現，或折現事件已由薪資模組結算
   * （`LeaveCashOutEvent.settledAt` 非 null）。撤銷等於憑空消滅一筆
   * 已經被使用或已經發出去的權益，因此擋下。
   *
   * 下一步不是重按，是人工調整（L9 `leave/balance/adjust`）——
   * 文案必須說出這件事，否則使用者只會一直按同一顆按鈕。
   */
  VA_OVERTIME_APPROVAL_NOT_REVERSIBLE: {
    code: "VA000081",
    message:
      "the compensatory leave from this approval has already been used, expired or cashed out, or payroll has settled its overtime payment; the approval can no longer be revoked, so correct it with a manual balance adjustment instead",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  VA_OVERTIME_EARLIER_THAN_APPROVED: {
    code: "VA000079",
    message:
      "an overtime request starting later that day has already been approved, and its Article 24 I premium tier is frozen; filing an earlier span now would under-pay both. Withdraw the later request and re-file them together",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  VA_OVERTIME_DAY_LENGTH_UNKNOWN: {
    code: "VA000076",
    message:
      "this employee has no derivable workday length, so overtime cannot be converted or cashed out; ask HR to schedule a shift for them",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  VA_OVERTIME_EMERGENCY_REVOKED_MIDWAY: {
    code: "VA000074",
    message:
      "The Article 32 IV determination on this overtime request was revoked while you were approving it; the whole span falls back to the ordinary premium, so reload and confirm the amount before approving",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260818 - Julian) 撤回事後補單卻沒填理由。
   *
   * 事前申請的撤回不必填 —— 那是取消一個還沒發生的計畫。事後補單不同：
   * 它是對**已經發生的事實**的陳述，而收回它的方向對雇主有利、對勞工不利
   * （同 `assertOvertimeFilingType` 檔頭所說的那種「有動機」的地形）。
   * 一筆沒有理由的撤回，事後沒有人判斷得出它是自願的還是被要求的。
   */
  VA_OVERTIME_WITHDRAW_REASON_REQUIRED: {
    code: "VA000068",
    message:
      "Withdrawing an after-the-fact overtime request requires a reason; the record must show whether it was voluntary",
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
   * Info: (20260818 - Julian) 內建假別的法定欄位不可修改，也不可停用。
   *
   * 內建的十三種假別由 seed 產生，它們的給假方式、工資比例、雇主有無准駁權
   * 都直接來自勞基法與性平法（ADR 021 §5：「seed 成為正確性的一部分」）。
   * 開放修改的效果不是彈性，是讓一個違法的設定看起來像一筆正常的假別 ——
   * 而受影響的人要到請假被扣錯天數時才會發現。
   *
   * 可改的只有公司政策欄位：名稱、最小請假單位、證明文件要求與門檻、遞延月數。
   */
  VA_LEAVE_POLICY_LOCKED_FIELD: {
    code: "VA000064",
    message:
      "This field of a system-defined leave type is fixed by statute and cannot be changed",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260818 - Julian) 併計關係成環。
   *
   * 家庭照顧假併入事假（性平法 §20）是一個有向關係。A→B→A 會讓併計扣減
   * 沿著環一直扣下去 —— 請一天假扣掉兩個假別各一天，而兩邊的餘額都對不上。
   * 自指由 `assertLeavePolicyUnit` 擋，更長的環擋在這裡。
   *
   * Info: (20260821 - Julian) ⚠️ 描述的是**併計扣減落地之後**的行為
   * （review 第 10 輪 B2）：`allocateConsumption` 目前不走任何鏈，
   * 送出端由 `VA_LEAVE_MERGE_NOT_IMPLEMENTED` 擋著。
   */
  VA_LEAVE_POLICY_MERGE_CYCLE: {
    code: "VA000065",
    message: "Merging into that leave type would form a cycle",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260818 - Julian) 年資級距表不合法。
   *
   * 級距表是特休日數的唯一來源（§38 I）。一張有洞、重疊或日數倒退的表，
   * 會讓某個年資區間查不到日數或查到比前一級少的日數 ——
   * 前者是錯誤，後者是「做越久假越少」，而兩者都不會報錯。
   */
  VA_LEAVE_TIER_TABLE_INVALID: {
    code: "VA000066",
    message: "The seniority tier table is not a valid ladder",
    status: ApiCode.VALIDATION_ERROR,
  } as IErrorDef,

  /**
   * Info: (20260818 - Julian) 這個假別不吃級距表。
   *
   * 與 `VA_LEAVE_TIER_TABLE_INVALID` 分開：那一個是表本身寫錯（改表就好），
   * 這一個是假別的給假方式不是 `SENIORITY_TIER`（要先改給假方式）。
   * 存進去的效果是一張永遠不會被讀到的表，而看設定的人會以為它生效了。
   */
  VA_LEAVE_TIER_NOT_APPLICABLE: {
    code: "VA000067",
    message:
      "Only a SENIORITY_TIER leave type reads a tier table; storing one here would do nothing",
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
   * ToDo: (20260821 - Julian) **U5：§9 假勤行事曆（L18）整節未實作。**
   * 無 `calendar/` route、無導覽項，而 `FO_LEAVE_CALENDAR_SCOPE` 已經配了號
   * 卻從未被丟 —— 一個配好號、寫好文案、沒有人丟的錯誤碼，
   * 讀起來像「已接線」。計畫書 §1506-1527。
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
   * Info: (20260819 - Julian) 例假日加班須依勞動基準法 §40 程序（天災事變或突發事件、
   * 報當地主管機關**核備**、事後補假休息）。系統尚未實作核備與補假，故一律擋下 ——
   * §32 IV 的 `isEmergency`（報備查）**不是**這一條的通行證，兩者程序不同（review B7）。
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
   * Info: (20260818 - Julian) 撤回加班單的人不是申請人本人。
   *
   * 刻意不沿用 `FO_NOT_AUTHORIZED_REVIEWER`（假單撤回目前借用它）——
   * 那句話是「你不是這一關的簽核者」，而使用者當下正在撤回**自己的**單，
   * 收到那個訊息只會更困惑。主管想讓一張單消失，正確的動作是駁回，
   * 那會留下他的名字。
   */
  FO_OVERTIME_NOT_APPLICANT: {
    code: "FO000020",
    message: "Only the applicant may withdraw an overtime request",
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
    code: "NF000028",
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

  /**
   * Info: (20260818 - Julian) 假別代號在這個帳本已經有人用了。
   *
   * `@@unique([accountBookId, code])` 是最終防線，但撞上它會丟 P2002 ——
   * 那讀起來像故障。代號重複是使用者的輸入問題，不是資料庫的問題
   * （coding_guidelines §5.2：不讓原始的 Prisma 錯誤噴到前端）。
   */
  CF_LEAVE_POLICY_CODE_TAKEN: {
    code: "CF000013",
    message: "That leave type code is already used in this account book",
    status: ApiCode.CONFLICT,
  } as IErrorDef,

  FO_ATTENDANCE_SUPERVISOR_ONLY: {
    code: "FO000011",
    message: "This action is limited to department managers",
    status: ApiCode.FORBIDDEN,
  } as IErrorDef,
};
