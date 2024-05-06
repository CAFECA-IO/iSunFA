import { IJournal } from '@/interfaces/journal';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';
import { journalArray } from '../index';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal>>
) {
  try {
    if (req.method === 'GET') {
      if (!req.query.voucherId) {
        throw new Error('INVALID_INPUT_PARAMETER');
      }
      const getJournalById = journalArray.find((journal) => journal.id === req.query.journalId);
      if (getJournalById) {
        res.status(200).json({
          powerby: 'ISunFa api ' + version,
          success: true,
          code: '200',
          message: 'get journal by id',
          payload: getJournalById,
        });
      } else {
        throw new Error('Journal not found');
      }
    } else {
      throw new Error('METHOD_NOT_ALLOWED');
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
