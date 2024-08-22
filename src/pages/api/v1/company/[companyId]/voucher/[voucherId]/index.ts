import { IResponseData } from '@/interfaces/response_data';
import { IVoucherDataForAPIResponse, IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { getSession } from '@/lib/utils/session';
import {
  updateVoucherByJournalIdInPrisma,
  findUniqueJournalInvolveInvoicePaymentInPrisma,
} from '@/lib/utils/repo/voucher.repo';
import { checkAuthorization } from '@/lib/utils/auth_check';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { isVoucherAmountGreaterOrEqualThenPaymentAmount } from '@/lib/utils/voucher';

type ApiResponseType = IVoucherDataForAPIResponse | null;

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

// Info: (20240613 - Murky) Temporary not use
// function formatVoucherId(voucherId: unknown): number {
//   let voucherIdInNumber = -1;
//   if (typeof voucherId === 'string') {
//     voucherIdInNumber = parseInt(voucherId, 10);
//   }
//   return voucherIdInNumber;
// }

function formatVoucherBody(voucher: IVoucherDataForSavingToDB) {
  let voucherData: IVoucherDataForSavingToDB | null = null;
  if (isVoucherValid(voucher)) {
    voucherData = voucher;
  }
  return voucherData;
}

function formatPutBody(req: NextApiRequest) {
  const { voucher } = req.body;
  const voucherData = formatVoucherBody(voucher as IVoucherDataForSavingToDB);
  return { voucherData };
}

async function handleVoucherUpdatePrismaLogic(
  voucher: IVoucherDataForSavingToDB,
  companyId: number
) {
  let voucherUpdated: ApiResponseType = null;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  try {
    const journal = await findUniqueJournalInvolveInvoicePaymentInPrisma(voucher.journalId);

    if (!journal || !journal.invoice || !journal.invoice.payment) {
      // Info: （ 20240806 - Murky）This message will appear in the console.log, but still single output
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    if (!isVoucherAmountGreaterOrEqualThenPaymentAmount(voucher, journal.invoice.payment)) {
      // Info: （ 20240806 - Murky）This message will appear in the console.log, but still single output
      throw new Error(STATUS_MESSAGE.INVALID_VOUCHER_AMOUNT);
    }

    voucherUpdated = await updateVoucherByJournalIdInPrisma(journal.id, companyId, voucher);
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  } catch (_error) {
    const error = _error as Error;
    // Deprecate: (20240524 - Murky) Deprecate this error message
    // eslint-disable-next-line no-console
    console.error(error);
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

async function handlePutRequest(companyId: number, req: NextApiRequest) {
  // Info: (20240613 - Murky) Temporary not use
  // const { voucherIdInNumber } = formatGetQuery(req);
  const { voucherData } = formatPutBody(req);
  let voucherUpdated: ApiResponseType = null;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  if (voucherData) {
    try {
      const voucherUpdatedData = await handleVoucherUpdatePrismaLogic(voucherData, companyId);
      voucherUpdated = voucherUpdatedData.voucherUpdated;
      statusMessage = voucherUpdatedData.statusMessage;
    } catch (error) {
      // Deprecate: (20240524 - Murky) Deprecate this error message
      // eslint-disable-next-line no-console
      console.error(error);
    }
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
          const { voucherUpdated, statusMessage: message } = await handlePutRequest(companyId, req);
          payload = voucherUpdated;
          statusMessage = message;
          break;
        }
        default: {
          break;
        }
      }
    } catch (_error) {
      const error = _error as Error;
      // Deprecate: (20240524 - Murky) Debugging purpose
      // eslint-disable-next-line no-console
      console.error(error);
      statusMessage = error.message;
    }
  }

  const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
