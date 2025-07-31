import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/utils/session';
import { formatApiResponse } from '@/lib/utils/common';
import { HTTP_STATUS } from '@/constants/http';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { APIName, HttpMethod } from '@/constants/api_connection';
import {
  checkSessionUser,
  checkUserAuthorization,
  checkRequestData,
  logUserAction,
} from '@/lib/utils/middleware';
import { validateOutputData } from '@/lib/utils/validator';
import { findInvoiceRC2ById, updateInvoiceRC2Input } from '@/lib/utils/repo/invoice_rc2.repo';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  await checkSessionUser(session, APIName.GET_INVOICE_RC2_INPUT, req);
  await checkUserAuthorization(APIName.GET_INVOICE_RC2_INPUT, req, session);

  const { query } = checkRequestData(APIName.GET_INVOICE_RC2_INPUT, req, session);
  if (!query) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const invoiceList = await findInvoiceRC2ById({
    userId: session.userId,
    accountBookId: query.accountBookId,
    invoiceId: query.invoiceId,
  });

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.GET_INVOICE_RC2_INPUT,
    invoiceList
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
    statusMessage = STATUS_MESSAGE.SUCCESS;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  await checkSessionUser(session, APIName.UPDATE_INVOICE_RC2_INPUT, req);
  await checkUserAuthorization(APIName.UPDATE_INVOICE_RC2_INPUT, req, session);

  const { query, body } = checkRequestData(APIName.UPDATE_INVOICE_RC2_INPUT, req, session);
  if (!query || !body) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const invoice = await updateInvoiceRC2Input(
    session.userId,
    query.accountBookId,
    query.invoiceId,
    body
  );

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.UPDATE_INVOICE_RC2_INPUT,
    invoice
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
    statusMessage = STATUS_MESSAGE.SUCCESS;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  const session = await getSession(req);

  try {
    switch (method) {
      case HttpMethod.GET:
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.PUT:
        ({ response, statusMessage } = await handlePutRequest(req));
        ({ httpCode, result } = response);
        break;

      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    loggerBack.error(`error: ${JSON.stringify(error)}`);
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, APIName.DELETE_INVOICE_RC2_INPUT, req, statusMessage);
  res.status(httpCode).json(result);
}
