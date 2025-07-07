import { NextApiRequest, NextApiResponse } from 'next';
import { HttpMethod } from '@/constants/api_connection';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { getAllVacancies } from '@/lib/utils/repo/job_posting.repo';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handleGetRequest = async (req: NextApiRequest) => {
  const vacancies = await getAllVacancies();

  return {
    result: vacancies,
    statusMessage: STATUS_MESSAGE.SUCCESS_LIST,
  };
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const method = req.method || HttpMethod.GET;
  let httpCode;
  let result;
  let statusMessage;

  try {
    switch (method) {
      case HttpMethod.GET:
      default:
        ({ statusMessage, result } = await handleGetRequest(req));
    }
    ({ httpCode, result } = formatApiResponse(statusMessage, result));
    res.status(httpCode).json(result);
  } catch (error) {
    loggerBack.error(error);
    const err = error as Error;
    statusMessage = err.message;
    ({ httpCode, result } = formatApiResponse(statusMessage, {}));
    res.status(httpCode).json(result);
  }
  res.end();
};

export default handler;
