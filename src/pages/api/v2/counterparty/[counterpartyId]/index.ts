import { NextApiRequest, NextApiResponse } from 'next';
import { ICounterparty, ICounterPartyEntity } from '@/interfaces/counterparty';
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
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';

const handleGetRequest: IHandleRequest<
  APIName.COUNTERPARTY_GET_BY_ID,
  ICounterPartyEntity
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterPartyEntity | null = null;

  const { counterpartyId } = query;
  const counterparty = await getCounterpartyById(counterpartyId);
  if (counterparty) {
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
    payload = parsePrismaCounterPartyToCounterPartyEntity(counterparty);
  }

  return { statusMessage, payload };
};

const handlePutRequest: IHandleRequest<APIName.COUNTERPARTY_UPDATE, ICounterPartyEntity> = async ({
  query,
  body,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterPartyEntity | null = null;

  const { counterpartyId } = query;
  const { name, taxId, type, note } = body;
  const updatedCounterparty = await updateCounterpartyById(counterpartyId, name, taxId, type, note);
  if (!updatedCounterparty) {
    statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
  } else {
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = parsePrismaCounterPartyToCounterPartyEntity(updatedCounterparty);
  }

  return { statusMessage, payload };
};

const handleDeleteRequest: IHandleRequest<
  APIName.COUNTERPARTY_DELETE,
  ICounterPartyEntity
> = async ({ query }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICounterPartyEntity | null = null;

  const { counterpartyId } = query;
  const deletedCounterparty = await deleteCounterpartyById(counterpartyId);
  if (deletedCounterparty) {
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = parsePrismaCounterPartyToCounterPartyEntity(deletedCounterparty);
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{ statusMessage: string; payload: ICounterparty | null }>;
} = {
  GET: (req) => withRequestValidation(APIName.COUNTERPARTY_GET_BY_ID, req, handleGetRequest),
  PUT: (req) => withRequestValidation(APIName.COUNTERPARTY_UPDATE, req, handlePutRequest),
  DELETE: (req) => withRequestValidation(APIName.COUNTERPARTY_DELETE, req, handleDeleteRequest),
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
