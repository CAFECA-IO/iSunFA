import { IResponseData } from '@/interfaces/response_data';
import { NextApiRequest, NextApiResponse } from 'next';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  convertStringToEventType,
  convertStringToPaymentPeriodType,
  convertStringToPaymentStatusType,
} from '@/lib/utils/type_guard/account';
import { IJournal } from '@/interfaces/journal';

type IJournalResponseFromPrisma = {
  id: number;
  tokenContract: string | null;
  tokenId: string | null;
  aichResultId: string | null;
  projectId: number | null;
  project: { name: string | null } | null;
  contractId: number | null;
  contract: { contractContent: { name: string | null } | null } | null;
  ocr: {
    id: number;
    imageName: string;
    imageUrl: string;
    imageSize: number;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  invoice: {
    id: number;
    date: number;
    paymentReason: string;
    eventType: string;
    description: string;
    vendorOrSupplier: string;
    payment: {
      id: number;
      isRevenue: boolean;
      price: number;
      hasTax: boolean;
      taxPercentage: number;
      hasFee: boolean;
      fee: number;
      paymentMethod: string;
      paymentPeriod: string;
      installmentPeriod: number;
      paymentAlreadyDone: number;
      paymentStatus: string;
      progress: number;
    };
  } | null;
  voucher: {
    id: number;
    no: string;
    lineItems: {
      id: number;
      amount: number;
      debit: boolean;
      description: string;
      account: {
        name: string;
      };
    }[];
  } | null;
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
            date: true,
            eventType: true,
            paymentReason: true,
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
                progress: true,
              },
            },
          },
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
                description: true,
                account: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        projectId: true,
        project: {
          select: { name: true },
        },
        contractId: true,
        contract: {
          select: {
            contractContent: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!journal) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    return journal;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_READ_FAILED_ERROR);
  }
}

function formatJournal(journalData: IJournalResponseFromPrisma): IJournal {
  const projectName = journalData?.project?.name;
  const { projectId } = journalData;
  const contractName = journalData?.contract?.contractContent?.name;
  const { contractId } = journalData;
  const createTimestamp = journalData.ocr
    ? timestampInSeconds(journalData.ocr.createdAt.getTime())
    : null;
  const updateTimestamp = journalData.ocr
    ? timestampInSeconds(journalData.ocr.updatedAt.getTime())
    : null;

  return {
    id: journalData.id,
    tokenContract: journalData.tokenContract,
    tokenId: journalData.tokenId,
    aichResultId: journalData.aichResultId,
    projectId,
    contractId,
    OCR: journalData.ocr && {
      id: journalData.ocr.id,
      imageName: journalData.ocr.imageName,
      imageUrl: journalData.ocr.imageUrl,
      imageSize: journalData.ocr.imageSize,
      createdAt: createTimestamp as number,
      updatedAt: updateTimestamp as number,
    },
    invoice: journalData.invoice && {
      journalId: journalData.id,
      date: journalData.invoice.date,
      eventType: convertStringToEventType(journalData.invoice.eventType),
      paymentReason: journalData.invoice.paymentReason,
      description: journalData.invoice.description,
      vendorOrSupplier: journalData.invoice.vendorOrSupplier,
      projectId,
      project: projectName || null,
      contractId,
      contract: contractName || null,
      payment: {
        isRevenue: journalData.invoice.payment.isRevenue,
        price: journalData.invoice.payment.price,
        hasTax: journalData.invoice.payment.hasTax,
        taxPercentage: journalData.invoice.payment.taxPercentage,
        hasFee: journalData.invoice.payment.hasFee,
        fee: journalData.invoice.payment.fee,
        paymentMethod: journalData.invoice.payment.paymentMethod,
        paymentPeriod: convertStringToPaymentPeriodType(journalData.invoice.payment.paymentPeriod),
        installmentPeriod: journalData.invoice.payment.installmentPeriod,
        paymentAlreadyDone: journalData.invoice.payment.paymentAlreadyDone,
        paymentStatus: convertStringToPaymentStatusType(journalData.invoice.payment.paymentStatus),
        progress: journalData.invoice.payment.progress,
      },
    },
    voucher: journalData.voucher && {
      journalId: journalData.id,
      lineItems: journalData.voucher.lineItems.map((lineItem) => {
        return {
          lineItemIndex: lineItem.id.toString(),
          amount: lineItem.amount,
          debit: lineItem.debit,
          account: lineItem.account.name,
          description: lineItem.description,
        };
      }),
    },
  };
}

function isJournalIdValid(journalId: string | string[] | undefined): journalId is string {
  return !!journalId && !Array.isArray(journalId) && typeof journalId === 'string';
}

async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal>>
) {
  const { journalId } = req.query;
  if (!isJournalIdValid(journalId)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }
  const journalData = await getJournal(Number(journalId));
  const journal = formatJournal(journalData);
  const { httpCode, result } = formatApiResponse<IJournal>(STATUS_MESSAGE.SUCCESS, journal);

  res.status(httpCode).json(result);
}

function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IJournal>(message, {} as IJournal);
  res.status(httpCode).json(result);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal>>
) {
  try {
    if (req.method === 'GET') {
      handleGetRequest(req, res);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    handleErrorResponse(res, error.message);
  }
}
