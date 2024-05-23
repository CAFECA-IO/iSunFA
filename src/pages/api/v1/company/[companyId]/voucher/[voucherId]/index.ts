import { AICH_URI } from '@/constants/config';
import { IResponseData } from '@/interfaces/response_data';
import { IVoucher } from '@/interfaces/voucher';
import { NextApiRequest, NextApiResponse } from 'next';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { formatApiResponse } from '@/lib/utils/common';
import { isIVoucher } from '@/lib/utils/type_guard/voucher';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<IVoucher | null>>
) {
  try {
    if (req.method === 'GET') {
      const { voucherId } = req.query;

      // Info Murky (20240416): Check if resultId is string
      if (typeof voucherId !== 'string' || !voucherId || Array.isArray(voucherId)) {
        throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
      }

      const fetchResult = await fetch(`${AICH_URI}/api/v1/vouchers/${voucherId}/result`);

      if (!fetchResult.ok) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_AICH_FAILED);
      }

      const rawVoucher: IVoucher = (await fetchResult.json()).payload;
      if (!rawVoucher) {
        const { httpCode, result } = formatApiResponse<IVoucher>(
          STATUS_MESSAGE.SUCCESS_GET,
          rawVoucher
        );
        res.status(httpCode).json(result);
      }

      if (!isIVoucher(rawVoucher)) {
        throw new Error(STATUS_MESSAGE.BAD_GATEWAY_DATA_FROM_AICH_IS_INVALID_TYPE);
      }

      // Depreciate: AICH需要match這邊的type
      // const { voucherIndex, metadatas, lineItems } = rawVoucher;
      // const {vendorOrSupplier, paymentReason, invoiceId, ...rawMetadata } = metadatas[0];
      // const trueMetadatas: IVoucherMetaData = {
      //   ...rawMetadata,
      //   companyId: '810af23',
      //   companyName:vendorOrSupplier,
      //   reason: paymentReason,
      //   contract: 'ISunFa開發',
      //   project: 'ISunFa',
      // };
      // const voucher: IVoucher = {
      //   voucherIndex,
      //   metadatas: [trueMetadatas],
      //   lineItems,
      //   invoiceIndex: invoiceId,
      // };

      const { httpCode, result } = formatApiResponse<IVoucher>(
        STATUS_MESSAGE.SUCCESS_GET,
        rawVoucher
      );
      res.status(httpCode).json(result);
    } else {
      throw new Error(STATUS_MESSAGE.METHOD_NOT_ALLOWED);
    }
  } catch (_error) {
    const error = _error as Error;
    const { httpCode, result } = formatApiResponse<IVoucher>(error.message, {} as IVoucher);
    res.status(httpCode).json(result);
  }
}
