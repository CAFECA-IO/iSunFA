import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { IAccountBookForUser, ACCOUNT_BOOK_UPDATE_ACTION } from '@/interfaces/account_book';
import { formatApiResponse } from '@/lib/utils/common';
import { updateCompanyVisibilityById } from '@/lib/utils/repo/company.repo';
import {
  getAdminByCompanyIdAndUserId,
  getAdminByCompanyIdAndUserIdAndRoleName,
  getCompanyAndRoleByUserIdAndCompanyId,
  setCompanyToTop,
  updateCompanyTagById,
} from '@/lib/utils/repo/admin.repo';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { Company, Role, File } from '@prisma/client';
import { CompanyRoleName } from '@/constants/role';
import { DefaultValue } from '@/constants/default_value';
import { getSession } from '@/lib/utils/session';
import { loggerError } from '@/lib/utils/logger_back';

/**
 * 處理 PUT 請求，更新帳本資訊
 * Info: (20250310 - Shirley)
 */
const handlePutRequest: IHandleRequest<
  APIName.UPDATE_ACCOUNT_BOOK_BY_ID,
  {
    company: Company & { imageFile: File | null };
    tag: string;
    order: number;
    role: Role;
    teamId: number | null;
  }
> = async ({ query, body, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: {
    company: Company & { imageFile: File | null };
    tag: string;
    order: number;
    role: Role;
    teamId: number | null;
  } | null = null;

  const companyId = Number(query.accountBookId);
  const { action, tag, isPrivate } = body;
  const { userId } = session;

  switch (action) {
    case ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_TAG: {
      const admin = await getAdminByCompanyIdAndUserId(userId, companyId);
      if (admin && tag) {
        const updatedCompanyAndRole = await updateCompanyTagById(admin.id, tag);
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = {
          ...updatedCompanyAndRole,
          teamId: updatedCompanyAndRole.company.teamId,
        };
      }
      break;
    }
    case ACCOUNT_BOOK_UPDATE_ACTION.SET_TO_TOP: {
      const updatedCompanyAndRole = await setCompanyToTop(userId, companyId);
      if (updatedCompanyAndRole) {
        statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
        payload = {
          ...updatedCompanyAndRole,
          teamId: updatedCompanyAndRole.company.teamId,
        };
      }
      break;
    }
    case ACCOUNT_BOOK_UPDATE_ACTION.UPDATE_VISIBILITY: {
      const admin = await getAdminByCompanyIdAndUserIdAndRoleName(
        companyId,
        userId,
        CompanyRoleName.OWNER
      );
      if (admin && isPrivate !== undefined) {
        await updateCompanyVisibilityById(companyId, isPrivate);
        const updatedCompanyAndRole = await getCompanyAndRoleByUserIdAndCompanyId(
          userId,
          companyId
        );
        if (updatedCompanyAndRole) {
          statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
          payload = updatedCompanyAndRole;
        }
      } else {
        statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      }
      break;
    }
    default:
      statusMessage = STATUS_MESSAGE.INVALID_INPUT_TYPE;
      break;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAccountBookForUser | null }>;
} = {
  PUT: (req) => withRequestValidation(APIName.UPDATE_ACCOUNT_BOOK_BY_ID, req, handlePutRequest),
};

/**
 * 帳本 API 處理程式
 * Info: (20250310 - Shirley)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBookForUser | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookForUser | null = null;
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
      userId: session?.userId ?? DefaultValue.USER_ID.GUEST,
      errorType: 'updateAccountBookById',
      errorMessage: error,
    });
  } finally {
    const { httpCode, result } = formatApiResponse<IAccountBookForUser | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
