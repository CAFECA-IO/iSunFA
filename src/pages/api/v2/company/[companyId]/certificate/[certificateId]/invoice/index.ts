import { NextApiRequest, NextApiResponse } from 'next';

import { withRequestValidation } from '@/lib/utils/middleware';
import { ICertificate, ICertificateEntity } from '@/interfaces/certificate';
import { APIName } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { IHandleRequest } from '@/interfaces/handleRequest';
import { invoicePostApiUtils as postUtils } from '@/pages/api/v2/company/[companyId]/certificate/[certificateId]/invoice/route_utils';
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
import { getCompanyById } from '@/lib/utils/repo/company.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { certificateGetOneAPIUtils } from '@/pages/api/v2/company/[companyId]/certificate/[certificateId]/route_utils';

/**
 * Info: (20241127 - Murky)
 * @note
 * - taxable
 */
const handlePostRequest: IHandleRequest<APIName.INVOICE_POST_V2, ICertificate | null> = async ({
  query,
  body,
  session,
}) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificate | null = null;

  const { userId, teams } = session;
  const { certificateId } = query;
  const {
    counterParty,
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
    // Info: (20250417 - Shirley) 從 invoice 獲取 certificate ID
    if (!certificateId) {
      postUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'Certificate not found',
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    // Info: (20250417 - Shirley) 檢查 certificate 是否存在
    const isCertificateExistInDB = await postUtils.isCertificateExistInDB(certificateId);
    if (!isCertificateExistInDB) {
      postUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'Certificate not found',
        statusMessage: STATUS_MESSAGE.RESOURCE_NOT_FOUND,
      });
    }

    // Info: (20250417 - Shirley) 獲取 certificate ，從中獲取公司ID
    const certificateData =
      await certificateGetOneAPIUtils.getCertificateByIdFromPrisma(certificateId);
    const { companyId } = certificateData;

    // Info: (20250417 - Shirley) 獲取公司以檢查團隊權限
    const company = await getCompanyById(companyId);
    if (!company) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const { teamId: companyTeamId } = company;
    if (!companyTeamId) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const userTeam = teams?.find((team) => team.id === companyTeamId);
    if (!userTeam) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam?.role as TeamRole,
      canDo: TeamPermissionAction.CREATE_CERTIFICATE,
    });

    if (!assertResult.can) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    const noteEmbedCounterParty = postUtils.embedCounterPartyIntoNote(no, counterParty);

    const currencyAlias = await postUtils.getCurrencyFromSetting(userId);

    const certificateFromPrisma = await postUtils.postInvoiceInPrisma({
      companyId,
      nowInSecond,
      certificateId,
      inputOrOutput,
      date,
      no: noteEmbedCounterParty,
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
    // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，invoice 功能跟 counterParty 相關的資料之後需要一一檢查或修改
    const invoiceEntity = certificateAPIPostUtils.initInvoiceEntity(certificateFromPrisma, {
      nowInSecond,
    });

    // Info: (20241223 - Murky) Temperary Patch name and taxId of counterParty
    invoiceEntity.counterParty.name = counterParty.name;
    invoiceEntity.counterParty.taxId = counterParty.taxId;

    const certificateEntity = certificateAPIPostUtils.initCertificateEntity(certificateFromPrisma);

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

    const certificateResponse: ICertificate =
      certificateAPIGetListUtils.transformCertificateEntityToResponse(certificateReadyForTransfer);

    payload = certificateResponse;
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
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
  POST: (req) => withRequestValidation(APIName.INVOICE_POST_V2, req, handlePostRequest),
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
    const errorInfo = {
      userId,
      errorType: error.name,
      errorMessage: error.message,
    };
    loggerError(errorInfo);
  }
  const { httpCode, result } = formatApiResponse<APIResponse>(statusMessage, payload);
  res.status(httpCode).json(result);
}
