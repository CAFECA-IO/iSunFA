import { IResponseData } from '@/interfaces/response_data';
import { IVocuherDataForAPIResponse, IVoucherDataForSavingToDB } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { isIVoucherDataForSavingToDB } from '@/lib/utils/type_guard/voucher';
import { getSession } from '@/lib/utils/session';
import {
  findUniqueJournalInPrisma,
  updateVoucherByJournalIdInPrisma,
} from '@/lib/utils/repo/voucher.repo';

type ApiResponseType = IVocuherDataForAPIResponse | null;

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
    const journalId = await findUniqueJournalInPrisma(voucher.journalId);

    voucherUpdated = await updateVoucherByJournalIdInPrisma(journalId, companyId, voucher);
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
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ApiResponseType = null;
  try {
    const session = await getSession(req, res);
    const { companyId } = session;

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
  const { httpCode, result } = formatApiResponse<ApiResponseType>(statusMessage, payload);
  res.status(httpCode).json(result);
}
