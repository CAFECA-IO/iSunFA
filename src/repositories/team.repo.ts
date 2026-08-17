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
  getPendingInvitationsByAddress(address: string): Promise<
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

  async createTeamInvitation(data: Prisma.TeamInvitationUncheckedCreateInput) {
    return prisma.teamInvitation.create({ data });
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
     * Info: (20260818 - Luphia) 只看**每個人最近一次**加入（第四輪 B-4）。
     *
     * 原本查的是該團隊歷來所有 `MISMATCHED` 的邀請列，於是一月以不符的信箱
     * 加入、被移出、二月以正確信箱重新加入並記為 `MATCHED` 的人，
     * 清單上仍然掛著標記——而且沒有任何操作能清掉它。
     * 一個清不掉的警示等於一個永久的誤報。
     *
     * 因此取全部已接受的邀請（含比對結果），在程式裡挑每人最新的那一筆。
     * 用 `acceptedAt` 而非 `updatedAt`：後者任何後續更新都會動。
     */
    const rows = await prisma.teamInvitation.findMany({
      where: { teamId, acceptedByUserId: { not: null } },
      select: {
        acceptedByUserId: true,
        acceptedEmailMatch: true,
        acceptedAt: true,
      },
      orderBy: { acceptedAt: "desc" },
    });

    const latestByUser = new Map<string, string | null>();
    for (const row of rows) {
      const userId = row.acceptedByUserId;
      if (!userId) continue;
      // Info: (20260818 - Luphia) 已按 acceptedAt 遞減排序，先看到的就是最新的那一筆
      if (!latestByUser.has(userId)) {
        latestByUser.set(userId, row.acceptedEmailMatch);
      }
    }

    return [...latestByUser.entries()]
      .filter(([, match]) => match === INVITE_EMAIL_MATCH.MISMATCHED)
      .map(([userId]) => userId);
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

  async getPendingInvitationsByAddress(address: string) {
    return prisma.teamInvitation.findMany({
      where: {
        inviteeAddress: address,
        status: TEAM_INVITATION_STATUS.PENDING,
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
