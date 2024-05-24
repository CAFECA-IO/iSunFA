import { IResponseData } from '@/interfaces/response_data';
import { NextApiRequest, NextApiResponse } from 'next';
import { formatApiResponse } from '@/lib/utils/common';
import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';

type ApiResponseType = {
    id: number;
    tokenContract: string | null;
    tokenId: string | null;
    aichResultId: string | null;
    projectId: number | null;
    contractId: number | null;
    ocr: { id: number; imageName: string; imageUrl: string; imageSize: number; createdAt: Date; updatedAt: Date; } | null,
    invoice: {
        id: number;
        eventType: string;
        description: string;
        vendorOrSupplier: string;
        payment: {
          id: number,
          isRevenue: boolean,
          price: number,
          hasTax: boolean,
          taxPercentage: number,
          hasFee: boolean,
          fee: number,
          paymentMethod: string,
          paymentPeriod: string,
          installmentPeriod: number,
          paymentAlreadyDone: number,
          paymentStatus: string,
          progress: number
        };
    } | null,
    voucher: {
        id: number;
        no: string;
        lineItems: {
            id: number;
            amount: number;
            debit: boolean;
            account: {
                name: string;
            }
        }[]
    } | null
};

async function getJournal(journalId: number) {
  try {
    const journal = await prisma.journal.findUnique({
      where: {
        id: journalId,
      },
      select: {
        id: true,
        tokenContract: true,
        tokenId: true,
        ocr: true,
        aichResultId: true,
        invoice: {
          select: {
            id: true,
            eventType: true,
            description: true,
            vendorOrSupplier: true,
            payment: {
              select: {
                id: true,
                isRevenue: true,
                price: true,
                hasTax: true,
                taxPercentage: true,
                hasFee: true,
                fee: true,
                paymentMethod: true,
                paymentPeriod: true,
                installmentPeriod: true,
                paymentAlreadyDone: true,
                paymentStatus: true,
                progress: true
              }
            },
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
        projectId: true,
        contractId: true,
        }
    });

    if (!journal) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    return journal;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  try {
    if (req.method === 'GET') {
      const { journalId } = req.query;
      if (!journalId || Array.isArray(journalId) || Number.isNaN(Number(journalId))) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }
      const journal = await getJournal(Number(journalId));
      const { httpCode, result } = formatApiResponse<ApiResponseType>(STATUS_MESSAGE.SUCCESS, journal);

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
