import { TeamRole } from '@/interfaces/team';

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

// Info: (20250311 - Tzuhan) 🌟 團隊操作權限
export const TEAM_PERMISSIONS = {
  INVITE_MEMBER: [TeamRole.OWNER, TeamRole.ADMIN], // Info: (20250311 - Tzuhan) `Owner/Admin` 可邀請成員
  LEAVE_TEAM: [TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER], // Info: (20250311 - Tzuhan) 除 `Owner` 外其他角色可離開
  DELETE_TEAM: [TeamRole.OWNER], // Info: (20250311 - Tzuhan) 只有 `Owner` 可刪除團隊 (目前未實作)
  MODIFY_NAME: [TeamRole.OWNER, TeamRole.ADMIN],
  MODIFY_IMAGE: [TeamRole.OWNER, TeamRole.ADMIN],
  MODIFY_ABOUT: [TeamRole.OWNER, TeamRole.ADMIN],
  MODIFY_PROFILE: [TeamRole.OWNER, TeamRole.ADMIN],
  MODIFY_BANK_ACCOUNT: [TeamRole.OWNER], // Info: (20250311 - Tzuhan) 只有 `Owner` 可修改銀行帳號
  MODIFY_PLAN: [TeamRole.OWNER], // Info: (20250311 - Tzuhan) 只有 `Owner` 可變更訂閱方案
  VIEW_TEAM_INFO: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
  VIEW_BANK_INFO: [TeamRole.OWNER], // Info: (20250311 - Tzuhan) 只有 `Owner` 可查看銀行資訊
  VIEW_SUBSCRIPTION: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER],
} as const;

// Info: (20250311 - Tzuhan) 🌟 團隊帳本權限 (區分 `公開帳本` & `私人帳本`)
export const ACCOUNT_BOOK_PERMISSIONS = {
  CREATE: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR], // Info: (20250311 - Tzuhan) 只能 `Owner/Admin/Editor` 建立帳本
  DELETE: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR], // Info: (20250311 - Tzuhan) 只有 `Owner/Admin/Editor` 可刪除帳本
  MODIFY_NAME: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  MODIFY_IMAGE: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  MODIFY_TAG: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR],
  MODIFY_PRIVACY: [TeamRole.OWNER, TeamRole.ADMIN], // Info: (20250311 - Tzuhan) 只有 `Owner/Admin` 可調整隱私
  CREATE_PRIVATE: [TeamRole.OWNER, TeamRole.ADMIN], // Info: (20250311 - Tzuhan) 只有 `Owner/Admin` 可建立私人帳本
  VIEW_PRIVATE: [TeamRole.OWNER, TeamRole.ADMIN], // Info: (20250311 - Tzuhan) 只有 `Owner/Admin` 可查看私人帳本
  VIEW_PUBLIC: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR, TeamRole.VIEWER], // Info: (20250311 - Tzuhan) 所有團隊成員可查看公開帳本
} as const;

// Info: (20250311 - Tzuhan) 🌟 帳本轉移權限
export const ACCOUNT_BOOK_TRANSFER_PERMISSIONS = {
  REQUEST_TRANSFER: [TeamRole.OWNER, TeamRole.ADMIN], // Info: (20250311 - Tzuhan) 只有 `Owner/Admin` 可請求轉移
  CANCEL_TRANSFER: [TeamRole.OWNER, TeamRole.ADMIN], // Info: (20250311 - Tzuhan) 只有 `Owner/Admin` 可取消轉移
  ACCEPT_TRANSFER: [TeamRole.OWNER, TeamRole.ADMIN], // Info: (20250311 - Tzuhan) 只有 `Owner/Admin` 可接受帳本轉移
  DECLINE_TRANSFER: [TeamRole.OWNER, TeamRole.ADMIN], // Info: (20250311 - Tzuhan) 只有 `Owner/Admin` 可拒絕帳本轉移
} as const;

// Info: (20250311 - Tzuhan) 🌟 訂閱方案限制
export const SUBSCRIPTION_PLAN_LIMITS = {
  FREE: 1, // Info: (20250311 - Tzuhan) 免費版最多只能有 1 個帳本
  PROFESSIONAL: Infinity, // Info: (20250311 - Tzuhan) 專業版無限制
  ENTERPRISE: Infinity, // Info: (20250311 - Tzuhan) 企業版無限制
} as const;

// Info: (20250311 - Tzuhan) 🌟 帳務權限
export const ACCOUNTING_PERMISSIONS = {
  BOOKKEEPING: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR], // Info: (20250311 - Tzuhan) 只能 `Owner/Admin/Editor` 記帳
  ACCOUNTING_SETTING: [TeamRole.OWNER, TeamRole.ADMIN, TeamRole.EDITOR], // Info: (20250311 - Tzuhan) `Owner/Admin/Editor` 可修改會計設定
} as const;
