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
import { getTeamByTeamId } from '@/lib/utils/repo/team.repo';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { IAccountBook, WORK_TAG } from '@/interfaces/account_book';
import { LeaveStatus } from '@/interfaces/team';
import prisma from '@/client'; // 使用已有的 prisma 客戶端

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
   * Info: (20250507 - Shirley) 更新後的連接帳本邏輯
   * 1. 先透過 getCompanyById 檢查帳本是否存在
   * 2. 檢查用戶權限有兩種途徑：
   *    a. 通過 Admin 表檢查用戶是否為帳本的直接管理員
   *    b. 如果帳本屬於某個團隊，檢查用戶是否為該團隊的成員
   * 3. 如果用戶有權限，則設置 session 中的相關信息
   */

  // Info: (20250507 - Shirley) 首先檢查帳本是否存在
  const company = await getCompanyById(accountBookId);
  if (!company) {
    return { statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND, payload: null };
  }

  let hasAccess = false;
  let companyAndRole = null;

  // Info: (20250507 - Shirley) 途徑一: 檢查用戶是否為帳本的直接管理員
  if (company.teamId) {
    // Info: (20250507 - Shirley) 途徑二: 如果帳本屬於團隊，檢查用戶是否為團隊成員
    const isTeamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: company.teamId,
        userId,
        status: LeaveStatus.IN_TEAM,
      },
    });

    if (isTeamMember) {
      hasAccess = true;
      // Info: (20250507 - Shirley) 用戶不是帳本直接管理員但是團隊成員，為了後續處理，構造一個 companyAndRole 對象
      companyAndRole = {
        company,
        teamId: company.teamId,
        role: {
          id: 0,
          name: isTeamMember.role,
          permissions: [],
        },
        tag: WORK_TAG.ALL,
        order: 0,
      };
    }
  }

  // Info: (20250507 - Shirley) 如果用戶既不是帳本的直接管理員也不是團隊成員，則返回 FORBIDDEN
  if (!hasAccess) {
    loggerBack.info(`用戶 ${userId} 無權限連接帳本 ${accountBookId}`);
    return { statusMessage: STATUS_MESSAGE.FORBIDDEN, payload: null };
  }

  const result = {
    id: company.id,
    imageId: company.imageFile?.url || '',
    name: company.name,
    taxId: company.taxId,
    startDate: company.startDate,
    createdAt: company.createdAt,
    updatedAt: company.updatedAt,
    isPrivate: company.isPrivate,
  } as IAccountBook;

  await setSession(session, { companyId: accountBookId });

  // 如果有 teamId，獲取團隊資訊並設置 session 中的 team 欄位
  if (companyAndRole && companyAndRole.teamId) {
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
