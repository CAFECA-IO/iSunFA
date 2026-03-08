import { Prisma } from '@/generated/client';
import { prisma } from '@/lib/prisma';
import { teamRepo } from '@/repositories/team.repo';

// Info: (20260308 - Luphia) 找出所有沒團隊的使用者，使用 getOrCreateUserTeam 為他建立一個
export const createTeamForUsersWithoutTeam = async () => {
  const usersWithoutTeam = await prisma.user.findMany({
    where: {
      teamMembers: {
        none: {},
      },
    },
  });

  const results = [];
  for (const user of usersWithoutTeam) {
    const team = await getOrCreateUserTeam(user.id, user.name || undefined);
    results.push(team);
  }

  return results;
};

// Info: (20260308 - Luphia) 為使用者建立一個團隊
export const getOrCreateUserTeam = async (userId: string, userName?: string) => {
  const teams = await teamRepo.listMemberTeam(userId);
  if (teams.length > 0) {
    return teams[0];
  }

  const team = await teamRepo.createTeam({
    name: userName ? `${userName}'s Team` : 'New Team',
  });

  await teamRepo.createTeamMember({
    team: { connect: { id: team.id } },
    user: { connect: { id: userId } },
    role: 'OWNER',
  });

  return team;
};

// Info: (20260308 - Luphia) 修改團隊資料
export const updateTeam = async (teamId: string, data: Prisma.TeamUpdateInput) => {
  return teamRepo.updateTeam(teamId, data);
};

// Info: (20260308 - Luphia) 增加一個團隊成員
export const addTeamMember = async (teamId: string, userId: string, role: string = 'MEMBER') => {
  return teamRepo.createTeamMember({
    team: { connect: { id: teamId } },
    user: { connect: { id: userId } },
    role,
  });
};

// Info: (20260308 - Luphia) 移除一個團隊成員
export const removeTeamMember = async (teamMemberId: string) => {
  return teamRepo.deleteTeamMember(teamMemberId);
};

// Info: (20260308 - Luphia) 軟刪除指定團隊
export const softDeleteTeam = async (teamId: string) => {
  return teamRepo.updateTeam(teamId, { deletedAt: new Date() });
};
