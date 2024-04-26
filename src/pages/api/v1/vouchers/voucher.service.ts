import {
  AccountInvoiceWithPaymentMethod,
  AccountLineItem,
  AccountLineItemObjectVersion,
  AccountProgressStatus,
  AccountVoucher,
  AccountVoucherMetaData,
  cleanAccountLineItems,
  cleanVoucherData,
  eventTypeToVoucherType,
} from '@/interfaces/account';
import LRUCache from '@/lib/utils/lru_cache';
import { LLAMA_CONFIG, VOUCHER_SERVICE_CONFIG } from '@/constants/config';
import LlamaConnect from '@/lib/utils/llama';
import { voucherPrompt } from '@/constants/prompts/voucher_prompt';

// Info Murky (20240416):  this is singleton class
// use VoucherService.getInstance() to get instance
// Only work after build
export default class VoucherService {
  private static instance: VoucherService | null = null;

  private cache: LRUCache<AccountVoucher>;

  private llamaConnect: LlamaConnect<AccountLineItem[]>;

  private prompts: string;

  constructor() {
    this.cache = new LRUCache<AccountVoucher>(
      VOUCHER_SERVICE_CONFIG.cacheSize,
      VOUCHER_SERVICE_CONFIG.idLength
    );
    this.prompts = voucherPrompt;
    this.llamaConnect = new LlamaConnect<AccountLineItem[]>(
      LLAMA_CONFIG.model,
      this.prompts,
      JSON.stringify(AccountLineItemObjectVersion),
      cleanAccountLineItems,
      LLAMA_CONFIG.retryLimit
    );
  }

  public static getInstance(): VoucherService {
    // The instance is created only if it does not exist
    if (VoucherService.instance === null) {
      // Deprecation Murky (20240423) debug
      // eslint-disable-next-line no-console
      console.log('VoucherService instance created');

      VoucherService.instance = new VoucherService();
    }
    return VoucherService.instance;
  }

  public generateVoucherFromInvoices(invoices: AccountInvoiceWithPaymentMethod[]): string {
    const invoiceString = JSON.stringify(invoices);
    const hashedKey = this.cache.hashId(invoiceString);
    if (this.cache.get(hashedKey).value) {
      return `Invoices data already uploaded, use resultId: ${hashedKey} to retrieve the result`;
    }

    // Info Murky (20240423) this is async function, but we don't await
    // it will be processed in background
    this.invoicesToAccountVoucherData(hashedKey, invoices);
    return hashedKey;
  }

  public getVoucherAnalyzingStatus(resultId: string): AccountProgressStatus {
    const result = this.cache.get(resultId);
    if (!result) {
      return 'notFound';
    }

    return result.status;
  }

  public getVoucherAnalyzingResult(resultId: string): AccountVoucher | null {
    const result = this.cache.get(resultId);
    if (!result) {
      return null;
    }

    if (result.status !== 'success') {
      return null;
    }

    return result.value;
  }

  private async invoicesToAccountVoucherData(
    hashedId: string,
    invoices: AccountInvoiceWithPaymentMethod[]
  ): Promise<void> {
    try {
      const invoiceString = JSON.stringify(invoices);
      const metadatas: AccountVoucherMetaData[] = invoices.map((invoice) => {
        return {
          date: invoice.date.start_date,
          voucherType: eventTypeToVoucherType[invoice.eventType],
          venderOrSupplyer: invoice.venderOrSupplyer,
          description: invoice.description,
          totalPrice: invoice.payment.price,
          taxPercentage: invoice.payment.taxPercentage,
          fee: invoice.payment.fee,
          paymentMethod: invoice.payment.paymentMethod,
          paymentPeriod: invoice.payment.paymentPeriod,
          installmentPeriod: invoice.payment.installmentPeriod,
          paymentStatus: invoice.payment.paymentStatus,
          alreadyPaidAmount: invoice.payment.alreadyPaidAmount,
        };
      });
      const lineItemsGenetaed = await this.llamaConnect.generateData(invoiceString);

      const voucherGenetaed = cleanVoucherData({ lineItems: lineItemsGenetaed, metadatas });

      if (voucherGenetaed) {
        this.cache.put(hashedId, 'success', voucherGenetaed);
      } else {
        this.cache.put(hashedId, 'error', null);
      }
    } catch (error) {
      this.cache.put(hashedId, 'error', null);
    }
  }
}
