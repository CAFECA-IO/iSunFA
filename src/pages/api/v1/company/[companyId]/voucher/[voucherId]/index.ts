import { IResponseData } from '@/interfaces/response_data';
import { IVoucherDataForAPIResponse, IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { getSession } from '@/lib/utils/session';
import {
  updateVoucherByJournalIdInPrisma,
  findUniqueJournalInvolveInvoicePaymentInPrisma
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
  try {
    const journal = await findUniqueJournalInvolveInvoicePaymentInPrisma(voucher.journalId);

    if (!journal || !journal.invoice || !journal.invoice.payment) {
      // Info: （ 20240806 - Murky）This message will appear in the console.log, but still single output
      throw new Error("Journal or invoice or payment not found");
    }

    if (!isVoucherAmountGreaterOrEqualThenPaymentAmount(voucher, journal.invoice.payment)) {
      // Info: （ 20240806 - Murky）This message will appear in the console.log, but still single output
      throw new Error("Voucher amount is not greater or equal to payment amount");
    }

    voucherUpdated = await updateVoucherByJournalIdInPrisma(journal.id, companyId, voucher);
  } catch (error) {
    // Deprecate: (20240524 - Murky) Deprecate this error message
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return voucherUpdated;
}

async function handlePutRequest(companyId: number, req: NextApiRequest) {
  // Info: (20240613 - Murky) Temporary not use
  // const { voucherIdInNumber } = formatGetQuery(req);
  const { voucherData } = formatPutBody(req);
  let voucherUpdated: ApiResponseType = null;

  if (voucherData) {
    try {
      voucherUpdated = await handleVoucherUpdatePrismaLogic(voucherData, companyId);
    } catch (error) {
      // Deprecate: (20240524 - Murky) Deprecate this error message
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  return voucherUpdated;
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
      // ToDo: (20240703 - Murky) Need to check Auth
      switch (req.method) {
        case 'PUT': {
          payload = await handlePutRequest(companyId, req);

          statusMessage = STATUS_MESSAGE.CREATED;
          break;
        }
        default: {
          break;
        }
      }
    } catch (_error) {
      const error = _error as Error;
      statusMessage = error.message;
    }
  }

  const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
