import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getUserById } from '@/lib/utils/repo/user.repo';
import { NextApiRequest, NextApiResponse } from 'next';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { getTeamsByUserIdAndTeamIds } from '@/lib/utils/repo/team.repo';
import { ITeam } from '@/interfaces/team';
import { findUserAccountBook } from '@/lib/utils/repo/account_book.repo';
import { getUserRoleById } from '@/lib/utils/repo/user_role.repo';
import { IUserRole } from '@/interfaces/user_role';
import { IUser } from '@/interfaces/user';
import { IAccountBookWithTeamEntity } from '@/lib/utils/zod_schema/account_book';

const handleGetRequest: IHandleRequest<
  APIName.STATUS_INFO_GET,
  {
    user: IUser | null;
    company: IAccountBookWithTeamEntity | null;
    role: IUserRole | null;
    teams: ITeam[] | null;
  }
> = async ({ session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  const payload: {
    user: IUser | null;
    company: IAccountBookWithTeamEntity | null;
    role: IUserRole | null;
    teams: ITeam[] | null;
  } = {
    user: null,
    company: null,
    role: null,
    teams: [],
  };

  const { userId, accountBookId, roleId, teams } = session; // TODO: (20250324 - Shirley) 改用 teams 來判斷用戶在團隊裡面的權限。

  if (userId > 0) {
    const userFromDB = await getUserById(userId);
    if (userFromDB) {
      payload.user = {
        ...userFromDB,
        imageId: userFromDB?.imageFile?.url ?? '',
        agreementList: userFromDB.userAgreements.map((ua) => ua.agreementHash),
        email: userFromDB?.email ?? '',
        deletedAt: userFromDB?.deletedAt ?? 0,
      };
    }
  }

  if (accountBookId > 0 && userId > 0) {
    // Info: (20250401 - Shirley) 使用高效率的函數查詢用戶的帳本
    // 該函數使用 Prisma 的關聯查詢能力一次性獲取所需資料，大幅減少數據庫查詢次數
    const teamIds = teams?.map((t) => t.id);

    // Info: (20250401 - Shirley) 傳入可選的 teamIds 來縮小查詢範圍，提高效率
    payload.company = await findUserAccountBook(userId, accountBookId, teamIds);
  }

  if (roleId > 0) {
    const userRole = await getUserRoleById(roleId);
    payload.role = userRole;
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
    payload: {
      user: IUser | null;
      company: IAccountBookWithTeamEntity | null;
      role: IUserRole | null;
      teams: ITeam[] | null;
    } | null;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.STATUS_INFO_GET, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    IResponseData<{
      user: IUser | null;
      company: IAccountBookWithTeamEntity | null;
      role: IUserRole | null;
      teams: ITeam[] | null;
    } | null>
  >
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    user: IUser | null;
    company: IAccountBookWithTeamEntity | null;
    role: IUserRole | null;
    teams: ITeam[] | null;
  } | null = {
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
    const { httpCode, result } = formatApiResponse<{
      user: IUser | null;
      company: IAccountBookWithTeamEntity | null;
      role: IUserRole | null;
      teams: ITeam[] | null;
    } | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
