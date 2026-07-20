// Info: (20260716 - Emily) 碳盤查存取裁決(#52,模型 A):
// Info: (20260716 - Emily) 聊天訊息維持「個人」(channel address 前綴裁決,E2EE 不動);
// Info: (20260716 - Emily) 報告/盤查狀態歸屬帳本:綁定帳本的會話以 TeamRole 裁決(VIEWER 可讀、EDITOR 以上可寫),
// Info: (20260716 - Emily) 未綁定(舊個人會話)沿用前綴裁決 — 雙軌相容,零資料遷移

import { prisma } from "@/lib/prisma";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { isCarbonChatChannelOwnedBy } from "@/constants/carbon_chatbot";

// Info: (20260716 - Emily) 需要的存取層級(報告/狀態端點用;聊天端點不經本模組)
export enum CarbonAccessLevelEnum {
  VIEW = "VIEW",
  EDIT = "EDIT",
}

// Info: (20260716 - Emily) TeamRole 中具編輯權者(VIEWER 之外全部);抽常數避免散落字串比對
const EDIT_CAPABLE_ROLES: readonly string[] = ["OWNER", "ADMIN", "EDITOR"];

export interface ICarbonAccessDecision {
  allowed: boolean;
  // Info: (20260716 - Emily) 呼叫者是否具編輯權(前端據此切換唯讀模式)
  canEdit: boolean;
  // Info: (20260716 - Emily) 會話綁定的帳本(null = 個人會話)
  accountBookId: string | null;
}

const DENIED: ICarbonAccessDecision = {
  allowed: false,
  canEdit: false,
  accountBookId: null,
};

/**
 * Info: (20260716 - Emily) 報告/盤查狀態的存取裁決(唯一裁決點):
 * - 會話不存在:視為個人新會話,前綴相符即可(首存會建立 chatroom)
 * - 個人會話(無 accountBookId):前綴相符 = 完整權限
 * - 帳本會話:依 TeamRole — VIEWER 可 VIEW;EDITOR/ADMIN/OWNER 可 VIEW+EDIT;
 *   會話擁有者(前綴相符)永遠具完整權限
 */
export const resolveCarbonAccess = async (
  userAddress: string,
  channel: string,
  level: CarbonAccessLevelEnum,
): Promise<ICarbonAccessDecision> => {
  const isChannelOwner = isCarbonChatChannelOwnedBy(channel, userAddress);

  const chatroom = await prisma.chatroom.findUnique({
    where: { channel },
    select: { accountBookId: true },
  });

  const accountBookId = chatroom?.accountBookId ?? null;

  // Info: (20260716 - Emily) 個人會話(含尚未建立者):僅擁有者可存取
  if (!accountBookId) {
    return isChannelOwner
      ? { allowed: true, canEdit: true, accountBookId: null }
      : DENIED;
  }

  // Info: (20260716 - Emily) 帳本會話:擁有者直通;其他人查團隊角色
  if (isChannelOwner) {
    return { allowed: true, canEdit: true, accountBookId };
  }

  const role = await accountBookRepo.getMemberRoleByAddress(
    accountBookId,
    userAddress,
  );
  if (!role) return DENIED;

  const canEdit = EDIT_CAPABLE_ROLES.includes(role);
  if (level === CarbonAccessLevelEnum.EDIT && !canEdit) return DENIED;

  return { allowed: true, canEdit, accountBookId };
};

/**
 * Info: (20260716 - Emily) 建立帳本會話前的裁決:需 EDITOR 以上(建立 = 寫入行為)
 */
export const canBindAccountBook = async (
  userAddress: string,
  accountBookId: string,
): Promise<boolean> => {
  const role = await accountBookRepo.getMemberRoleByAddress(
    accountBookId,
    userAddress,
  );
  return role !== null && EDIT_CAPABLE_ROLES.includes(role);
};
