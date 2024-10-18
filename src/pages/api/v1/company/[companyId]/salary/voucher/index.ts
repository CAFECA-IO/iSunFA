import type { NextApiRequest, NextApiResponse } from 'next';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse, timestampInSeconds } from '@/lib/utils/common';
import { getSession } from '@/lib/utils/session';
import { getAdminByCompanyIdAndUserId } from '@/lib/utils/repo/admin.repo';
import { IFolder } from '@/interfaces/folder';
import { createLineItemInPrisma, getLatestVoucherNoInPrisma } from '@/lib/utils/repo/voucher.repo';
import {
  createSalaryRecordJournal,
  getInfoFromSalaryRecordLists,
  createVoucherFolder,
  createVoucherSalaryRecordFolderMapping,
} from '@/lib/utils/repo/salary_record.repo';
import { createVoucher } from '@/lib/utils/repo/beta_transition.repo';
import { EventType } from '@/constants/account';

function checkInput(salaryRecordsIdsList: number[], voucherType: string): boolean {
  return (
    Array.isArray(salaryRecordsIdsList) &&
    salaryRecordsIdsList.every((id) => typeof id === 'number') &&
    typeof voucherType === 'string'
  );
}

async function checkAuth(userId: number, companyId: number): Promise<boolean> {
  const admin = await getAdminByCompanyIdAndUserId(companyId, userId);
  return !!admin;
}

async function createLineItems(
  voucherType: string,
  voucherDataId: number,
  companyId: number,
  salaryRecordsIdsList: number[]
) {
  const { description, amount } = await getInfoFromSalaryRecordLists(
    salaryRecordsIdsList,
    voucherType
  );
  const lineItems = [
    {
      lineItemIndex: '',
      accountId: 10001264,
      account: '2201',
      amount,
      description,
      voucherId: voucherDataId,
      debit: false,
    },
    {
      lineItemIndex: '',
      accountId: 10000347,
      account: '6110',
      amount,
      description,
      voucherId: voucherDataId,
      debit: true,
    },
  ];
  await Promise.all(
    lineItems.map(async (lineItem) => {
      return createLineItemInPrisma(lineItem, voucherDataId, companyId);
    })
  );
}

async function handlePostRequest(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFolder | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFolder | null = null;

  const { salaryRecordsIdsList, voucherType } = req.body;
  const isValid = checkInput(salaryRecordsIdsList, voucherType);
  if (!isValid) {
    statusMessage = STATUS_MESSAGE.INVALID_INPUT_PARAMETER;
  } else {
    const session = await getSession(req, res);
    const { userId, companyId } = session;
    const isAuth = await checkAuth(userId, companyId);
    if (!isAuth) {
      statusMessage = STATUS_MESSAGE.FORBIDDEN;
    } else {
      // Info: (20240715 - Gibbs) create journal
      await createSalaryRecordJournal(companyId);
      // Info: (20240715 - Gibbs) create voucher
      const newVoucherNo = await getLatestVoucherNoInPrisma(companyId);
      const now = Date.now();
      const nowTimestamp = timestampInSeconds(now);
      const voucherData = await createVoucher(
        newVoucherNo,
        companyId,
        nowTimestamp,
        EventType.PAYMENT
      );
      // Info: (20240715 - Gibbs) create line items
      await createLineItems(voucherType, voucherData.id, companyId, salaryRecordsIdsList);
      // Info: (20240715 - Gibbs) create folder
      const voucherFolder = await createVoucherFolder(voucherType, newVoucherNo, companyId);
      // Info: (20240715 - Gibbs) voucher salary record folder mapping
      await createVoucherSalaryRecordFolderMapping(
        voucherFolder.id,
        salaryRecordsIdsList,
        voucherData.id
      );
      statusMessage = STATUS_MESSAGE.CREATED;
      payload = voucherFolder;
    }
  }
  return { statusMessage, payload };
}

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: IFolder | null;
  }>;
} = {
  POST: handlePostRequest,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IFolder | null>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IFolder | null = null;
  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    payload = null;
  } finally {
    const { httpCode, result } = formatApiResponse<IFolder | null>(statusMessage, payload);
    res.status(httpCode).json(result);
  }
}
