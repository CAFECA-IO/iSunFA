import type { NextApiRequest, NextApiResponse } from 'next';
import { AccountResultStatus, AccountVoucher, isAccountVoucher } from '@/interfaces/account';
import version from '@/lib/version';
import { ResponseType } from '@/interfaces/api_response';
import { IVoucher, IVoucherMetaData } from '@/interfaces/voucher';

interface ResponseData extends ResponseType<AccountVoucher[] | AccountResultStatus> {}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Todo Murky (20240416): Get Images and check if Image exist
  switch (req.method) {
    case 'GET': {
      let { page = 1, limit = 10 } = req.query;
      page = Number(page);
      limit = Number(limit);
      // Info Murky (20240416): Check if page and limit are positive integers
      if (Number.isNaN(page) || page < 1 || Number.isNaN(limit) || limit < 1) {
        return res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Invalid page or limit, must be positive integer number',
        });
      }
      const mockVoucherMetaData: IVoucherMetaData = {
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
      };

      // const mock
      const mockVoucherData: IVoucher = {
        voucherIndex: '1',
        metadatas: [mockVoucherMetaData],
        lineItems: [
          {
            lineItemIndex: '2',
            account: '124124',
            description: 'WSTP會計師工作輔助幫手',
            debit: false,
            amount: 5,
          },
          {
            lineItemIndex: '3',
            account: '124124',
            description: '文中網路版主機授權費用',
            debit: false,
            amount: 8400,
          },
          {
            lineItemIndex: '4',
            account: '124124',
            description: '文中工作站授權費用',
            debit: false,
            amount: 6300,
          },
        ],
        invoiceIndex: '',
      };
      return res.status(200).json({
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'List of vouchers return successfully',
        payload: mockVoucherData,
      });
    }
    case 'POST': {
      // Todo Murky (20240416): Get Images and check if Image exist
      const { voucher } = req.body;
      // Info Murky (20240416): Check if voucher is valid
      if (Array.isArray(voucher) || !isAccountVoucher(voucher)) {
        return res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Invalid voucher',
        });
      }

      const data: AccountResultStatus = {
        resultId: '1229001',
        status: 'success',
      };

      const response: ResponseData = {
        powerby: `ISunFa api ${version}`,
        success: true,
        code: '200',
        message: 'Voucher is successfully generated',
        payload: data,
      };

      return res.status(200).json(response);
    }
    default: {
      return res.status(405).json({
        powerby: `ISunFa api ${version}`,
        success: false,
        code: '405',
        message: 'Method Not Allowed in vouchers api',
      });
    }
  }
}
