import { NextApiRequest, NextApiResponse } from 'next';

import { withRequestValidation } from '@/lib/utils/middleware';
import { ICertificate, ICertificateEntity } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { invoicePostApiUtils as postUtils } from '@/pages/api/v2/company/[companyId]/invoice/route_utils';
import {
  certificateAPIGetListUtils,
  certificateAPIPostUtils,
} from '@/pages/api/v2/company/[companyId]/certificate/route_utils';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import { IVoucherEntity } from '@/interfaces/voucher';
import { InvoiceTaxType } from '@/constants/invoice';

/**
 * Info: (20241127 - Murky)
 * @note
 * - taxable
 */
const handlePostRequest: IHandleRequest<APIName.INVOICE_POST_V2, ICertificate | null> = async ({
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificate | null = null;

  const { userId } = session;
  const {
    certificateId,
    counterPartyId,
    inputOrOutput,
    date,
    no,
    // currencyAlias,
    priceBeforeTax,
    // taxType,
    taxRatio,
    taxPrice,
    totalPrice,
    type,
    deductible,
  } = body;
  const nowInSecond = getTimestampNow();

  try {
    const isCertificateExistInDB = await postUtils.isCertificateExistInDB(certificateId);
    if (!isCertificateExistInDB) {
      postUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'Certificate not found',
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    const isCounterPartyExistInDB = await postUtils.isCounterPartyExistInDB(counterPartyId);
    if (!isCounterPartyExistInDB) {
      postUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'CounterParty not found',
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    const currencyAlias = await postUtils.getCurrencyFromSetting(userId);

    const certificateFromPrisma = await postUtils.postInvoiceInPrisma({
      nowInSecond,
      certificateId,
      counterPartyId,
      inputOrOutput,
      date,
      no,
      currencyAlias,
      priceBeforeTax,
      taxType: InvoiceTaxType.TAXABLE,
      taxRatio,
      taxPrice,
      totalPrice,
      type,
      deductible,
    });

    const fileEntity = certificateAPIPostUtils.initFileEntity(certificateFromPrisma);
    const userCertificateEntities =
      certificateAPIPostUtils.initUserCertificateEntities(certificateFromPrisma);
    const uploaderEntity = certificateAPIPostUtils.initUploaderEntity(certificateFromPrisma);
    const voucherCertificateEntity =
      certificateAPIPostUtils.initVoucherCertificateEntities(certificateFromPrisma);
    const invoiceEntity = certificateAPIPostUtils.initInvoiceEntity(certificateFromPrisma, {
      nowInSecond,
    });
    const certificateEntity = certificateAPIPostUtils.initCertificateEntity(certificateFromPrisma);

    const certificateReadyForTransfer: ICertificateEntity & {
      invoice: IInvoiceEntity & { counterParty: ICounterPartyEntity };
      file: IFileEntity;
      uploader: IUserEntity;
      userCertificates: IUserCertificateEntity[];
      vouchers: IVoucherEntity[];
    } = {
      ...certificateEntity,
      invoice: invoiceEntity,
      file: fileEntity,
      uploader: uploaderEntity,
      vouchers: voucherCertificateEntity.map((voucherCertificate) => voucherCertificate.voucher),
      userCertificates: userCertificateEntities,
    };

    const certificate: ICertificate =
      certificateAPIGetListUtils.transformCertificateEntityToResponse(certificateReadyForTransfer);

    payload = certificate;
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    const logger = loggerError(userId, error.name, error.message);
    logger.error(error);
  }

  return {
    statusMessage,
    payload,
  };
};

type APIResponse = ICertificate | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  POST: (req, res) => withRequestValidation(APIName.INVOICE_POST_V2, req, res, handlePostRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  const userId: number = -1;

  try {
    const handleRequest = methodHandlers[req.method || ''];
    if (handleRequest) {
      ({ statusMessage, payload } = await handleRequest(req, res));
    } else {
      statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
    }
  } catch (_error) {
    const error = _error as Error;
    const logger = loggerError(userId, error.name, error.message);
    logger.error(error);
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
