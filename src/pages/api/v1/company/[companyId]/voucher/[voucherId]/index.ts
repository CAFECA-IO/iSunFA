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
import { validateRequest } from '@/lib/utils/request_validator';
import { APIName } from '@/constants/api_connection';

type ApiResponseType = IVoucherDataForAPIResponse | null;

async function handleVoucherUpdatePrismaLogic(
  voucher: IVoucherDataForSavingToDB,
  companyId: number
) {
  let voucherUpdated: ApiResponseType = null;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  try {
    const journal = await findUniqueJournalInvolveInvoicePaymentInPrisma(voucher.journalId);

    if (!journal || !journal.invoice || !journal.invoice.payment) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    if (!isVoucherAmountGreaterOrEqualThenPaymentAmount(voucher, journal.invoice.payment)) {
      throw new Error(STATUS_MESSAGE.INVALID_VOUCHER_AMOUNT);
    }

    voucherUpdated = await updateVoucherByJournalIdInPrisma(journal.id, companyId, voucher);
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  } catch (_error) {
    const error = _error as Error;
    const logError = loggerError(0, 'handleVoucherUpdatePrismaLogic failed', error);
    logError.error(
      'Prisma related func. in handleVoucherUpdatePrismaLogic in voucher/voucherId/index.ts failed'
    );
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
    const logError = loggerError(
      0,
      'handleVoucherUpdatePrismaLogic in handlePutRequest failed',
      error as Error
    );
    logError.error('Prisma related func. in handlePutRequest in voucher/voucherId/index.ts failed');
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
  const session = await getSession(req, res);
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
      const logError = loggerError(userId, 'handle voucherId request failed', error);
      logError.error(
        'handle voucher request failed in handler function in voucher/voucherId/index.ts'
      );
      statusMessage = error.message;
    }
  }

  const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
