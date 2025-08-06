import { CounterpartyType } from '@/constants/counterparty';
import { CurrencyType, OEN_CURRENCY } from '@/constants/currency';
import { InvoiceTaxType, InvoiceTransactionDirection, InvoiceType } from '@/constants/invoice';
import { STATUS_MESSAGE } from '@/constants/status_code';
import { PostCertificateResponse } from '@/interfaces/certificate';
import loggerBack from '@/lib/utils/logger_back';
import { getAccountingSettingByCompanyId } from '@/lib/utils/repo/accounting_setting.repo';
import { getOneCertificateByIdWithoutInclude } from '@/lib/utils/repo/certificate.repo';
import { getCounterpartyById } from '@/lib/utils/repo/counterparty.repo';
import { postInvoiceV2 } from '@/lib/utils/repo/invoice.repo';
import { Logger } from 'pino';

export const invoicePostApiUtils = {
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

    const isCounterPartyExistInDB = await invoicePostApiUtils.isCounterPartyExistInDB(id);

    return !isCounterPartyExistInDB;
  },
  embedCounterPartyIntoNote: (
    note: string,
    counterPartyFromBody?: {
      name: string;
      taxId: string;
      type: CounterpartyType;
    }
  ): string => {
    const name = counterPartyFromBody?.name || '';
    const taxId = counterPartyFromBody?.taxId || '';
    const type = counterPartyFromBody?.type || CounterpartyType.SUPPLIER;

    const counterPartyInfo = `{"name":"${name}","taxId":"${taxId}","type":"${type}","note":"${note}"}`;
    return counterPartyInfo;
  },
  getCurrencyFromSetting: async (companyId: number) => {
    const accountingSetting = await getAccountingSettingByCompanyId(companyId);
    const currencyKey =
      (accountingSetting?.currency as keyof typeof OEN_CURRENCY) || CurrencyType.TWD;
    const currency = OEN_CURRENCY[currencyKey];
    return currency;
  },
  postInvoiceInPrisma: async (options: {
    accountBookId: number;
    nowInSecond: number;
    certificateId: number;
    inputOrOutput: InvoiceTransactionDirection;
    date: number;
    no: string;
    currencyAlias: CurrencyType;
    priceBeforeTax: number;
    taxType: InvoiceTaxType;
    taxRatio: number;
    taxPrice: number;
    totalPrice: number;
    type: InvoiceType;
    deductible: boolean;
  }): Promise<PostCertificateResponse> => {
    const certificateInPrisma: PostCertificateResponse | null = await postInvoiceV2(options);

    if (!certificateInPrisma) {
      invoicePostApiUtils.throwErrorAndLog(loggerBack, {
        errorMessage: 'putInvoiceInPrisma failed, Failed to update invoice',
        statusMessage: STATUS_MESSAGE.INTERNAL_SERVICE_ERROR,
      });
    }
    return certificateInPrisma!;
  },
};
