import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { NextApiRequest, NextApiResponse } from 'next';
import { getRoleById } from '@/lib/utils/repo/role.repo';
import { IStatusInfo } from '@/interfaces/status_info';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { Company, Role, User } from '@prisma/client';
import { getTeamByTeamId } from '@/lib/utils/repo/team.repo';
import { ITeam } from '@/interfaces/team';

const handleGetRequest: IHandleRequest<
  APIName.STATUS_INFO_GET,
  {
    user: User | null;
    company: Company | null;
    role: Role | null;
    team: ITeam | null;
    teams: ITeam[] | null;
  }
> = async ({ session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: {
    user: User | null;
    company: Company | null;
    role: Role | null;
    team: ITeam | null;
    teams: ITeam[] | null;
  } = {
    user: null,
    company: null,
    role: null,
    team: null,
    teams: [],
  };

  const { userId, companyId, roleId, teamId, teams } = session;

  if (userId > 0) {
    const getUser = await getUserById(userId);
    payload.user = getUser;
  }

  if (companyId > 0) {
    const getCompany = await getCompanyById(companyId);
    payload.company = getCompany;
  }

  if (roleId > 0) {
    const getRole = await getRoleById(roleId);
    payload.role = getRole;
  }

  if (teamId > 0) {
    const getTeam = await getTeamByTeamId(teamId, userId);
    payload.team = getTeam;
  }

  if (teams && teams.length > 0) {
    const teamsData: ITeam[] = [];
    await Promise.all(
      teams.map(async (t: { id: number; role: string }) => {
        try {
          const teamData = await getTeamByTeamId(t.id, userId);
          if (teamData) {
            teamsData.push(teamData);
          }
        } catch (error) {
          // Info: (20250517 - Shirley) 忽略获取单个团队失败的错误，确保其他团队仍能正常处理
        }
      })
    );

    payload.teams = teamsData;
  }

  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: IStatusInfo | null;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.STATUS_INFO_GET, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IStatusInfo | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IStatusInfo | null = {
    user: null,
    company: null,
    role: null,
    team: null,
    teams: [],
  };

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = { user: null, company: null, role: null, team: null, teams: [] };
  } finally {
    const { httpCode, result } = formatApiResponse<IStatusInfo | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
