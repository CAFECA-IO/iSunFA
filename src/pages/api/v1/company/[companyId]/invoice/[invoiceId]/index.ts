import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { formatApiResponse, isParamNumeric } from '@/lib/utils/common';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { IInvoice } from '@/interfaces/invoice';
import { getSession } from '@/lib/utils/session';
import { checkAuth } from '@/lib/utils/auth_check';
import prisma from '@/client';
import {
  convertStringToEventType,
  convertStringToPaymentPeriodType,
  convertStringToPaymentStatusType,
} from '@/lib/utils/type_guard/account';

async function getInvoice(invoiceIdNumber: number): Promise<IInvoice> {
  let responseData = {} as IInvoice;
  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceIdNumber,
    },
    include: {
      payment: true,
      journal: {
        include: {
          project: true,
          contract: true,
        },
      },
    },
  });
  if (invoice) {
    responseData = {
      journalId: invoice.journalId,
      date: invoice.date,
      eventType: convertStringToEventType(invoice.eventType),
      paymentReason: invoice.paymentReason,
      description: invoice.description,
      vendorOrSupplier: invoice.vendorOrSupplier,
      projectId: invoice.journal.projectId,
      project: invoice.journal?.project?.name,
      contractId: invoice.journal.contractId,
      contract: invoice.journal?.contract?.name,
      payment: {
        isRevenue: invoice.payment.isRevenue,
        price: invoice.payment.price,
        hasTax: invoice.payment.hasTax,
        taxPercentage: invoice.payment.taxPercentage,
        hasFee: invoice.payment.hasFee,
        fee: invoice.payment.fee,
        method: invoice.payment.method,
        period: convertStringToPaymentPeriodType(invoice.payment.period),
        installmentPeriod: invoice.payment.installmentPeriod,
        alreadyPaid: invoice.payment.alreadyPaid,
        status: convertStringToPaymentStatusType(invoice.payment.status),
        progress: invoice.payment.progress,
      },
    } as IInvoice;
  }
  return responseData;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IInvoice>>
) {
  let shouldContinue: boolean = true;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload = {} as IInvoice;

  try {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const { invoiceId } = req.query;
    if (req.method !== 'GET') {
      shouldContinue = false;
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
    if (shouldContinue) {
      shouldContinue = await checkAuth(userId, companyId);
      if (!shouldContinue) {
        statusMessage = STATUS_MESSAGE.UNAUTHORIZED_ACCESS;
      }
    }
    if (shouldContinue) {
      if (!isParamNumeric(invoiceId)) {
        shouldContinue = false;
        statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
      }
    }
    if (shouldContinue) {
      const invoiceIdNumber = Number(invoiceId);
      const responseData = await getInvoice(invoiceIdNumber);
      statusMessage = STATUS_MESSAGE.SUCCESS_GET;
      payload = responseData;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = {} as IInvoice;
  }
  const { httpCode, result } = formatApiResponse<IInvoice>(statusMessage, payload);
  res.status(httpCode).json(result);
}
