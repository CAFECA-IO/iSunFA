import { logger } from "@/lib/utils/logger";
import { INVITE_EMAIL_MATCH, TEAM_INVITATION_STATUS } from "@/constants/status";
import { TeamRole, isTeamManagerRole } from "@/constants/team";
import { SystemSettingKey } from "@/constants/system_setting";
import {
  DEFAULT_TEAM_INVITE_COOLDOWN_SECONDS,
  DEFAULT_TEAM_INVITE_DAILY_LIMIT,
  DEFAULT_TEAM_PENDING_INVITE_LIMIT,
  TEAM_PLAN,
} from "@/constants/subscription_quota";
import { getTeamEntitlement } from "@/services/plan.service";
import { API_ERRORS, ApiError, IErrorDef } from "@/lib/utils/error_dictionary";
import {
  buildInviteUrl,
  createInviteToken,
  hashInviteToken,
  isInviteExpired,
  INVITE_TOKEN_TTL_DAYS,
} from "@/lib/team/invite_token";
import { canonicalizeEmailForKey } from "@/lib/team/email_identity";
import { buildPendingInviteKey } from "@/lib/team/pending_invite_key";
import { resolveInviteEmailMatch } from "@/lib/team/invite_email_match";
import { userIdentityRepo } from "@/repositories/user_identity.repo";
import {
  chargeSeatAddition,
  type ISeatChargeResult,
} from "@/services/team_seat.service";
import { sendMail, MailNotConfiguredError } from "@/services/mail.service";
import { systemSettingService } from "@/services/system_setting.service";
import { teamRepo } from "@/repositories/team.repo";
import { paymentRepo } from "@/repositories/payment.repo";
import type { IOenCallbackData } from "@/interfaces/payment";

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

/**
 * Info: (20260819 - Luphia) 兩道上限的設定解析（正式值為 DB 系統設定，ADR 017）。
 *
 * 讀不到或驗簽失敗一律退回程式內的保底值，理由與 `resolveFaithMemoryRetentionDays`
 * 同一套：這兩個值不是憑證、也不授權任何事，而退回保底值是**較嚴格**的方向
 * （被竄改成 999999 也不會讓上限失效）。
 */
const DAY_MS = 86_400_000;

async function resolveNumericSetting(
  key: SystemSettingKey,
  fallback: number,
): Promise<number> {
  try {
    const raw = await systemSettingService.get(key);
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  } catch (error) {
    logger.warn("failed to resolve invite limit setting; using fallback", {
      key,
      fallback,
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

const resolveTeamPendingInviteLimit = (): Promise<number> =>
  resolveNumericSetting(
    SystemSettingKey.TEAM_PENDING_INVITE_LIMIT,
    DEFAULT_TEAM_PENDING_INVITE_LIMIT,
  );

const resolveTeamInviteDailyLimit = (): Promise<number> =>
  resolveNumericSetting(
    SystemSettingKey.TEAM_INVITE_DAILY_LIMIT,
    DEFAULT_TEAM_INVITE_DAILY_LIMIT,
  );

const resolveTeamInviteCooldownSeconds = (): Promise<number> =>
  resolveNumericSetting(
    SystemSettingKey.TEAM_INVITE_COOLDOWN_SECONDS,
    DEFAULT_TEAM_INVITE_COOLDOWN_SECONDS,
  );

/**
 * Info: (20260819 - Luphia) 冷卻期間帶著剩餘秒數（產品決定 20260819）。
 *
 * 只說「請稍後再試」而不說多久，使用者只能一直按——而每一次按都會再打一次 API。
 * 剩餘秒數走 payload（同 402 額度用罄的作法），前端據此顯示倒數。
 */
export class InviteCooldownError extends ApiError {
  public data: { retryAfterSeconds: number };

  constructor(retryAfterSeconds: number) {
    super(
      API_ERRORS.TW_INVITE_COOLDOWN.code,
      API_ERRORS.TW_INVITE_COOLDOWN.message,
      API_ERRORS.TW_INVITE_COOLDOWN.status,
    );
    this.name = "InviteCooldownError";
    this.data = { retryAfterSeconds };
  }
}

/**
 * Info: (20260819 - Luphia) 冷卻**只對免費方案生效**（產品決定 20260819）。
 *
 * 三道量控存在的理由是「免費團隊不收席次費，寄信量沒有經濟上的煞車」。付費團隊
 * 每加一席都在付錢，而冷卻是三道裡對他們最痛的一道：60 席的公司要一次邀 60 位
 * 員工，每分鐘一封就是**花一小時**才寄得完，而那些席次的錢已經付了。
 *
 * 兩道總量上限（同時未接受 20、每日 50）**維持一律套用**：那是總量的煞車，
 * 而帳號被盜時付費團隊反而是更好的跳板（有卡、有信譽），不該完全沒有上界。
 *
 * 「什麼是免費方案」交給 `resolveEffectivePlanId`（唯一判斷點）：訂閱過期或
 * 被取消一律視為免費，否則「讓訂閱過期」就成了免除冷卻的方法。
 */
async function isFreePlanTeam(teamId: string, nowMs: number): Promise<boolean> {
  /**
   * Info: (20260819 - Luphia) 方案一律經 `plan.service` 的權益入口（集中化 20260819）：
   * 這裡不再自己撈訂閱列再折算——那是第二道門，而兩道門的答案遲早不一樣。
   */
  const planId = await getTeamEntitlement({
    teamId,
    nowSec: Math.floor(nowMs / 1000),
  });
  return planId === TEAM_PLAN.FREE;
}

export interface IInviteLimitsView {
  /** Info: (20260819 - Luphia) 還要等幾秒才能再寄；0 代表現在就可以 */
  cooldownSecondsRemaining: number;
  pendingCount: number;
  sentToday: number;
  /**
   * Info: (20260819 - Luphia) 上限；**`null` 代表這個方案不適用**（付費團隊）。
   *
   * 回 `null` 而不是一個很大的數字：畫面要說得出「不限」與「上限很高」的差別，
   * 而一個假的大數字會在某天被當成真的上限顯示出去。
   */
  pendingLimit: number | null;
  dailyLimit: number | null;
}

/**
 * Info: (20260819 - Luphia) 邀請量的現況（唯讀），供對話框開啟時顯示。
 *
 * 與 `assertInviteVolumeWithinLimits` 讀同一組數字。**刻意不讓它自己判斷能不能寄**
 * ——那個判斷只有一份，在下面那支；這裡只回原始數字，畫面自己決定怎麼呈現。
 * 兩邊各判一次的話，「畫面說可以、送出被擋」就會變成可能發生的事。
 */
export async function getInviteLimits(
  teamId: string,
  nowMs: number,
): Promise<IInviteLimitsView> {
  const [pendingLimit, dailyLimit, cooldownSeconds] = await Promise.all([
    resolveTeamPendingInviteLimit(),
    resolveTeamInviteDailyLimit(),
    resolveTeamInviteCooldownSeconds(),
  ]);
  /**
   * Info: (20260819 - Luphia) 付費團隊不套用這三道（見 `assertInviteVolumeWithinLimits`）：
   * 不查冷卻、上限回 `null`。用量仍然回傳——那是有用的資訊，只是沒有上界。
   */
  const freePlan = await isFreePlanTeam(teamId, nowMs);
  const [pendingCount, sentToday, lastSentAt] = await Promise.all([
    teamRepo.countPendingInvitations(teamId, nowMs),
    teamRepo.countInvitationsCreatedSince(teamId, new Date(nowMs - DAY_MS)),
    freePlan
      ? teamRepo.findLastInvitationSentAt(teamId)
      : Promise.resolve(null),
  ]);

  return {
    cooldownSecondsRemaining: resolveCooldownRemaining(
      lastSentAt,
      nowMs,
      cooldownSeconds,
    ),
    pendingCount,
    sentToday,
    pendingLimit: freePlan ? pendingLimit : null,
    dailyLimit: freePlan ? dailyLimit : null,
  };
}

/**
 * Info: (20260819 - Luphia) 剩餘冷卻秒數（純函式，向上取整）。
 *
 * 向上取整而不是四捨五入：回 0 的意思是「現在可以寄」，而還差 0.4 秒時回 0
 * 會讓前端倒數結束的那一刻按下去被擋——顯示的與實際的必須是同一件事。
 */
export function resolveCooldownRemaining(
  lastSentAt: Date | null,
  nowMs: number,
  cooldownSeconds: number,
): number {
  if (!lastSentAt) return 0;
  const elapsedMs = nowMs - lastSentAt.getTime();
  const remainingMs = cooldownSeconds * 1000 - elapsedMs;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/**
 * Info: (20260819 - Luphia) 邀請量的兩道團隊層上限（產品決定 20260819）。
 *
 * 免費版人數上限移除之後（額度改為全隊共用一份），寄信量失去所有界線：免費團隊
 * 不收席次費，而每一封 email 邀請都是真的寄出去的信。人數不再是煞車，這裡就是。
 *
 * 兩道分工不同，缺一不可：
 *
 * 1. **同時未接受數**：擋「一次撒出幾百封」。
 * 2. **每日寄送數**：擋「撤回再邀、撤回再邀」的迴圈——只看第 1 道的話，
 *    那個迴圈可以無限寄信而同時數永遠是 1。計數以已建立的邀請列為準，
 *    撤回或被拒絕的仍然算（信已經寄出去了）。
 *
 * 位置在**扣款與建立邀請之前**：擋下來時不該產生任何金流，也不該留下邀請列。
 * 另有一層依操作者的限流（`RateLimitBucketEnum.TEAM_INVITE_SEND`）擋單人狂點，
 * 而這裡擋的是整團的總量——多位管理員各自在限流額度內，仍然能疊出大量寄信。
 */
export async function assertInviteVolumeWithinLimits(
  teamId: string,
  nowMs: number,
): Promise<void> {
  /**
   * Info: (20260819 - Luphia) **三道量控只對免費方案生效**（產品決定 20260819）。
   *
   * 這三道存在的理由是「免費團隊不收席次費，寄信量沒有經濟上的煞車」。付費團隊
   * 每加一席都在付錢，那本身就是煞車——而三道限制對他們的代價是實際的：
   * 60 席的公司一次邀 60 位員工，會在第 21 封撞到同時未接受數，而每分鐘一封
   * 更要花一小時。那些席次的錢已經付了，而錯誤訊息還把責任推給管理員。
   *
   * 付費團隊剩下的界線是**每操作者的限流**（10/分、100/日，`TEAM_INVITE_SEND`）。
   * 那一層是 process 記憶體的實作：多實例各自計數、重啟歸零，因此它擋得住
   * 「一個人狂點」，擋不住「總量」。這是這個決定明知而為的取捨——
   * 付費團隊的濫用成本由席次費與金流紀錄承擔，不由這三道承擔。
   */
  const freePlan = await isFreePlanTeam(teamId, nowMs);
  if (!freePlan) return;

  const [pendingLimit, dailyLimit] = await Promise.all([
    resolveTeamPendingInviteLimit(),
    resolveTeamInviteDailyLimit(),
  ]);
  const [pendingCount, sentToday, lastSentAt] = await Promise.all([
    teamRepo.countPendingInvitations(teamId, nowMs),
    teamRepo.countInvitationsCreatedSince(teamId, new Date(nowMs - DAY_MS)),
    freePlan
      ? teamRepo.findLastInvitationSentAt(teamId)
      : Promise.resolve(null),
  ]);

  /**
   * Info: (20260819 - Luphia) 冷卻（產品決定 20260819）：距離上一封未滿一分鐘就擋。
   *
   * 與「每分鐘 10 封」的限流分工不同：限流擋的是狂點，冷卻擋的是**穩定地一直寄**
   * ——後者在限流眼中看起來完全正常（每分鐘 1 封，永遠不會超限）。
   *
   * 擋在兩道總量上限**之前**：它是最便宜的檢查，而且是使用者最常撞到的一道，
   * 錯誤訊息也帶得出「還要等幾秒」這種可行動的資訊。
   */
  const cooldownRemaining = resolveCooldownRemaining(
    lastSentAt,
    nowMs,
    await resolveTeamInviteCooldownSeconds(),
  );
  if (cooldownRemaining > 0) {
    logger.info("invitation cooldown active", { teamId, cooldownRemaining });
    throw new InviteCooldownError(cooldownRemaining);
  }

  if (pendingCount >= pendingLimit) {
    logger.info("pending invitation limit reached", {
      teamId,
      pendingCount,
      pendingLimit,
    });
    throw toApiError(API_ERRORS.TW_PENDING_INVITE_LIMIT);
  }

  if (sentToday >= dailyLimit) {
    logger.info("daily invitation limit reached", {
      teamId,
      sentToday,
      dailyLimit,
    });
    throw toApiError(API_ERRORS.TW_INVITE_DAILY_LIMIT);
  }
}

export interface IInviteByEmailParams {
  teamId: string;
  operatorUserId: string;
  email: string;
  role: TeamRole;
  nowMs: number;
  /**
   * Info: (20260819 - Luphia) 畫面上顯示過的席次費用，扣款前比對（review #6682 高）。
   * 不符即 `TW_SEAT_QUOTE_STALE`，要求重新試算——不照新價扣款。
   */
  expectedAmount?: number;
}

export interface IInviteByEmailResult {
  invitationId: string;
  expiresAt: Date;
  seatCharge: ISeatChargeResult;
}

/**
 * Info: (20260818 - Luphia) 以第三方綁定的信箱反查團隊成員（第三輪 C-4）。
 *
 * `User` 沒有 email 欄位，唯一的對應是第三方登入的綁定（`UserIdentity`）。
 * 因此這支只找得到「用該信箱做過第三方登入」的人——以 passkey 註冊的成員
 * 查不到。這是能力的上限，不是實作的疏漏，呼叫端要據此理解它的保證強度。
 */
async function findTeamMemberByEmail(
  teamId: string,
  email: string,
): Promise<string | null> {
  const identities = await userIdentityRepo.findByEmail(email);
  for (const identity of identities) {
    const member = await teamRepo.getTeamMember(identity.userId, teamId);
    if (member) return member.id;
  }
  return null;
}

/**
 * Info: (20260818 - Luphia) 建立邀請失敗時的處置（第三輪 C-3）。
 *
 * 位址路徑有這一段（失敗即把訂單標成 MINT_FAILED，註解還寫著
 * 「席次路徑不能是例外」），email 路徑漏了。而 `pendingKey` 的唯一鍵在並發時
 * **預期**會丟 P2002——那是這條路徑上唯一被設計成「一定會發生」的錯誤，
 * 卻是唯一沒被處理的，會一路落到 `IS_UNKNOWN` 500。
 */
async function createInvitationOrCompensate(
  data: Parameters<typeof teamRepo.createTeamInvitation>[0],
  seatCharge: ISeatChargeResult,
) {
  try {
    return await teamRepo.createTeamInvitation(data);
  } catch (error) {
    /**
     * Info: (20260818 - Luphia) P2002 = 並發下有人搶先建立了同一封邀請。
     * 這不是系統錯誤，而是「已有待處理的邀請」，回對應的錯誤碼。
     */
    if (isUniqueConstraintError(error)) {
      throw toApiError(API_ERRORS.VA_AN_INVITATION_IS_ALREADY_PE);
    }

    /**
     * Info: (20260818 - Luphia) 已扣款卻建不出邀請＝已收款未履行。
     * 不標記的話這筆會停在 COMPLETED、席次也加了，而邀請不存在——
     * 沒有任何查詢篩得出它。
     */
    if (seatCharge.orderId) {
      await paymentRepo.updateOrderMintFailed(
        seatCharge.orderId,
        { teamId: data.teamId, inviteeEmail: data.inviteeEmail },
        {} as IOenCallbackData,
        `invitation creation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    throw error;
  }
}

// Info: (20260818 - Luphia) Prisma 的唯一鍵衝突（不依賴訊息字串）
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === "P2002"
  );
}

export async function inviteMemberByEmail(
  params: IInviteByEmailParams,
): Promise<IInviteByEmailResult> {
  const { teamId, operatorUserId, email, role, nowMs, expectedAmount } = params;
  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidInviteEmail(normalizedEmail)) {
    throw toApiError(API_ERRORS.VL_INVALID_EMAIL);
  }

  const team = await teamRepo.getTeamById(teamId);
  if (!team) throw toApiError(API_ERRORS.NF_TEAM);

  /**
   * Info: (20260818 - Luphia) 已經是成員就不要再邀請一次（第三輪 C-4）。
   *
   * 位址路徑早就有這道檢查，email 路徑漏了。少了它：照收席次費、照寄信，
   * 而對方點連結後 `acceptInviteByToken` 發現他已是成員、回成功且刻意不動那封邀請
   * ——於是那封 PENDING 邀請佔住一席直到七天後逾期，而畫面顯示「邀請成功」。
   *
   * 以第三方綁定的信箱比對：那是唯一能把 email 對應到帳號的資料
   * （`User` 沒有 email 欄位）。比不到的情況很常見（passkey 註冊），
   * 那時只能讓它往下走——這道檢查能擋的是「找得到的重複」，不是全部。
   */
  const existingMemberId = await findTeamMemberByEmail(teamId, normalizedEmail);
  if (existingMemberId) {
    throw toApiError(API_ERRORS.VA_USER_IS_ALREADY_A_MEMBER_OF);
  }

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
   * Info: (20260819 - Luphia) 量控在扣款之前：擋下來時不產生金流、不留邀請列。
   */
  await assertInviteVolumeWithinLimits(teamId, nowMs);

  /**
   * Info: (20260815 - Luphia) 席次：先看有沒有已付費的空位，沒有才補收。
   * 冪等鍵以信箱為準，重試同一封邀請不會扣第二次。
   */
  const seatCharge = await chargeSeatAddition({
    teamId,
    seats: 1,
    nowMs,
    operatorUserId,
    // Info: (20260819 - Luphia) 畫面上顯示過的金額，扣款前比對（review #6682 高）
    expectedAmount,
    /**
     * Info: (20260818 - Luphia) 冪等鍵以「同一個收件匣」為準（第三輪 C-1）：
     * 否則同一個人的 plus/點號變體每一封都會真的刷一次 OWNER 的卡。
     */
    idempotencyKey: `invite-email:${teamId}:${canonicalizeEmailForKey(
      normalizedEmail,
    )}`,
  });

  const { token, tokenHash, expiresAt } = createInviteToken(nowMs);

  const invitation = await createInvitationOrCompensate(
    {
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
    },
    seatCharge,
  );

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
  /**
   * Info: (20260818 - Luphia) 呼叫者資訊（第三輪 D）。
   *
   * 這支**不要求登入**，所以除此之外沒有任何線索留下來：
   * 一封邀請被拒絕就當場釋出席次，而管理員只看到「對方拒絕了」。
   * 連結被轉寄出去、被別人按掉時，IP／UA 是唯一能事後追的東西。
   *
   * 兩者都是用戶端可控的值，因此只記錄、不用於任何判斷。
   */
  caller?: { ip?: string; userAgent?: string | null },
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
    // Info: (20260818 - Luphia) 未登入端點的唯一線索（第三輪 D）；不作判斷用
    ip: caller?.ip ?? "unknown",
    userAgent: caller?.userAgent ?? "unknown",
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

  /**
   * Info: (20260817 - Luphia) 稽核用的信箱比對（不影響能否加入）。
   *
   * 只在有第三方綁定時才比得出東西；純 passkey 註冊的帳號沒有任何 email
   * （`User` 沒有 email 欄位），結果會是 `UNAVAILABLE`——那是常態，不是異常。
   * 邀請信箱是**投遞地址，不是身分斷言**，見 invite_email_match.ts。
   */
  const identities = await userIdentityRepo.findByUserId(userId);
  const emailMatch = resolveInviteEmailMatch(
    invitation.inviteeEmail,
    identities
      .filter((identity) => identity.emailVerified)
      .map((identity) => identity.email),
  );

  /**
   * Info: (20260819 - Luphia) 免費版人數上限已移除（產品決定 20260819）。
   *
   * 上限存在的理由不是人數，是**免費額度**：額度逐成員計算、每位成員各自一份，
   * 於是 20 人的免費團隊就是每週 800 點的模型用量、月費零。同一輪已把免費方案的
   * 額度改為**全隊共用一份**（見 `spendCredits`）——加人不再產生額度，
   * 上限與它的兩道防線（邀請端、接受端）因此一起移除。
   *
   * 付費方案的人數仍由「席次 × 單價」自然封頂，那條路徑完全沒有變。
   */

  /**
   * Info: (20260818 - Luphia) 信箱不符時**當場告警**（第三輪 C-2）。
   *
   * 這個欄位先前是純寫入：DB 老實記下 `MISMATCHED`，而沒有任何查詢、
   * API 或畫面讀它——稽核價值等於零。既然接受邀請不綁身分是刻意的
   * （模型是 bearer token），這個訊號就更需要被看見。
   *
   * 兩層：這裡記 warn（立即可觀測、可接到告警系統），
   * 另一層在成員清單上標給管理職看（見 members 端點）。
   */
  if (emailMatch === INVITE_EMAIL_MATCH.MISMATCHED) {
    logger.warn("invitation accepted by a different verified email", {
      teamId: invitation.teamId,
      invitationId: invitation.id,
      acceptedByUserId: userId,
    });
  }

  const member = await teamRepo.acceptInvitation({
    inviteId: invitation.id,
    teamId: invitation.teamId,
    userId,
    role: invitation.role,
    acceptedAt: new Date(nowMs),
    emailMatch,
  });

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

export interface IRevokeInviteParams {
  teamId: string;
  inviteId: string;
  operatorUserId: string;
}

/**
 * Info: (20260817 - Luphia) 撤回尚未接受的邀請（產品拍板 20260815）。
 *
 * 由 route 搬進 service（CLAUDE.md §1）：這裡有三條業務規則——操作者的權限、
 * 邀請必須屬於路徑上的團隊、且必須仍是 PENDING——而規則放在端口裡就沒辦法
 * 單獨測試，也很容易在下一支類似的端點裡被漏抄一條。
 *
 * 撤回**不退費**（`subscription.seats` 不減），但空出來的位置可以立刻再用。
 */
export async function revokeInvitation(
  params: IRevokeInviteParams,
): Promise<{ id: string; seatReleased: boolean; refunded: boolean }> {
  const { teamId, inviteId, operatorUserId } = params;

  const operator = await teamRepo.getTeamMember(operatorUserId, teamId);
  if (!isTeamManagerRole(operator?.role)) {
    throw toApiError(API_ERRORS.FO_PERMISSION_DENIED_ONLY_OWN);
  }

  const invitation = await teamRepo.getInvitationByIdWithDetails(inviteId);
  /**
   * Info: (20260817 - Luphia) 邀請必須屬於路徑上的團隊。少了這一行，
   * 任何團隊的管理員都能刪掉別的團隊的邀請——上面驗的是「他對 teamId 的權限」，
   * 而不是「他對這筆邀請的權限」。
   */
  if (!invitation || invitation.teamId !== teamId) {
    throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
  }
  if (invitation.status !== TEAM_INVITATION_STATUS.PENDING) {
    throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
  }

  /**
   * Info: (20260818 - Luphia) 改狀態而非實刪除（第三輪 D）。
   *
   * 撤回是團隊主動收回一封已經寄出、且已經收過席次費的邀請。實刪除之後
   * 「曾經邀請過誰、由誰撤回」查不到，而同一條路徑上的「拒絕」留著紀錄——
   * 同一件事的兩個方向，稽核強度不該不一樣。
   *
   * 回 false 代表這封邀請剛剛被接受或已被別人撤回。此時不能回「撤回成功」：
   * 那會讓管理員以為席次空出來了，而對方其實已經在團隊裡。
   */
  const revoked = await teamRepo.revokeInvitationById(inviteId, operatorUserId);
  if (!revoked) throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);

  logger.info("invitation revoked", {
    teamId,
    invitationId: inviteId,
    revokedByUserId: operatorUserId,
  });

  // Info: (20260817 - Luphia) 明講「席次已釋出、費用不退」，前端才說得出這件事
  return { id: inviteId, seatReleased: true, refunded: false };
}

export interface IDeclineByMemberParams {
  inviteId: string;
  userId: string;
  address: string;
}

/**
 * Info: (20260817 - Luphia) 受邀者拒絕以錢包位址寄出的邀請（條款 §3.6）。
 *
 * 同樣由 route 搬進 service（CLAUDE.md §1）。與 token 路徑的差別只在身分來源：
 * 位址邀請的受邀者一定已經有帳號，因此可以、也應該驗「是不是本人」。
 */
export async function declineInvitationByMember(
  params: IDeclineByMemberParams,
): Promise<{ id: string; teamId: string }> {
  const { inviteId, address } = params;

  const invitation = await teamRepo.getInvitationByIdWithDetails(inviteId);
  if (!invitation || invitation.status !== TEAM_INVITATION_STATUS.PENDING) {
    throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);
  }
  if (invitation.inviteeAddress !== address) {
    throw toApiError(API_ERRORS.FO_YOU_ARE_NOT_THE_INTENDED_RE);
  }

  /**
   * Info: (20260817 - Luphia) `false` = 這封邀請在讀取之後已經不是 PENDING。
   * 當成查無此邀請，不要回一個「已拒絕」的假象——那會讓一個其實已經
   * 加入團隊的人以為自己退掉了。
   */
  const declined = await teamRepo.declineInvitation(inviteId);
  if (!declined) throw toApiError(API_ERRORS.NO_INVITATION_NOT_FOUND_OR_NO);

  return { id: inviteId, teamId: invitation.teamId };
}
