import { NextApiRequest, NextApiResponse } from 'next';

import { EventType, PaymentPeriodType, PaymentStatusType } from '@/constants/account';
import { IInvoice, IInvoiceDataForSavingToDB } from '@/interfaces/invoice';
import { isIInvoiceDataForSavingToDB } from '@/lib/utils/type_guard/invoice';
import { IResponseData } from '@/interfaces/response_data';
import { IAccountResultStatus } from '@/interfaces/accounting_account';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import prisma from '@/client';

import { AICH_URI } from '@/constants/config';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { isIAccountResultStatus } from '@/lib/utils/type_guard/account';
import { IPayment } from '@/interfaces/payment';

interface IPostApiResponseType {
  journalId: number;
  resultStatus: IAccountResultStatus;
}

async function createOrFindCompanyInPrisma(companyId: number) {
  let company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    try {
      const now = Date.now();
      const currentTimestamp = timestampInSeconds(now);
      company = await prisma.company.create({
        data: {
          id: companyId,
          code: 'COMP123',
          name: 'Company Name',
          regional: 'Regional Name',
          startDate: currentTimestamp,
          createdAt: currentTimestamp,
          updatedAt: currentTimestamp,
        },
        select: { id: true },
      });
    } catch (error) {
      throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
    }
  }

  return company;
}

async function paymentSaveToPrisma(paymentData: IPayment) {
  const payment = await prisma.payment.create({
    data: paymentData,
    select: {
      id: true,
    },
  });
  return payment;
}

async function invoiceSaveToPrisma(
  invoiceDataForSavingToDB: IInvoiceDataForSavingToDB,
  companyId: number
) {
  const {
    payment: paymentData,
    project,
    projectId,
    contract,
    contractId,
    journalId,
    ...invoiceData
  } = invoiceDataForSavingToDB;

  // Depreciate ( 20240522 - Murky ) For demo purpose, create company if not exist
  try {
    const result = await prisma.$transaction(async () => {
      const company = await createOrFindCompanyInPrisma(companyId);

      const payment = await paymentSaveToPrisma(paymentData);

      const invoice = await prisma.invoice.create({
        data: {
          date: timestampInSeconds(invoiceData.date),
          eventType: invoiceData.eventType,
          paymentReason: invoiceData.paymentReason,
          description: invoiceData.description,
          vendorOrSupplier: invoiceData.vendorOrSupplier,
          paymentId: payment.id,
        },
      });

      return { invoiceId: invoice.id, companyIdNumber: company.id };
    });
    return result;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

async function journalSaveToPrisma(
  journalId: number | null,
  invoiceId: number,
  aichResultId: string,
  projectId: number | null,
  contractId: number | null,
  companyId: number
) {
  // ToDo: ( 20240522 - Murky ) 如果AICJ回傳的resultId已經存在於journal，會因為unique key而無法upsert，導致error
  try {
    const result = await prisma.$transaction(async () => {
      // Check if contractId exists if it's not null

      let journal: {
        id: number;
      };

      if (!journalId) {
        journal = await prisma.journal.create({
          data: {
            invoiceId,
            aichResultId,
            projectId: projectId || undefined,
            contractId: contractId || undefined,
            companyId,
          },
          select: {
            id: true,
          },
        });
      } else {
        journal = await prisma.journal.update({
          where: {
            id: journalId,
          },
          data: {
            invoiceId,
            aichResultId,
            projectId: projectId || undefined,
            contractId: contractId || undefined,
          },
          select: {
            id: true,
          },
        });
      }

      return journal.id;
    });

    return result;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

function isCompanyIdValid(companyId: string | string[] | undefined): companyId is string {
  if (
    Array.isArray(companyId) ||
    !companyId ||
    typeof companyId !== 'string' ||
    !Number.isInteger(Number(companyId))
  ) {
    return false;
  }
  return true;
}

// Info Murky (20240416): Body傳進來會是any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatInvoice(invoice: any) {
  // Depreciate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
  const formattedInvoice = {
    ...invoice,
    projectId: invoice.projectId ? invoice.projectId : null,
    contractId: invoice.contractId ? invoice.contractId : null,
    project: invoice.project ? invoice.project : null,
    contract: invoice.contract ? invoice.contract : null,
  };
  // Info Murky (20240416): Check if invoices is array and is Invoice type
  if (Array.isArray(formattedInvoice) || !isIInvoiceDataForSavingToDB(formattedInvoice)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_INVOICE_BODY_TO_VOUCHER);
  }
  return formattedInvoice;
}

async function uploadInvoiceToAICH(invoice: IInvoiceDataForSavingToDB) {
  let response: Response;

  try {
    const { journalId, ...invoiceData } = invoice;

    response = await fetch(`${AICH_URI}/api/v1/vouchers/upload_invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([invoiceData]), // ToDo: Murky 這邊之後要改成單一一個
    });
  } catch (error) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  if (!response.ok) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  return response.json() as Promise<{ payload?: unknown } | null>;
}

async function getPayloadFromResponseJSON(responseJSON: Promise<{ payload?: unknown } | null>) {
  if (!responseJSON) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
  }

  let json: {
    payload?: unknown;
  } | null;

  try {
    json = await responseJSON;
  } catch (error) {
    throw new Error(STATUS_MESSAGE.PARSE_JSON_FAILED_ERROR);
  }

  if (!json || !json.payload) {
    throw new Error(STATUS_MESSAGE.AICH_SUCCESSFUL_RETURN_BUT_RESULT_IS_NULL);
  }

  return json.payload as IAccountResultStatus;
}

function getProjectIdAndContractIdFromInvoice(invoice: IInvoiceDataForSavingToDB) {
  const projectIdNum = Number(invoice.projectId);
  const contractIdNum = Number(invoice.contractId);
  const projectId = !Number.isNaN(projectIdNum) ? projectIdNum : null;
  const contractId = !Number.isNaN(contractIdNum) ? contractIdNum : null;
  return { projectId, contractId };
}

function handleErrorResponse(res: NextApiResponse, message: string) {
  const { httpCode, result } = formatApiResponse<IAccountResultStatus>(
    message,
    {} as IAccountResultStatus
  );
  res.status(httpCode).json(result);
}

async function handleGetRequest(
  companyId: string,
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IPostApiResponseType>>
) {
  const { invoice } = req.body;

  const formattedInvoice = formatInvoice(invoice);

  // ToDo: save to prisma
  const companyIdNum = Number(companyId);
  const { invoiceId, companyIdNumber } = await invoiceSaveToPrisma(formattedInvoice, companyIdNum);

  // Post to AICH
  const fetchResult = uploadInvoiceToAICH(formattedInvoice);

  const resultStatus: IAccountResultStatus = await getPayloadFromResponseJSON(fetchResult);

  if (!resultStatus || !isIAccountResultStatus(resultStatus)) {
    throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
  }

  // Depreciate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
  const { projectId, contractId } = getProjectIdAndContractIdFromInvoice(formattedInvoice);

  const journalId = await journalSaveToPrisma(
    formattedInvoice.journalId,
    invoiceId,
    resultStatus.resultId,
    projectId,
    contractId,
    companyIdNumber
  );

  const { httpCode, result } = formatApiResponse<IPostApiResponseType>(STATUS_MESSAGE.CREATED, {
    journalId,
    resultStatus,
  });
  res.status(httpCode).json(result);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice[] | IPostApiResponseType>>
) {
  try {
    const { companyId } = req.query;
    if (!isCompanyIdValid(companyId)) {
      throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
    }
    if (req.method === 'GET') {
      // Handle GET request to fetch all invoices
      const invoices: IInvoice[] = [
        {
          date: 21321321,
          invoiceId: '123123',
          eventType: EventType.PAYMENT,
          paymentReason: 'purchase',
          description: 'description',
          vendorOrSupplier: 'vender',
          project: 'ISunFa',
          contract: 'ISunFa buy',
          projectId: '123',
          contractId: '123',
          payment: {
            isRevenue: false,
            price: 1500,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
            paymentMethod: 'transfer',
            paymentPeriod: PaymentPeriodType.AT_ONCE,
            installmentPeriod: 0,
            paymentAlreadyDone: 1500,
            paymentStatus: PaymentStatusType.PAID,
            progress: 0,
          },
        },
        {
          invoiceId: '2',
          date: 123123123,
          eventType: EventType.PAYMENT,
          paymentReason: 'sale',
          description: 'description',
          vendorOrSupplier: 'vender',
          project: 'ISunFa',
          contract: 'ISunFa buy',
          projectId: '123',
          contractId: '123',
          payment: {
            isRevenue: false,
            price: 100,
            hasTax: true,
            taxPercentage: 10,
            hasFee: true,
            fee: 10,
            paymentMethod: 'transfer',
            paymentPeriod: PaymentPeriodType.AT_ONCE,
            installmentPeriod: 0,
            paymentAlreadyDone: 110,
            paymentStatus: PaymentStatusType.PAID,
            progress: 0,
          },
        },
      ];

      const { httpCode, result } = formatApiResponse<IInvoice[]>(
        STATUS_MESSAGE.SUCCESS_GET,
        invoices as IInvoice[]
      );
      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      // Handle POST request to create a new invoice
      await handleGetRequest(companyId, req, res);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    handleErrorResponse(res, error.message);
  }
}
