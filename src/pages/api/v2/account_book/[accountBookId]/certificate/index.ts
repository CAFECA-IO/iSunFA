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
import {
  ICertificate,
  ICertificateEntity,
  ICertificateListSummary,
} from '@/interfaces/certificate';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { IFileEntity } from '@/interfaces/file';
import { IUserEntity } from '@/interfaces/user';
import { IPaginatedData } from '@/interfaces/pagination';
import {
  certificateAPIPostUtils as postUtils,
  certificateAPIGetListUtils as getListUtils,
  certificateAPIDeleteMultipleUtils as deleteUtils,
} from '@/pages/api/v2/account_book/[accountBookId]/certificate/route_utils';
import { IVoucherEntity } from '@/interfaces/voucher';
import { getCompanyById } from '@/lib/utils/repo/account_book.repo';
import { convertTeamRoleCanDo } from '@/lib/shared/permission';
import { TeamRole } from '@/interfaces/team';
import { TeamPermissionAction } from '@/interfaces/permissions';
import {
  transformWithIncomplete,
  summarizeIncompleteCertificates,
} from '@/lib/utils/repo/certificate.repo';

type APIResponse = ICertificate[] | IPaginatedData<ICertificate[]> | number[] | null;

/**
 * Info: (20241126 - Murky)
 * @todo
 * - 符合FilterSection公版
 * - 需要讀取withVoucher, withoutVoucher unRead的數量
 * - 要從account setting讀取currency
 * - 要Post UserCertificate Read
 */
const handleGetRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ICertificate[]> | null = null;

  await checkSessionUser(session, APIName.CERTIFICATE_LIST_V2, req);
  await checkUserAuthorization(APIName.CERTIFICATE_LIST_V2, req, session);

  // Info: (20250430 - Shirley) Validate request data
  const { query } = checkRequestData(APIName.CERTIFICATE_LIST_V2, req, session);
  if (query === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { accountBookId, page, pageSize, startDate, endDate, tab, sortOption, searchQuery, type } =
    query;

  try {
    // Info: (20250417 - Shirley) 添加團隊權限檢查
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

    const nowInSecond = getTimestampNow();

    const paginationCertificates = await getListUtils.getPaginatedCertificateList({
      tab,
      accountBookId,
      startDate,
      endDate,
      page,
      pageSize,
      sortOption,
      searchQuery,
      type,
      isDeleted: false,
    });

    const { data: certificatesFromPrisma, ...pagination } = paginationCertificates;

    const currency = await getListUtils.getCurrencyFromSetting(accountBookId);

    const certificatesWithoutIncomplete = certificatesFromPrisma.map((certificateFromPrisma) => {
      const fileEntity = postUtils.initFileEntity(certificateFromPrisma);
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
        vouchers: IVoucherEntity[];
      } = {
        ...certificateEntity,
        invoice: invoiceEntity,
        file: fileEntity,
        uploader: uploaderEntity,
        vouchers: voucherCertificateEntity.map((v: { voucher: IVoucherEntity }) => v.voucher),
      };

      return getListUtils.transformCertificateEntityToResponse(certificateReadyForTransfer);
    });

    const certificates = transformWithIncomplete(certificatesWithoutIncomplete);

    const incompleteSummary = summarizeIncompleteCertificates(certificates);

    const totalInvoicePrice = await getListUtils.getSumOfTotalInvoicePrice({
      accountBookId,
      startDate,
      endDate,
      searchQuery,
      type,
      tab,
      isDeleted: false,
    });

    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    const summary: ICertificateListSummary = {
      totalInvoicePrice,
      incomplete: incompleteSummary,
      currency,
    };

    getListUtils.sortCertificateList(certificates, { sortOption, tab });

    payload = {
      page: pagination.page,
      totalPages: pagination.totalPages,
      totalCount: pagination.totalCount,
      pageSize: pagination.pageSize,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
      sort: sortOption,
      data: certificates,
      note: JSON.stringify(summary),
    };
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
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.CERTIFICATE_LIST_V2,
    payload
  );

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
 * Info: (20241122 - Murky)
 * @todo
 * - 輸入companyId, fileId
 * - 回傳 ICertificate
 * - 記得放在Pusher CERTIFICATE_EVENT.CREATE
 */
const handlePostRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificate[] | null = null;

  await checkSessionUser(session, APIName.CERTIFICATE_POST_V2, req);
  await checkUserAuthorization(APIName.CERTIFICATE_POST_V2, req, session);

  // Info: (20250430 - Shirley) Validate request data
  const { query, body } = checkRequestData(APIName.CERTIFICATE_POST_V2, req, session);
  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { fileIds } = body;
  const { accountBookId } = query;

  try {
    // Info: (20250417 - Shirley) 添加團隊權限檢查
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

    const nowInSecond = getTimestampNow();

    const certificates: ICertificate[] = await Promise.all(
      fileIds.map(async (fileId) => {
        const certificateFromPrisma = await postUtils.createCertificateInPrisma({
          nowInSecond,
          accountBookId,
          uploaderId: userId,
          fileId,
        });

        const fileEntity = postUtils.initFileEntity(certificateFromPrisma);
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
          vouchers: IVoucherEntity[];
        } = {
          ...certificateEntity,
          invoice: invoiceEntity,
          file: fileEntity,
          uploader: uploaderEntity,
          vouchers: voucherCertificateEntity.map(
            (voucherCertificate: { voucher: IVoucherEntity }) => voucherCertificate.voucher
          ),
        };

        const certificate: ICertificate = postUtils.transformCertificateEntityToResponse(
          certificateReadyForTransfer
        );

        postUtils.triggerPusherNotification(certificate, {
          accountBookId,
        });

        return certificate;
      })
    );
    // Info: (20241121 - tzuhan) @Murkey 這是 createCertificate 成功h後，後端使用 pusher 的傳送 CERTIFICATE_EVENT.CREATE 的範例
    /**
     * CERTIFICATE_EVENT.CREATE 傳送的資料格式為 { message: string }, 其中 string 為 SON.stringify(certificate as ICertificate)
     */

    statusMessage = STATUS_MESSAGE.CREATED;
    payload = certificates;
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
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.CERTIFICATE_POST_V2,
    payload
  );

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
 * Info: (20241205 - Murky)
 * 1. 根據前端傳來的 id 陣列
 * 2. 對那些 certificate 執行 softDelete (isDeleted = true)
 * 3. 回傳被刪除的 id list
 */
const handleDeleteRequest = async (req: NextApiRequest) => {
  const session = await getSession(req);
  const { userId } = session;
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number[] | null = null;

  await checkSessionUser(session, APIName.CERTIFICATE_DELETE_MULTIPLE_V2, req);
  await checkUserAuthorization(APIName.CERTIFICATE_DELETE_MULTIPLE_V2, req, session);

  // Info: (20250430 - Shirley) Validate request data
  const { query, body } = checkRequestData(APIName.CERTIFICATE_DELETE_MULTIPLE_V2, req, session);
  if (query === null || body === null) {
    throw new Error(STATUS_MESSAGE.INVALID_INPUT_PARAMETER);
  }

  const { certificateIds } = body;
  const { accountBookId } = query;

  try {
    // Info: (20250417 - Shirley) 添加團隊權限檢查
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
      canDo: TeamPermissionAction.DELETE_CERTIFICATE,
    });

    if (!assertResult.can) {
      throw new Error(STATUS_MESSAGE.FORBIDDEN);
    }

    const deletedCertificateIdList = await deleteUtils.deleteCertificates({
      certificateIds,
      nowInSecond: getTimestampNow(),
    });

    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = deletedCertificateIdList;
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
  const { isOutputDataValid, outputData } = validateOutputData(
    APIName.CERTIFICATE_DELETE_MULTIPLE_V2,
    payload
  );

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
  let apiName: APIName = APIName.CERTIFICATE_LIST_V2;
  const session = await getSession(req);

  try {
    // Info: (20250430 - Shirley) Handle different HTTP methods
    switch (method) {
      case HttpMethod.GET:
        apiName = APIName.CERTIFICATE_LIST_V2;
        ({ response, statusMessage } = await handleGetRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.POST:
        apiName = APIName.CERTIFICATE_POST_V2;
        ({ response, statusMessage } = await handlePostRequest(req));
        ({ httpCode, result } = response);
        break;
      case HttpMethod.DELETE:
        apiName = APIName.CERTIFICATE_DELETE_MULTIPLE_V2;
        ({ response, statusMessage } = await handleDeleteRequest(req));
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
