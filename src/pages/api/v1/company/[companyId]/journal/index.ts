import { NextApiRequest, NextApiResponse } from 'next';

import { IJournal } from '@/interfaces/journal';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, pageToOffset, timestampInMilliSeconds } from '@/lib/utils/common';

import { STATUS_MESSAGE } from '@/constants/status_code';
import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';
import { EventType } from '@/constants/account';

async function getJournal(
  companyId: number,
  page: number = DEFAULT_PAGE_START_AT,
  limit: number = DEFAULT_PAGE_LIMIT,
  eventType: EventType | undefined = undefined,
  startDate: number | undefined = undefined,
  endDate: number | undefined = undefined,
  search: string | undefined = undefined,
  sort: string | undefined = undefined
) {
  const startDateInMilliSecond = startDate ? new Date(timestampInMilliSeconds(startDate)) : undefined;
  const endDateInMilliSecond = endDate ? new Date(timestampInMilliSeconds(endDate)) : undefined;
  const eventTypeInString = eventType ? EventType[eventType] : undefined;

  const offset = pageToOffset(page, limit);
  try {
    const journalData = await prisma.journal.findMany({
      skip: offset,
      take: limit,
      where: {
        companyId,
        createdAt: {
          gte: startDateInMilliSecond,
          lte: endDateInMilliSecond
        },
        invoice: {
          eventType: eventTypeInString,
        },
        OR: [
          {
            invoice: {
              vendorOrSupplier: {
                contains: search
              }
            }
          },
          {
            invoice: {
              description: {
                contains: search
              }
            }
          },
          {
            voucher: {
              no: {
                contains: search
              }
            }
          }
        ]
      },
      select: {
        id: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            name: true,
          }
        },
        invoice: {
          select: {
            eventType: true,
            description: true,
            vendorOrSupplier: true,
          }
        },
        voucher: {
          select: {
            id: true,
            no: true,
            lineItems: {
              select: {
                id: true,
                amount: true,
                debit: true,
                account: {
                  select: {
                    name: true,
                  }
                }
            }
          }
        }

      },
    } });
    return journalData;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

function formatJournal(journalData: ) {

}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal | IJournal[]>>
) {
  try {
    if (req.method === 'GET') {
      if (!journalArray) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }

      const { httpCode, result } = formatApiResponse<IJournal[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        journalArray
      );

      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IJournal>(error.message, {} as IJournal);
    res.status(httpCode).json(result);
  }
}
