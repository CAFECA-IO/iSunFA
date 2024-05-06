import { AICH_URI } from '@/constants/config';
import { AccountResultStatus } from '@/interfaces/account';
import { isIInvoiceWithPaymentMethod } from '@/interfaces/invoice';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucher } from '@/interfaces/voucher';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IVoucher | AccountResultStatus>>
) {
  try {
    // Depreciate Murky (20240416): 這邊應該要搬到Journal
    // if (req.method === 'GET') {
    //   const voucher: IVoucher[] = [
    //     {
    //       voucherIndex: '1',
    //       metadatas: [
    //         {
    //           date: 1713139200000,
    //           voucherType: 'expense',
    //           companyId: '1',
    //           companyName: '文中資訊股份有限公司',
    //           description:
    //             'WSTP會計師工作輔助幫手: 88725, 文中網路版主機授權費用: 8400, 文中工作站授權費用: 6300',
    //           totalPrice: 109725,
    //           taxPercentage: 5,
    //           fee: 0,
    //           paymentMethod: 'transfer',
    //           paymentPeriod: 'atOnce',
    //           installmentPeriod: 0,
    //           paymentStatus: 'unpaid',
    //           alreadyPaidAmount: 0,
    //         },
    //       ],
    //       lineItems: [
    //         {
    //           lineItemIndex: '2',
    //           account: '124124',
    //           description: 'WSTP會計師工作輔助幫手',
    //           debit: false,
    //           amount: 5,
    //         },
    //         {
    //           lineItemIndex: '3',
    //           account: '124124',
    //           description: '文中網路版主機授權費用',
    //           debit: false,
    //           amount: 8400,
    //         },
    //         {
    //           lineItemIndex: '4',
    //           account: '124124',
    //           description: '文中工作站授權費用',
    //           debit: false,
    //           amount: 6300,
    //         },
    //       ],
    //     },
    //   ];
    //   res.status(200).json({
    //     powerby: 'ISunFa api ' + version,
    //     success: true,
    //     code: '200',
    //     message: 'get voucher by id',
    //     payload: voucher,
    //   });
    // } else if (req.method === 'POST') {
    if (req.method === 'POST') {
      const { invoices } = req.body;
      // Info Murky (20240416): Check if invoices is array and is Invoice type
      if (!Array.isArray(invoices) || !invoices.every(isIInvoiceWithPaymentMethod)) {
        res.status(400).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: '400',
          message: 'Invalid invoices',
          payload: {},
        });
      }

      const result = await fetch(`${AICH_URI}/api/v1/vouchers/upload_invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoices),
      });

      if (!result.ok) {
        res.status(result.status).json({
          powerby: `ISunFa api ${version}`,
          success: false,
          code: String(result.status),
          message:
            'Failed to post invoice in vouchers, error happened in Sending data to AICH server',
          payload: {},
        });
      }

      const resultStatus: AccountResultStatus = (await result.json()).payload;

      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create voucher',
        payload: resultStatus,
      });
    } else {
      res.status(405).json({
        powerby: 'ISunFa api ' + version,
        success: false,
        code: '405',
        message: 'Method Not Allowed',
        payload: {},
      });
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
