import { STATUS_MESSAGE } from '@/constants/status_code';
import { PaymentPeriodType, PaymentStatusType, VoucherType } from '@/constants/account';
import { IJournal } from '@/interfaces/journal';
import { IResponseData } from '@/interfaces/response_data';
import { isIVoucher } from '@/interfaces/voucher';
import { formatApiResponse } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';

export const journalArray: IJournal[] = [
  {
    id: '1',
    tokenContract: '0xd38E5c25935291fFD51C9d66C3B7384494bb099A',
    tokenId: '8978922',
    voucherIndex: '20240402299',
    invoiceIndex: '20240402299',
    metadatas: [
      {
        date: 1713139200000,
        voucherType: VoucherType.Expense,
        companyId: '1',
        companyName: '文中資訊股份有限公司',
        description:
          'WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300',
        reason: '記帳系統',
        projectId: '0',
        project: 'baifa',
        contractId: '3',
        contract: 'asus',
        payment: {
          isRevenue: false,
          price: 109725,
          hasTax: true,
          taxPercentage: 5,
          hasFee: false,
          fee: 0,
          paymentMethod: 'transfer',
          paymentPeriod: PaymentPeriodType.AtOnce,
          installmentPeriod: 0,
          paymentAlreadyDone: 0,
          paymentStatus: PaymentStatusType.Unpaid,
          progress: 0,
        },
      },
    ],
    lineItems: [
      {
        lineItemIndex: '20240402001',
        account: '購買軟體',
        description:
          'WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300',
        debit: true,
        amount: 10450,
      },
      {
        lineItemIndex: '20240402002',
        account: '銀行存款',
        description:
          'WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300',
        debit: false,
        amount: 10450,
      },
    ],
  },
  {
    id: '2',
    tokenContract: '0xd38E5c25935291fFD51C9d66C3B7384494bb099A',
    tokenId: '8978922',
    voucherIndex: '20240402299',
    invoiceIndex: '20240402299',
    metadatas: [
      {
        date: 1713139200000,
        voucherType: VoucherType.Expense,
        companyId: '1',
        companyName: '文中資訊股份有限公司',
        description:
          'WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300',
        reason: '記帳系統',
        projectId: '0',
        project: 'baifa',
        contractId: '3',
        contract: 'asus',
        payment: {
          isRevenue: false,
          price: 109725,
          hasTax: true,
          taxPercentage: 5,
          hasFee: false,
          fee: 0,
          paymentMethod: 'transfer',
          paymentPeriod: PaymentPeriodType.AtOnce,
          installmentPeriod: 0,
          paymentAlreadyDone: 0,
          paymentStatus: PaymentStatusType.Unpaid,
          progress: 0,
        },
      },
    ],
    lineItems: [
      {
        lineItemIndex: '20240402001',
        account: '購買軟體',
        description:
          'WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300',
        debit: true,
        amount: 10450,
      },
      {
        lineItemIndex: '20240402002',
        account: '銀行存款',
        description:
          'WSTP會計師工作輔助幫手: 88,725, 文中網路版主機授權費用: 8,400, 文中工作站授權費用: 6,300',
        debit: false,
        amount: 10450,
      },
    ],
  },
];
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal | IJournal[]>>
) {
  try {
    if (req.method === 'GET') {
      if (!journalArray) {
        throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
      }

      const { httpCode, result } = formatApiResponse<IJournal[]>(
        STATUS_MESSAGE.SUCCESS_LIST,
        journalArray
      );

      res.status(httpCode).json(result);
    } else if (req.method === 'POST') {
      const { voucher } = req.body;
      // eslint-disable-next-line no-console
      console.log('voucher', voucher, isIVoucher(voucher));
      if (!voucher || !isIVoucher(voucher)) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_VOUCHER_BODY_TO_JOURNAL);
      }

      // combine voucher to journal
      const journal: IJournal = {
        id: '3',
        tokenContract: '0xd38E5c25935291fFD51C9d66C3B7384494bb099A',
        tokenId: '8978922',
        ...voucher,
      };
      journalArray.push(journal);

      const { httpCode, result } = formatApiResponse<IJournal>(STATUS_MESSAGE.CREATED, journal);

      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IJournal>(error.message, {} as IJournal);
    res.status(httpCode).json(result);
  }
}
