import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { ONE_DAY_IN_S } from '@/constants/time';

export const GRACE_PERIOD_DAYS = 3; // Info: (20250311 - Tzuhan) 寬限期天數
export const GRACE_PERIOD_SECONDS = GRACE_PERIOD_DAYS * ONE_DAY_IN_S; // Info: (20250311 - Tzuhan) 寬限期秒數

export const TEAM_ROLE_DESCRIPTIONS = {
  [TeamRole.OWNER]: '最高權限，管理所有團隊與帳本權限',
  [TeamRole.ADMIN]: '管理團隊與帳本，無法更改訂閱方案',
  [TeamRole.EDITOR]: '可編輯帳本，但無法管理團隊與帳本隱私權',
  [TeamRole.VIEWER]: '只能檢視帳本與團隊資訊，無法修改',
};

export const TEAM_PENDING_DECISIONS = {
  DELETE_TEAM_WITH_ACCOUNT_BOOKS: false, // Info: (20250311 - Tzuhan) ❌ 是否允許刪除仍有帳本的團隊（待決議）
  ACCOUNT_BOOK_TRANSFER_BETWEEN_PAID_PLANS: false, // Info: (20250311 - Tzuhan) ❌ 付費版帳本轉移問題（待決議）
};

export const ACTION_BLOCKED_BY_TRIAL_PAYWALL: TeamPermissionAction[] = [
  TeamPermissionAction.INVITE_MEMBER,
  TeamPermissionAction.DELETE_TEAM,
  TeamPermissionAction.MODIFY_NAME,
  TeamPermissionAction.MODIFY_IMAGE,
  TeamPermissionAction.MODIFY_ABOUT,
  TeamPermissionAction.MODIFY_PROFILE,
  TeamPermissionAction.MODIFY_BANK_ACCOUNT,

  TeamPermissionAction.CREATE_ACCOUNT_BOOK,
  TeamPermissionAction.DELETE_ACCOUNT_BOOK,
  TeamPermissionAction.MODIFY_ACCOUNT_BOOK,
  TeamPermissionAction.MODIFY_TAG,
  TeamPermissionAction.MODIFY_PRIVACY,
  TeamPermissionAction.CREATE_PRIVATE_ACCOUNT_BOOK,
  TeamPermissionAction.VIEW_PRIVATE_ACCOUNT_BOOK,

  TeamPermissionAction.REQUEST_ACCOUNT_BOOK_TRANSFER,
  TeamPermissionAction.CANCEL_ACCOUNT_BOOK_TRANSFER,
  TeamPermissionAction.ACCEPT_ACCOUNT_BOOK_TRANSFER,
  TeamPermissionAction.DECLINE_ACCOUNT_BOOK_TRANSFER,

  TeamPermissionAction.BOOKKEEPING,
  TeamPermissionAction.ACCOUNTING_SETTING_CREATE,
  TeamPermissionAction.ACCOUNTING_SETTING_UPDATE,
  TeamPermissionAction.ACCOUNTING_SETTING_DELETE,
  TeamPermissionAction.EXPORT_TRIAL_BALANCE,
  TeamPermissionAction.EXPORT_LEDGER,
  TeamPermissionAction.CREATE_ASSET,
  TeamPermissionAction.UPDATE_ASSET,
  TeamPermissionAction.DELETE_ASSET,
  TeamPermissionAction.EXPORT_ASSET,

  TeamPermissionAction.CREATE_VOUCHER,
  TeamPermissionAction.MODIFY_VOUCHER,
  TeamPermissionAction.DELETE_VOUCHER,
  TeamPermissionAction.RESTORE_VOUCHER,
  TeamPermissionAction.CHANGE_TEAM_ROLE,
];

// Info: (20250313 - Tzuhan) ✅ 把所有權限統一管理在一個 `ALL_PERMISSIONS` 物件
export const ALL_PERMISSIONS: Record<TeamPermissionAction, TeamRole[]> = {
  // Info: (20250313 - Tzuhan) 團隊操作權限
  [TeamPermissionAction.INVITE_MEMBER]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.LEAVE_TEAM]: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
  [TeamPermissionAction.DELETE_TEAM]: [TeamRole.OWNER],
  [TeamPermissionAction.MODIFY_NAME]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.MODIFY_IMAGE]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.MODIFY_ABOUT]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.MODIFY_PROFILE]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.MODIFY_BANK_ACCOUNT]: [TeamRole.OWNER],
  [TeamPermissionAction.MODIFY_PLAN]: [TeamRole.OWNER],
  [TeamPermissionAction.VIEW_TEAM_INFO]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],
  [TeamPermissionAction.VIEW_BANK_INFO]: [TeamRole.OWNER],
  [TeamPermissionAction.VIEW_SUBSCRIPTION]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],
  [TeamPermissionAction.MODIFY_SUBSCRIPTION]: [TeamRole.OWNER],
  [TeamPermissionAction.VIEW_SUBSCRIPTION_INVOICE]: [TeamRole.OWNER],

  // Info: (20250313 - Tzuhan) 帳本權限
  [TeamPermissionAction.CREATE_ACCOUNT_BOOK]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.DELETE_ACCOUNT_BOOK]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.MODIFY_ACCOUNT_BOOK]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.MODIFY_TAG]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.MODIFY_PRIVACY]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.CREATE_PRIVATE_ACCOUNT_BOOK]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.VIEW_PRIVATE_ACCOUNT_BOOK]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.VIEW_PUBLIC_ACCOUNT_BOOK]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],

  // Info: (20250313 - Tzuhan) 帳本轉移
  [TeamPermissionAction.REQUEST_ACCOUNT_BOOK_TRANSFER]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.CANCEL_ACCOUNT_BOOK_TRANSFER]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.ACCEPT_ACCOUNT_BOOK_TRANSFER]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.DECLINE_ACCOUNT_BOOK_TRANSFER]: [TeamRole.OWNER, TeamRole.ADMIN],

  // Info: (20250313 - Tzuhan) 帳務相關
  [TeamPermissionAction.BOOKKEEPING]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.ACCOUNTING_SETTING_CREATE]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
  ],
  [TeamPermissionAction.ACCOUNTING_SETTING_GET]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],
  [TeamPermissionAction.ACCOUNTING_SETTING_UPDATE]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
  ],
  [TeamPermissionAction.ACCOUNTING_SETTING_DELETE]: [TeamRole.OWNER, TeamRole.ADMIN],
  [TeamPermissionAction.VIEW_TRIAL_BALANCE]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.VIEW_LEDGER]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.VIEW_ASSET]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.EXPORT_TRIAL_BALANCE]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.EXPORT_LEDGER]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.CREATE_ASSET]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.UPDATE_ASSET]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.DELETE_ASSET]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.EXPORT_ASSET]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],

  [TeamPermissionAction.VIEW_COUNTERPARTY]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.CREATE_COUNTERPARTY]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],

  // Info: (20250417 - Shirley) 憑證相關權限, 所有角色都有權限
  [TeamPermissionAction.VIEW_CERTIFICATE]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],
  [TeamPermissionAction.CREATE_CERTIFICATE]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],
  [TeamPermissionAction.UPDATE_CERTIFICATE]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],
  [TeamPermissionAction.DELETE_CERTIFICATE]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],

  [TeamPermissionAction.CHANGE_TEAM_ROLE]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],

  // Info: (20250416 - Tzuhan) 傳票相關
  [TeamPermissionAction.CREATE_VOUCHER]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.MODIFY_VOUCHER]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.DELETE_VOUCHER]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.RESTORE_VOUCHER]: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  [TeamPermissionAction.VIEW_VOUCHER_LIST]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],
  [TeamPermissionAction.VIEW_VOUCHER]: [
    TeamRole.OWNER,
    TeamRole.ADMIN,
    TeamRole.EDITOR,
    TeamRole.VIEWER,
  ],
};

// Info: (20250313 - Tzuhan) ✅ 角色變更權限獨立處理
export const TEAM_ROLE_TRANSITIONS: Record<TeamRole, TeamRole[]> = {
  [TeamRole.OWNER]: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
  [TeamRole.ADMIN]: [TeamRole.EDITOR, TeamRole.VIEWER],
  [TeamRole.EDITOR]: [TeamRole.VIEWER],
  [TeamRole.VIEWER]: [],
};

// Info: (20250311 - Tzuhan) 🌟 訂閱方案限制
export const SUBSCRIPTION_PLAN_LIMITS = {
  BEGINNER: 1, // Info: (20250311 - Tzuhan) 免費版最多只能有 1 個帳本，但為了方便測試，這裡設定為 100
  TRIAL: Infinity, // Info: (20250418 - Tzuhan) 試用版無限制
  PROFESSIONAL: Infinity, // Info: (20250311 - Tzuhan) 專業版無限制
  ENTERPRISE: Infinity, // Info: (20250311 - Tzuhan) 企業版無限制
} as const;
