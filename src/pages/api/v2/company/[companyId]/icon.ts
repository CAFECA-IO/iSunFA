import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { getCompanyById, putCompanyIcon } from '@/lib/utils/repo/company.repo';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { loggerError } from '@/lib/utils/logger_back';
import { Company, File } from '@prisma/client';
import { IAccountBook } from '@/interfaces/account_book';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamPermissionAction, TeamRoleCanDoKey } from '@/interfaces/permissions';
import { TeamRole } from '@/interfaces/team';

const handlePutRequest: IHandleRequest<
  APIName.COMPANY_PUT_ICON,
  Company & { imageFile: File }
> = async ({ query, body, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: (Company & { imageFile: File }) | null = null;

  const { companyId } = query;
  const { fileId } = body;
  const { userId, teams } = session;

  try {
    // Info: (20250410 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
    const company = await getCompanyById(companyId);
    if (!company) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const { teamId: companyTeamId } = company;
    if (!companyTeamId) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const userTeam = teams?.find((team) => team.id === companyTeamId);
    if (!userTeam) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam?.role as TeamRole,
      canDo: TeamPermissionAction.MODIFY_ACCOUNT_BOOK,
    });

    if (TeamRoleCanDoKey.YES_OR_NO in assertResult && !assertResult.yesOrNo) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    const updatedCompany = await putCompanyIcon({ companyId, fileId });

    const formattedPayload = {
      ...updatedCompany,
      imageId: updatedCompany.imageFile?.id.toString() || '',
    };

    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = formattedPayload as Company & { imageFile: File };
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
  ) => Promise<{ statusMessage: string; payload: IAccountBook | null }>;
} = {
  PUT: (req) => withRequestValidation(APIName.COMPANY_PUT_ICON, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountBook | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountBook | null = null;

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
    const { httpCode, result } = formatApiResponse<IAccountBook | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
