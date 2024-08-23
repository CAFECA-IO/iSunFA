import { IResponseData } from '@/interfaces/response_data';
import { NextApiRequest, NextApiResponse } from 'next';
import { formatApiResponse } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IJournal } from '@/interfaces/journal';
import { deleteJournalInPrisma, findUniqueJournalInPrisma } from '@/lib/utils/repo/journal.repo';
import { formatIJournal } from '@/lib/utils/formatter/journal.formatter';
import { getSession } from '@/lib/utils/session';

function formatJournalIdFromQuery(journalId: unknown): number {
  let formattedJournalId: number = -1;

  if (typeof journalId === 'string') {
    formattedJournalId = Number(journalId);
  }
  return formattedJournalId;
}

function formatGetQuery(req: NextApiRequest) {
  const { journalId } = req.query;
  const formattedJournalId = formatJournalIdFromQuery(journalId);

  return { journalId: formattedJournalId };
}

function formatDeleteQuery(req: NextApiRequest) {
  const { journalId } = req.query;
  const formattedJournalId = formatJournalIdFromQuery(journalId);

  return { journalId: formattedJournalId };
}

async function handleGetRequest(companyId: number, req: NextApiRequest) {
  let journal: IJournal | null = null;

  const { journalId } = formatGetQuery(req);

  if (journalId > 0) {
    try {
      const journalData = await findUniqueJournalInPrisma(journalId, companyId);

      if (journalData) {
        journal = formatIJournal(journalData);
      }
    } catch (error) {
      // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
    }
  }
  return journal;
}

async function handleDeleteRequest(companyId: number, req: NextApiRequest) {
  let journal: IJournal | null = null;

  const { journalId } = formatDeleteQuery(req);

  if (journalId > 0) {
    try {
      const journalData = await deleteJournalInPrisma(journalId, companyId);

      if (journalData) {
        journal = formatIJournal(journalData);
      }
    } catch (error) {
      // Todo: (20240822 - Anna) [Beta] feat. Murky - 使用 logger
    }
  }
  return journal;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IJournal | null = null;
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

    switch (req.method) {
      case 'GET': {
        payload = await handleGetRequest(companyId, req);
        statusMessage = STATUS_MESSAGE.SUCCESS;
        break;
      }
      case 'DELETE': {
        payload = await handleDeleteRequest(companyId, req);
        statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
        break;
      }
      default: {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<IJournal | null>(statusMessage, payload);
  res.status(httpCode).json(result);
}
