import { NextApiRequest, NextApiResponse } from 'next';

import { withRequestValidation } from '@/lib/utils/middleware';
import { ICertificate, ICertificateEntity } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { invoicePutApiUtils as putUtils } from '@/pages/api/v2/company/[companyId]/invoice/[invoiceId]/route_utils';
import { certificateAPIPostUtils } from '@/pages/api/v2/company/[companyId]/certificate/route_utils';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import { IVoucherEntity } from '@/interfaces/voucher';

const handlePutRequest: IHandleRequest<APIName.INVOICE_PUT_V2, ICertificate | null> = async ({
  query,
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificate | null = null;

  const { invoiceId } = query;
  const { userId } = session;
  const {
    certificateId,
    counterPartyId,
    inputOrOutput,
    date,
    no,
    currencyAlias,
    priceBeforeTax,
    taxType,
    taxRatio,
    taxPrice,
    totalPrice,
    type,
    deductible,
  } = body;
  const nowInSecond = getTimestampNow();

  try {
    const certificateFromPrisma = await putUtils.putInvoiceInPrisma({
      nowInSecond,
      invoiceId,
      certificateId,
      counterPartyId,
      inputOrOutput,
      date,
      no,
      currencyAlias,
      priceBeforeTax,
      taxType,
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

    const certificate: ICertificate = certificateAPIPostUtils.transformCertificateEntityToResponse(
      certificateReadyForTransfer
    );

    payload = certificate;
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
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
  PUT: (req, res) => withRequestValidation(APIName.INVOICE_PUT_V2, req, res, handlePutRequest),
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
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
    statusMessage = error.message;
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
