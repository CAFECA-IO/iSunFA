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
        "description": "沒有國家的人(第2版), 憂鬱的貓太郎, 紅與黑(精裝版), 誠品小紙提袋, 國家的品格:個人自由與公共利益",
        "venderOrSupplyer": "eslite 誠品",
        "payment": {
            "price": 1500,
            "hasTax": false,
            "taxPercentage": 0,
            "hasFee": true,
            "fee": 0
        }
    }

    範例2：
    文字辨識的結果是：
    [
      '中華電信',
      '台北營運處113年02月繳費通知',
      '先生',
      '女士',
      '寶號',
      '中華電信股份有限公司 帳單查詢免付費客服專線:0800080123',
      '電子信箱: billing service@cht.com',
      '營利事業統一編號:81691784',
      '聯絡地址:臺北市大安區金山南路二段52號9樓',
      '變動載具號碼',
      '11302 BB20258135 1210210701372',
      '應繳總金額(元)',
      '$2310',
      '繳費期限',
      '113/03/11',
      '繳費方式',
      '自行繳款',
      '營運處代號',
      '227',
      '用戶號碼',
      '貴客戶若持本單於便利商店繳費,請要求蓋收訖章並核對金額。',
      'Y364403',
      '113年01月費用已入帳並開立113年01月30日發票號碼:WM65651822(隨機碼9389)(已採變動載具申報者,請勿重複申報),金額:2310元。',
      '用戶統一編號: 52650861',
      '通知單流水號: 1210210701372 彙寄編號:',
      '用戶帳號: A52650861001001',
      '計費週期:第1週期',
      '帳單別:',
      '計費期間: 113/01/01至113/01/31',
      '費用項 目',
      '金額',
      '費用項 項目',
      '金額',
      '光世代電路月租費',
      '593 HiNet企業專案服務費',
      '1607',
      '收訖章',
      '北黄连',
      '113 4 09',
      '台北東區服務中心',
      '收訖章:',
      '中華電信',
      '股份有限公司',
      '113/04/09',
      '收訖章',
      '台北營運處 收費員代號:ZA01860 POS',
      '1130409',
      '電信費一般稅率: 2,200',
      '電信費零稅:0',
      '電信費免稅:0',
      '其他各費:0',
      '營業稅:110(本月應繳營業稅110元,沖(扣抵)負數項目營業稅0元)',
      '應繳總金額: 2,310',
      '說明:1.標示*之費用適用零稅率,無標示者適用一',
      '般稅率,繳費後另開立雲端發票,並請妥善',
      '保存單據,中獎請持領獎收據兌獎。',
      '2. 當期應繳金額若有變動,以銷帳後之金額開',
      '立發票。若有溢繳、重繳或短繳之費用,本',
      '公司將於繳費後次月扣抵(或可臨櫃辦理退',
      '費)或補繳方式辦理。',
      '領獎收據',
      '金額:新臺幣',
      '元整',
      '中獎人簽名(正楷)或蓋章:',
      '電話:',
      '載具類別 E10185',
      '年期別+載具流水號 11302BB20258135',
      '檢核碼 1210210701372',
      '(以上為用戶收執聯)',
      '\n'
    ]
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
