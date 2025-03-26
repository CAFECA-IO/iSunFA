import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { NextApiRequest, NextApiResponse } from 'next';
import { getRoleById } from '@/lib/utils/repo/role.repo';
import { IStatusInfo } from '@/interfaces/status_info';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { Role, User } from '@prisma/client';
import { getTeamsByUserIdAndTeamIds } from '@/lib/utils/repo/team.repo';
import { ITeam } from '@/interfaces/team';
import { IAccountBookForUserWithTeam } from '@/interfaces/account_book';
import { findUserAccountBook } from '@/lib/utils/repo/account_book.repo';

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
    // Info: (20250401 - Shirley) 使用高效率的函數查詢用戶的帳本
    // 該函數使用 Prisma 的關聯查詢能力一次性獲取所需資料，大幅減少數據庫查詢次數
    const teamIds = teams?.map((t) => t.id);

    // Info: (20250401 - Shirley) 傳入可選的 teamIds 來縮小查詢範圍，提高效率
    payload.company = await findUserAccountBook(userId, companyId, teamIds);
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
