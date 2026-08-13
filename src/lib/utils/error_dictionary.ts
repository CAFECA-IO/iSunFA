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
   * Info: (20260813 - Luphia) 碳盤查會話未綁定帳本（產品拍板 20260813：一律綁帳本）。
   * 沒有帳本就沒有計費團隊，扣不了額度；此時 fail closed 而非放行不計費，
   * 並以專屬錯誤碼讓前端能引導用戶把會話綁到帳本，而不是丟一句「系統錯誤」。
   */
  VA_CARBON_SESSION_NOT_BOUND: {
    code: "VA000041",
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
  TW_PERSONAL_PAYMENT_REQUIRED: {
    code: "TW000010",
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
};
