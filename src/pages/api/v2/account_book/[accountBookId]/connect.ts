import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import {
  IAccountBookEntity,
  IConnectAccountBookQueryParams,
} from '@/lib/utils/zod_schema/account_book';
import { getSession, setSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { WORK_TAG } from '@/interfaces/account_book';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

interface IResponse {
  statusMessage: string;
  payload: IAccountBookEntity | null;
}

const handleGetRequest: IHandleRequest<
  APIName.CONNECT_ACCOUNT_BOOK_BY_ID,
  IAccountBookEntity | null
> = async ({ query, session }) => {
  const { accountBookId } = query as IConnectAccountBookQueryParams;
  const userId = session?.userId;
  const { teams } = session;

  /**
   * Info: (20250416 - Shirley) 更新後的連接帳本邏輯
   * 1. 先透過 getCompanyById 檢查帳本是否存在
   * 2. 如果帳本屬於團隊，使用 convertTeamRoleCanDo 檢查用戶是否有 VIEW_PUBLIC_ACCOUNT_BOOK 權限
   * 3. 如果用戶有權限，則設置 session 中的相關信息
   */

  // Info: (20250402 - Shirley) 首先檢查帳本是否存在
  const company = await getCompanyById(accountBookId);
  if (!company) {
    return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
  }

  let hasAccess = false;

  // Info: (20250416 - Shirley) 使用團隊權限檢查方式
  if (company.teamId) {
    // Info: (20250416 - Shirley) 檢查用戶是否為團隊成員並有查看帳本的權限
    const userTeam = teams?.find((team) => team.id === company.teamId);
    if (userTeam) {
      const assertResult = convertTeamRoleCanDo({
        teamRole: userTeam.role as TeamRole,
        canDo: TeamPermissionAction.VIEW_PUBLIC_ACCOUNT_BOOK,
      });

      hasAccess = assertResult.can;
    }
  }

  // Info: (20250402 - Shirley) 如果用戶既不是帳本的直接管理員也不是團隊成員，則返回 FORBIDDEN
  if (!hasAccess) {
    loggerBack.info(`用戶 ${userId} 無權限連接帳本 ${accountBookId}`);
    return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
  }

  const result: IAccountBookEntity = {
    id: company.id,
    userId: company.userId || 555,
    imageId: company.imageFile?.url || '',
    name: company.name,
    taxId: company.taxId,
    startDate: company.startDate,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    isPrivate: company.isPrivate,
    teamId: company.teamId,
    tag: company.tag as WORK_TAG,
  };

  await setSession(session, { accountBookId });

  return { statusMessage: STATUS_MESSAGE.SUCCESS_GET, payload: result };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: (req) => withRequestValidation(APIName.CONNECT_ACCOUNT_BOOK_BY_ID, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IResponse['payload']>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IResponse['payload'] = null;
  const session = await getSession(req);
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
    loggerError({
      userId: session?.userId,
      errorType: 'connectAccountBookById',
      errorMessage: error,
    });
  } finally {
    const { httpCode, result } = formatApiResponse<IResponse['payload']>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
