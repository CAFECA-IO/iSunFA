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
import {
  deleteCertificateRC2Output,
  updateCertificateRC2Output,
} from '@/lib/utils/repo/certificate_rc2.repo';

const handlePutRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  await checkSessionUser(session, APIName.UPDATE_CERTIFICATE_RC2_OUTPUT, req);
  await checkUserAuthorization(APIName.UPDATE_CERTIFICATE_RC2_OUTPUT, req, session);

  const { query, body } = checkRequestData(APIName.UPDATE_CERTIFICATE_RC2_OUTPUT, req, session);
  if (!query || !body) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const certificate = await updateCertificateRC2Output(query.certificateId, body);

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.UPDATE_CERTIFICATE_RC2_OUTPUT,
    certificate
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

const handleDeleteRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = null;

  await checkSessionUser(session, APIName.DELETE_CERTIFICATE_RC2_OUTPUT, req);
  await checkUserAuthorization(APIName.DELETE_CERTIFICATE_RC2_OUTPUT, req, session);

  const { query } = checkRequestData(APIName.DELETE_CERTIFICATE_RC2_OUTPUT, req, session);
  if (!query) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const certificateList = await deleteCertificateRC2Output(query.certificateId);

  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.DELETE_CERTIFICATE_RC2_OUTPUT,
    certificateList
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
      case HttpMethod.DELETE:
        ({ response, statusMessage } = await handleDeleteRequest(req));
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

  await logUserAction(session, APIName.DELETE_CERTIFICATE_RC2_OUTPUT, req, statusMessage);
  res.status(httpCode).json(result);
}
