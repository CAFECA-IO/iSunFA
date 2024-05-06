import { IJournal } from '@/interfaces/journal';
import { IResponseData } from '@/interfaces/response_data';
import { errorMessageToErrorCode } from '@/lib/utils/errorCode';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IJournal>>
) {
  try {
    if (req.method === 'GET') {
      const journal: IJournal[] = [
        {
          eventType: 'expense',
          date: '2024-03-27',
          reason: 'Equipment',
          companyId: '1',
          company: '優質辦公設備有限公司',
          description: 'Buy a new printer',
          totalPrice: 30000,
          paymentMethod: 'Transfer',
          paymentPeriod: 'At Once',
          paymentStatus: 'Paid',
          projectId: '1',
          project: 'BAIFA',
          contract: 'Contract123',
          voucher: {
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
        },
        {
          eventType: 'expense',
          date: '2024-03-27',
          reason: 'Equipment',
          companyId: '1',
          company: '優質辦公設備有限公司',
          description: 'Buy a new printer',
          totalPrice: 30000,
          paymentMethod: 'Transfer',
          paymentPeriod: 'At Once',
          paymentStatus: 'Paid',
          projectId: '1',
          project: 'BAIFA',
          contract: 'Contract123',
          voucher: {
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
        },
      ];
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'get voucher by id',
        payload: journal,
      });
    } else if (req.method === 'POST') {
      const { voucher } = req.body;
      if (!voucher) {
        throw new Error('Invalid input parameter');
      }
      // post voucher
      const journal: IJournal = {
        eventType: 'expense',
        date: '2024-03-27',
        reason: 'Equipment',
        companyId: '1',
        company: '優質辦公設備有限公司',
        description: 'Buy a new printer',
        totalPrice: 30000,
        paymentMethod: 'Transfer',
        paymentPeriod: 'At Once',
        paymentStatus: 'Paid',
        projectId: '1',
        project: 'BAIFA',
        contract: 'Contract123',
        voucher: {
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
      };
      res.status(200).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: '200',
        message: 'create journal successfully',
        payload: journal,
      });
    } else {
      throw new Error('Method Not Allowed');
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
