// Info: (20260716 - Tzuhan) 碳盤查存取裁決(#52,模型 A):
// Info: (20260716 - Tzuhan) 聊天訊息維持「個人」(channel address 前綴裁決,E2EE 不動);
// Info: (20260716 - Tzuhan) 報告/盤查狀態歸屬帳本:綁定帳本的會話以 TeamRole 裁決(VIEWER 可讀、EDITOR 以上可寫),
// Info: (20260716 - Tzuhan) 未綁定(舊個人會話)沿用前綴裁決 — 雙軌相容,零資料遷移

import { chatroomRepo } from "@/repositories/chatroom.repo";
import { carbonAttachmentOwnerRepo } from "@/repositories/carbon_attachment_owner.repo";
import { isSameAddress } from "@/lib/team/address_identity";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { isCarbonChatChannelOwnedBy } from "@/constants/carbon_chatbot";

// Info: (20260716 - Tzuhan) 需要的存取層級(報告/狀態端點用;聊天端點不經本模組)
export enum CarbonAccessLevelEnum {
  VIEW = "VIEW",
  EDIT = "EDIT",
  /**
   * Info: (20260730 - Tzuhan) 封存/還原整個會話。刻意與 EDIT 分層:
   * 編輯內容與「讓整份 33 節報告連同活動數據帳本從清單上消失」是不同量級的行為,
   * EDITOR 應能寫報告但不應能收掉別人建的會話。
   */
  DELETE = "DELETE",
}

// Info: (20260716 - Tzuhan) TeamRole 中具編輯權者(VIEWER 之外全部);抽常數避免散落字串比對
// Info: (20260819 - Luphia) 團隊 ADMIN 已取消（產品決定 20260819）
const EDIT_CAPABLE_ROLES: readonly string[] = ["OWNER", "EDITOR"];

// Info: (20260730 - Tzuhan) 具封存權者:僅帳本管理層。EDITOR 不在此列(見 CarbonAccessLevelEnum.DELETE 註解)
const DELETE_CAPABLE_ROLES: readonly string[] = ["OWNER"];

export interface ICarbonAccessDecision {
  allowed: boolean;
  // Info: (20260716 - Tzuhan) 呼叫者是否具編輯權(前端據此切換唯讀模式)
  canEdit: boolean;
  // Info: (20260716 - Tzuhan) 會話綁定的帳本(null = 個人會話)
  accountBookId: string | null;
}

const DENIED: ICarbonAccessDecision = {
  allowed: false,
  canEdit: false,
  accountBookId: null,
};

/**
 * Info: (20260716 - Tzuhan) 報告/盤查狀態的存取裁決(唯一裁決點):
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

  // Info: (20260731 - Luphia) 經 repository 取用(§1:唯 repository 可碰 Prisma);
  // Info: (20260731 - Luphia) chatroomRepo.findAccountBookIdByChannel 語意與原查詢一致
  const accountBookId = await chatroomRepo.findAccountBookIdByChannel(channel);

  // Info: (20260716 - Tzuhan) 個人會話(含尚未建立者):僅擁有者可存取
  if (!accountBookId) {
    return isChannelOwner
      ? { allowed: true, canEdit: true, accountBookId: null }
      : DENIED;
  }

  // Info: (20260716 - Tzuhan) 帳本會話:擁有者直通;其他人查團隊角色
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
  // Info: (20260730 - Tzuhan) 封存需管理層;會話擁有者已於上方直通(自己建的會話自己收得掉)
  if (
    level === CarbonAccessLevelEnum.DELETE &&
    !DELETE_CAPABLE_ROLES.includes(role)
  ) {
    return DENIED;
  }

  return { allowed: true, canEdit, accountBookId };
};

/**
 * Info: (20260716 - Tzuhan) 建立帳本會話前的裁決:需 EDITOR 以上(建立 = 寫入行為)
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

/**
 * Info: (20260720 - Tzuhan) #53 帳本層級的閱覽裁決(不經 channel):任一 TeamRole 皆可讀
 * (esg-records 匯入/證據鏈端點用;與 #52 報告閱覽同一權限語意)
 */
export const canViewAccountBook = async (
  userAddress: string,
  accountBookId: string,
): Promise<boolean> => {
  const role = await accountBookRepo.getMemberRoleByAddress(
    accountBookId,
    userAddress,
  );
  return role !== null;
};

/**
 * Info: (20260907 - Emily) 附件 cid 的讀取裁決(#6748;一次收 #6625 / #6613):
 * **只有上傳者本人**能經 /import 或聊天附件把那個 cid 的檔取回來。
 *
 * cid 是 Laria 的 metadata hash,由內容決定、可被猜中或轉貼;在此之前
 * 讀取端一律照單取回 —— 知道 cid 就等於拿到檔。
 *
 * 為什麼是「上傳者本人」而不是「同帳本成員」:附件的生命週期是同一個人
 * 在同一個瀏覽器裡「選檔上傳 → 送出 / 匯入」,重載後的重試也是同一個人;
 * 目前沒有任何流程需要 B 讀 A 上傳的 cid。放寬要等有那個流程時再放,
 * 而且要以帳本角色裁決,不是在這裡猜。
 *
 * 「查無擁有者」一律拒絕,包含本功能上線前上傳的舊 cid:那些 cid 沒有紀錄,
 * 系統無法證明是誰的。代價是上線前尚未完成的待匯入紀錄要重傳檔案
 * (前端本來就有「cid 取不回就退回直傳」那條路),寫進部署清單。
 * 若改成「查無即放行」,所有舊 cid 永遠留在門外,這道門對它們等於不存在。
 */
export const canReadAttachmentCid = async (
  userAddress: string,
  cid: string,
): Promise<boolean> => {
  const owner = await carbonAttachmentOwnerRepo.findOwnerAddress(cid);
  return owner !== null && isSameAddress(owner, userAddress);
};
