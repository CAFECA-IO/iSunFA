import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { IAccountingSetting } from '@/interfaces/accounting_setting';
import {
  createAccountingSetting,
  getAccountingSettingByCompanyId,
  updateAccountingSettingById,
} from '@/lib/utils/repo/accounting_setting.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { formatAccountingSetting } from '@/lib/utils/formatter/accounting_setting.formatter';
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

const handleGetRequest: IHandleRequest<
  APIName.ACCOUNTING_SETTING_GET,
  IAccountingSetting
> = async ({ query, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountingSetting | null = null;

  const { companyId } = query;
  const { teams } = session;
  // Info: (20250414 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
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
    canDo: TeamPermissionAction.ACCOUNTING_SETTING,
  });

  if (!assertResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const accountingSetting = await getAccountingSettingByCompanyId(companyId);
  if (accountingSetting) {
    payload = formatAccountingSetting(accountingSetting);
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } else {
    const createdAccountingSetting = await createAccountingSetting(companyId);
    if (createdAccountingSetting) {
      payload = formatAccountingSetting(createdAccountingSetting);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    } else {
      statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    }
  }

  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<
  APIName.ACCOUNTING_SETTING_UPDATE,
  IAccountingSetting
> = async ({ query, body }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountingSetting | null = null;

  const { companyId } = query;
  const accountingSetting = body;

  try {
    const updatedAccountingSetting = await updateAccountingSettingById(
      companyId,
      accountingSetting
    );

    if (updatedAccountingSetting) {
      payload = formatAccountingSetting(updatedAccountingSetting);
      statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    } else {
      statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
    }
  } catch (error) {
    statusMessage = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: IAccountingSetting | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.ACCOUNTING_SETTING_GET, req, handleGetRequest),
  PUT: (req) => withRequestValidation(APIName.ACCOUNTING_SETTING_UPDATE, req, handlePutRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IAccountingSetting | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IAccountingSetting | null = null;

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
    const { httpCode, result } = formatApiResponse<IAccountingSetting | null>(
      statusMessage,
      payload
    );
    res.status(httpCode).json(result);
  }
}
