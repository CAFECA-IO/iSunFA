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

async function invoiceSaveToPrisma(
  invoiceDataForSavingToDB: IInvoiceDataForSavingToDB,
  companyId: number
) {
  const {
    payment: paymentDate,
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
      let company = await prisma.company.findUnique({
        where: {
          id: companyId,
        },
        select: {
          id: true,
        },
      });

      if (!company) {
        company = await prisma.company.create({
          data: {
            id: companyId,
            code: 'COMP123',
            name: 'Company Name',
            regional: 'Regional Name',
          },
          select: {
            id: true,
          },
        });
      }

      const payment = await prisma.payment.create({
        data: paymentDate,
        select: {
          id: true,
        },
      });

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

async function safeToJournal(
  journalId: number | null,
  invoiceId: number,
  aichResultId: string,
  projectId: number | null,
  contractId: number | null,
  companyId: number
) {
  // ToDo: ( 20240522 - Murky ) 如果AICJ回傳的resultId已經存在於journal，會因為unique key而無法upsert，導致error
  try {
    await prisma.$transaction(async () => {
      // Check if contractId exists if it's not null

      if (!journalId) {
        await prisma.journal.create({
          data: {
            invoiceId,
            aichResultId,
            projectId,
            contractId,
            companyId,
          },
        });
      } else {
        await prisma.journal.upsert({
          where: {
            id: journalId,
          },
          update: {
            invoiceId,
            aichResultId,
          },
          create: {
            invoiceId,
            aichResultId,
            companyId,
          },
        });
      }
    });
  } catch (error) {
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice[] | IAccountResultStatus>>
) {
  try {
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
      const { companyId } = req.query;
      if (
        Array.isArray(companyId) ||
        !companyId ||
        typeof companyId !== 'string' ||
        !Number.isInteger(Number(companyId))
      ) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }

      const { invoice } = req.body;

      // eslint-disable-next-line no-console
      console.log('invoice', invoice);
      // Depreciate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
      invoice.projectId = invoice.projectId ? invoice.projectId : null;
      invoice.contractId = invoice.contractId ? invoice.contractId : null;
      invoice.project = invoice.project ? invoice.project : null;
      invoice.contract = invoice.contract ? invoice.contract : null;

      // Info Murky (20240416): Check if invoices is array and is Invoice type
      if (Array.isArray(invoice) || !isIInvoiceDataForSavingToDB(invoice)) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_INVOICE_BODY_TO_VOUCHER);
      }

      // ToDo: save to prisma
      const { invoiceId, companyIdNumber } = await invoiceSaveToPrisma(invoice, Number(companyId));

      // Post to AICH
      let fetchResult: Response;

      try {
        const { journalId, ...invoiceData } = invoice;

        fetchResult = await fetch(`${AICH_URI}/api/v1/vouchers/upload_invoice`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([invoiceData]), // ToDo: Murky 這邊之後要改成單一一個
        });
      } catch (error) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      if (!fetchResult.ok) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      const resultStatus: IAccountResultStatus = (await fetchResult.json()).payload;

      if (!resultStatus || !isIAccountResultStatus(resultStatus)) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
      }

      // Depreciate ( 20240522 - Murky ) For demo purpose, AICH need to remove projectId and contractId
      const projectId = !Number.isNaN(Number(invoice.projectId)) ? Number(invoice.projectId) : null;
      const contractId = !Number.isNaN(Number(invoice.contractId))
        ? Number(invoice.contractId)
        : null;

      await safeToJournal(
        invoiceId,
        invoiceId,
        resultStatus.resultId,
        projectId,
        contractId,
        companyIdNumber
      );

      const { httpCode, result } = formatApiResponse<IAccountResultStatus>(
        STATUS_MESSAGE.CREATED,
        resultStatus
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IInvoice[]>(error.message, {} as IInvoice[]);
    res.status(httpCode).json(result);
  }
}
