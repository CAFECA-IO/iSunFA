import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName } from '@/constants/api_connection';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { ICertificate, ICertificateEntity } from '@/interfaces/certificate';
import { certificateGetOneAPIUtils } from '@/pages/api/v2/company/[companyId]/certificate/[certificateId]/route_utils';
import { loggerError } from '@/lib/utils/logger_back';
import {
  certificateAPIPostUtils as postUtils,
  certificateAPIGetListUtils as getListUtils,
} from '@/pages/api/v2/company/[companyId]/certificate/route_utils';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import { IVoucherEntity } from '@/interfaces/voucher';

type APIResponse = ICertificate | null;

export const handleGetRequest: IHandleRequest<APIName.CERTIFICATE_GET_V2, ICertificate> = async ({
  query,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificate | null = null;
  const { certificateId } = query;
  const { userId } = session;
  const nowInSecond = getTimestampNow();
  try {
    const certificateFromPrisma =
      await certificateGetOneAPIUtils.getCertificateByIdFromPrisma(certificateId);
    const fileEntity = postUtils.initFileEntity(certificateFromPrisma);
    const userCertificateEntities = postUtils.initUserCertificateEntities(certificateFromPrisma);
    const uploaderEntity = postUtils.initUploaderEntity(certificateFromPrisma);
    const voucherCertificateEntity =
      postUtils.initVoucherCertificateEntities(certificateFromPrisma);
    const invoiceEntity = postUtils.initInvoiceEntity(certificateFromPrisma, {
      nowInSecond,
    });
    const certificateEntity = postUtils.initCertificateEntity(certificateFromPrisma);

    const certificateReadyForTransfer: ICertificateEntity & {
      invoice: IInvoiceEntity & { counterParty: ICounterPartyEntity };
      file: IFileEntity;
      uploader: IUserEntity & { imageFile: IFileEntity };
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

    const certificate: ICertificate = getListUtils.transformCertificateEntityToResponse(
      certificateReadyForTransfer
    );

    payload = certificate;

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (_error) {
    const error = _error as Error;
    const errorInfo = {
      userId,
      errorType: error.name,
      errorMessage: error.message,
    };
    loggerError(errorInfo);
  }

  return {
    statusMessage,
    payload,
  };
};

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req) => withRequestValidation(APIName.CERTIFICATE_GET_V2, req, handleGetRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;

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
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
