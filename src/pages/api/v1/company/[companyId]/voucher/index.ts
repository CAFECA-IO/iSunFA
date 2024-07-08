import { NextApiRequest, NextApiResponse } from 'next';

import { IResponseData } from '@/interfaces/response_data';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { formatApiResponse } from '@/lib/utils/common';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { checkAdmin } from '@/lib/utils/auth_check';
import {
  createLineItemInPrisma,
  createVoucherInPrisma,
  findUniqueJournalInPrisma,
  findUniqueVoucherInPrisma,
  getLatestVoucherNoInPrisma,
} from '@/lib/utils/repo/voucher.repo';

type ApiResponseType = {
  id: number;
  createdAt: number;
  updatedAt: number;
  journalId: number;
  no: string;
  lineItems: {
    id: number;
    amount: number;
    description: string;
    debit: boolean;
    accountId: number;
    voucherId: number;
    createdAt: number;
    updatedAt: number;
  }[];
} | null;

async function handleVoucherCreatePrismaLogic(
  voucher: IVoucherDataForSavingToDB,
  companyId: number
) {
  try {
    const journalId = await findUniqueJournalInPrisma(voucher.journalId);

    const newVoucherNo = await getLatestVoucherNoInPrisma(companyId);
    const voucherData = await createVoucherInPrisma(newVoucherNo, journalId);
    await Promise.all(
      voucher.lineItems.map(async (lineItem) => {
        return createLineItemInPrisma(lineItem, voucherData.id, companyId);
      })
    );

    // Info: （ 20240613 - Murky）Get the voucher data again after creating the line items
    const voucherWithLineItems = await findUniqueVoucherInPrisma(voucherData.id);

    return voucherWithLineItems;
  } catch (error) {
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

  const { httpCode, result: response } = formatApiResponse<ApiResponseType>(
    STATUS_MESSAGE.CREATED,
    result
  );

  return { httpCode, response };
}

export function handleErrorRequest(error: Error) {
  const { httpCode, result } = formatApiResponse<ApiResponseType>(
    error.message,
    {} as ApiResponseType
  );
  return { httpCode, result };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<ApiResponseType>>
) {
  const session = await checkAdmin(req, res);
  const { companyId } = session;
  // Deprecated: (20240613 - Murky) Need to replace by type guard after merge
  if (!companyId || typeof companyId !== 'number') {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  try {
    if (req.method === 'POST') {
      const { httpCode, response } = await handlePostRequest(req, companyId);
      res.status(httpCode).json(response);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = handleErrorRequest(error);
    res.status(httpCode).json(result);
  }
}
