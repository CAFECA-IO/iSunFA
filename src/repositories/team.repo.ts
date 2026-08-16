import { prisma } from "@/lib/prisma";
import {
  Prisma,
  Team,
  TeamMember,
  TeamInvitation,
  TeamRole,
} from "@/generated";
import { TEAM_INVITATION_STATUS } from "@/constants/status";

/**
 * Info: (20260814 - Luphia) 團隊 + 我在其中的角色（null = 資料異常，查得到團隊卻查不到成員身分）。
 * 角色決定畫面上哪些團隊可被選為訂閱／購點的對象（設計書 §6.4）。
 */
export type ITeamWithRole = Team & {
  role: string | null;
  // Info: (20260814 - Luphia) 團隊人數＝訂閱席次數：訂閱畫面要先算得出「席次 × 單價」
  memberCount: number;
};

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
  consumeInvitationToken(id: string): Promise<TeamInvitation>;
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
   */
  listTeamInvitations(
    teamId: string,
    status: string,
  ): Promise<Omit<TeamInvitation, "tokenHash" | "updatedAt">[]>;
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
  acceptInvitation(
    inviteId: string,
    teamId: string,
    userId: string,
    role: TeamRole,
  ): Promise<TeamMember>;
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
   * 留著只會佔住 `(teamId, inviteeEmail, status)` 這個唯一鍵，
   * 讓管理員重試同一個信箱時撞上「已有邀請」。
   */
  async deleteInvitation(id: string) {
    return prisma.teamInvitation.delete({ where: { id } });
  }

  /**
   * Info: (20260815 - Luphia) 用掉 token（一次性）：只清雜湊，不動狀態。
   * 供「已是成員又點了一次連結」這條路徑使用。
   */
  async consumeInvitationToken(id: string) {
    return prisma.teamInvitation.update({
      where: { id },
      data: { tokenHash: null },
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

  async acceptInvitation(
    inviteId: string,
    teamId: string,
    userId: string,
    role: TeamRole,
  ) {
    const [, newMember] = await prisma.$transaction([
      prisma.teamInvitation.update({
        where: { id: inviteId },
        data: {
          status: TEAM_INVITATION_STATUS.ACCEPTED,
          /**
           * Info: (20260815 - Luphia) 接受後清掉 token 雜湊（一次性連結）。
           * 狀態改成 ACCEPTED 本身就擋得住重用，清雜湊是第二道：
           * 邀請信可能被轉寄，過期的連結不該還留著一把對得上的鑰匙。
           */
          tokenHash: null,
        },
      }),
      prisma.teamMember.create({
        data: {
          teamId,
          userId,
          role,
        },
      }),
    ]);
    return newMember;
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
