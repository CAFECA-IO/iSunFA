import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getCompanyById, putCompanyIcon } from '@/lib/utils/repo/account_book.repo';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { loggerError } from '@/lib/utils/logger_back';
import { AccountBook, File } from '@prisma/client';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';
import { IAccountBookEntity } from '@/lib/utils/zod_schema/account_book';

/**
 * Info: (20250423 - Shirley) Handle PUT request for account book icon
 * This API replaces the COMPANY_PUT_ICON API
 */
const handlePutRequest: IHandleRequest<
  APIName.ACCOUNT_BOOK_PUT_ICON,
  AccountBook & { imageFile: File }
> = async ({ query, body, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: (AccountBook & { imageFile: File }) | null = null;

  const { accountBookId } = query;
  const { fileId } = body;
  const { userId, teams } = session;

  try {
    // Info: (20250423 - Shirley) Get account book details
    const accountBook = await getCompanyById(+accountBookId);
    if (!accountBook) {
      loggerError({
        userId,
        errorType: 'resource_not_found',
        errorMessage: `Account book ${accountBookId} not found`,
      });
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    // Info: (20250423 - Shirley) Check if account book belongs to a team
    const { teamId } = accountBook;
    if (!teamId) {
      loggerError({
        userId,
        errorType: 'resource_not_found',
        errorMessage: `Account book ${accountBookId} does not belong to any team`,
      });
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    // Info: (20250423 - Shirley) Check if user is part of the team
    const userTeam = teams?.find((team) => team.id === teamId);
    if (!userTeam) {
      loggerError({
        userId,
        errorType: 'permission_denied',
        errorMessage: `User ${userId} is not a member of team ${teamId}`,
      });
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    // Info: (20250423 - Shirley) Check if user has permission to modify account book
    const canModifyResult = convertTeamRoleCanDo({
      teamRole: userTeam.role as TeamRole,
      canDo: TeamPermissionAction.MODIFY_ACCOUNT_BOOK,
    });

    if (!canModifyResult.can) {
      loggerError({
        userId,
        errorType: 'permission_denied',
        errorMessage: `User ${userId} with role ${userTeam.role} does not have permission to update account book icon`,
      });
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    // Info: (20250423 - Shirley) Update account book icon
    const updatedAccountBook = await putCompanyIcon({ accountBookId: +accountBookId, fileId });

    const formattedPayload = {
      ...updatedAccountBook,
      imageId: updatedAccountBook.imageFile?.id.toString() || '',
    };

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = formattedPayload as AccountBook & { imageFile: File };

    loggerError({
      userId,
      errorType: 'info',
      errorMessage: `Successfully updated icon for account book ${accountBookId}`,
    });
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAccountBookEntity | null }>;
} = {
  PUT: (req) => withRequestValidation(APIName.ACCOUNT_BOOK_PUT_ICON, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBookEntity | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBookEntity | null = null;

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
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IAccountBookEntity | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
