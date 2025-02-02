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
import { createLineItemInPrisma, findUniqueVoucherInPrisma } from '@/lib/utils/repo/voucher.repo';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { isVoucherAmountGreaterOrEqualThenPaymentAmount } from '@/lib/utils/voucher';
import { loggerError } from '@/lib/utils/logger_back';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { getInvoiceVoucherJournalByJournalId } from '@/lib/utils/repo/beta_transition.repo';
import { DefaultValue } from '@/constants/default_value';

type ApiResponseType = IVoucherDataForAPIResponse | null;

async function handleVoucherCreatePrismaLogic(
  voucher: IVoucherDataForSavingToDB,
  companyId: number
) {
  let updatedVoucher: IVoucherFromPrismaIncludeJournalLineItems | null = null;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;

  try {
    const invoiceVoucherJournal = await getInvoiceVoucherJournalByJournalId(voucher.journalId || 0);

    if (!invoiceVoucherJournal || !invoiceVoucherJournal.invoice) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    if (
      !isVoucherAmountGreaterOrEqualThenPaymentAmount(
        voucher,
        invoiceVoucherJournal.invoice.totalPrice
      )
    ) {
      throw new Error(STATUS_MESSAGE.INVALID_VOUCHER_AMOUNT);
    }

    // Info: (20240925 - Murky) I need to make sure lineitems is created in order
    // Deprecated: (20240926 - Murky) Need to find better way to sort line items
    /* eslint-disable no-restricted-syntax */
    if (!invoiceVoucherJournal.voucher) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }
    for (const lineItem of voucher.lineItems) {
      // Deprecated: (20240926 - Murky) Need to find better way to sort line items
      /* eslint-disable no-await-in-loop */
      await createLineItemInPrisma(lineItem, invoiceVoucherJournal.voucher.id, companyId);
      /* eslint-enable no-await-in-loop */
    }
    /* eslint-enable no-restricted-syntax */

    // Info: （ 20240613 - Murky）Get the voucher data again after creating the line items
    updatedVoucher = await findUniqueVoucherInPrisma(invoiceVoucherJournal.voucher?.id || 1000);
    statusMessage = STATUS_MESSAGE.CREATED;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'handleVoucherCreatePrismaLogic failed',
      errorMessage: error.message,
    });

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

export async function handlePostRequest(
  companyId: number,
  voucher: IVoucherDataForSavingToDB & {
    journalId: number;
  }
) {
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
  const session = await getSession(req);
  const { userId, companyId } = session;
  const isAuth = await checkAuthorization([AuthFunctionsKeys.admin], { userId, companyId });

  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ApiResponseType = null;

  if (isAuth) {
    try {
      if (req.method === 'POST') {
        const { body } = validateRequest(APIName.VOUCHER_CREATE, req, userId);

        if (body) {
          const { voucher } = body;
          const { updatedVoucher, statusMessage: message } = await handlePostRequest(
            companyId,
            voucher
          );
          if (
            updatedVoucher &&
            updatedVoucher.id &&
            updatedVoucher.invoiceVoucherJournals[0].journalId &&
            updatedVoucher.invoiceVoucherJournals[0].journal
          ) {
            const formattedVoucher = {
              ...updatedVoucher,
              id: updatedVoucher.id,
              journalId: updatedVoucher.invoiceVoucherJournals[0].journalId,
              journal: updatedVoucher.invoiceVoucherJournals[0].journal,
              lineItems: updatedVoucher.lineItems,
            };
            payload = formattedVoucher;
            statusMessage = message;
          } else {
            throw new Error(STATUS_MESSAGE.INVALID_INPUT_VOUCHER_BODY_TO_JOURNAL);
          }
          statusMessage = message;
        }
      } else {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    } catch (_error) {
      loggerError({
        userId,
        errorType: 'handler request failed',
        errorMessage: (_error as Error).message,
      });
    }
  }
  const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
