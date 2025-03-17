import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IConnectAccountBookQueryParams } from '@/lib/utils/zod_schema/account_book';
import { getSession, setSession } from '@/lib/utils/session';
import { getCompanyAndRoleByUserIdAndCompanyId } from '@/lib/utils/repo/admin.repo';
import { getTeamByTeamId } from '@/lib/utils/repo/team.repo';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { IAccountBook } from '@/interfaces/account_book';

interface IResponse {
  statusMessage: string;
  payload: IAccountBook | null;
}

const handleGetRequest: IHandleRequest<
  APIName.CONNECT_ACCOUNT_BOOK_BY_ID,
  IAccountBook | null
> = async ({ query, session }) => {
  const { accountBookId } = query as IConnectAccountBookQueryParams;
  const userId = session?.userId;

  /**
   * Info: (20250227 - Shirley) 連接帳本的邏輯
   * 1. 檢查帳本是否存在
   * 2. 檢查用戶是否有權限
   * 3. 設置 session 中的 companyId，之後應該改成 accountBookId
   * 4. 獲取團隊資訊並設置 session 中的 team 欄位
   */

  const companyAndRole = await getCompanyAndRoleByUserIdAndCompanyId(userId, accountBookId);
  if (!companyAndRole) {
    return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
  }

  const result = {
    id: companyAndRole.company.id,
    imageId: companyAndRole.company.imageFile?.url || '',
    name: companyAndRole.company.name,
    taxId: companyAndRole.company.taxId,
    startDate: companyAndRole.company.startDate,
    createdAt: companyAndRole.company.createdAt,
    updatedAt: companyAndRole.company.updatedAt,
    isPrivate: companyAndRole.company.isPrivate,
  } as IAccountBook;

  await setSession(session, { companyId: accountBookId });

  // 如果有 teamId，獲取團隊資訊並設置 session 中的 team 欄位
  if (companyAndRole.teamId) {
    const teamInfo = await getTeamByTeamId(companyAndRole.teamId, userId);
    if (teamInfo) {
      const teamData = {
        id: teamInfo.id,
        name: teamInfo.name.value,
        role: teamInfo.role,
      };
      await setSession(session, { teamId: teamData.id, teamRole: teamData.role });
    } else {
      // TODO: (20250307 - Shirley) return failed response
      loggerBack.info(`未找到 teamInfo，teamId: ${companyAndRole.teamId}`);
    }
  } else {
    // TODO: (20250307 - Shirley) return failed response
    loggerBack.info('未找到 teamId');
  }

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
