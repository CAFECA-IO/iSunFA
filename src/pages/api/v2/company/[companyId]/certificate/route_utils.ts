import {
  createCertificateWithEmptyInvoice,
  deleteMultipleCertificates,
  getCertificatesV2,
  getUnreadCertificateCount,
  upsertUserReadCertificates,
} from '@/lib/utils/repo/certificate.repo';
import {
  ICertificate,
  ICertificateEntity,
  PostCertificateResponse,
} from '@/interfaces/certificate';
import loggerBack from '@/lib/utils/logger_back';
import { Logger } from 'pino';
import { STATUS_MESSAGE } from '@/constants/status_code';
import {
  decryptImageFile,
  getImageUrlFromFileIdV1,
  initFileEntity,
  parseFilePathWithBaseUrlPlaceholder,
} from '@/lib/utils/file';
import { parsePrismaFileToFileEntity } from '@/lib/utils/formatter/file.formatter';
import { parsePrismaUserCertificateToUserCertificateEntity } from '@/lib/utils/formatter/user_certificate.formatter';
import {
  Prisma,
  Voucher as PrismaVoucher,
  VoucherCertificate as PrismaVoucherCertificate,
  File as PrismaFile,
} from '@prisma/client';
import { parsePrismaVoucherToVoucherEntity } from '@/lib/utils/formatter/voucher.formatter';
import { parsePrismaVoucherCertificateToEntity } from '@/lib/utils/formatter/voucher_certificate.formatter';
import { initInvoiceEntity } from '@/lib/utils/invoice';
import { parsePrismaInvoiceToInvoiceEntity } from '@/lib/utils/formatter/invoice.formatter';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { CurrencyType, OEN_CURRENCY } from '@/constants/currency';
import { InvoiceTransactionDirection, InvoiceTaxType, InvoiceType } from '@/constants/invoice';
import { parsePrismaCertificateToCertificateEntity } from '@/lib/utils/formatter/certificate.formatter';
import { parsePrismaUserToUserEntity } from '@/lib/utils/formatter/user.formatter';
import { IFileBeta, IFileEntity } from '@/interfaces/file';
import { IInvoiceEntity, IInvoiceBetaOptional } from '@/interfaces/invoice';
import { IUserEntity } from '@/interfaces/user';
import { IUserCertificateEntity } from '@/interfaces/user_certificate';
import { IVoucherEntity } from '@/interfaces/voucher';
import { parsePrismaCounterPartyToCounterPartyEntity } from '@/lib/utils/formatter/counterparty.formatter';
import { ICounterparty, ICounterPartyEntity } from '@/interfaces/counterparty';
import { getPusherInstance } from '@/lib/utils/pusher';
import { CERTIFICATE_EVENT, PRIVATE_CHANNEL } from '@/constants/pusher';
import { InvoiceTabs } from '@/constants/certificate';
import { SortBy, SortOrder } from '@/constants/sort';
import { IPaginatedData } from '@/interfaces/pagination';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { readFile } from 'fs/promises';
import { bufferToBlob } from '@/lib/utils/parse_image_form';
import { ProgressStatus } from '@/constants/account';
import { parseCounterPartyFromNoInInvoice } from '@/lib/utils/counterparty';

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
  initFileEntityFromPrisma: (fileFromPrisma: PrismaFile) => {
    return parsePrismaFileToFileEntity(fileFromPrisma, false);
  },

  initUploaderEntity: (
    certificateFromPrisma: PostCertificateResponse
  ): IUserEntity & {
    imageFile: IFileEntity;
  } => {
    const { uploader } = certificateFromPrisma;
    const fileEntity = certificateAPIPostUtils.initFileEntityFromPrisma(uploader.imageFile);
    const userEntity = parsePrismaUserToUserEntity(uploader);
    return {
      ...userEntity,
      imageFile: fileEntity,
    };
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
        type: InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
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

      // Info: (20241223 - Murky) Temporary Patch for counterParty from invoice no
      const { note, type, taxId, name } = parseCounterPartyFromNoInInvoice(invoice.no);
      invoice.no = note;
      counterParty.name = name;
      counterParty.taxId = taxId;
      counterParty.type = type;

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

  transformFileURL: (file: IFileEntity) => {
    const fileURL = getImageUrlFromFileIdV1(file.id);
    return fileURL;
  },

  transformCertificateEntityToResponse: (
    certificateEntity: ICertificateEntity & {
      invoice: IInvoiceEntity & { counterParty: ICounterPartyEntity };
      file: IFileEntity;
      uploader: IUserEntity & { imageFile: IFileEntity };
      userCertificates: IUserCertificateEntity[];
      vouchers: IVoucherEntity[];
    }
  ): ICertificate & {
    uploaderUrl: string;
    voucherId: number | undefined;
  } => {
    const fileURL = certificateAPIPostUtils.transformFileURL(certificateEntity.file);
    const file: IFileBeta = {
      id: certificateEntity.file.id,
      name: certificateEntity.file.name,
      size: certificateEntity.file.size,
      url: fileURL,
      existed: true,
    };

    // Deprecated: (20241127 - Murky) 目前CreateCertificate不會創造invoice, 如果需要假的invoice再把這邊打開
    // const counterParty: ICounterparty = {
    //   id: certificateEntity.invoice.counterParty.id,
    //   companyId: certificateEntity.invoice.counterParty.companyId,
    //   name: certificateEntity.invoice.counterParty.name,
    //   taxId: certificateEntity.invoice.counterParty.taxId,
    //   type: certificateEntity.invoice.counterParty.type,
    //   note: certificateEntity.invoice.counterParty.note,
    //   createdAt: certificateEntity.invoice.counterParty.createdAt,
    //   updatedAt: certificateEntity.invoice.counterParty.updatedAt,
    // };
    const invoice: IInvoiceBetaOptional = {
      // id: certificateEntity.invoice.id,
      // isComplete: false,
      // counterParty,
      // inputOrOutput: certificateEntity.invoice.inputOrOutput,
      // date: certificateEntity.invoice.date,
      // no: certificateEntity.invoice.no,
      // currencyAlias: certificateEntity.invoice.currencyAlias,
      // priceBeforeTax: certificateEntity.invoice.priceBeforeTax,
      // taxType: certificateEntity.invoice.taxType,
      // taxRatio: certificateEntity.invoice.taxRatio,
      // taxPrice: certificateEntity.invoice.taxPrice,
      // totalPrice: certificateEntity.invoice.totalPrice,
      // type: certificateEntity.invoice.type,
      // deductible: certificateEntity.invoice.deductible,
      // createdAt: certificateEntity.invoice.createdAt,
      // updatedAt: certificateEntity.invoice.updatedAt,
    };
    const isRead =
      certificateEntity.userCertificates.length > 0
        ? certificateEntity.userCertificates.some((data) => data.isRead)
        : false;
    const firstVoucher =
      certificateEntity.vouchers.length > 0 ? certificateEntity.vouchers[0] : null;
    const voucherNo = firstVoucher?.no || '';
    const voucherId = firstVoucher?.id;

    const certificate: ICertificate & {
      uploaderUrl: string;
      voucherId: number | undefined;
    } = {
      id: certificateEntity.id,
      name: certificateEntity.file.name,
      companyId: certificateEntity.companyId,
      unRead: !isRead,
      file,
      invoice,
      voucherNo,
      voucherId,
      aiResultId: certificateEntity.aiResultId,
      createdAt: certificateEntity.createdAt,
      updatedAt: certificateEntity.updatedAt,
      uploader: certificateEntity.uploader.name,
      uploaderUrl: certificateEntity.uploader.imageFile.url,
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

  getAndDecryptFile: async (
    file: PrismaFile,
    options: {
      companyId: number;
    }
  ): Promise<Blob> => {
    const { companyId } = options;
    const filePath = parseFilePathWithBaseUrlPlaceholder(file.url);
    const fileBuffer = await readFile(filePath);
    const decryptFileBuffer = await decryptImageFile({
      imageBuffer: fileBuffer,
      file,
      companyId,
    });
    const decryptFileBlob = bufferToBlob(decryptFileBuffer, file.mimeType);
    return decryptFileBlob;
  },

  sendFileToAI: async (
    file: PrismaFile,
    options: {
      companyId: number;
    }
  ) => {
    const { companyId } = options;
    const fileBlob = await certificateAPIPostUtils.getAndDecryptFile(file, { companyId });
    const formData = new FormData();
    formData.append('image', fileBlob);
  },
};

export const certificateAPIGetListUtils = {
  getPaginatedCertificateList: (options: {
    companyId: number;
    startDate: number;
    endDate: number;
    page: number;
    pageSize: number;
    sortOption: {
      // Info: (20241126 - Murky) 畫面沒有特定要sort哪些值
      sortBy: SortBy;
      sortOrder: SortOrder;
    }[];
    searchQuery?: string | undefined;
    isDeleted?: boolean | undefined;
    type?: InvoiceType | undefined;
    tab?: InvoiceTabs | undefined;
  }): Promise<
    IPaginatedData<PostCertificateResponse[]> & {
      where: Prisma.CertificateWhereInput;
    }
  > => {
    return getCertificatesV2(options);
  },

  getUnreadCertificateCount: (options: {
    userId: number;
    tab: InvoiceTabs;
    where: Prisma.CertificateWhereInput;
  }): Promise<number> => {
    return getUnreadCertificateCount(options);
  },

  getCurrencyFromSetting: async (companyId: number) => {
    const accountingSetting = await getAccountingSettingByCompanyId(companyId);
    const currencyKey =
      (accountingSetting?.currency as keyof typeof OEN_CURRENCY) || CurrencyType.TWD;
    const currency = OEN_CURRENCY[currencyKey];
    return currency;
  },

  getSumOfTotalInvoicePrice: (certificates: ICertificate[]): number => {
    return certificates.reduce((acc, certificate) => {
      if (!certificate?.invoice?.totalPrice) {
        return acc;
      }
      return acc + certificate.invoice.totalPrice;
    }, 0);
  },

  upsertUserReadCertificates: (options: {
    certificateIdsBeenRead: number[];
    userId: number;
    nowInSecond: number;
  }) => {
    const { certificateIdsBeenRead, userId, nowInSecond } = options;
    return upsertUserReadCertificates({
      userId,
      certificateIds: certificateIdsBeenRead,
      nowInSecond,
    });
  },

  isInvoiceComplete: (invoice: IInvoiceEntity) => {
    const isComplete = !!(
      invoice.no &&
      invoice.date &&
      invoice.priceBeforeTax &&
      invoice.totalPrice &&
      invoice.counterPartyId
    );
    return isComplete;
  },

  transformCertificateEntityToResponse: (
    certificateEntity: ICertificateEntity & {
      invoice: IInvoiceEntity & { counterParty: ICounterPartyEntity };
      file: IFileEntity;
      uploader: IUserEntity & { imageFile: IFileEntity };
      userCertificates: IUserCertificateEntity[];
      vouchers: IVoucherEntity[];
    }
  ): ICertificate & {
    uploaderUrl: string;
    voucherId: number | undefined;
  } => {
    const fileURL = certificateAPIPostUtils.transformFileURL(certificateEntity.file);
    const file: IFileBeta = {
      id: certificateEntity.file.id,
      name: certificateEntity.file.name,
      size: certificateEntity.file.size,
      url: fileURL,
      existed: true,
    };

    let invoice: IInvoiceBetaOptional = {};

    if (certificateEntity.invoice?.id) {
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

      const isInvoiceComplete = certificateAPIGetListUtils.isInvoiceComplete(
        certificateEntity.invoice
      );
      invoice = {
        id: certificateEntity.invoice.id,
        isComplete: isInvoiceComplete,
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
    }
    const isRead =
      certificateEntity.userCertificates.length > 0
        ? certificateEntity.userCertificates.some((data) => data.isRead)
        : false;

    const firstVoucher =
      certificateEntity.vouchers.length > 0 ? certificateEntity.vouchers[0] : null;
    const voucherNo = firstVoucher?.no || '';
    const voucherId = firstVoucher?.id;

    const certificate: ICertificate & {
      uploaderUrl: string;
      voucherId: number | undefined;
    } = {
      id: certificateEntity.id,
      name: certificateEntity.file.name,
      companyId: certificateEntity.companyId,
      unRead: !isRead,
      file,
      invoice,
      voucherNo,
      voucherId,
      aiResultId: certificateEntity.aiResultId,
      createdAt: certificateEntity.createdAt,
      updatedAt: certificateEntity.updatedAt,
      uploader: certificateEntity.uploader.name,
      uploaderUrl: certificateEntity.uploader.imageFile.url,
    };

    return certificate;
  },
};

export const certificateAPIDeleteMultipleUtils = {
  deleteCertificates: async (options: { certificateIds: number[]; nowInSecond: number }) => {
    return deleteMultipleCertificates(options);
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
    aiStatus: ProgressStatus.SUCCESS,
    createAt: 10000000,
    updateAt: 10000000,
  },
];
