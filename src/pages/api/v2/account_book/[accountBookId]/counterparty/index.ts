import { NextApiRequest, NextApiResponse } from 'next';
import { ICounterparty, ICounterPartyEntity } from '@/interfaces/counterparty';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData } from '@/interfaces/pagination';
import {
  createCounterparty,
  getCounterpartyByName,
  getCounterpartyByTaxId,
  listCounterparty,
} from '@/lib/utils/repo/counterparty.repo';
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';
import { getSession } from '@/lib/utils/session';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

const handleGetRequest: IHandleRequest<
  APIName.COUNTERPARTY_LIST,
  IPaginatedData<ICounterparty[]>
> = async ({ query, req }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ICounterparty[]> | null = null;

  const { accountBookId: companyId, page, pageSize, type, searchQuery } = query;

  // Info: (20250416 - Shirley) 添加團隊權限檢查
  const { teams } = await getSession(req);

  // Info: (20250416 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
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
    canDo: TeamPermissionAction.VIEW_COUNTERPARTY,
  });

  if (!assertResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const counterpartyList: IPaginatedData<ICounterPartyEntity[]> = await listCounterparty(
    companyId,
    page,
    pageSize,
    type,
    searchQuery
  );
  statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
  payload = counterpartyList;

  return { statusMessage, payload };
};

const handlePostRequest: IHandleRequest<APIName.COUNTERPARTY_ADD, ICounterparty> = async ({
  query,
  body,
  req,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterPartyEntity | null = null;

  const { accountBookId } = query;
  const { name, taxId, type, note } = body;

  // Info: (20250416 - Shirley) 添加團隊權限檢查
  const { teams } = await getSession(req);

  // Info: (20250416 - Shirley) 要找到 company 對應的 team，然後跟 session 中的 teams 比對，再用 session 的 role 來檢查權限
  const company = await getCompanyById(accountBookId);
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
    canDo: TeamPermissionAction.CREATE_COUNTERPARTY,
  });

  if (!assertResult.can) {
    throw new Error(STATUS_MESSAGE.FORBIDDEN);
  }

  const originClientByName = await getCounterpartyByName({ name, accountBookId });
  const originClientByTaxId = await getCounterpartyByTaxId({ taxId, accountBookId });

  if (originClientByName) {
    statusMessage = STATUS_MESSAGE.DUPLICATE_COUNTERPARTY_NAME;
    payload = parsePrismaCounterPartyToCounterPartyEntity(originClientByName);
  } else if (originClientByTaxId) {
    statusMessage = STATUS_MESSAGE.DUPLICATE_COUNTERPARTY_TAX_ID;
    payload = parsePrismaCounterPartyToCounterPartyEntity(originClientByTaxId);
  } else {
    const newClient = await createCounterparty(accountBookId, name, taxId, type, note);
    if (newClient) {
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = parsePrismaCounterPartyToCounterPartyEntity(newClient);
    }
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: ICounterparty | IPaginatedData<ICounterparty[]> | null;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.COUNTERPARTY_LIST, req, handleGetRequest),
  POST: (req) => withRequestValidation(APIName.COUNTERPARTY_ADD, req, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICounterparty | IPaginatedData<ICounterparty[]> | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterparty | IPaginatedData<ICounterparty[]> | null = null;

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
    const { httpCode, result } = formatApiResponse<
      ICounterparty | IPaginatedData<ICounterparty[]> | null
    >(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
