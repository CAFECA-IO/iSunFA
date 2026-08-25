import { prisma } from "@/lib/prisma";
import {
  Prisma,
  Team,
  TeamMember,
  TeamInvitation,
  TeamRole,
} from "@/generated";
import {
  INVITE_EMAIL_MATCH,
  TEAM_INVITATION_STATUS,
  type InviteEmailMatch,
} from "@/constants/status";
import { canonicalizeEmailForKey } from "@/lib/team/email_identity";

/**
 * Info: (20260814 - Luphia) 團隊 + 我在其中的角色（null = 資料異常，查得到團隊卻查不到成員身分）。
 * 角色決定畫面上哪些團隊可被選為訂閱／購點的對象（設計書 §6.4）。
 */
export type ITeamWithRole = Team & {
  role: string | null;
  // Info: (20260814 - Luphia) 團隊人數＝訂閱席次數：訂閱畫面要先算得出「席次 × 單價」
  memberCount: number;
};

/**
 * Info: (20260817 - Luphia) 接受邀請的參數。改成物件而非位置參數：
 * 加上稽核欄位後有六個，其中三個是 string，位置參數寫錯順序不會被型別擋下來。
 */
export interface IAcceptInvitationParams {
  inviteId: string;
  teamId: string;
  userId: string;
  role: TeamRole;
  acceptedAt: Date;
  // Info: (20260817 - Luphia) INVITE_EMAIL_MATCH；位址邀請無受邀信箱可比對，為 null
  emailMatch?: InviteEmailMatch | null;
}

export interface ITeamRepository {
  createTeam(data: Prisma.TeamCreateInput): Promise<Team>;
  createTeamMember(data: Prisma.TeamMemberCreateInput): Promise<TeamMember>;
  listTeamMember(teamId: string): Promise<TeamMember[]>;
  listMemberTeam(userId: string): Promise<ITeamWithRole[]>;
  countMembers(teamId: string): Promise<number>;
  updateTeamMember(
    id: string,
    data: Prisma.TeamMemberUpdateInput,
  ): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<TeamMember>;
  updateTeam(id: string, data: Prisma.TeamUpdateInput): Promise<Team>;
  deleteTeam(id: string): Promise<Team>;
  getTeamMember(userId: string, teamId: string): Promise<TeamMember | null>;
  getTeamById(id: string): Promise<Team | null>;
  getTeamInvitation(
    teamId: string,
    inviteeAddress: string,
    status: string,
  ): Promise<TeamInvitation | null>;
  getTeamInvitationByEmail(
    teamId: string,
    inviteeEmail: string,
    status: string,
  ): Promise<TeamInvitation | null>;
  createTeamInvitation(
    data: Prisma.TeamInvitationUncheckedCreateInput,
  ): Promise<TeamInvitation>;
  deleteInvitation(id: string): Promise<TeamInvitation>;
  countPendingInvitations(teamId: string, nowMs: number): Promise<number>;
  findInvitationByTokenHash(
    tokenHash: string,
  ): Promise<Prisma.TeamInvitationGetPayload<{
    include: { team: true };
  }> | null>;
  /**
   * Info: (20260815 - Luphia) 回傳型別刻意不是 `TeamInvitation`：
   * 這支不吐 `tokenHash`（見實作處說明），型別要照實反映那件事，
   * 否則下一個人會理所當然地在端點裡引用一個實際上不存在的欄位。
   *
   * Info: (20260817 - Luphia) 改用 `Pick` 而非 `Omit`：每次資料表加一欄，
   * `Omit` 就會把新欄位默默納入這個型別，而 select 沒有選它——
   * 型別說有、實際是 undefined，正是這裡最不該發生的事。
   */
  listMismatchedAcceptorIds(teamId: string): Promise<string[]>;
  listTeamInvitations(
    teamId: string,
    status: string,
  ): Promise<
    Pick<
      TeamInvitation,
      | "id"
      | "teamId"
      | "inviterId"
      | "inviteeAddress"
      | "inviteeEmail"
      | "role"
      | "status"
      | "expiresAt"
      | "createdAt"
    >[]
  >;
  getPendingInvitationsForRecipient(params: {
    address: string;
    emailKeys: readonly string[];
  }): Promise<
    Prisma.TeamInvitationGetPayload<{
      include: {
        team: true;
        inviter: { select: { name: true; address: true; imageUrl: true } };
      };
    }>[]
  >;
  getInvitationByIdWithDetails(
    inviteId: string,
  ): Promise<Prisma.TeamInvitationGetPayload<{
    include: { team: true; inviter: true };
  }> | null>;
  // Info: (20260816 - Luphia) 回 `false` 代表這封邀請已不是 PENDING
  declineInvitation(inviteId: string): Promise<boolean>;
  // Info: (20260818 - Luphia) 撤回：同上，但另記撤回者（第三輪 D）
  revokeInvitationById(
    inviteId: string,
    revokedByUserId: string,
  ): Promise<boolean>;
  /**
   * Info: (20260816 - Luphia) 回 `null` 代表這封邀請已不是 PENDING（被搶先接受或已撤回）。
   * 型別上就是可空的，呼叫端才不會把「沒搶到」當成「加入成功」。
   */
  acceptInvitation(params: IAcceptInvitationParams): Promise<TeamMember | null>;
  getTeamMemberById(memberId: string): Promise<TeamMember | null>;
  countTeamMembersByRole(
    teamId: string,
    role: TeamRole | string,
  ): Promise<number>;
}

export class TeamRepository implements ITeamRepository {
  async createTeam(data: Prisma.TeamCreateInput) {
    const team = await prisma.team.create({ data });
    return team;
  }

  async findManyTeams(args: Prisma.TeamFindManyArgs) {
    return prisma.team.findMany(args);
  }

  async createTeamMember(data: Prisma.TeamMemberCreateInput) {
    const teamMember = await prisma.teamMember.create({ data });
    return teamMember;
  }

  async findManyMembers(args: Prisma.TeamMemberFindManyArgs) {
    return prisma.teamMember.findMany(args);
  }

  async listTeamMember(teamId: string) {
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, address: true, name: true, imageUrl: true },
        },
      },
    });
    return teamMembers;
  }

  /**
   * Info: (20260814 - Luphia) 一併帶出「我在這個團隊的角色」：
   * 訂閱限 OWNER、購點限 OWNER / ADMIN（設計書 §6.4），前端要據此決定哪些團隊可選。
   * 少了這個欄位，畫面只能讓人全選一遍再被 server 打回票。
   */
  /**
   * Info: (20260821 - Luphia) 診斷用：某人所屬的每個團隊 + 該團隊的訂閱原值
   *（`scripts/diagnose_subscription_state.ts`）。
   *
   * 與 `listMemberTeam` 的差別是它帶**訂閱列本身**：診斷要分辨「顯示端沒回 plan」
   * 與「履行端沒套用」，而那需要看得到 DB 的原值（planId / status / 週期 / 卡片狀態）。
   * 專屬方法而不是讓腳本自己拼 `select`：只有 Repository 碰得到 Prisma（CLAUDE.md §1），
   * 而 `findManyMembers` 的回傳型別不含關聯，腳本會拿不到 `team`。
   */
  async listMembershipsWithSubscription(userId: string) {
    return prisma.teamMember.findMany({
      where: { userId },
      select: {
        role: true,
        teamId: true,
        team: {
          select: { name: true, deletedAt: true, teamSubscription: true },
        },
      },
    });
  }

  async listMemberTeam(userId: string) {
    const teams = await prisma.team.findMany({
      where: { teamMembers: { some: { userId } } },
      include: {
        accountBooks: true,
        teamMembers: { where: { userId }, select: { role: true } },
        _count: { select: { teamMembers: true } },
      },
    });
    return teams.map(({ teamMembers, _count, ...team }) => ({
      ...team,
      role: teamMembers[0]?.role ?? null,
      memberCount: _count.teamMembers,
    }));
  }

  /**
   * Info: (20260819 - Luphia) 這個人**擁有**（OWNER）的團隊，附各自的訂閱狀態。
   *
   * 供「一個人只能擁有一個免費團隊」的判斷（產品決定 20260819）。回訂閱的三個
   * 欄位而不是回一個布林，是因為「什麼是有效方案」只能有一個判斷點
   * （`resolveEffectivePlanId`）——在這裡自己判一次，兩邊遲早分岔。
   *
   * 一次查詢帶出訂閱（`include`），不是先撈團隊再逐一查（N+1）。
   */
  async listOwnedTeamsWithSubscription(userId: string): Promise<
    {
      teamId: string;
      subscription: {
        planId: string;
        status: string;
        currentPeriodEnd: Date;
      } | null;
    }[]
  > {
    const memberships = await prisma.teamMember.findMany({
      where: { userId, role: TeamRole.OWNER },
      select: {
        teamId: true,
        team: {
          select: {
            teamSubscription: {
              select: {
                planId: true,
                status: true,
                currentPeriodEnd: true,
              },
            },
          },
        },
      },
    });
    return memberships.map((membership) => ({
      teamId: membership.teamId,
      subscription: membership.team?.teamSubscription ?? null,
    }));
  }

  /**
   * Info: (20260814 - Luphia) 團隊人數 = 席次數（規範 P2）：訂閱以此乘上單價計費。
   * 以成員關聯計數，不含待接受的邀請——邀請的席次在發出時就已單獨補收。
   */
  async countMembers(teamId: string) {
    return prisma.teamMember.count({ where: { teamId } });
  }

  async updateTeamMember(id: string, data: Prisma.TeamMemberUpdateInput) {
    const teamMember = prisma.teamMember.update({
      where: { id },
      data,
    });
    return teamMember;
  }

  async deleteTeamMember(id: string) {
    const teamMember = prisma.teamMember.delete({
      where: { id },
    });
    return teamMember;
  }

  async updateTeam(id: string, data: Prisma.TeamUpdateInput) {
    const team = prisma.team.update({
      where: { id },
      data,
    });
    return team;
  }

  async deleteTeam(id: string) {
    const team = prisma.team.delete({
      where: { id },
    });
    return team;
  }

  async getTeamMember(userId: string, teamId: string) {
    const teamMember = await prisma.teamMember.findFirst({
      where: { userId, teamId },
    });
    return teamMember;
  }

  async getTeamById(id: string) {
    return prisma.team.findUnique({ where: { id } });
  }

  /**
   * Info: (20260819 - Luphia) 團隊的 OWNER 與其鏈上地址（訂閱會員卡鑄給誰）。
   *
   * OWNER 是持卡人（付訂閱費的那個人），因此卡片鑄給他。取**最早加入**的那一位：
   * 團隊理論上只有一位 OWNER，但「最後一位 OWNER」的保護是在應用層而不是資料庫,
   * 所以這裡不假設唯一——固定取最早的一位，讓同步結果與呼叫次序無關
   * （否則資料庫回傳順序一變，卡片就會鑄給另一個人）。
   */
  async findTeamOwner(
    teamId: string,
  ): Promise<{ userId: string; address: string } | null> {
    const owner = await prisma.teamMember.findFirst({
      where: { teamId, role: TeamRole.OWNER },
      orderBy: { createdAt: "asc" },
      select: { userId: true, user: { select: { address: true } } },
    });
    if (!owner) return null;
    return { userId: owner.userId, address: owner.user.address };
  }

  async getTeamInvitation(
    teamId: string,
    inviteeAddress: string,
    status: string,
  ) {
    return prisma.teamInvitation.findFirst({
      where: { teamId, inviteeAddress, status },
    });
  }

  // Info: (20260815 - Luphia) email 邀請的重複檢查（規範 §4 / P4）
  async getTeamInvitationByEmail(
    teamId: string,
    inviteeEmail: string,
    status: string,
  ) {
    return prisma.teamInvitation.findFirst({
      where: { teamId, inviteeEmail, status },
    });
  }

  /**
   * Info: (20260825 - Julian) `inviteeEmailKey` 在**這裡**算，不由呼叫端傳。
   *
   * 它是 `inviteeEmail` 的純函數（schema 的不變式），沒有政策在裡面 ——
   * 這與 `pendingKey` 由呼叫端算刻意不同：那一欄要看 status，是政策。
   *
   * 交給呼叫端就是兩個可以忘記的地方（位址 route 與 `inviteMemberByEmail`），
   * 而忘記的症狀是「那個人就是收不到通知」，不會有任何測試變紅。
   */
  async createTeamInvitation(data: Prisma.TeamInvitationUncheckedCreateInput) {
    const inviteeEmail =
      typeof data.inviteeEmail === "string" ? data.inviteeEmail.trim() : "";
    return prisma.teamInvitation.create({
      data: {
        ...data,
        inviteeEmailKey: inviteeEmail
          ? canonicalizeEmailForKey(inviteeEmail)
          : null,
      },
    });
  }

  /**
   * Info: (20260815 - Luphia) 邀請信寄送失敗時回滾用。
   *
   * 刻意用實刪而非改狀態：一封沒寄出去的邀請不是歷史紀錄，
   * 留著只會佔住 `pendingKey` 這個唯一鍵，
   * 讓管理員重試同一個信箱時撞上「已有邀請」。
   */
  async deleteInvitation(id: string) {
    return prisma.teamInvitation.delete({ where: { id } });
  }

  /**
   * Info: (20260819 - Luphia) 某個時間點之後這個團隊建立過幾封邀請（產品決定 20260819）。
   *
   * 用於「每日寄送數」上限。計數以**邀請列的建立時間**為準，而且**不看狀態**：
   * 撤回、被拒絕、已逾期的都算——信已經寄出去了，而這道上限管的是寄信量，
   * 不是目前還有效的邀請數（那是 `countPendingInvitations` 的事）。
   *
   * 因此不需要另外一張計數表：邀請列本身就是寄送紀錄。
   */
  /**
   * Info: (20260819 - Luphia) 這個團隊最近一次寄出邀請的時間（冷卻用）。
   *
   * 與日計數同一個資料來源（邀請列本身就是寄送紀錄），因此**不濾 status**：
   * 撤回或被拒絕的那一封信也已經寄出去了，冷卻該照算。
   */
  async findLastInvitationSentAt(teamId: string): Promise<Date | null> {
    const latest = await prisma.teamInvitation.findFirst({
      where: { teamId },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    return latest?.createdAt ?? null;
  }

  async countInvitationsCreatedSince(
    teamId: string,
    since: Date,
  ): Promise<number> {
    return prisma.teamInvitation.count({
      where: { teamId, createdAt: { gte: since } },
    });
  }

  /**
   * Info: (20260815 - Luphia) 仍在佔用席次的邀請數（產品拍板 20260815）。
   *
   * 席次的佔用者是「成員 + 尚未失效的 PENDING 邀請」。逾期的邀請不算——
   * 它讓出的位置可以給下一次邀請使用（但當初付的錢不退，見設計書 §5.4.8）。
   */
  async countPendingInvitations(teamId: string, nowMs: number) {
    return prisma.teamInvitation.count({
      where: {
        teamId,
        status: TEAM_INVITATION_STATUS.PENDING,
        OR: [
          // Info: (20260815 - Luphia) 舊的位址邀請沒有期限欄位，一律視為仍在佔用
          { expiresAt: null },
          { expiresAt: { gt: new Date(nowMs) } },
        ],
      },
    });
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return prisma.teamInvitation.findUnique({
      where: { tokenHash },
      include: { team: true },
    });
  }

  /**
   * Info: (20260815 - Luphia) 團隊的邀請清單。
   *
   * **明列欄位而非整列回傳**：這張表自 2026-08-15 起帶著 `tokenHash`，
   * 而這支的呼叫端是「團隊任一成員都讀得到」的端點。雜湊本身無法反推回 token，
   * 但一把鑰匙的指紋沒有任何理由離開伺服器。
   */
  /**
   * Info: (20260818 - Luphia) 以「信箱不符」之邀請加入的成員（第三輪 C-2）。
   *
   * `acceptedEmailMatch` 先前是純寫入欄位——DB 老實記下 `MISMATCHED`，
   * 而沒有任何查詢、API 或畫面讀它，稽核價值等於零。
   *
   * 回 userId 集合而不是整列：呼叫端要的只是「這個人要不要標一下」，
   * 而邀請列裡有受邀者的信箱，那不該為了畫一個標記就一併吐出去。
   */
  async listMismatchedAcceptorIds(teamId: string): Promise<string[]> {
    /**
     * Info: (20260818 - Luphia) 以**來源邀請的外鍵**判斷，不比對任何時間戳（第六輪第 1 條）。
     *
     * 先前的寫法是「取每人最新一筆已接受的邀請，再比對成員資格的建立時間」，
     * 而那兩個時間來自兩個時鐘：邀請的 `acceptedAt` 是 app 在 route 一開始取的
     * `Date.now()`，成員的 `createdAt` 預設是資料庫的 `CURRENT_TIMESTAMP`。
     * 實測相差 +19ms（中間隔著五次以上查詢），於是條件永遠不成立、**標記永遠
     * 不顯示**；而在 app 與 DB 時鐘有偏移的部署上又會零星出現，更難查。
     *
     * 現在從**成員**這一側查：每一段成員資格都記著自己的來源邀請
     * （`joinedByInvitationId`，非邀請途徑為 NULL）。因此
     *
     * - 「是不是現任成員」由 `TeamMember` 列的存在本身保證，不必另外交集；
     * - 「是不是這一段成員資格」由外鍵保證，重新加入會是新的一列、新的外鍵；
     * - 位址直接加入的成員 NULL，天然不在結果裡（他們也沒有信箱可比對）。
     */
    const members = await prisma.teamMember.findMany({
      where: {
        teamId,
        joinedByInvitation: {
          acceptedEmailMatch: INVITE_EMAIL_MATCH.MISMATCHED,
        },
      },
      select: { userId: true },
    });

    return members.map((member) => member.userId);
  }

  async listTeamInvitations(teamId: string, status: string) {
    return prisma.teamInvitation.findMany({
      where: { teamId, status },
      select: {
        id: true,
        teamId: true,
        inviterId: true,
        inviteeAddress: true,
        inviteeEmail: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Info: (20260825 - Julian) 一個人的待接受邀請 —— 位址邀請**與** email 邀請。
   *
   * 取代原本的 `getPendingInvitationsByAddress`。舊的只查 `inviteeAddress`，
   * 而 email 邀請的那一欄是 NULL（對方可能還沒註冊時就寄出了），於是
   * 「已註冊的人被 email 邀請」在小鈴鐺與團隊頁上都完全看不到。
   * 舊的那支已刪除：留著就是一支「只看得到一半」的查詢等著被誤用。
   *
   * `emailKeys` 的兩個約定，呼叫端要負責：
   *
   * 1. **已經 canonical**（`canonicalizeEmailForKey`）—— 與 `pendingKey` 同一套，
   *    否則唯一鍵認定 `alice+x@` 與 `alice@` 是同一個人，這裡卻認定不是
   * 2. **只含已驗證的信箱** —— 未驗證的 email 是使用者宣稱的字串，拿它當
   *    「這封邀請是給我的」的依據，等於宣稱一個信箱就能讀到別人團隊的名稱與邀請人姓名
   *
   * `emailKeys` 為空時 `in: []` 在 Prisma 是「永不匹配」，所以 `OR` 會退化成
   * 只剩位址那一條 —— 安全。這一行寫下來是因為那個語意不該靠讀者去記得：
   * 若哪天改成「空陣列時省略這個條件」，查詢就變成「列出全站待接受邀請」，
   * 而那是跨租戶外洩的標準形狀（同 `listPendingInvitations` 的空 address 早退）。
   */
  async getPendingInvitationsForRecipient(params: {
    address: string;
    emailKeys: readonly string[];
  }) {
    return prisma.teamInvitation.findMany({
      where: {
        status: TEAM_INVITATION_STATUS.PENDING,
        OR: [
          { inviteeAddress: params.address },
          { inviteeEmailKey: { in: [...params.emailKeys] } },
        ],
      },
      include: {
        team: true,
        inviter: {
          select: {
            name: true,
            address: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Info: (20260825 - Julian) 還沒算出 `inviteeEmailKey` 的 email 邀請（回填用）。
   *
   * 一併帶 `pendingKey`：回填腳本要拿它的後綴對照重算的結果 ——
   * PENDING 的 email 邀請，`pendingKey` 就是 `{teamId}:mail:{canonical}`，
   * 兩者不一致代表正規化規則在某個時間點分岔了，那時要中止而不是靜靜寫入。
   */
  async listInvitationsMissingEmailKey() {
    return prisma.teamInvitation.findMany({
      where: { inviteeEmailKey: null, inviteeEmail: { not: null } },
      select: {
        id: true,
        status: true,
        inviteeEmail: true,
        pendingKey: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // Info: (20260825 - Julian) 回填單列（逐列寫，失敗的那一列才報得出是哪一列）
  async setInvitationEmailKey(
    inviteId: string,
    inviteeEmailKey: string,
  ): Promise<void> {
    await prisma.teamInvitation.update({
      where: { id: inviteId },
      data: { inviteeEmailKey },
    });
  }

  async getInvitationByIdWithDetails(inviteId: string) {
    return prisma.teamInvitation.findUnique({
      where: { id: inviteId },
      include: { team: true, inviter: true },
    });
  }

  /**
   * Info: (20260816 - Luphia) 拒絕邀請。回 `false` 代表這封邀請已經不是 PENDING。
   *
   * 與 `acceptInvitation` 用同一個原子守衛（`updateMany` 帶 `status: PENDING`）：
   * 「已經被接受的邀請不能再被拒絕」跟「已經被拒絕的邀請不能再被接受」是同一件事，
   * 而兩者在時間上可以任意接近。
   *
   * 一併清空 `tokenHash` 與 `pendingKey`：連結當場失效，席次立刻空出來給下一次邀請
   * （`countPendingInvitations` 只數 PENDING）。
   */
  /**
   * Info: (20260818 - Luphia) 管理者撤回邀請：改狀態並記下是誰撤的（第三輪 D）。
   *
   * 原本是 `deleteInvitation`（實刪除），於是撤回之後「曾經邀請過誰、由誰撤回」
   * 全部消失——而同一條路徑上的「拒絕」是改狀態，兩者的稽核強度不一致。
   *
   * `tokenHash` 與 `pendingKey` 一併設回 NULL：前者讓那條連結立即失效，
   * 後者把唯一鍵讓出來，管理員才能重新邀請同一個信箱。
   *
   * 回 `false` 代表這封邀請已不是 PENDING（剛被接受或已撤回）——
   * 條件比對與寫入在同一個 `updateMany` 裡，因此併發下只有一方會成功。
   */
  async revokeInvitationById(inviteId: string, revokedByUserId: string) {
    const revoked = await prisma.teamInvitation.updateMany({
      where: { id: inviteId, status: TEAM_INVITATION_STATUS.PENDING },
      data: {
        status: TEAM_INVITATION_STATUS.REVOKED,
        tokenHash: null,
        pendingKey: null,
        revokedByUserId,
        revokedAt: new Date(),
      },
    });
    return revoked.count > 0;
  }

  async declineInvitation(inviteId: string) {
    const declined = await prisma.teamInvitation.updateMany({
      where: { id: inviteId, status: TEAM_INVITATION_STATUS.PENDING },
      data: {
        status: TEAM_INVITATION_STATUS.REJECTED,
        tokenHash: null,
        pendingKey: null,
      },
    });
    return declined.count > 0;
  }

  /**
   * Info: (20260816 - Luphia) 接受邀請。回 `null` 代表這封邀請已經不是 PENDING
   * （被人搶先接受、已撤回、或同一個人連點兩次的第二次）。
   *
   * **PENDING → ACCEPTED 的判斷與寫入必須是同一個原子操作**。原本的寫法是
   * 呼叫端先查、判斷 status，再由這裡無條件 update；兩個請求可以同時通過那個判斷，
   * 於是各自建立一筆 TeamMember——一封轉寄出去的邀請信被兩個人同時點開，
   * 就是**一個付費席次進兩個人**。`updateMany` 帶上 `status: PENDING` 之後，
   * 條件比對發生在資料庫的那一列上，第二個請求會拿到 count 0。
   */
  async acceptInvitation(params: IAcceptInvitationParams) {
    const { inviteId, teamId, userId, role, acceptedAt, emailMatch } = params;
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.teamInvitation.updateMany({
        where: { id: inviteId, status: TEAM_INVITATION_STATUS.PENDING },
        data: {
          status: TEAM_INVITATION_STATUS.ACCEPTED,
          /**
           * Info: (20260815 - Luphia) 接受後清掉 token 雜湊（一次性連結）。
           * 狀態改成 ACCEPTED 本身就擋得住重用，清雜湊是第二道：
           * 邀請信可能被轉寄，過期的連結不該還留著一把對得上的鑰匙。
           */
          tokenHash: null,
          /**
           * Info: (20260816 - Luphia) 離開 PENDING 即釋放唯一鍵，
           * 這個人日後才能再被邀請一次（見 pending_invite_key.ts）。
           */
          pendingKey: null,
          /**
           * Info: (20260817 - Luphia) 稽核軌跡：是哪個帳號用掉這封邀請。
           * 與成員建立寫在**同一個交易**裡——分開寫就會出現
           * 「成員存在但邀請沒記下接受者」的中間狀態，而那正是要消滅的斷點。
           */
          acceptedByUserId: userId,
          acceptedAt,
          acceptedEmailMatch: emailMatch ?? null,
        },
      });

      // Info: (20260816 - Luphia) 沒搶到那一列就什麼都不做，交易照樣提交（沒有副作用要回滾）
      if (claimed.count === 0) return null;

      return tx.teamMember.create({
        data: {
          teamId,
          userId,
          role,
          /**
           * Info: (20260818 - Luphia) 記下這段成員資格由哪一封邀請而來（第六輪第 1 條）。
           *
           * 與認領那封邀請在**同一個交易**裡：兩者要嘛一起成立、要嘛都不成立。
           * 成員清單的「信箱不符」標記據此判斷「這個紀錄描述的是不是現在這段
           * 成員資格」——先前是拿兩個時鐘的時間戳去推論，而那個比較永遠不成立。
           */
          joinedByInvitationId: inviteId,
        },
      });
    });
  }

  async getTeamMemberById(memberId: string) {
    return prisma.teamMember.findUnique({ where: { id: memberId } });
  }

  async countTeamMembersByRole(teamId: string, role: TeamRole | string) {
    return prisma.teamMember.count({
      where: { teamId, role: role as TeamRole },
    });
  }
}

export const teamRepo = new TeamRepository();
