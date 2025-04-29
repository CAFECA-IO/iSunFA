// /pages/api/v2/company/[companyId]/certificate/input/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import loggerBack from '@/lib/utils/logger_back';
import { IPaginatedOptions } from '@/interfaces/pagination';
import { ICertificateInput } from '@/interfaces/certificate';
import { validateOutputData } from '@/lib/utils/validator';
import { getPaginatedCertificateListByType } from '@/lib/utils/repo/certificate_list.repo';
import { InvoiceTransactionDirection } from '@/constants/invoice';

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedOptions<ICertificateInput[]> | null = null;

  await checkSessionUser(session, APIName.INPUT_CERTIFICATE_LIST, req);
  await checkUserAuthorization(APIName.INPUT_CERTIFICATE_LIST, req, session);

  const { query } = checkRequestData(APIName.INPUT_CERTIFICATE_LIST, req, session);
  if (!query) throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);

  const certificateList = await getPaginatedCertificateListByType(
    {
      ...query,
      accountBookId: query.companyId,
    },
    session,
    InvoiceTransactionDirection.INPUT
  );
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.INPUT_CERTIFICATE_LIST,
    certificateList
  );

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
  } else {
    payload = outputData;
  }

  statusMessage = STATUS_MESSAGE.SUCCESS;
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

  await logUserAction(session, APIName.INPUT_CERTIFICATE_LIST, req, statusMessage);
  res.status(httpCode).json(result);
}
