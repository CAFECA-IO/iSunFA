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
 * Info: (20260907 - Emily) 附件 cid 的讀取裁決(#6748;一次收 #6625 / #6613)。
 *
 * cid 是 Laria 的 metadata hash,由內容決定、可被猜中或轉貼;在此之前讀取端一律
 * 照單取回 —— 知道 cid 就等於拿到檔。
 *
 * ## 誰能讀
 *
 * 1. **上傳者本人**,永遠可以。
 * 2. **同一個帳本的接續者**(review 中-1,owner 拍板 20260907):待匯入紀錄連同 cid
 *    是每個 chatroom 一筆、帳本會話的成員拿得到那張卡(#6714 / #6723 做「接著匯入」
 *    時刻意撐過重載與切房的);B 在 A 的卡上按「接著匯入」會帶 A 的 cid 打 /import。
 *    第一版寫「沒有任何流程需要 B 讀 A 上傳的 cid」—— 那句是錯的,那個流程這幾週
 *    才做起來。放寬的條件三個都要成立:請求綁了帳本、呼叫者對它有 EDIT(/import 上一道
 *    guard 已算過,直接沿用)、**且 cid 的擁有者也是該帳本成員** —— 最後這條擋掉
 *    「B 拿 A 的 cid 到別的帳本用」。
 * 3. 其他一律拒絕,包含查無擁有者(上線前上傳的舊 cid:系統無法證明是誰的)。
 *    代價是上線前尚未完成的待匯入紀錄要重傳(前端本來就有直傳退路),寫進部署清單。
 *    若改成「查無即放行」,所有舊 cid 永遠留在門外,這道門對它們等於不存在。
 *
 * 聊天附件那端**不帶 scope**(只認本人):訊息是個人的、E2EE,沒有「接續」語意。
 */
export interface IAttachmentReadScope {
  /** 請求所綁的帳本(個人會話為 null → 只認本人) */
  accountBookId: string | null;
  /** 呼叫者對該帳本是否具編輯權(由 resolveCarbonAccess 算出,不在這裡重算) */
  callerCanEdit: boolean;
}

export const canReadAttachmentCid = async (
  userAddress: string,
  cid: string,
  scope?: IAttachmentReadScope,
): Promise<boolean> => {
  const owner = await carbonAttachmentOwnerRepo.findOwnerAddress(cid);
  if (owner === null) return false;
  if (isSameAddress(owner, userAddress)) return true;
  if (!scope?.accountBookId || !scope.callerCanEdit) return false;
  const ownerRole = await accountBookRepo.getMemberRoleByAddress(
    scope.accountBookId,
    owner,
  );
  return ownerRole !== null;
};
