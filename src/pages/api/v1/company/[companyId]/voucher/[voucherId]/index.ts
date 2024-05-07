import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucher, IVoucherMetaData } from '@/interfaces/voucher';
import { errorMessageToErrorCode } from '@/lib/utils/error_code';
import { RESPONSE_STATUS_CODE } from '@/constants/status_code';
import version from '@/lib/version';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IVoucher>>
) {
  try {
    if (req.method === 'GET') {
      if (!req.query.voucherId) {
        throw new Error('INVALID_INPUT_PARAMETER');
      }

      const result = await fetch(`${AICH_URI}/api/v1/vouchers/${req.query.voucherId}/result`);

      if (!result.ok) {
        throw new Error('GATEWAY_TIMEOUT');
      }

      const { voucherIndex, metadatas, lineItems } = (await result.json()).payload;

      const { venderOrSupplyer, paymentReason, invoiceId, ...rawMetadata } = metadatas[0];
      const trueMetadatas: IVoucherMetaData = {
        ...rawMetadata,
        companyId: '810af23',
        companyName: venderOrSupplyer,
        reason: paymentReason,
        contract: 'ISunFa開發',
        project: 'ISunFa',
      };
      const voucher: IVoucher = {
        voucherIndex,
        metadatas: [trueMetadatas],
        lineItems,
        invoiceIndex: invoiceId,
      };

      res.status(RESPONSE_STATUS_CODE.success).json({
        powerby: 'ISunFa api ' + version,
        success: true,
        code: String(RESPONSE_STATUS_CODE.success),
        message: 'get voucher analyzation result by id',
        payload: voucher,
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
