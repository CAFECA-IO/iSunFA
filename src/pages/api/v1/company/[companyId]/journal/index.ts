import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, pageToOffset, timestampInMilliSeconds, timestampInSeconds } from '@/lib/utils/common';

import { STATUS_MESSAGE } from '@/constants/status_code';
import prisma from '@/client';
import { DEFAULT_PAGE_LIMIT, DEFAULT_PAGE_START_AT } from '@/constants/config';

type ApiResponseType = {
  id: number;
  date: number;
  type: string | undefined;
  particulars: string | undefined;
  fromTo: string | undefined;
  account: {
    id:number;
    debit: boolean;
    account: string;
    amount: number;
  }[] | undefined;
  projectName: string | undefined;
  projectImageId: string | null | undefined;
  voucherId: number | undefined;
  voucherNo: string | undefined;
}[];

type PrismaReturnType = {
  id: number;
  createdAt: Date;
  invoice: {
    eventType: string;
    description: string;
    vendorOrSupplier: string;
  } | null;
  project: {
    name: string;
    id: number;
    imageId: string | null;
  } | null;
  voucher: {
    id: number;
    no: string;
    lineItems: {
      id: number;
      amount: number;
      debit: boolean;
      account: {
        name: string;
      };
    }[];
  } | null
}[];

async function getJournals(
  companyId: number,
  page: number = DEFAULT_PAGE_START_AT,
  limit: number = DEFAULT_PAGE_LIMIT,
  eventType: string | undefined = undefined,
  startDate: number | undefined = undefined,
  endDate: number | undefined = undefined,
  search: string | undefined = undefined,
  sort: string | undefined = undefined
) {
  const startDateInMilliSecond = startDate ? new Date(timestampInMilliSeconds(startDate)) : undefined;
  const endDateInMilliSecond = endDate ? new Date(timestampInMilliSeconds(endDate)) : undefined;

  const offset = pageToOffset(page, limit);
  try {
    const journalData = await prisma.journal.findMany({
      orderBy: {
        createdAt: sort === 'asc' ? 'asc' : 'desc'
      },
      skip: offset,
      take: limit,
      where: {
        companyId,
        createdAt: {
          gte: startDateInMilliSecond,
          lte: endDateInMilliSecond
        },
        invoice: {
          eventType,
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
            imageId: true,
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

function formatJournals(journalData: PrismaReturnType) {
  const journals = journalData.map((journal) => {
    return {
      id: journal.id,
      date: timestampInSeconds(journal.createdAt.getTime()),
      type: journal.invoice?.eventType,
      particulars: journal.invoice?.description,
      fromTo: journal.invoice?.vendorOrSupplier,
      account: journal.voucher?.lineItems.map((lineItem) => {
        return {
          id: lineItem.id,
          debit: lineItem.debit,
          account: lineItem.account.name,
          amount: lineItem.amount,
        };
      }),
      projectName: journal.project?.name,
      projectImageId: journal.project?.imageId,
      voucherId: journal.voucher?.id,
      voucherNo: journal.voucher?.no,
    };
  });
  return journals;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  try {
    if (req.method === 'GET') {
      const {
        companyId,
        page, // can be undefined
        limit,
        eventType,
        startDate,
        endDate,
        search,
        sort
      } = req.query;
      // help me check type

      if (
         Array.isArray(companyId) ||
        !companyId ||
        typeof companyId !== 'string' ||
        !Number.isInteger(Number(companyId)) ||
        (page && !Number.isInteger(Number(page))) ||
        (limit && !Number.isInteger(Number(limit))) ||
        (eventType && typeof eventType !== 'string') ||
        (startDate && !Number.isInteger(Number(startDate))) ||
        (endDate && !Number.isInteger(Number(endDate))) ||
        (search && typeof search !== 'string') ||
        (sort && typeof sort !== 'string')) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }

      const companyIdNumber = Number(companyId);
      const pageInt = page ? Number(page) : DEFAULT_PAGE_START_AT;
      const limitInt = limit ? Number(limit) : DEFAULT_PAGE_LIMIT;
      const startDateInt = startDate ? Number(startDate) : undefined;
      const endDateInt = endDate ? Number(endDate) : undefined;

      const journalData = await getJournals(companyIdNumber, pageInt, limitInt, eventType, startDateInt, endDateInt, search, sort);
      const journals = formatJournals(journalData);

      const { httpCode, result } = formatApiResponse<ApiResponseType>(
        STATUS_MESSAGE.SUCCESS_LIST,
        journals
      );

      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<ApiResponseType>(error.message, {} as ApiResponseType);
    res.status(httpCode).json(result);
  }
}
