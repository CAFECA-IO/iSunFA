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
    this.prompts = `
    以下你需要使用發票array汲取出來的文字 ，然後根據以下的格式來生成會計傳票要使用的JSON檔案:\n

    請從提供的發票圖像中準確提取以下資訊，並按照規定的格式處理數據，以便生成標準的會計憑證（Account Voucher）：

    1. **日期（date）**：
      - 提取發票上的日期並轉換為時間戳（秒為單位）。

    2. **憑證類型（voucherType，基於 eventType）**：
      - 根據事件類型（收入、付款或轉賬），確定對應的憑證類型（接收、支出或轉賬）。

    3. **供應商或銷售商（venderOrSupplyer）**：
      - 提取發票上供應商或銷售商的名稱。

    4. **描述（description）**：
      - 提供發票上明確的服務或產品描述。

    5. **總價格（totalPrice，對應 payment.price）**：
      - 提取發票上的總金額，並移除任何逗號或貨幣符號，轉換為數字格式。

    6. **稅率百分比（taxPercentage）**：
      - 如果發票上提到稅率，提取稅率百分比。

    7. **費用（fee）**：
      - 如果發票上有額外費用，提取這些費用並轉換為數字格式。

    8. **付款方式（paymentMethod）**：
      - 確定付款方式，例如現金、信用卡、轉賬等。

    9. **付款期限類型（paymentPeriod）**：
      - 確定付款是一次性完成還是分期付款。

    10. **分期期數（installmentPeriod）**：
        - 如果是分期付款，提取分期的期數。

    11. **付款狀態（paymentStatus）**：
        - 確定付款是已付、未付還是部分付款。

    12. **已付金額（alreadyPaidAmount）**：
        - 如果部分付款，提取已經付款的金額。

    請確保所有提取的信息精確無誤，並適當格式化以符合系統要求。輸出的數據應該符合 AccountVoucher 的結構，以便進一步處理和記賬。


    以下是一個例子:\n
    以下是一份發票的JSON檔案，多張發票會放置於array中:\n
    [
      {
        "date": {
            "start_date": 1713052800000,
            "end_date": 1713052800000
        },
        "eventType": "payment",
        "paymentReason": "管理費用",
        "description": "沒有國家的人(第2版), 憂鬱的貓太郎, 紅與黑(精裝版), 誠品小紙提袋, 國家的品格:個人自由與公共利益",
        "venderOrSupplyer": "eslite 誠品",
        "payment": {
            "price": 1500,
            "hasTax": false,
            "taxPercentage": 0,
            "hasFee": true,
            "fee": 0,
            "paymentMethod": "transfer",
            "paymentPeriod": "atOnce",
            "installmentPeriod": 0,
            "paymentStatus": "unpaid",
            "alreadyPaidAmount": 0,
        }
      }
    ];

    返回的JSON，請借貸方平衡，並確保所有數據準確無誤，不然會計師會找你麻煩的！\n
    [
      {
          "lineItemIndex": "0",
          "accounting": "管理費用",
          "particular": "沒有國家的人(第2版), 憂鬱的貓太郎, 紅與黑(精裝版), 誠品小紙提袋, 國家的品格:個人自由與公共利益",
          "debit": true,
          "amount": 1500
      },
      {
          "lineItemIndex": "1",
          "accounting": "銀行存款",
          "particular": "管理費用(圖書)",
          "debit": false,
          "amount": 1500
      }
  ]
    `;
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
