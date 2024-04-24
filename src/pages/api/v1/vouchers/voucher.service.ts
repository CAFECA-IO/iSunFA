import {
  AccountInvoiceData,
  AccountProgressStatus,
  AccountVoucher,
  AccountVoucherObjectVersion,
  isAccountVoucher,
} from '@/interfaces/account';
import LRUCache from '@/lib/utils/lru_cache';
import { LLAMA_CONFIG, VOUCHER_SERVICE_CONFIG } from '@/constants/config';
import LlamaConnect from '@/lib/utils/llama';

// Info Murky (20240416):  this is singleton class
// use VoucherService.getInstance() to get instance
// Only work after build
export default class VoucherService {
  private static instance: VoucherService | null = null;

  private cache: LRUCache<AccountVoucher>;

  private llamaConnect: LlamaConnect<AccountVoucher>;

  private prompts: string;

  constructor() {
    this.cache = new LRUCache<AccountVoucher>(
      VOUCHER_SERVICE_CONFIG.cacheSize,
      VOUCHER_SERVICE_CONFIG.idLength
    );
    this.prompts = `
    以下你需要使用發票array汲取出來的文字 ，然後根據以下的格式來生成會計傳票要使用的JSON檔案:\n

    以下是一個例子:\n
    以下是一份發票的JSON檔案，多張發票會放置於array中:\n
    [{
      "date": "2024-12-29",
      "eventType": "income",
      "incomeReason": "勞務收入",
      "client": "Isuncloud Limited",
      "description": "技術開發軟件與服務",
      "price": "469920",
      "tax": "free",
      "taxPercentange": "null",
      "fee": "0",
    }];

    用以上的invoice json應該要可以產出下面的會計傳票JSON檔案:\n
    請記得借貸方要平衡，另外請記得最外圍是大括號，它是一份Voucher 的 json，不是Voucher array
    \`\`\`
    {
        "date": "2024-12-29",
        "vouchIndex": "1229001",
        "type": "Receiving",
        "from_or_to": "Isuncloud Limited",
        "description": "技術開發軟件與服務",
        "lineItem": [
          {
            "lineItemIndex": "1229001001",
            "account": "銀行存款",
            "description": "港幣120000 * 3.916",
            "debit": "true",
            "amount": "469920",
          },
          {
            "lineItemIndex": "1229001002",
            "account": "營業收入",
            "description": "港幣120000 * 3.916",
            "debit": "false",
            "amount": "469920",
          },
        ],
      }
    \`\`\`
    `;
    this.llamaConnect = new LlamaConnect<AccountVoucher>(
      LLAMA_CONFIG.model,
      this.prompts,
      JSON.stringify(AccountVoucherObjectVersion),
      isAccountVoucher,
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

  public generateVoucherFromInvoices(invoices: AccountInvoiceData[]): string {
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
    invoices: AccountInvoiceData[]
  ): Promise<void> {
    try {
      const invoiceString = JSON.stringify(invoices);
      const voucherGenetaed = await this.llamaConnect.generateData(invoiceString);

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
