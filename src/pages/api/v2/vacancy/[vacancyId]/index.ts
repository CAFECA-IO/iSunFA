import { NextApiRequest, NextApiResponse } from 'next';
import { HttpMethod } from '@/constants/api_connection';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack from '@/lib/utils/logger_back';
import { getVacancyById } from '@/lib/utils/repo/job_posting.repo';

export const handleGetRequest = async (req: NextApiRequest) => {
  const { query } = req;
  const { vacancyId } = query;

  if (!vacancyId) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_DATA);
  }

  const vacancyIdNum = Number(vacancyId);
  const vacancy = await getVacancyById({ vacancyId: vacancyIdNum });

  // Info: (20250704 - Julian) 如果沒有找到對應的職缺，則回傳 resource not found
  const result = vacancy
    ? {
        statusMessage: STATUS_MESSAGE.SUCCESS_GET,
        result: vacancy,
      }
    : {
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
        result: null,
      };

  return result;
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
