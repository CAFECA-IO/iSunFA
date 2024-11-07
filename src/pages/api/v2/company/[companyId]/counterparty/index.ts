import { NextApiRequest, NextApiResponse } from 'next';
import { ICounterparty } from '@/interfaces/counterparty';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { IPaginatedData } from '@/interfaces/pagination';
import { createCounterparty, listCounterparty } from '@/lib/utils/repo/counterparty.repo';

const handleGetRequest: IHandleRequest<
  APIName.COUNTERPARTY_LIST,
  IPaginatedData<ICounterparty[]>
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ICounterparty[]> | null = null;

  const { companyId, page, pageSize, type, searchQuery } = query;
  const counterpartyList: IPaginatedData<ICounterparty[]> = await listCounterparty(
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
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterparty | null = null;

  const { companyId } = query;
  const { name, taxId, type, note } = body;
  const newClient = await createCounterparty(companyId, name, taxId, type, note);
  statusMessage = STATUS_MESSAGE.CREATED;
  payload = newClient;

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
  GET: (req, res) => withRequestValidation(APIName.COUNTERPARTY_LIST, req, res, handleGetRequest),
  POST: (req, res) => withRequestValidation(APIName.COUNTERPARTY_ADD, req, res, handlePostRequest),
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
