/* eslint-disable @typescript-eslint/no-unused-vars */
import { CurrencyType } from '@/constants/currency';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { PostCertificateResponse } from '@/interfaces/certificate';
import loggerBack from '@/lib/utils/logger_back';
import { putInvoiceV2 } from '@/lib/utils/repo/invoice.repo';
import { Logger } from 'pino';

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

  putInvoiceInPrisma: async (options: {
    nowInSecond: number;
    invoiceId: number;
    certificateId?: number;
    counterPartyId?: number;
    inputOrOutput?: InvoiceTransactionDirection;
    date?: number;
    no?: string;
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
