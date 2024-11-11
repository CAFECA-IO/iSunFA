import { NextApiRequest, NextApiResponse } from 'next';

import { STATUS_MESSAGE } from '@/constants/status_code';
import { IResponseData } from '@/interfaces/response_data';
import { loggerError } from '@/lib/utils/logger_back';
import { formatApiResponse } from '@/lib/utils/common';
import { APIName } from '@/constants/api_connection';
import { ICounterPartyEntity } from '@/interfaces/counterparty';
import { CounterpartyType } from '@/constants/counterparty';
import { IEventEntity } from '@/interfaces/event';
import { EventEntityFrequency, EventEntityType } from '@/constants/event';
import { AccountType, EventType } from '@/constants/account';
import { ILineItemEntity } from '@/interfaces/line_item';
import { IAccountEntity } from '@/interfaces/accounting_account';
import { IVoucherEntity } from '@/interfaces/voucher';
import { JOURNAL_EVENT } from '@/constants/journal';
import { IAssetEntity } from '@/interfaces/asset';
import { AssetDepreciationMethod, AssetEntityType, AssetStatus } from '@/constants/asset';
import { IInvoiceEntity } from '@/interfaces/invoice';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { CurrencyType } from '@/constants/currency';
import { IFileEntity } from '@/interfaces/file';
import { FileFolder } from '@/constants/file';
import { ICertificateEntity } from '@/interfaces/certificate';
import { voucherAPIGetOneUtils as getUtils } from '@/pages/api/v2/company/[companyId]/voucher/[voucherId]/route_utils';
import { withRequestValidation } from '@/lib/utils/middleware';
import { IHandleRequest } from '@/interfaces/handleRequest';
import type { AccountingSetting as PrismaAccountingSetting } from '@prisma/client';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';

type GetOneVoucherResponse = IVoucherEntity & {
  issuer: IUserEntity;
  accountSetting: PrismaAccountingSetting; // ToDo: (20241105 - Murky)  換成entity
  counterParty: ICounterPartyEntity;
  originalEvents: IEventEntity[];
  resultEvents: IEventEntity[];
  asset: IAssetEntity[];
  certificates: (ICertificateEntity & {
    invoice: IInvoiceEntity;
    file: IFileEntity;
    userCertificates: IUserCertificateEntity[];
  })[];
  lineItems: (ILineItemEntity & { account: IAccountEntity })[];
  payableInfo?: {
    total: number;
    alreadyHappened: number;
    remain: number;
  };
  receivingInfo?: {
    total: number;
    alreadyHappened: number;
    remain: number;
  };
};

export const handleGetRequest: IHandleRequest<
  APIName.VOUCHER_GET_BY_ID_V2,
  GetOneVoucherResponse
> = async ({ query, session }) => {
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: GetOneVoucherResponse | null = null;
  const { userId } = session;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query) {
    const mockIssuer: IUserEntity = {
      id: 1,
      name: 'Murky',
      email: 'murky@isunfa.com',
      imageFileId: 1,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      imageFile: undefined,
    };
    const mockAccountingSetting: PrismaAccountingSetting = {
      id: 1,
      companyId: 1002,
      currency: 'TWD',
      salesTaxRate: 5,
      salesTaxTaxable: true,
      purchaseTaxRate: 5,
      purchaseTaxTaxable: true,
      returnPeriodicity: 'monthly',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };

    const mockOriginalInvoice: IInvoiceEntity = {
      id: 1,
      certificateId: 1,
      counterPartyId: 1,
      inputOrOutput: InvoiceTransactionDirection.INPUT,
      date: 1,
      no: '1001',
      currencyAlias: CurrencyType.TWD,
      priceBeforeTax: 2000,
      taxType: InvoiceTaxType.TAXABLE,
      taxRatio: 5,
      taxPrice: 100,
      totalPrice: 2100,
      type: InvoiceType.SALES_TRIPLICATE_INVOICE,
      deductible: true,

      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };

    const mockOriginFile: IFileEntity = {
      id: 1,
      name: 'murky.jpg',
      size: 1000,
      mimeType: 'image/jpeg',
      type: FileFolder.TMP,
      url: 'https://isunfa.com/elements/avatar_default.svg?w=256&q=75',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };

    const mockCertificate: ICertificateEntity & {
      invoice: IInvoiceEntity;
      file: IFileEntity;
    } = {
      id: 1,
      companyId: 1002,
      voucherNo: '1001',
      invoice: mockOriginalInvoice,
      file: mockOriginFile,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      vouchers: [],
      userCertificates: [
        {
          id: 1,
          userId: 1,
          certificateId: 1,
          isRead: false,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      ],
    };

    const mockRevertLineItems: (ILineItemEntity & { account: IAccountEntity })[] = [
      {
        id: 1,
        description: '存入銀行',
        amount: 600,
        debit: true,
        accountId: 1,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        account: {
          id: 1,
          companyId: 1002,
          system: 'IFRS',
          type: AccountType.ASSET,
          debit: true,
          liquidity: true,
          code: '1103',
          name: '銀行存款',
          forUser: true,
          parentCode: '1100',
          rootCode: '1100',
          level: 3,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      },
      {
        id: 2,
        description: '存入銀行',
        amount: 600,
        debit: true,
        accountId: 1,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        account: {
          id: 2,
          companyId: 1002,
          system: 'IFRS',
          type: AccountType.ASSET,
          debit: true,
          liquidity: true,
          code: '1101',
          name: '庫存現金',
          forUser: true,
          parentCode: '1100',
          rootCode: '1100',
          level: 3,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      },
      {
        id: 3,
        description: '原價屋',
        amount: 1000,
        debit: false,
        accountId: 1,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        account: {
          id: 1,
          companyId: 1002,
          system: 'IFRS',
          type: AccountType.ASSET,
          debit: true,
          liquidity: true,
          code: '1172',
          name: '應收帳款',
          forUser: true,
          parentCode: '1170',
          rootCode: '1170',
          level: 3,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      },
    ];

    const mockRevertVoucher: IVoucherEntity = {
      id: 1,
      issuerId: 1,
      counterPartyId: 1,
      companyId: 1002,
      status: JOURNAL_EVENT.UPLOADED,
      editable: true,
      no: '1001',
      date: 1,
      type: EventType.INCOME,
      note: 'this is note',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      lineItems: mockRevertLineItems,
      readByUsers: [],
      originalEvents: [],
      resultEvents: [],
      certificates: [],
      asset: [],
    };

    const mockOriginalLineItems: (ILineItemEntity & { account: IAccountEntity })[] = [
      {
        id: 4,
        description: '原價屋',
        amount: 2000,
        debit: true,
        accountId: 1,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        account: {
          id: 1,
          companyId: 1002,
          system: 'IFRS',
          type: AccountType.ASSET,
          debit: true,
          liquidity: true,
          code: '1172',
          name: '應收帳款',
          forUser: true,
          parentCode: '1170',
          rootCode: '1170',
          level: 3,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      },
      {
        id: 1,
        description: '賣電腦',
        amount: 2000,
        debit: true,
        accountId: 1,
        voucherId: 1,
        createdAt: 1,
        updatedAt: 1,
        deletedAt: null,
        account: {
          id: 1,
          companyId: 1002,
          system: 'IFRS',
          type: AccountType.REVENUE,
          debit: false,
          liquidity: true,
          code: '4111',
          name: '銷貨收入',
          forUser: false,
          parentCode: '4110',
          rootCode: '4110',
          level: 3,
          createdAt: 1,
          updatedAt: 1,
          deletedAt: null,
        },
      },
    ];

    const mockOriginalVoucher: IVoucherEntity = {
      id: 1,
      issuerId: 1,
      counterPartyId: 1,
      companyId: 1002,
      status: JOURNAL_EVENT.UPLOADED,
      editable: true,
      no: '1001',
      date: 1,
      type: EventType.INCOME,
      note: 'this is note',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      lineItems: mockOriginalLineItems,
      readByUsers: [],
      originalEvents: [],
      resultEvents: [],
      certificates: [],
      asset: [],
    };

    const mockCounterParty: ICounterPartyEntity = {
      id: 1,
      companyId: 1003,
      name: '原價屋',
      taxId: '27749036',
      type: CounterpartyType.CLIENT,
      note: '買電腦',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
    };

    const revertEvent: IEventEntity = {
      id: 1,
      eventType: EventEntityType.REVERT,
      frequency: EventEntityFrequency.ONCE,
      startDate: 1,
      endDate: 1,
      dateOfWeek: [],
      monthsOfYear: [],
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      associateVouchers: [
        {
          originalVoucher: mockOriginalVoucher,
          resultVoucher: mockRevertVoucher,
        },
      ],
    };

    const mockAsset: IAssetEntity = {
      id: 1,
      companyId: 1002,
      name: '電腦',
      type: AssetEntityType.LAND,
      number: '1172',
      acquisitionDate: 1,
      purchasePrice: 1000,
      accumulatedDepreciation: 100,
      residualValue: 100,
      remainingLife: 5,
      status: AssetStatus.NORMAL,
      depreciationStart: 1,
      depreciationMethod: AssetDepreciationMethod.STRAIGHT_LINE,
      usefulLife: 5,
      note: '',
      createdAt: 1,
      updatedAt: 1,
      deletedAt: null,
      assetVouchers: [],
    };

    const { payableInfo, receivingInfo } = getUtils.getPayableReceivableInfo(revertEvent);

    const mockVoucher: GetOneVoucherResponse = {
      ...mockOriginalVoucher,
      issuer: mockIssuer,
      accountSetting: mockAccountingSetting,
      counterParty: mockCounterParty,
      originalEvents: [revertEvent],
      resultEvents: [],
      asset: [mockAsset],
      certificates: [mockCertificate],
      lineItems: mockOriginalLineItems,
      payableInfo,
      receivingInfo,
    };
    payload = mockVoucher;
    statusMessage = STATUS_MESSAGE.SUCCESS_GET;
  }
  return {
    statusMessage,
    payload,
    userId,
  };
};

export const handlePutRequest: IHandleRequest<APIName.VOUCHER_PUT_V2, number> = async ({
  query,
  body,
  session,
}) => {
  /**
   * Info: (20240927 - Murky)
   * Put is not actually put, but add an reverse voucher and link to current voucher
   * maybe non lineItem put can just put original voucher?? => flow chart is needed
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const { userId } = session;
  const mockPutVoucherId = 1002;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query && body) {
    statusMessage = STATUS_MESSAGE.SUCCESS_UPDATE;
    payload = mockPutVoucherId;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

export const handleDeleteRequest: IHandleRequest<APIName.VOUCHER_DELETE_V2, number> = async ({
  query,
  session,
}) => {
  /**
   * Info: (20240927 - Murky)
   * Delete is not actually put, but add an reverse voucher and link to current voucher
   */
  let statusMessage: string = STATUS_MESSAGE.BAD_REQUEST;
  let payload: number | null = null;
  const { userId } = session;
  const mockDeleteVoucherId = 1002;

  // ToDo: (20240927 - Murky) Remember to add auth check
  if (query) {
    statusMessage = STATUS_MESSAGE.SUCCESS_DELETE;
    payload = mockDeleteVoucherId;
  }

  return {
    statusMessage,
    payload,
    userId,
  };
};

type APIResponse = object | number | null;

const methodHandlers: {
  [key: string]: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<{
    statusMessage: string;
    payload: APIResponse;
  }>;
} = {
  GET: (req, res) =>
    withRequestValidation(APIName.VOUCHER_GET_BY_ID_V2, req, res, handleGetRequest),
  PUT: (req, res) => withRequestValidation(APIName.VOUCHER_PUT_V2, req, res, handlePutRequest),
  DELETE: (req, res) =>
    withRequestValidation(APIName.VOUCHER_DELETE_V2, req, res, handleDeleteRequest),
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
