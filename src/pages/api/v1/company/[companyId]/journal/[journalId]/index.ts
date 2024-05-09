import { IJournal } from '@/interfaces/journal';
import { IResponseData } from '@/interfaces/response_data';
import { NextApiRequest, NextApiResponse } from 'next';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_CODE } from '@/constants/status_code';
import { journalArray } from '../index';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal>>
) {
  try {
    if (req.method === 'GET') {
      const { journalId } = req.query;
      if (!journalId || Array.isArray(journalId) || typeof journalId !== 'string') {
        throw new Error(STATUS_CODE.INVALID_INPUT_PARAMETER);
      }
      const getJournalById = journalArray.find((journal) => journal.id === req.query.journalId);

      if (!getJournalById) {
        throw new Error(STATUS_CODE.RESOURCE_NOT_FOUND);
      }

      const { httpCode, result } = formatApiResponse<IJournal>(
        STATUS_CODE.SUCCESS_GET,
        getJournalById
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_CODE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IJournal>(error.message, {} as IJournal);
    res.status(httpCode).json(result);
  }
}
