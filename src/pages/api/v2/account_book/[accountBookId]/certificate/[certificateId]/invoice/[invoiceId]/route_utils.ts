/* eslint-disable @typescript-eslint/no-unused-vars */
import { CounterpartyType } from '@/constants/counterparty';
import { CurrencyType } from '@/constants/currency';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { PostCertificateResponse } from '@/interfaces/certificate';
import loggerBack from '@/lib/utils/logger_back';
import { getOneCertificateByIdWithoutInclude } from '@/lib/utils/repo/certificate.repo';
import { getCounterpartyById } from '@/lib/utils/repo/counterparty.repo';
import { getInvoiceByIdV2, putInvoiceV2 } from '@/lib/utils/repo/invoice.repo';
import { Logger } from 'pino';
import {
  Invoice as PrismaInvoice,
  Certificate as PrismaCertificate,
  Counterparty as PrismaCounterparty,
} from '@prisma/client';
import { parseCounterPartyFromNoInInvoice } from '@/lib/utils/counterparty';

export const invoicePutApiUtils = {
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

  isCertificateExistInDB: async (certificateId: number): Promise<boolean> => {
    const certificate = await getOneCertificateByIdWithoutInclude(certificateId);
    return !!certificate;
  },

  isCounterPartyExistInDB: async (counterPartyId: number): Promise<boolean> => {
    const counterParty = await getCounterpartyById(counterPartyId);
    return !!counterParty;
  },

  isNeedToCreateNewCounterParty: async (counterPartyFromBody?: {
    name: string;
    taxId: string;
    type: CounterpartyType;
    id?: number | undefined;
    note?: string | undefined;
  }): Promise<boolean> => {
    if (!counterPartyFromBody) return true;

    const { id } = counterPartyFromBody;

    if (!id) return true;

    const isCounterPartyExistInDB = await invoicePutApiUtils.isCounterPartyExistInDB(id);

    return !isCounterPartyExistInDB;
  },
  embedCounterPartyIntoNote: (options: {
    originalInvoice: PrismaInvoice;
    newNote?: string;
    counterPartyFromBody?: {
      name: string;
      taxId: string;
      type: CounterpartyType;
    };
  }): string => {
    const { newNote, originalInvoice, counterPartyFromBody } = options;
    const originalNote = originalInvoice.no;
    const { note, name, type, taxId } = parseCounterPartyFromNoInInvoice(originalNote);
    const nameToUse = counterPartyFromBody?.name || name;
    const taxIdToUse = counterPartyFromBody?.taxId || taxId;
    const typeToUse = counterPartyFromBody?.type || type;
    const noteToUse = newNote || note;
    const counterPartyInfo = `{"name":"${nameToUse}","taxId":"${taxIdToUse}","type":"${typeToUse}","note":"${noteToUse}"}`;
    return counterPartyInfo;
  },
  getInvoiceFromPrisma: async (
    invoiceId: number
  ): Promise<
    PrismaInvoice & {
      certificate: PrismaCertificate;
      counterParty: PrismaCounterparty;
    }
  > => {
    const invoice:
      | (PrismaInvoice & {
          certificate: PrismaCertificate;
          counterParty: PrismaCounterparty;
        })
      | null = await getInvoiceByIdV2(invoiceId);

    if (!invoice) {
      invoicePutApiUtils.throwErrorAndLog(loggerBack, {
        errorMessage: `getInvoiceInPrisma failed, Can't find invoice by id: ${invoiceId}`,
        statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR,
      });
    }
    return invoice!;
  },
  putInvoiceInPrisma: async (options: {
    accountBookId: number;
    nowInSecond: number;
    invoiceId: number;
    certificateId?: number;
    inputOrOutput?: InvoiceTransactionDirection;
    date?: number;
    no: string;
    currencyAlias?: CurrencyType;
    priceBeforeTax?: number;
    taxType?: InvoiceTaxType;
    taxRatio?: number;
    taxPrice?: number;
    totalPrice?: number;
    type?: InvoiceType;
    deductible?: boolean;
  }): Promise<PostCertificateResponse> => {
    const certificateInPrisma: PostCertificateResponse | null = await putInvoiceV2(options);

    if (!certificateInPrisma) {
      invoicePutApiUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'putInvoiceInPrisma failed, Failed to update invoice',
        statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR,
      });
    }
    return certificateInPrisma!;
  },
};
