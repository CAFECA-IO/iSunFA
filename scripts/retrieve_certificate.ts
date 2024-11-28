import { AI_TYPE } from '@/constants/aich';
import { PUBLIC_COUNTER_PARTY } from '@/constants/counterparty';
import { CurrencyType } from '@/constants/currency';
import { InvoiceTransactionDirection, InvoiceTaxType, InvoiceType } from '@/constants/invoice';
import { IInvoiceEntity, IAIInvoice } from '@/interfaces/invoice';
import { fetchResultFromAICH } from '@/lib/utils/aich';
import { getTimestampNow } from '@/lib/utils/common';
import {
  listCertificateWithResultId,
  updateCertificateAiResultId,
} from '@/lib/utils/repo/certificate.repo';
import { fuzzySearchCounterpartyByName } from '@/lib/utils/repo/counterparty.repo';
import { createManyInvoice } from '@/lib/utils/repo/invoice.repo';
import loggerBack, { loggerError } from '@/lib/utils/logger_back';

async function processCertificateContent(certificate: {
  id: number;
  aiResultId: string;
  companyId: number;
}) {
  loggerBack.info(`Processing certificate ${certificate.id}`);
  try {
    const resultFromAI = await fetchResultFromAICH(AI_TYPE.CERTIFICATE, certificate.aiResultId);

    if (resultFromAI.payload && resultFromAI.payload.length > 0) {
      const { payload: aiPayload } = resultFromAI;
      const { status, value } = aiPayload;
      if (status !== 'success') {
        loggerError({
          userId: certificate.companyId,
          errorType: 'CertificateProcessingError',
          errorMessage: `Failed to process certificate ${certificate.id}`,
        });
        throw new Error(
          `Certificate content is not ready for certificate ${certificate.id}. Status: ${status}`
        );
      }
      const invoiceList: IInvoiceEntity[] = await Promise.all(
        value.map(async (invoice: IAIInvoice) => {
          const counterparty = await fuzzySearchCounterpartyByName(
            invoice.counterpartyName,
            certificate.companyId
          );
          const nowTimestamp = getTimestampNow();
          return {
            certificateId: certificate.id,
            counterPartyId: counterparty?.id || PUBLIC_COUNTER_PARTY.id,
            inputOrOutput: invoice.inputOrOutput || InvoiceTransactionDirection.INPUT,
            date: invoice.date || nowTimestamp,
            no: invoice.no || 'AI00000000',
            currencyAlias: invoice.currencyAlias || CurrencyType.TWD,
            priceBeforeTax: invoice.priceBeforeTax || 0,
            taxType: invoice.taxType || InvoiceTaxType.TAXABLE,
            taxRatio: invoice.taxRatio || 5,
            taxPrice: invoice.taxPrice || 0,
            totalPrice: invoice.totalPrice || 0,
            type: invoice.type || InvoiceType.PURCHASE_TRIPLICATE_AND_ELECTRONIC,
            deductible: invoice.deductible || false,
            createdAt: nowTimestamp,
            updatedAt: nowTimestamp,
          };
        })
      );

      const { count } = await createManyInvoice(invoiceList);
      await updateCertificateAiResultId(certificate.id, 'done');
      loggerBack.info(`Processed ${count} invoices for certificate ${certificate.id}`);
    } else {
      loggerBack.info(`No payload found for certificate ${certificate.id}`);
    }
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: certificate.companyId,
      errorType: 'CertificateProcessingError',
      errorMessage: error,
    });
  }
}

async function processCertificates() {
  try {
    const certificatesWithResultId = await listCertificateWithResultId();
    await Promise.all(certificatesWithResultId.map(processCertificateContent));
    loggerBack.info('All certificates processed successfully');
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: 0,
      errorType: 'CertificateListError',
      errorMessage: error,
    });
  }
}

(async () => {
  await processCertificates();
})();
