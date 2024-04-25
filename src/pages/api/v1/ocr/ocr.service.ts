import {
  AccountInvoiceData,
  AccountInvoiceDataObjectVersion,
  AccountProgressStatus,
  cleanInvoiceData,
} from '@/interfaces/account';
import LRUCache from '@/lib/utils/lru_cache';
import GoogleVisionClientSingleton from '@/lib/utils/google_vision_singleton';
import LlamaConnect from '@/lib/utils/llama';
import { LLAMA_CONFIG, OCR_SERVICE_CONFIG } from '@/constants/config';

// Info Murky (20240416):  this is singleton class
// use OCRService.getInstance() to get instance
// don't use new OCRService()
// ** This only work after build **

export default class OCRService {
  private static instance: OCRService | null = null;

  private cache: LRUCache<AccountInvoiceData>;

  private prompts: string;

  private llamaConnect: LlamaConnect<AccountInvoiceData>;

  constructor() {
    this.cache = new LRUCache<AccountInvoiceData>(
      OCR_SERVICE_CONFIG.cacheSize,
      OCR_SERVICE_CONFIG.idLength
    );
    this.prompts = `
    你現在是一位專業的審計員，你需要從發票的文字中提取你發票中包含的資訊，並生成JSON檔案:\n
    提供的資訊已經是發票經過OCR文字辨識後讀出的資訊,
    請根據以下詳細說明，從提供的發票圖像中提取帳單信息並轉換成所需格式：

    1. **日期(date)**：
       - 提取發票上的“開始日期”和“結束日期”。
       - 請將這些日期從常見格式（如YYYY-MM-DD）轉換為時間戳（秒為單位）。
    
    2. **事件類型（eventType）**：
       - 確定發票對應的事件類型，例如“income”、“payment”或“transfer”，transfer指會計上資產或負債在表上的移轉。
    
    3. **付款原因(paymentReason)**：
       - 從發票的描述或標題中提取付款原因，例如“月度服務費”、“產品銷售”。
    
    4. **描述(description)**：
       - 提供發票上明確的服務或產品描述，如果有多個品項，請把他們全部列出來之後用,區分，例如“書本1, 書本2”。
    
    5. **供應商或銷售商(venderOrSupplyer:)**：
       - 從發票上標識供應商或銷售商的名稱。
    
    6. **付款詳情(payment)**：
       - 價格(price)：將發票上的**總金額**轉換為數字格式，確保移除任何逗號或貨幣符號。
       - 是否含稅(hasTax)：根據發票上的提示確認是否含稅，並轉換為布林值（true/false）。
       - 稅率百分比(taxPercentage)：如果適用，提取稅率百分比並轉換為數字。
       - 是否含手續費(hasFee)：根據發票上的提示確認是否有額外費用，並轉換為布林值。
       - 費用(fee)：如果適用，提取相關費用並以數字格式表示。
    
    請確保所有提取的信息精確無誤，並適當格式化以符合系統要求。在無法直接從發票獲取某些信息時，請使用適當的預設值或估算值。
    
    以下是一個例子:
    OCR辨識的結果是：
    [
      'f eslite 誠品',
      '電子發票證明聯',
      '113年03-04月',
      'YZ-30887276',
      '2024-04-14 17:19:04 格式:25',
      '隨機碼:7415',
      '總計:1500',
      '賣方:51380003 買方:52414797',
      '機:BA010007',
      '營:2024-04-14(會員)',
      '序:04140107 電:0225639818',
      '-辦理商品相關作業請持發票及明細-',
      '買受人統編:52414797',
      '營業人統編:51380003',
      '格式:25',
      '誠品股份有限公司中山書街分公司',
      '地址:台北市大同區南京西路16號',
      '店號:BA01捷運中山店',
      '序號:04140107',
      '機號:BA010007',
      '系統日:2024-04-14 17:19:04',
      '沒有國家的人(第2版)',
      '2681272303006',
      '200',
      '1@',
      '$200',
      '(會)會員折扣',
      '90%',
      '-$20',
      '憂鬱的貓太郎',
      '2682122250006',
      '330',
      '1@',
      '$330',
      '(會)會員折扣',
      '90%',
      '-$33',
      '紅與黑(精裝版)',
      '2682444550006',
      '800',
      '1@',
      '$800',
      '(會)會員折扣',
      '90%',
      '-$80',
      '誠品小紙提袋',
      '2000000034003*',
      '3 1@',
      '$3TX',
      '國家的品格:個人自由與公共利益,',
      '2682453868000',
      '500 1@',
      '$500',
      '(組)書展4月共和國書展-$105',
      '小計',
      '$1595',
      '總計',
      '$1595',
      '電子折價券',
      '$50',
      '點數折抵',
      '$45',
      'LinePay',
      '$1500',
      '未稅',
      '稅額',
      '$0',
      '$0',
      '應稅總額',
      '$0',
      '免稅總額',
      '$1500',
      '會員:301****434',
      '本次折抵450點',
      '剩餘點數2829點',
      '當日消費/促銷活動之獲贈點數另計,',
      '請以誠品人APP/誠品網站顯示為準。',
      '本年度到期點數595點',
      '5件/發票額:1500元',
      '\n'
    ]

    範例1產生產生的結果應該是：
    {
        "date": {
            "start_date": 1713052800000,
            "end_date": 1713052800000
        },
        "eventType": "payment",
        "paymentReason": "管理費用",
        "description": "沒有國家的人(第2版), 憂鬱的貓太郎, 紅與黑(精裝版), 誠品小紙提袋, 國家的品格:個人自由與公共利益"
        "venderOrSupplyer": "eslite 誠品",
        "payment": {
            "price": 1500,
            "hasTax": false,
            "taxPercentage": 0,
            "hasFee": true,
            "fee": 0
        }
    }
    `;
    this.llamaConnect = new LlamaConnect<AccountInvoiceData>(
      LLAMA_CONFIG.model,
      this.prompts,
      JSON.stringify(AccountInvoiceDataObjectVersion),
      cleanInvoiceData,
      LLAMA_CONFIG.retryLimit
    );
  }

  public static getInstance(): OCRService {
    // The instance is created only if it does not exist
    if (OCRService.instance === null) {
      OCRService.instance = new OCRService();
      // Deprecation Murky (20240423) debug
      // eslint-disable-next-line no-console
      console.log('OCRService instance created');
    }

    return OCRService.instance;
  }

  public async extractTextFromImage(imagePath: string): Promise<string> {
    const getneratedDescription = await GoogleVisionClientSingleton.generateDescription(imagePath);

    // eslint-disable-next-line no-console
    console.log('OCR from google: ', getneratedDescription.concat('\n'));
    const key = getneratedDescription[0];

    let hashedKey = this.cache.hashId(key);
    if (this.cache.get(hashedKey).value) {
      return `Already uploaded, resultId: ${hashedKey}`;
    }
    hashedKey = this.cache.put(key, 'inProgress', null);

    // Info Murky (20240423) this is async function, but we don't await
    // it will be processed in background
    this.ocrToAccountInvoiceData(hashedKey, getneratedDescription);
    return hashedKey;
  }

  // Deprecation Murky (20240423) debug
  // public async tempTestOcr(getneratedDescription: string[]): Promise<string> {
  //   const key = getneratedDescription[0];

  //   let hashedKey = this.cache.hashId(key);
  //   if (this.cache.get(hashedKey).value) {
  //     return `Already extracted, resultId: ${hashedKey}`;
  //   }
  //   hashedKey = this.cache.put(key, 'inProgress', null);
  //   this.ocrToAccountInvoiceData(hashedKey, getneratedDescription);
  //   return hashedKey;
  // }

  public getOCRStatus(resultId: string): AccountProgressStatus {
    const result = this.cache.get(resultId);
    if (!result) {
      return 'notFound';
    }

    return result.status;
  }

  public getOCRResult(resultId: string): AccountInvoiceData | null {
    const result = this.cache.get(resultId);
    if (!result) {
      return null;
    }

    if (result.status !== 'success') {
      return null;
    }

    return result.value;
  }

  private async ocrToAccountInvoiceData(hashedId: string, description: string[]): Promise<void> {
    // Todo: post to llama
    try {
      const descriptionString = description.join('\n');
      const invoiceGenerated = await this.llamaConnect.generateData(descriptionString);

      if (invoiceGenerated) {
        this.cache.put(hashedId, 'success', invoiceGenerated);
      } else {
        this.cache.put(hashedId, 'error', null);
      }
    } catch (e) {
      this.cache.put(hashedId, 'error', null);
    }
  }
}
