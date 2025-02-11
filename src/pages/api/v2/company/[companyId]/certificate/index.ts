import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
// import { AuthFunctionsKeys } from '@/interfaces/auth';
// import { checkAuthorization } from '@/lib/utils/auth_check';
import { formatApiResponse, getTimestampNow } from '@/lib/utils/common';
import { NextApiRequest, NextApiResponse } from 'next';
import { APIName } from '@/constants/api_connection';

import { loggerError } from '@/lib/utils/logger_back';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
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

import { IUserCertificateEntity } from '@/interfaces/user_certificate';

import {
  certificateAPIPostUtils as postUtils,
  certificateAPIGetListUtils as getListUtils,
  certificateAPIDeleteMultipleUtils as deleteUtils,
} from '@/pages/api/v2/company/[companyId]/certificate/route_utils';
import { IVoucherEntity } from '@/interfaces/voucher';
import { InvoiceTabs } from '@/constants/certificate';

type APIResponse = ICertificate[] | IPaginatedData<ICertificate[]> | number[] | null;

/**
 * Info: (20241126 - Murky)
 * @todo
 * - 符合FilterSection公版
 * - 需要讀取withVoucher, withoutVoucher unRead的數量
 * - 要從account setting讀取currency
 * - 要Post UserCertificate Read
 */
export const handleGetRequest: IHandleRequest<
  APIName.CERTIFICATE_LIST_V2,
  IPaginatedData<ICertificate[]>
> = async ({ query, session }) => {
  // ToDo: (20241024 - Murky) API接口請符合 FilterSection 公版
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: IPaginatedData<ICertificate[]> | null = null;

  const { userId, companyId } = session;
  const { page, pageSize, startDate, endDate, tab, sortOption, searchQuery, type } = query;
  const nowInSecond = getTimestampNow();

  try {
    const paginationCertificates = await getListUtils.getPaginatedCertificateList({
      tab,
      companyId,
      startDate,
      endDate,
      page,
      pageSize,
      sortOption,
      searchQuery,
      type,
      isDeleted: false,
    });

    const { data: certificatesFromPrisma, where, ...pagination } = paginationCertificates;

    const currency = await getListUtils.getCurrencyFromSetting(companyId);

    const certificates = certificatesFromPrisma.map((certificateFromPrisma) => {
      const fileEntity = postUtils.initFileEntity(certificateFromPrisma);
      const userCertificateEntities = postUtils.initUserCertificateEntities(certificateFromPrisma);
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

      const certificate: ICertificate & {
        uploaderUrl: string;
        voucherId: number | undefined;
      } = getListUtils.transformCertificateEntityToResponse(certificateReadyForTransfer);
      return certificate;
    });

    const totalInvoicePrice = await getListUtils.getSumOfTotalInvoicePrice({
      companyId,
      startDate,
      endDate,
      searchQuery,
      type,
      tab,
      isDeleted: false,
    });

    const withVoucher = await getListUtils.getUnreadCertificateCount({
      userId,
      tab: InvoiceTabs.WITH_VOUCHER,
      where,
    });

    const withoutVoucher = await getListUtils.getUnreadCertificateCount({
      userId,
      tab: InvoiceTabs.WITHOUT_VOUCHER,
      where,
    });

    // Info: (20241126 - Murky) Record already read certificate
    await getListUtils.upsertUserReadCertificates({
      userId,
      certificateIdsBeenRead: certificates.map((certificate) => certificate.id),
      nowInSecond,
    });

    statusMessage = STATUS_MESSAGE.SUCCESS_LIST;
    const summary: ICertificateListSummary = {
      totalInvoicePrice,
      unRead: {
        withVoucher,
        withoutVoucher,
      },
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

  return {
    statusMessage,
    payload,
  };
};

/**
 * Info: (20241122 - Murky)
 * @todo
 * - 輸入companyId, fileId
 * - 回傳 ICertificate
 * - 記得放在Pusher CERTIFICATE_EVENT.CREATE
 */
export const handlePostRequest: IHandleRequest<
  APIName.CERTIFICATE_POST_V2,
  ICertificate[]
> = async ({ body, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: ICertificate[] | null = null;

  const { fileIds } = body;
  const { userId, companyId } = session;

  try {
    const nowInSecond = getTimestampNow();

    const certificates: (ICertificate & {
      uploaderUrl: string;
      voucherId: number | undefined;
    })[] = await Promise.all(
      fileIds.map(async (fileId) => {
        const certificateFromPrisma = await postUtils.createCertificateInPrisma({
          nowInSecond,
          companyId,
          uploaderId: userId,
          fileId,
        });

        const fileEntity = postUtils.initFileEntity(certificateFromPrisma);
        const userCertificateEntities =
          postUtils.initUserCertificateEntities(certificateFromPrisma);
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
          vouchers: voucherCertificateEntity.map(
            (voucherCertificate) => voucherCertificate.voucher
          ),
          userCertificates: userCertificateEntities,
        };

        const certificate: ICertificate & {
          uploaderUrl: string;
          voucherId: number | undefined;
        } = postUtils.transformCertificateEntityToResponse(certificateReadyForTransfer);

        postUtils.triggerPusherNotification(certificate, {
          companyId,
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
  return {
    statusMessage,
    payload,
  };
};

export const handleDeleteRequest: IHandleRequest<
  APIName.CERTIFICATE_DELETE_MULTIPLE_V2,
  number[]
> = async ({ body, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number[] | null = null;

  const { certificateIds } = body;
  const { userId } = session;

  try {
    const nowInSecond = getTimestampNow();

    const deletedCertificateIds = await deleteUtils.deleteCertificates({
      certificateIds,
      nowInSecond,
    });

    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = deletedCertificateIds;
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
  GET: (req) => withRequestValidation(APIName.CERTIFICATE_LIST_V2, req, handleGetRequest),
  POST: (req) => withRequestValidation(APIName.CERTIFICATE_POST_V2, req, handlePostRequest),
  DELETE: (req) =>
    withRequestValidation(APIName.CERTIFICATE_DELETE_MULTIPLE_V2, req, handleDeleteRequest),
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<IResponseData<APIResponse>>
) {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: APIResponse = null;
  const userId = -1;
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
