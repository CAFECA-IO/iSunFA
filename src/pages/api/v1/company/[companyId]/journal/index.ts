import { IJournal } from '@/interfaces/journal';
import { IResponseData } from '@/interfaces/response_data';
import { isIVoucher } from '@/interfaces/voucher';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import version from '@/lib/version';
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
        voucherType: 'expense',
        companyId: '1',
        companyName: '文中資訊股份有限公司',
        description:
          'WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300',
        totalPrice: 109725,
        taxPercentage: 5,
        fee: 0,
        paymentMethod: 'transfer',
        paymentPeriod: 'atOnce',
        installmentPeriod: 0,
        paymentStatus: 'unpaid',
        alreadyPaidAmount: 0,
        reason: 'haha',
        projectId: '0',
        project: 'baifa',
        contractId: '3',
        contract: 'asus',
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
        voucherType: 'expense',
        companyId: '1',
        companyName: '文中資訊股份有限公司',
        description:
          'WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300',
        totalPrice: 109725,
        taxPercentage: 5,
        fee: 0,
        paymentMethod: 'transfer',
        paymentPeriod: 'atOnce',
        installmentPeriod: 0,
        paymentStatus: 'unpaid',
        alreadyPaidAmount: 0,
        reason: 'haha',
        projectId: '0',
        project: 'baifa',
        contractId: '2',
        contract: 'asus',
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
  res: NextApiResponse<IResponseData<IJournal>>
) {
  try {
    if (req.method === 'GET') {
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'get voucher by id',
        payload: journalArray,
      });
    } else if (req.method === 'POST') {
      const { voucher } = req.body;
      if (!voucher) {
        throw new Error('INVALID_INPUT_PARAMETER');
      }
      if (!isIVoucher(voucher)) {
        throw new Error('Invalid input parameter not voucher');
      }
      // combine voucher to journal
      const journal: IJournal = {
        id: '3',
        tokenContract: '0xd38E5c25935291fFD51C9d66C3B7384494bb099A',
        tokenId: '8978922',
        ...voucher,
      };
      journalArray.push(journal);
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create journal successfully',
        payload: journal,
      });
    } else {
      throw new Error('METHOD_NOT_ALLOWED');
    }
  } catch (_error) {
    const error = _error as Error;
    const statusCode = errorMessageToErrorCode(error.message);
    res.status(statusCode).json({
      powerby: 'ISunFa api ' + version,
      success: false,
      code: String(statusCode),
      payload: {},
      message: error.message,
    });
  }
}
