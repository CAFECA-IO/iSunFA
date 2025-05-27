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
import { DefaultValue } from '@/constants/default_value';
import { ProgressStatus } from '@/constants/account';

async function processCertificateContent(certificate: {
  id: number;
  aiResultId: string;
  accountBookId: number;
}) {
  loggerBack.info(`Processing certificate ${certificate.id}`);
  try {
    // Info: (20241128 - Jacky) Step 1: Load the analysis waiting list
    // Info: (20241128 - Jacky) Step 2: Fetch the analysis result from AICH
    const resultFromAI = await fetchResultFromAICH(AI_TYPE.CERTIFICATE, certificate.aiResultId);

    if (resultFromAI.payload && resultFromAI.payload.length > 0) {
      // Info: (20241128 - Jacky) Step 3: If analysis result is ready, process the invoices
      // ToDo: (20241128 - Luphia) Declare expact data format for resultFromAI (why are there multiple invoices with one certificate?)
      const { payload: aiPayload } = resultFromAI;
      const { status, value } = aiPayload;
      if (status !== ProgressStatus.SUCCESS) {
        loggerError({
          userId: certificate.accountBookId,
          errorType: 'CertificateProcessingError',
          errorMessage: `Failed to process certificate ${certificate.id}`,
        });
        throw new Error(
          `Certificate content is not ready for certificate ${certificate.id}. Status: ${status}`
        );
      }
      const invoiceList: IInvoiceEntity[] = await Promise.all(
        value.map(async (invoice: IAIInvoice) => {
          // Info: (20241128 - Jacky) Step 4: Fuzzy search CounterParty by name for each invoice
          // ToDo: (20241128 - Luphia) Do not process sql query in loop especially for fuzzy search
          const counterparty = await fuzzySearchCounterpartyByName(
            invoice.counterpartyName,
            certificate.accountBookId
          );
          const nowTimestamp = getTimestampNow();
          // ToDo: (20241128 - Luphia) Declare expact data format for analysisResult
          const analysisResult = {
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
          return analysisResult;
        })
      );

      // Info: (20241128 - Jacky) Step 5: Create invoices for this certificate
      const { count } = await createManyInvoice(invoiceList);
      // Info: (20241128 - Jacky) Step 6: Update certificate status to done to remove it from the waiting list
      await updateCertificateAiResultId(certificate.id, 'done');
      loggerBack.info(`Processed ${count} invoices for certificate ${certificate.id}`);
    } else {
      loggerBack.info(`No payload found for certificate ${certificate.id}`);
    }
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: certificate.accountBookId,
      errorType: 'CertificateProcessingError',
      errorMessage: error,
    });
  }
}

async function processCertificates() {
  try {
    const certificatesWithResultId = await listCertificateWithResultId();
    // ToDo: (20241128 - Luphia) use waterfall promise to process certificates
    await Promise.all(certificatesWithResultId.map(processCertificateContent));
    loggerBack.info('All certificates processed successfully');
  } catch (_error) {
    const error = _error as Error;
    loggerError({
      userId: DefaultValue.USER_ID.SYSTEM,
      errorType: 'CertificateListError',
      errorMessage: error,
    });
  }
}

(async () => {
  await processCertificates();
})();
