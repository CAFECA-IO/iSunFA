import { IResponseData } from '@/interfaces/response_data';
import { IVoucherDataForAPIResponse, IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import {
  updateVoucherByJournalIdInPrisma,
  findUniqueJournalInvolveInvoicePaymentInPrisma,
} from '@/lib/utils/repo/voucher.repo';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { isVoucherAmountGreaterOrEqualThenPaymentAmount } from '@/lib/utils/voucher';
import { loggerError } from '@/lib/utils/logger_back';
import { validateRequest } from '@/lib/utils/validator';
import { APIName } from '@/constants/api_connection';
import { DefaultValue } from '@/constants/default_value';

type ApiResponseType = IVoucherDataForAPIResponse | null;

async function handleVoucherUpdatePrismaLogic(
  voucher: IVoucherDataForSavingToDB,
  companyId: number
) {
  let voucherUpdated: ApiResponseType = null;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  try {
    const journal = await findUniqueJournalInvolveInvoicePaymentInPrisma(voucher.journalId);

    if (!journal || !journal.invoiceVoucherJournals || !journal.invoiceVoucherJournals) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const { invoiceVoucherJournals } = journal;
    const amount = invoiceVoucherJournals.reduce((sum, invoiceVoucherJournal) => {
      return sum + (invoiceVoucherJournal.invoice?.totalPrice || 0);
    }, 0);
    if (!isVoucherAmountGreaterOrEqualThenPaymentAmount(voucher, amount)) {
      throw new Error(STATUS_MESSAGE.INVALID_VOUCHER_AMOUNT);
    }

    voucherUpdated = await updateVoucherByJournalIdInPrisma(journal.id, companyId, voucher);
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'handleVoucherUpdatePrismaLogic failed',
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
    voucherUpdated,
    statusMessage,
  };
}

async function handlePutRequest(
  companyId: number,
  voucher: IVoucherDataForSavingToDB & { journalId: number }
) {
  // Info: (20240613 - Murky) Temporary not use
  // const { voucherIdInNumber } = formatGetQuery(req);
  let voucherUpdated: ApiResponseType = null;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  try {
    const voucherUpdatedData = await handleVoucherUpdatePrismaLogic(voucher, companyId);
    voucherUpdated = voucherUpdatedData.voucherUpdated;
    statusMessage = voucherUpdatedData.statusMessage;
  } catch (error) {
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'handleVoucherUpdatePrismaLogic in handlePutRequest failed',
      errorMessage: (error as Error).message,
    });
  }

  return {
    voucherUpdated,
    statusMessage,
  };
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
      switch (req.method) {
        case 'PUT': {
          const { body } = validateRequest(APIName.VOUCHER_UPDATE, req, userId);
          if (body) {
            const { voucher } = body;
            const { voucherUpdated, statusMessage: message } = await handlePutRequest(
              companyId,
              voucher
            );
            payload = voucherUpdated;
            statusMessage = message;
          }
          break;
        }
        default: {
          break;
        }
      }
    } catch (_error) {
      const error = _error as Error;
      loggerError({
        userId,
        errorType: 'handle voucherId request failed',
        errorMessage: error.message,
      });
      statusMessage = error.message;
    }
  }

  const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
