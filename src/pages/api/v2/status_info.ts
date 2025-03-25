import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getCompanyAndRoleByUserIdAndCompanyId } from '@/lib/utils/repo/admin.repo';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { NextApiRequest, NextApiResponse } from 'next';
import { getRoleById } from '@/lib/utils/repo/role.repo';
import { IStatusInfo } from '@/interfaces/status_info';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { Role, User } from '@prisma/client';
import { getTeamByTeamId, getTeamsByUserIdAndTeamIds } from '@/lib/utils/repo/team.repo';
import { ITeam } from '@/interfaces/team';
import { IAccountBookForUserWithTeam, WORK_TAG } from '@/interfaces/account_book';

const handleGetRequest: IHandleRequest<
  APIName.STATUS_INFO_GET,
  {
    user: User | null;
    company: IAccountBookForUserWithTeam | null;
    role: Role | null;
    teams: ITeam[] | null;
  }
> = async ({ session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: {
    user: User | null;
    company: IAccountBookForUserWithTeam | null;
    role: Role | null;
    teams: ITeam[] | null;
  } = {
    user: null,
    company: null,
    role: null,
    teams: [],
  };

  const { userId, companyId, roleId, teams } = session; // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。

  if (userId > 0) {
    const getUser = await getUserById(userId);
    payload.user = getUser;
  }

  if (companyId > 0 && userId > 0) {
    // Info: (20250328 - Shirley) 使用 getCompanyAndRoleByUserIdAndCompanyId 取得完整的帳本資料
    const companyAndRole = await getCompanyAndRoleByUserIdAndCompanyId(userId, companyId);

    if (companyAndRole) {
      let teamInfo: ITeam | null = null;

      // Info: (20250328 - Shirley) 如果帳本屬於某個團隊，獲取團隊資訊
      if (companyAndRole.teamId) {
        teamInfo = await getTeamByTeamId(companyAndRole.teamId, userId);
      }

      // Info: (20250328 - Shirley) 轉換為 IAccountBookForUserWithTeam 格式
      // Info: (20250328 - Shirley) 只有在 teamInfo 存在時才設置 company
      if (teamInfo) {
        payload.company = {
          company: {
            id: companyAndRole.company.id,
            imageId: companyAndRole.company.imageFile?.url ?? '/images/fake_company_img.svg',
            name: companyAndRole.company.name,
            taxId: companyAndRole.company.taxId,
            startDate: companyAndRole.company.startDate,
            createdAt: companyAndRole.company.createdAt,
            updatedAt: companyAndRole.company.updatedAt,
            isPrivate: companyAndRole.company.isPrivate ?? false,
          },
          tag: companyAndRole.tag as WORK_TAG,
          order: companyAndRole.order,
          role: companyAndRole.role,
          team: teamInfo,
          isTransferring: companyAndRole.company.isTransferring ?? false,
        };
      }
    }
  }

  if (roleId > 0) {
    const getRole = await getRoleById(roleId);
    payload.role = getRole;
  }

  if (teams && teams.length > 0) {
    try {
      const teamIds = teams.map((t) => t.id);
      payload.teams = await getTeamsByUserIdAndTeamIds(userId, teamIds);
    } catch (error) {
      // Info: (20250626 - Shirley) 如果獲取團隊數據失敗，返回空數組
      payload.teams = [];
    }
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
    payload = { user: null, company: null, role: null, teams: [] };
  } finally {
    const { httpCode, result } = formatApiResponse<IStatusInfo | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
