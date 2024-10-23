import { NextApiRequest, NextApiResponse } from 'next';
import { ICounterparty } from '@/interfaces/counterparty';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';
import {
  deleteCounterpartyById,
  getCounterpartyById,
  updateCounterpartyById,
} from '@/lib/utils/repo/counterparty.repo';

const handleGetRequest: IHandleRequest<APIName.COUNTERPARTY_GET_BY_ID, ICounterparty> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterparty | null = null;

  const { counterpartyId } = query;
  const counterparty = await getCounterpartyById(counterpartyId);
  statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  payload = counterparty;

  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<APIName.COUNTERPARTY_UPDATE, ICounterparty> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterparty | null = null;

  const { counterpartyId } = query;
  const { name, taxId, type, note } = body;
  const updatedCounterparty = await updateCounterpartyById(counterpartyId, name, taxId, type, note);
  if (!updatedCounterparty) {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = updatedCounterparty;
  }

  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<APIName.COUNTERPARTY_DELETE, ICounterparty> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterparty | null = null;

  const { counterpartyId } = query;
  const deletedCounterparty = await deleteCounterpartyById(counterpartyId);
  statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
  payload = deletedCounterparty;

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICounterparty | null }>;
} = {
  GET: (req, res) =>
    withRequestValidation(APIName.COUNTERPARTY_GET_BY_ID, req, res, handleGetRequest),
  PUT: (req, res) => withRequestValidation(APIName.COUNTERPARTY_UPDATE, req, res, handlePutRequest),
  DELETE: (req, res) =>
    withRequestValidation(APIName.COUNTERPARTY_DELETE, req, res, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ICounterparty | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterparty | null = null;

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
    const { httpCode, result } = formatApiResponse<ICounterparty | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
