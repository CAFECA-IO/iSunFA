import { prisma } from '@/lib/prisma';
import { Prisma, Team, TeamMember } from '@/generated/client';

export interface ITeamRepository {
  createTeam(data: Prisma.TeamCreateInput): Promise<Team>;
  createTeamMember(data: Prisma.TeamMemberCreateInput): Promise<TeamMember>;
  listTeamMember(teamId: string): Promise<TeamMember[]>;
  listMemberTeam(userId: string): Promise<Team[]>;
  updateTeamMember(id: string, data: Prisma.TeamMemberUpdateInput): Promise<TeamMember>;
  deleteTeamMember(id: string): Promise<TeamMember>;
  updateTeam(id: string, data: Prisma.TeamUpdateInput): Promise<Team>;
  deleteTeam(id: string): Promise<Team>;
}

export class TeamRepository implements ITeamRepository {
  async createTeam(data: Prisma.TeamCreateInput) {
    const team = prisma.team.create({ data });
    return team;
  }

  async createTeamMember(data: Prisma.TeamMemberCreateInput) {
    const teamMember = prisma.teamMember.create({ data });
    return teamMember;
  }

  async listTeamMember(teamId: string) {
    const teamMembers = prisma.teamMember.findMany({
      where: { teamId },
    });
    return teamMembers;
  }

  async listMemberTeam(userId: string) {
    const teams = prisma.team.findMany({
      where: { teamMembers: { some: { userId } } },
    });
    return teams;
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
}

export const teamRepo = new TeamRepository();
