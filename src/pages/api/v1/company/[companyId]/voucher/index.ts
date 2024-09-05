import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import {
  IVoucherDataForAPIResponse,
  IVoucherDataForSavingToDB,
  IVoucherFromPrismaIncludeJournalLineItems,
} from '@/interfaces/voucher';
import { formatApiResponse } from '@/lib/utils/common';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { checkAuthorization } from '@/lib/utils/auth_check';
import {
  createLineItemInPrisma,
  createVoucherInPrisma,
  findUniqueVoucherInPrisma,
  getLatestVoucherNoInPrisma,
  findUniqueJournalInvolveInvoicePaymentInPrisma,
} from '@/lib/utils/repo/voucher.repo';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { IJournalFromPrismaIncludeInvoicePayment } from '@/interfaces/journal';
import { isVoucherAmountGreaterOrEqualThenPaymentAmount } from '@/lib/utils/voucher';

type ApiResponseType = IVoucherDataForAPIResponse | null;

async function handleVoucherCreatePrismaLogic(
  voucher: IVoucherDataForSavingToDB,
  companyId: number
) {
  let updatedVoucher: IVoucherFromPrismaIncludeJournalLineItems | null = null;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;

  try {
    const journal: IJournalFromPrismaIncludeInvoicePayment | null =
      await findUniqueJournalInvolveInvoicePaymentInPrisma(voucher.journalId);

    if (!journal || !journal.invoice || !journal.invoice.payment) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    if (!isVoucherAmountGreaterOrEqualThenPaymentAmount(voucher, journal.invoice.payment)) {
      throw new Error(STATUS_MESSAGE.INVALID_VOUCHER_AMOUNT);
    }

    const newVoucherNo = await getLatestVoucherNoInPrisma(companyId);
    const voucherData = await createVoucherInPrisma(newVoucherNo, journal.id);
    await Promise.all(
      voucher.lineItems.map(async (lineItem) => {
        return createLineItemInPrisma(lineItem, voucherData.id, companyId);
      })
    );

    // Info: （ 20240613 - Murky）Get the voucher data again after creating the line items
    updatedVoucher = await findUniqueVoucherInPrisma(voucherData.id);
    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (_error) {
    const error = _error as Error;
    // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger

    switch (error.message) {
      case STATUS_MESSAGE.RESOURCE_NOT_FOUND:
        statusMessage = STATUS_MESSAGE.RESOURCE_NOT_FOUND;
        break;
      case STATUS_MESSAGE.INVALID_VOUCHER_AMOUNT:
        statusMessage = STATUS_MESSAGE.INVALID_VOUCHER_AMOUNT;
        break;
      default:
        statusMessage = STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR;
        break;
    }
  }

  return {
    updatedVoucher,
    statusMessage,
  };
}

function isVoucherValid(
  voucher: IVoucherDataForSavingToDB
): voucher is IVoucherDataForSavingToDB & { journalId: number } {
  if (
    !voucher ||
    !isIVoucherDataForSavingToDB(voucher) ||
    !voucher.journalId ||
    typeof voucher.journalId !== 'number'
  ) {
    return false;
  }
  return true;
}

export async function handlePostRequest(req: NextApiRequest, companyId: number) {
  const { voucher } = req.body;

  // Info: （ 20240522 - Murky）body need to provide LineItems and journalId
  if (!isVoucherValid(voucher)) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const result = await handleVoucherCreatePrismaLogic(voucher, companyId);

  return result;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  const session = await getSession(req, res);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ApiResponseType = null;

  if (isAuth) {
    try {
      if (req.method === 'POST') {
        const { updatedVoucher, statusMessage: message } = await handlePostRequest(req, companyId);
        payload = updatedVoucher;
        statusMessage = message;
      } else {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    } catch (_error) {
      // Todo: (20240822 - Anna): [Beta] feat. Murky - 使用 logger
    }
  }
  const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
