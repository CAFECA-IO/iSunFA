import { IResponseData } from '@/interfaces/response_data';
import { NextApiRequest, NextApiResponse } from 'next';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IJournal } from '@/interfaces/journal';
import { checkAdmin } from '@/lib/utils/auth_check';
import { findUniqueJournalInPrisma } from '@/lib/utils/repo/journal.repo';
import { formatIJournal } from '@/lib/utils/formatter/journal.formatter';

function isJournalIdValid(journalId: string | string[] | undefined): journalId is string {
  return !!journalId && !Array.isArray(journalId) && typeof journalId === 'string';
}

// ToDo: (20240617 - Murky) Need to use function in type guard instead
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCompanyIdValid(companyId: any): companyId is number {
  if (Array.isArray(companyId) || !companyId || typeof companyId !== 'number') {
    return false;
  }
  return true;
}

async function handleGetRequest(
  companyId: number,
  req: NextApiRequest,
) {
  const { journalId } = req.query;
  if (!isJournalIdValid(journalId)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const journalIdNumber = Number(journalId);
  const journalData = await findUniqueJournalInPrisma(journalIdNumber, companyId);

  // Info: (20240617 - Murky) If journalData is null, formatIJournal will return an empty object
  const journal = journalData ? formatIJournal(journalData) : {} as IJournal;
  const { httpCode, result } = formatApiResponse<IJournal>(STATUS_MESSAGE.SUCCESS, journal);

  return {
    httpCode,
    result,
  };
}

function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IJournal>(message, {} as IJournal);
  return {
    httpCode,
    result,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal>>
) {
  try {
    const session = await checkAdmin(req, res);
    const { companyId } = session;
    if (!isCompanyIdValid(companyId)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    switch (req.method) {
      case 'GET': {
        const { httpCode, result } = await handleGetRequest(companyId, req);
        res.status(httpCode).json(result);
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = handleErrorResponse(res, error.message);
    res.status(httpCode).json(result);
  }
}
