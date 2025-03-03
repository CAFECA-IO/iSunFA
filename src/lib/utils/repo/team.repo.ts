import prisma from '@/client';
import { Team, TeamMember, TeamRole } from '@prisma/client';
import { getTimestampNow, timestampInSeconds } from '@/lib/utils/common';

/**
 * Info: (20250303 - Shirley)
 * 創建一個新的 team
 * @param ownerId 擁有者 ID
 * @param name team 名稱
 * @param about team 描述
 * @param profile team 簡介
 * @param bankInfo team 銀行資訊
 * @returns 創建的 team
 */
export async function createTeam({
  ownerId,
  name,
  about = '',
  profile = '',
  bankInfo = { code: '', number: '' },
}: {
  ownerId: number;
  name: string;
  about?: string;
  profile?: string;
  bankInfo?: { code: string; number: string };
}): Promise<Team> {
  const now = getTimestampNow();

  const team = await prisma.team.create({
    data: {
      ownerId,
      name,
      about,
      profile,
      bankInfo,
      createdAt: now,
    },
  });

  return team;
}

/**
 * Info: (20250303 - Shirley)
 * 創建一個新的 team member
 * @param teamId team ID
 * @param userId 用戶 ID
 * @param role 角色
 * @returns 創建的 team member
 */
export async function createTeamMember({
  teamId,
  userId,
  role,
}: {
  teamId: number;
  userId: number;
  role: TeamRole;
}): Promise<TeamMember> {
  const now = Date.now();
  const nowTimestamp = timestampInSeconds(now);

  const teamMember = await prisma.teamMember.create({
    data: {
      teamId,
      userId,
      role,
      joinedAt: nowTimestamp,
    },
  });

  return teamMember;
}

/**
 * Info: (20250303 - Shirley)
 * 為新用戶創建默認的 team
 * @param userId 用戶 ID
 * @param userName 用戶名稱
 * @returns 創建的 team 和 team member
 */
export async function createDefaultTeamForUser(
  userId: number,
  userName: string
): Promise<{ team: Team; teamMember: TeamMember }> {
  const teamName = `${userName}'s Team`;

  const team = await createTeam({
    ownerId: userId,
    name: teamName,
  });

  const teamMember = await createTeamMember({
    teamId: team.id,
    userId,
    role: TeamRole.OWNER,
  });

  return { team, teamMember };
}

/**
 * Info: (20250303 - Shirley)
 * 將 company 關聯到 team
 * @param companyId company ID
 * @param teamId team ID
 * @returns 更新的 company
 */
export async function assignCompanyToTeam(companyId: number, teamId: number) {
  const company = await prisma.company.update({
    where: {
      id: companyId,
    },
    data: {
      teamId,
    },
  });

  return company;
}

/**
 * Info: (20250303 - Shirley)
 * 獲取用戶的 team 列表
 * @param userId 用戶 ID
 * @returns 用戶的 team 列表
 */
export async function listTeamsByUserId(userId: number) {
  const teams = await prisma.teamMember.findMany({
    where: {
      userId,
    },
    include: {
      team: true,
    },
  });

  return teams;
}

/**
 * Info: (20250303 - Shirley)
 * 獲取 team 的 company 列表
 * @param teamId team ID
 * @returns team 的 company 列表
 */
export async function listCompaniesByTeamId(teamId: number) {
  const companies = await prisma.company.findMany({
    where: {
      teamId,
    },
  });

  return companies;
}

/**
 * Info: (20250303 - Shirley)
 * 檢查用戶是否為 team 的 owner
 * @param userId 用戶 ID
 * @param teamId team ID
 * @returns 是否為 owner
 */
export async function isTeamOwner(userId: number, teamId: number): Promise<boolean> {
  const teamMember = await prisma.teamMember.findFirst({
    where: {
      userId,
      teamId,
      role: TeamRole.OWNER,
    },
  });

  return !!teamMember;
}
