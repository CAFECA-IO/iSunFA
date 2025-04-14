import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IConnectAccountBookQueryParams } from '@/lib/utils/zod_schema/account_book';
import { getSession, setSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { IAccountBook, WORK_TAG } from '@/interfaces/account_book';
import { isUserTeamMember } from '@/lib/utils/repo/team_member.repo';

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
   *
   * Info: (20250402 - Shirley) 更新後的連接帳本邏輯
   * 1. 先透過 getCompanyById 檢查帳本是否存在
   * 2. 檢查用戶權限有兩種途徑：
   *    a. 通過 Admin 表檢查用戶是否為帳本的直接管理員
   *    b. 如果帳本屬於某個團隊，檢查用戶是否為該團隊的成員
   * 3. 如果用戶有權限，則設置 session 中的相關信息
   */

  // Info: (20250402 - Shirley) 首先檢查帳本是否存在
  const company = await getCompanyById(accountBookId);
  if (!company) {
    return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
  }

  let hasAccess = false;

  // Info: (20250402 - Shirley) 途徑一: 檢查用戶是否為帳本的直接管理員
  if (company.teamId) {
    // Info: (20250402 - Shirley) 途徑二: 如果帳本屬於團隊，檢查用戶是否為團隊成員
    // Info: (20250402 - Shirley) 使用 repo 函數替代直接的 Prisma 查詢
    hasAccess = await isUserTeamMember(userId, company.teamId);
  }

  // Info: (20250402 - Shirley) 如果用戶既不是帳本的直接管理員也不是團隊成員，則返回 FORBIDDEN
  if (!hasAccess) {
    loggerBack.info(`用戶 ${userId} 無權限連接帳本 ${accountBookId}`);
    return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
  }

  const result: IAccountBook = {
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

  await setSession(session, { companyId: accountBookId });

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
