import { NextApiRequest, NextApiResponse } from 'next';
import { APIName, HttpMethod } from '@/constants/api_connection';
import { IResponseData } from '@/interfaces/response_data';
import { STATUS_MESSAGE } from '@/constants/status_code';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { ICertificate, ICertificateEntity } from '@/interfaces/certificate';
import { invoicePostApiUtils as postUtils } from '@/pages/api/v2/account_book/[accountBookId]/certificate/[certificateId]/invoice/route_utils';
import {
  certificateAPIGetListUtils,
  certificateAPIPostUtils,
} from '@/pages/api/v2/account_book/[accountBookId]/certificate/route_utils';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { IUserEntity } from '@/interfaces/user';
import { IVoucherEntity } from '@/interfaces/voucher';
import { InvoiceTaxType } from '@/constants/invoice';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import { certificateGetOneAPIUtils } from '@/pages/api/v2/account_book/[accountBookId]/certificate/[certificateId]/route_utils';
import {
  checkRequestData,
  checkSessionUser,
  checkUserAuthorization,
  logUserAction,
} from '@/lib/utils/middleware';
import { getSession } from '@/lib/utils/session';
import { HTTP_STATUS } from '@/constants/http';
import { validateOutputData } from '@/lib/utils/validator';

/**
 * Info: (20241127 - Murky)
 * @note
 * - taxable
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificate | null = null;

  await checkSessionUser(session, APIName.INVOICE_POST_V2, req);
  await checkUserAuthorization(APIName.INVOICE_POST_V2, req, session);

  // Info: (20250430 - Shirley) Validate request data
  const { query, body } = checkRequestData(APIName.INVOICE_POST_V2, req, session);
  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

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
    const { accountBookId } = certificateData;

    // Info: (20250417 - Shirley) 獲取公司以檢查團隊權限
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
      canDo: TeamPermissionAction.CREATE_CERTIFICATE,
    });

    if (!assertResult.can) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    const noteEmbedCounterParty = postUtils.embedCounterPartyIntoNote(no, counterParty);

    const currencyAlias = await postUtils.getCurrencyFromSetting(userId);

    const certificateFromPrisma = await postUtils.postInvoiceInPrisma({
      accountBookId,
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
      vouchers: IVoucherEntity[];
    } = {
      ...certificateEntity,
      invoice: invoiceEntity,
      file: fileEntity,
      uploader: uploaderEntity,
      vouchers: voucherCertificateEntity.map((voucherCertificate) => voucherCertificate.voucher),
    };

    const certificateResponse: ICertificate =
      certificateAPIGetListUtils.transformCertificateEntityToResponse(certificateReadyForTransfer);

    payload = certificateResponse;
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

  // Info: (20250430 - Shirley) Validate output data
  const { isOutputDataValid, outputData } = validateOutputData(APIName.INVOICE_POST_V2, payload);

  if (!isOutputDataValid) {
    statusMessage = STATUS_MESSAGE.INVALID_OUTPUT_DATA;
    payload = null;
  } else {
    payload = outputData;
  }

  const response = formatApiResponse(statusMessage, payload);
  return { response, statusMessage };
};

type APIResponse = ICertificate | null;

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
  let apiName: APIName = APIName.INVOICE_POST_V2;
  const session = await getSession(req);

  try {
    // Info: (20250430 - Shirley) Handle different HTTP methods
    switch (method) {
      case HttpMethod.POST:
        apiName = APIName.INVOICE_POST_V2;
        ({ response, statusMessage } = await handlePostRequest(req));
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
