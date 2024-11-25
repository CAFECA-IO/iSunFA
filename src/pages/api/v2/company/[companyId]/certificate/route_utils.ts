import { createCertificateWithEmptyInvoice } from '@/lib/utils/repo/certificate.repo';
import {
  ICertificate,
  ICertificateEntity,
  PostCertificateResponse,
} from '@/interfaces/certificate';
import loggerBack from '@/lib/utils/logger_back';
import { Logger } from 'pino';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { initFileEntity } from '@/lib/utils/file';
import { parsePrismaFileToFileEntity } from '@/lib/utils/formatter/file.formatter';
import { parsePrismaUserCertificateToUserCertificateEntity } from '@/lib/utils/formatter/user_certificate.formatter';
import {
  Voucher as PrismaVoucher,
  VoucherCertificate as PrismaVoucherCertificate,
} from '@prisma/client';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { parsePrismaVoucherCertificateToEntity } from '@/lib/utils/formatter/voucher_certificate.formatter';
import { initInvoiceEntity } from '@/lib/utils/invoice';
import { parsePrismaInvoiceToInvoiceEntity } from '@/lib/utils/formatter/invoice.formatter';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { CurrencyType } from '@/constants/currency';
import { InvoiceTransactionDirection, InvoiceTaxType, InvoiceType } from '@/constants/invoice';
import { parsePrismaCertificateToCertificateEntity } from '@/lib/utils/formatter/certificate.formatter';
import { parsePrismaUserToUserEntity } from '@/lib/utils/formatter/user.formatter';
import { IFileBeta, IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity, IInvoiceBeta } from '@/interfaces/invoice';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import { IVoucherEntity } from '@/interfaces/voucher';
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';
import { ICounterparty, ICounterPartyEntity } from '@/interfaces/counterparty';
import { getPusherInstance } from '@/lib/utils/pusher';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';

export const certificateAPIPostUtils = {
  /**
   * Info: (20241025 - Murky)
   * @description throw StatusMessage as Error, but it can log the errorMessage
   * @param logger - pino Logger
   * @param options - errorMessage and statusMessage
   * @param options.errorMessage - string, message you want to log
   * @param options.statusMessage - string, status message you want to throw
   * @throws Error - statusMessage
   */
  throwErrorAndLog: (
    logger: Logger,
    {
      errorMessage,
      statusMessage,
    }: {
      errorMessage: string;
      statusMessage: string;
    }
  ) => {
    logger.error(errorMessage);
    throw new Error(statusMessage);
  },

  createCertificateInPrisma: async (options: {
    nowInSecond: number;
    companyId: number;
    uploaderId: number;
    fileId: number;
    aiResultId?: string;
  }): Promise<PostCertificateResponse> => {
    const certificate = await createCertificateWithEmptyInvoice(options);

    if (!certificate) {
      certificateAPIPostUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `createCertificateWithEmptyInvoice failed, options: ${JSON.stringify(options)}`,
        statusMessage: STATUS_MESSAGE.IMAGE_UPLOAD_FAILED_ERROR,
      });
    }

    return certificate!;
  },

  initFileEntity: (certificateFromPrisma: PostCertificateResponse) => {
    const fileDto = certificateFromPrisma.file;
    const fileEntity = parsePrismaFileToFileEntity(fileDto);
    return initFileEntity(fileEntity);
  },

  initUserCertificateEntities: (certificateFromPrisma: PostCertificateResponse) => {
    const { UserCertificate } = certificateFromPrisma;
    return UserCertificate.map((userCertificate) =>
      parsePrismaUserCertificateToUserCertificateEntity(userCertificate)
    );
  },

  initVoucherEntity: (voucherFromPrisma: PrismaVoucher) => {
    return parsePrismaVoucherToVoucherEntity(voucherFromPrisma);
  },

  initVoucherCertificateEntity: (voucherCertificateFromPrisma: PrismaVoucherCertificate) => {
    return parsePrismaVoucherCertificateToEntity(voucherCertificateFromPrisma);
  },

  initUploaderEntity: (certificateFromPrisma: PostCertificateResponse) => {
    const { uploader } = certificateFromPrisma;
    return parsePrismaUserToUserEntity(uploader);
  },

  initVoucherCertificateEntities: (certificateFromPrisma: PostCertificateResponse) => {
    const { voucherCertificates } = certificateFromPrisma;
    const certificateVoucherRelations = voucherCertificates.map((voucherCertificate) => {
      const voucherCertificateEntity =
        certificateAPIPostUtils.initVoucherCertificateEntity(voucherCertificate);
      const voucherEntity = certificateAPIPostUtils.initVoucherEntity(voucherCertificate.voucher);
      return {
        ...voucherCertificateEntity,
        voucher: voucherEntity,
      };
    });
    return certificateVoucherRelations;
  },

  /**
   * Info: (20241125 - Murky)
   * @note 如果database沒有invoice，則初始化一個空的invoice, 而不會丟error
   */
  initInvoiceEntity: (
    certificateFromPrisma: PostCertificateResponse,
    options: {
      nowInSecond: number;
    }
  ) => {
    const { invoices } = certificateFromPrisma;
    const { nowInSecond } = options;
    let invoiceEntity: IInvoiceEntity & {
      counterParty: ICounterPartyEntity;
    };
    if (invoices.length === 0) {
      const newInvoice = initInvoiceEntity({
        counterPartyId: PUBLIC_COUNTER_PARTY.id,
        name: '',
        inputOrOutput: InvoiceTransactionDirection.INPUT,
        date: nowInSecond,
        no: '',
        currencyAlias: CurrencyType.TWD,
        priceBeforeTax: 0,
        taxType: InvoiceTaxType.TAXABLE,
        taxRatio: 0,
        taxPrice: 0,
        totalPrice: 0,
        type: InvoiceType.SALES_TRIPLICATE_INVOICE,
        deductible: false,
        createdAt: nowInSecond,
        updatedAt: nowInSecond,
        deletedAt: null,
        certificateId: 0,
      });
      invoiceEntity = {
        ...newInvoice,
        counterParty: PUBLIC_COUNTER_PARTY,
      };
    } else {
      const invoiceDto = invoices[0];
      const counterPartyDto = invoiceDto.counterParty;
      const invoice = parsePrismaInvoiceToInvoiceEntity(invoiceDto);
      const counterParty = parsePrismaCounterPartyToCounterPartyEntity(counterPartyDto);
      invoiceEntity = {
        ...invoice,
        counterParty,
      };
    }

    return invoiceEntity;
  },

  initCertificateEntity: (certificateFromPrisma: PostCertificateResponse) => {
    return parsePrismaCertificateToCertificateEntity(certificateFromPrisma);
  },

  transformCertificateEntityToResponse: (
    certificateEntity: ICertificateEntity & {
      invoice: IInvoiceEntity & { counterParty: ICounterPartyEntity };
      file: IFileEntity;
      uploader: IUserEntity;
      userCertificates: IUserCertificateEntity[];
      vouchers: IVoucherEntity[];
    }
  ): ICertificate => {
    const file: IFileBeta = {
      id: certificateEntity.file.id,
      name: certificateEntity.file.name,
      size: certificateEntity.file.size,
      url: certificateEntity.file.url,
      existed: true,
    };

    const counterParty: ICounterparty = {
      id: certificateEntity.invoice.counterParty.id,
      companyId: certificateEntity.invoice.counterParty.companyId,
      name: certificateEntity.invoice.counterParty.name,
      taxId: certificateEntity.invoice.counterParty.taxId,
      type: certificateEntity.invoice.counterParty.type,
      note: certificateEntity.invoice.counterParty.note,
      createdAt: certificateEntity.invoice.counterParty.createdAt,
      updatedAt: certificateEntity.invoice.counterParty.updatedAt,
    };
    const invoice: IInvoiceBeta = {
      id: certificateEntity.invoice.id,
      isComplete: false,
      counterParty,
      inputOrOutput: certificateEntity.invoice.inputOrOutput,
      date: certificateEntity.invoice.date,
      no: certificateEntity.invoice.no,
      currencyAlias: certificateEntity.invoice.currencyAlias,
      priceBeforeTax: certificateEntity.invoice.priceBeforeTax,
      taxType: certificateEntity.invoice.taxType,
      taxRatio: certificateEntity.invoice.taxRatio,
      taxPrice: certificateEntity.invoice.taxPrice,
      totalPrice: certificateEntity.invoice.totalPrice,
      type: certificateEntity.invoice.type,
      deductible: certificateEntity.invoice.deductible,
      createdAt: certificateEntity.invoice.createdAt,
      updatedAt: certificateEntity.invoice.updatedAt,
    };
    const isRead =
      certificateEntity.userCertificates.length > 0
        ? certificateEntity.userCertificates.some((data) => data.isRead)
        : false;
    const voucherNo = certificateEntity.vouchers.length > 0 ? certificateEntity.vouchers[0].no : '';

    const certificate: ICertificate = {
      id: certificateEntity.id,
      name: certificateEntity.file.name,
      companyId: certificateEntity.companyId,
      unRead: !isRead,
      file,
      invoice,
      voucherNo,
      aiResultId: certificateEntity.aiResultId,
      createdAt: certificateEntity.createdAt,
      updatedAt: certificateEntity.updatedAt,
      uploader: certificateEntity.uploader.name,
    };

    return certificate;
  },

  triggerPusherNotification: (
    certificate: ICertificate,
    options: {
      companyId: number;
    }
  ) => {
    const { companyId } = options;
    /**
     * CERTIFICATE_EVENT.CREATE 傳送的資料格式為 { message: string }, 其中 string 為 SON.stringify(certificate as ICertificate)
     */
    const pusher = getPusherInstance();

    pusher.trigger(`${PRIVATE_CHANNEL.CERTIFICATE}-${companyId}`, CERTIFICATE_EVENT.CREATE, {
      message: JSON.stringify(certificate),
    });
  },
};
export const mockCertificateList = [
  {
    id: 1,
    inputOrOutput: 'input',
    certificateDate: 10000001,
    certificateNo: 'AB-12345678',
    currencyAlias: 'TWD',
    priceBeforeTax: 4000,
    taxRatio: 5,
    taxPrice: 200,
    totalPrice: 4200,
    counterPartyId: 1,
    invoiceType: 'triplicate_uniform_invoice',
    deductible: true,
    connectToId: null,
    name: 'invoice001.jpg',
    url: '/api/v2/certificate/1',
    type: 'invoice',
    connectToType: 'voucher',
    mimeTYpe: 'image/jpeg',
    size: '3.0 MB',
    uploadProgress: 50,
    aiResultId: 'douhvjax_-1',
    aiStatus: 'success',
    createAt: 10000000,
    updateAt: 10000000,
  },
];
