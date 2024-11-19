import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { ILedgerPayload } from '@/interfaces/ledger';
import { listLedger } from '@/lib/utils/repo/ledger.repo';
import { withRequestValidation } from '@/lib/utils/middleware';
import { APIName } from '@/constants/api_connection';
import { IHandleRequest } from '@/interfaces/handleRequest';

interface IPayload extends ILedgerPayload {}

interface IResponse {
  statusMessage: string;
  payload: IPayload | null;
}

export const handleGetRequest: IHandleRequest<APIName.LEDGER_LIST, IPayload> = async ({
  query,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPayload | null = null;

  try {
    const ledgerData = await listLedger(query);
    if (ledgerData) {
      payload = ledgerData;
      statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = err.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  }

  return { statusMessage, payload };
};

const methodHandlers: {
  [key: string]: (req: NextApiRequest, res: NextApiResponse) => Promise<IResponse>;
} = {
  GET: (req, res) => withRequestValidation(APIName.LEDGER_LIST, req, res, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPayload | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPayload | null = null;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message || STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IPayload | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
