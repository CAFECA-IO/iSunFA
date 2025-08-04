import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { loggerError } from '@/lib/utils/logger_back';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';
import { ICertificate, ICertificateEntity } from '@/interfaces/certificate';
import { certificateGetOneAPIUtils } from '@/pages/api/v2/account_book/[accountBookId]/certificate/[certificateId]/route_utils';
import {
  certificateAPIPostUtils as postUtils,
  certificateAPIGetListUtils as getListUtils,
} from '@/pages/api/v2/account_book/[accountBookId]/certificate/route_utils';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IUserEntity } from '@/interfaces/user';
import { IVoucherEntity } from '@/interfaces/voucher';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';

type APIResponse = ICertificate | null;

const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificate | null = null;

  await checkSessionUser(session, APIName.CERTIFICATE_GET_V2, req);
  await checkUserAuthorization(APIName.CERTIFICATE_GET_V2, req, session);

  // Info: (20250430 - Shirley) Validate request data
  const { query } = checkRequestData(APIName.CERTIFICATE_GET_V2, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { certificateId } = query;
  const nowInSecond = getTimestampNow();

  try {
    // Info: (20250417 - Shirley) 先獲取憑證資料
    const certificateFromPrisma =
      await certificateGetOneAPIUtils.getCertificateByIdFromPrisma(certificateId);

    // Info: (20250417 - Shirley) 添加團隊權限檢查
    const { accountBookId } = certificateFromPrisma;
    const company = await getCompanyById(accountBookId);
    if (!company) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const { teamId: companyTeamId } = company;
    if (!companyTeamId) {
      throw new Error(STATUS_MESSAGE.RESOURCE_NOT_FOUND);
    }

    const userTeam = session.teams?.find((team) => team.id === companyTeamId);
    if (!userTeam) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    const assertResult = convertTeamRoleCanDo({
      teamRole: userTeam?.role as TeamRole,
      canDo: TeamPermissionAction.VIEW_CERTIFICATE,
    });

    if (!assertResult.can) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    // Info: (20250417 - Shirley) 權限檢查通過後繼續處理資料
    const fileEntity = postUtils.initFileEntity(certificateFromPrisma);
    const uploaderEntity = postUtils.initUploaderEntity(certificateFromPrisma);
    const voucherCertificateEntity =
      postUtils.initVoucherCertificateEntities(certificateFromPrisma);
    // TODO: (20250114 - Shirley) DB migration 為了讓功能可以使用的暫時解法，invoice 功能跟 counterParty 相關的資料之後需要一一檢查或修改
    const invoiceEntity = postUtils.initInvoiceEntity(certificateFromPrisma, {
      nowInSecond,
    });
    const certificateEntity = postUtils.initCertificateEntity(certificateFromPrisma);

    const certificateReadyForTransfer: ICertificateEntity & {
      invoice: IInvoiceEntity & { counterParty: ICounterPartyEntity };
      file: IFileEntity;
      uploader: IUserEntity & { imageFile: IFileEntity };
      vouchers: IVoucherEntity[];
    } = {
      ...certificateEntity,
      invoice: invoiceEntity,
      file: fileEntity,
      uploader: uploaderEntity,
      vouchers: voucherCertificateEntity.map((voucherCertificate) => voucherCertificate.voucher),
    };

    const certificate: ICertificate = getListUtils.transformCertificateEntityToResponse(
      certificateReadyForTransfer
    );

    payload = certificate;

    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  } catch (_error) {
    const error = _error as Error;
    statusMessage = error.message;
    loggerError({
      userId,
      errorType: error.name,
      errorMessage: error.message,
    });
  }

  // Info: (20250430 - Shirley) Validate output data
  const { isOutputDataValid, outputData } = validateOutputData(APIName.CERTIFICATE_GET_V2, payload);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    payload = null;
  } else {
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

/**
 * Info: (20250430 - Shirley) Export default handler function
 * This follows the flat coding style API pattern:
 * 1. Define a switch-case for different HTTP methods
 * 2. Call the appropriate handler based on method
 * 3. Handle errors and return consistent response format
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  const method = req.method || HttpMethod.GET;
  let httpCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let result;
  let response;
  let statusMessage: string = STATUS_MESSAGE.INTERNAL_SERVICE_ERROR;
  let apiName: APIName = APIName.CERTIFICATE_GET_V2;
  const session = await getSession(req);

  try {
    // Info: (20250430 - Shirley) Handle different HTTP methods
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.CERTIFICATE_GET_V2;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      default:
        statusMessage = STATUS_MESSAGE.METHOD_NOT_ALLOWED;
        ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
        break;
    }
  } catch (error) {
    const err = error as Error;
    statusMessage = STATUS_MESSAGE[err.name as keyof typeof STATUS_MESSAGE] || err.message;
    ({ httpCode, result } = formatApiResponse<null>(statusMessage, null));
  }

  await logUserAction(session, apiName, req, statusMessage);
  res.status(httpCode).json(result);
}
