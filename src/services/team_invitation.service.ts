import { logger } from "@/lib/utils/logger";
import { TEAM_INVITATION_STATUS } from "@/constants/status";
import { TeamRole } from "@/constants/team";
import { SystemSettingKey } from "@/constants/system_setting";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import {
  buildInviteUrl,
  createInviteToken,
  hashInviteToken,
  isInviteExpired,
  INVITE_TOKEN_TTL_DAYS,
} from "@/lib/team/invite_token";
import { buildPendingInviteKey } from "@/lib/team/pending_invite_key";
import {
  chargeSeatAddition,
  type ISeatChargeResult,
} from "@/services/team_seat.service";
import { sendMail, MailNotConfiguredError } from "@/services/mail.service";
import { systemSettingService } from "@/services/system_setting.service";
import { teamRepo } from "@/repositories/team.repo";

/**
 * Info: (20260815 - Luphia) Email 邀請（規範 §4 / P4）。
 *
 * 與既有的錢包位址邀請並存：位址邀請適用於「對方已經是本站用戶」，
 * email 邀請適用於「對方還沒有帳號」——受邀者點信中連結完成註冊即加入團隊，
 * 不需要邀請者先問到對方的錢包位址。
 *
 * 順序是 fail-closed，且每一步失敗的處置都不同：
 * 1. **席次**：先確認有沒有位置、需要才補收（見 team_seat.service）
 * 2. **建立邀請**：帶一次性 token 的雜湊與期限
 * 3. **寄信**：失敗即**刪除該邀請**——留著一封沒寄出去的邀請會佔住席次，
 *    而收件者永遠不會知道有這回事。錢不退（產品拍板），但席次會空出來給下一次使用。
 */

function toApiError(def: IErrorDef): ApiError {
  return new ApiError(def.code, def.message, def.status);
}

/**
 * Info: (20260815 - Luphia) Email 格式檢查。
 *
 * 刻意保守而非追求 RFC 完整：這個欄位會觸發一次席次補收與一封信，
 * 寬鬆的規則等於允許用亂打的字串消耗團隊的錢與寄信額度。
 * 真正的驗證是「對方收不收得到」，而那要等信寄出去才知道。
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidInviteEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_PATTERN.test(email);
}

export interface IInviteByEmailParams {
  teamId: string;
  operatorUserId: string;
  email: string;
  role: TeamRole;
  nowMs: number;
}

export interface IInviteByEmailResult {
  invitationId: string;
  expiresAt: Date;
  seatCharge: ISeatChargeResult;
}

export async function inviteMemberByEmail(
  params: IInviteByEmailParams,
): Promise<IInviteByEmailResult> {
  const { teamId, operatorUserId, email, role, nowMs } = params;
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidInviteEmail(normalizedEmail)) {
    throw toApiError(API_ERRORS.VL_INVALID_EMAIL);
  }

  const team = await teamRepo.getTeamById(teamId);
  if (!team) throw toApiError(API_ERRORS.NF_TEAM);

  /**
   * Info: (20260815 - Luphia) 已有未失效的邀請就不再送第二封：
   * 重複邀請會再佔一個席次，而收件者只會困惑於收到兩封一樣的信。
   * 要重寄請先撤回原邀請（席次會留著給下一次用）。
   */
  const existing = await teamRepo.getTeamInvitationByEmail(
    teamId,
    normalizedEmail,
    TEAM_INVITATION_STATUS.PENDING,
  );
  if (existing && !isInviteExpired(existing.expiresAt, nowMs)) {
    throw toApiError(API_ERRORS.VA_AN_INVITATION_IS_ALREADY_PE);
  }

  /**
   * Info: (20260816 - Luphia) 逾期的舊邀請要先清掉才能重邀同一個信箱。
   *
   * 它的狀態仍是 PENDING，因此還握著 `pendingKey` 這個唯一鍵——留著的話，
   * 下面那行 create 會撞 P2002，而使用者看到的是「邀請失敗」卻說不出原因。
   * 實刪而非留存：一封逾期且從未被接受的邀請不是有用的歷史，
   * 而扣款的軌跡在 Order 那邊，不會因為刪掉這一列而消失。
   */
  if (existing) {
    await teamRepo.deleteInvitation(existing.id);
  }

  /**
   * Info: (20260815 - Luphia) 席次：先看有沒有已付費的空位，沒有才補收。
   * 冪等鍵以信箱為準，重試同一封邀請不會扣第二次。
   */
  const seatCharge = await chargeSeatAddition({
    teamId,
    seats: 1,
    nowMs,
    operatorUserId,
    idempotencyKey: `invite-email:${teamId}:${normalizedEmail}`,
  });

  const { token, tokenHash, expiresAt } = createInviteToken(nowMs);

  const invitation = await teamRepo.createTeamInvitation({
    teamId,
    inviterId: operatorUserId,
    inviteeEmail: normalizedEmail,
    tokenHash,
    expiresAt,
    role,
    status: TEAM_INVITATION_STATUS.PENDING,
    /**
     * Info: (20260816 - Luphia) 併發防護：兩位管理員同時邀請同一個信箱時，
     * 上面的「是否已有 PENDING」檢查兩邊都會通過，於是各建一列、各扣一次席次費用。
     * 唯一鍵讓第二筆在資料庫層失敗（見 pending_invite_key.ts）。
     */
    pendingKey: buildPendingInviteKey({
      teamId,
      inviteeEmail: normalizedEmail,
    }),
  });

  try {
    const baseUrl = await systemSettingService.get(
      SystemSettingKey.APP_BASE_URL,
    );
    if (!baseUrl) {
      throw new MailNotConfiguredError([SystemSettingKey.APP_BASE_URL]);
    }
    const inviteUrl = buildInviteUrl(baseUrl, token);
    await sendMail(buildInvitationMail(normalizedEmail, team.name, inviteUrl));
  } catch (error) {
    /**
     * Info: (20260815 - Luphia) 寄信失敗即刪除邀請（見檔頭說明）：
     * 留著一封沒寄出去的邀請會佔住席次，而收件者永遠不會知道有這回事。
     * 補收的錢不退，但席次會空出來給下一次邀請使用。
     */
    await teamRepo.deleteInvitation(invitation.id);
    logger.error("invitation mail failed; invitation removed", {
      teamId,
      invitationId: invitation.id,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error instanceof MailNotConfiguredError
      ? toApiError(API_ERRORS.TW_MAIL_NOT_CONFIGURED)
      : toApiError(API_ERRORS.TW_INVITATION_MAIL_FAILED);
  }

  return { invitationId: invitation.id, expiresAt, seatCharge };
}

function buildInvitationMail(to: string, teamName: string, inviteUrl: string) {
  const subject = `iSunFA｜${teamName} 邀請您加入團隊`;
  /**
   * Info: (20260815 - Luphia) 純文字與 HTML 兩份內容一致：
   * 不少信箱客戶端與過濾器只讀純文字那一份，兩者不一致會讓連結在某些收件匣裡消失。
   */
  const text = [
    `${teamName} 邀請您加入 iSunFA 團隊。`,
    "",
    `請點擊以下連結完成加入（連結為一次性，${INVITE_TOKEN_TTL_DAYS} 天內有效）：`,
    inviteUrl,
    "",
    "若您沒有預期收到這封信，請忽略即可，您不會被加入任何團隊。",
  ].join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.6;color:#1f2937">
      <p><strong>${escapeHtml(teamName)}</strong> 邀請您加入 iSunFA 團隊。</p>
      <p>
        <a href="${escapeHtml(inviteUrl)}"
           style="display:inline-block;background:#ea580c;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">
          接受邀請
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280">
        連結為一次性，${INVITE_TOKEN_TTL_DAYS} 天內有效。若您沒有預期收到這封信，請忽略即可，您不會被加入任何團隊。
      </p>
      <p style="font-size:12px;color:#9ca3af;word-break:break-all">${escapeHtml(inviteUrl)}</p>
    </div>
  `.trim();

  return { to, subject, text, html };
}

/**
 * Info: (20260815 - Luphia) 團隊名稱由使用者輸入，直接插進 HTML 等於把信件版面
 * （乃至收件者的信箱）交給對方擺佈。這裡只處理五個字元，因為信件內容全由本檔產生，
 * 不需要一套通用的消毒器。
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface IInviteView {
  teamId: string;
  teamName: string;
  role: TeamRole;
  expiresAt: Date | null;
}

/**
 * Info: (20260815 - Luphia) 以 token 取得邀請的公開資訊（未登入亦可讀）。
 *
 * 只回團隊名稱與角色，**不回受邀者信箱**：拿到連結的人不一定是收件者本人
 * （信件可能被轉寄），沒有理由讓連結本身洩漏第三人的信箱。
 */
export async function resolveInviteByToken(
  token: string,
  nowMs: number,
): Promise<IInviteView | null> {
  const invitation = await teamRepo.findInvitationByTokenHash(
    hashInviteToken(token),
  );
  if (!invitation) return null;
  if (invitation.status !== TEAM_INVITATION_STATUS.PENDING) return null;
  if (isInviteExpired(invitation.expiresAt, nowMs)) return null;

  return {
    teamId: invitation.teamId,
    teamName: invitation.team.name,
    /**
     * Info: (20260815 - Luphia) Prisma 產生的 TeamRole 與 `@/constants/team` 的
     * 是兩個字面值相同、名義上不同的 enum。轉型只發生在這個邊界上，
     * 值域由 schema 的 enum 保證一致。
     */
    role: invitation.role as unknown as TeamRole,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Info: (20260816 - Luphia) 以 token 拒絕邀請（條款 §3.6「邀請經拒絕…即行釋出席次」）。
 *
 * **不需要登入**，與接受不同。理由是兩者需要的東西不一樣：加入團隊必須知道加的是誰，
 * 拒絕不需要——沒有任何人被加進任何地方。而受邀者多半還沒有帳號，
 * 要求他先註冊才能說「不用了」，等於保證沒有人會用這個功能，
 * 那一席就會佔到七天後逾期為止，而條款寫的是「經拒絕即行釋出」。
 *
 * 代價是拿到轉寄連結的人可以替受邀者拒絕。損失有上限且可回復：
 * 席次當場空出來（本來就不退費），管理員重新邀請不會再收一次錢。
 * 反過來（讓連結持有者**接受**）才是不可回復的，所以那一邊要登入。
 */
export async function declineInviteByToken(
  token: string,
  nowMs: number,
): Promise<{ teamId: string }> {
  const invitation = await teamRepo.findInvitationByTokenHash(
    hashInviteToken(token),
  );
  if (
    !invitation ||
    invitation.status !== TEAM_INVITATION_STATUS.PENDING ||
    isInviteExpired(invitation.expiresAt, nowMs)
  ) {
    throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
  }

  /**
   * Info: (20260816 - Luphia) 沒改到任何一列＝這封邀請剛剛被接受或撤回了。
   * 當成「查無此邀請」，不要回一個「已拒絕」的假象——
   * 那會讓一個其實已經加入團隊的人以為自己拒絕成功。
   */
  const declined = await teamRepo.declineInvitation(invitation.id);
  if (!declined) throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);

  logger.info("invitation declined", {
    teamId: invitation.teamId,
    invitationId: invitation.id,
  });

  return { teamId: invitation.teamId };
}

export interface IAcceptInviteParams {
  token: string;
  userId: string;
  nowMs: number;
}

/**
 * Info: (20260815 - Luphia) 以 token 接受邀請並加入團隊。
 *
 * 授權來自 token 本身（一次性、有期限），因此不再要求受邀者的 FIDO 簽章——
 * 剛註冊完的人還沒有任何與這個團隊相關的憑證可簽，而要求他簽一次只是把
 * 「點連結就能加入」變成「點連結再簽一次才能加入」，沒有增加任何保證。
 */
export async function acceptInviteByToken(
  params: IAcceptInviteParams,
): Promise<{ teamId: string }> {
  const { token, userId, nowMs } = params;

  const invitation = await teamRepo.findInvitationByTokenHash(
    hashInviteToken(token),
  );
  if (
    !invitation ||
    invitation.status !== TEAM_INVITATION_STATUS.PENDING ||
    isInviteExpired(invitation.expiresAt, nowMs)
  ) {
    throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
  }

  /**
   * Info: (20260815 - Luphia) 已經是成員就當成功處理：重複點連結不該看到錯誤。
   *
   * Info: (20260816 - Luphia) 但**不動這封邀請**。原本這裡會把 token 作廢，
   * 那在「已是成員的人開了一封轉寄來的信」時，等於替受邀者把他的連結銷毀——
   * 而受邀者本人還沒用過它。點連結的人是不是收件者，我們無從得知，
   * 所以唯一安全的動作是什麼都不做：他已經在團隊裡了，回成功即可。
   */
  const existingMember = await teamRepo.getTeamMember(
    userId,
    invitation.teamId,
  );
  if (existingMember) {
    return { teamId: invitation.teamId };
  }

  const member = await teamRepo.acceptInvitation(
    invitation.id,
    invitation.teamId,
    userId,
    invitation.role,
  );

  /**
   * Info: (20260816 - Luphia) `null` = 這一列在我們讀取之後、寫入之前已經不是 PENDING。
   *
   * 兩種情境：轉寄出去的連結被另一個人搶先接受，或同一個人連點兩下。
   * 前者必須擋（一個付費席次只能進一個人），後者的第二次點擊本來就該安靜地
   * 視為已完成——所以這裡重查一次成員資格再決定回什麼，
   * 而不是一律報錯讓真的已經加入的人看到失敗。
   */
  if (!member) {
    const joined = await teamRepo.getTeamMember(userId, invitation.teamId);
    if (joined) return { teamId: invitation.teamId };
    throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
  }

  return { teamId: invitation.teamId };
}
