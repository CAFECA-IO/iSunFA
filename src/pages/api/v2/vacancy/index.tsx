import { NextApiRequest, NextApiResponse } from 'next';
import { HttpMethod } from '@/constants/api_connection';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { listVacancy } from '@/lib/utils/repo/job_posting.repo';

export const handleGetRequest = async (req: NextApiRequest) => {
  // Info: (20250707 - Julian) 取得 GET 請求的查詢參數
  const { query } = req;

  const vacancies = await listVacancy(query);

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
