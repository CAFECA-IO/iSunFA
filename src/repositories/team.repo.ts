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
  createTeamInvitation(
    data: Prisma.TeamInvitationUncheckedCreateInput,
  ): Promise<TeamInvitation>;
  listTeamInvitations(
    teamId: string,
    status: string,
  ): Promise<TeamInvitation[]>;
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

  async createTeamInvitation(data: Prisma.TeamInvitationUncheckedCreateInput) {
    return prisma.teamInvitation.create({ data });
  }

  async listTeamInvitations(teamId: string, status: string) {
    return prisma.teamInvitation.findMany({
      where: { teamId, status },
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
        data: { status: TEAM_INVITATION_STATUS.ACCEPTED },
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
