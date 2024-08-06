import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { IVoucherDataForAPIResponse, IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { formatApiResponse } from '@/lib/utils/common';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { checkAuthorization } from '@/lib/utils/auth_check';
import {
  createLineItemInPrisma,
  createVoucherInPrisma,
  findUniqueVoucherInPrisma,
  getLatestVoucherNoInPrisma,
  findUniqueJournalInvolveInvoicePaymentInPrisma
} from '@/lib/utils/repo/voucher.repo';
import { getSession } from '@/lib/utils/session';
import { AuthFunctionsKeys } from '@/interfaces/auth';
import { IJournalFromPrismaIncludeInvoicePayment } from '@/interfaces/journal';

type ApiResponseType = IVoucherDataForAPIResponse | null;

async function handleVoucherCreatePrismaLogic(
  voucher: IVoucherDataForSavingToDB,
  companyId: number
) {
  try {
    const journal: IJournalFromPrismaIncludeInvoicePayment | null = await findUniqueJournalInvolveInvoicePaymentInPrisma(voucher.journalId);

    const newVoucherNo = await getLatestVoucherNoInPrisma(companyId);
    const voucherData = await createVoucherInPrisma(newVoucherNo, journal.id);
    await Promise.all(
      voucher.lineItems.map(async (lineItem) => {
        return createLineItemInPrisma(lineItem, voucherData.id, companyId);
      })
    );

    // Info: （ 20240613 - Murky）Get the voucher data again after creating the line items
    const voucherWithLineItems = await findUniqueVoucherInPrisma(voucherData.id);

    return voucherWithLineItems;
  } catch (error) {
    // Deprecate: (20240806 - Murky) Debugging purpose
    // eslint-disable-next-line no-console
    console.error(error);
    throw new Error(STATUS_MESSAGE.DATABASE_CREATE_FAILED_ERROR);
  }
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
        payload = await handlePostRequest(req, companyId);
        statusMessage = STATUS_MESSAGE.CREATED;
      } else {
        throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
      }
    } catch (_error) {
      const error = _error as Error;
      // Deprecate: (20240524 - Murky) Debugging purpose
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }
  const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
