import {
  AccountInvoiceData,
  AccountInvoiceDataObjectVersion,
  AccountProgressStatus,
  isAccountInvoiceData,
} from '@/interfaces/account';
import LRUCache from '@/lib/utils/lru_cache';
import GoogleVisionClientSingleton from '@/lib/utils/google_vision_singleton';
import LlamaConnect from '@/lib/utils/llama';
import { LLAMA_CONFIG } from '@/constants/config';

// Info Murky (20240416):  this is singleton class
// use OCRService.getInstance() to get instance
// don't use new OCRService()

export default class OCRService {
  private static instance: OCRService | null = null;

  private cache: LRUCache<AccountInvoiceData>;

  private prompts: string;

  private llamaConnect: LlamaConnect<AccountInvoiceData>;

  constructor() {
    this.cache = new LRUCache<AccountInvoiceData>(10, 20);
    this.prompts = `
    以下你需要使用Google Vision API 提取出來的文字，然後根據以下的格式來還原成發票的JSON檔案:\n

    以下是一個例子:\n

    Google vision解析的字串為： "港幣120,000×3.916\n12月份\n※應稅、零稅率、免稅之銷售額應分別開立統一發票,並應於各該欄打「v」。\n章蓋\nTa\n人壽本非)蛋\n統一發票專用章\n台統\n˙號松\n全\n金製張外泡飲\n總\n電話\n北52414797萬\n計\n總計新臺幣\n469,920\n(中文大寫)\n課\n稅\n別應稅\n億仟佰肆拾陸萬玖仟玖佰貳拾零元\n零稅率 / 免税\n市負責人:馬建英\n802-2700-1979\n敦化北路207號8樓之7\n第二聯收執聯\n松山區\n469.92001\n 營業人蓋用統一發票專用章\n801-0\n\n台灣陽光雲有限公司\nLacă\n",\n12月份
    還原出來的JSON檔案需要如下:\n
    {
      "date": "2024-12-29",
      "eventType": "income",
      "incomeReason": "勞務收入",
      "client": "Isuncloud Limited",
      "description": "技術開發軟件與服務",
      "price": "469920",
      "tax": "free",
      "taxPercentange": "null",
      "fee": "0",
    };
    `;
    this.llamaConnect = new LlamaConnect<AccountInvoiceData>(
      LLAMA_CONFIG.model,
      this.prompts,
      JSON.stringify(AccountInvoiceDataObjectVersion),
      isAccountInvoiceData,
      10
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
    const key = getneratedDescription[0];
    let hashedKey = this.cache.hashId(key);
    if (this.cache.get(hashedKey).value) {
      return `Already extracted, resultId: ${hashedKey}`;
    }
    hashedKey = this.cache.put(key, 'inProgress', null);
    this.ocrToAccountInvoiceData(hashedKey, getneratedDescription);
    return hashedKey;
  }

  public async tempTestOcr(getneratedDescription: string[]): Promise<string> {
    const key = getneratedDescription[0];

    let hashedKey = this.cache.hashId(key);
    if (this.cache.get(hashedKey).value) {
      return `Already extracted, resultId: ${hashedKey}`;
    }
    hashedKey = this.cache.put(key, 'inProgress', null);
    this.ocrToAccountInvoiceData(hashedKey, getneratedDescription);
    return hashedKey;
  }

  public getOCRStatus(resultId: string): AccountProgressStatus {
    const result = this.cache.get(resultId);
    if (!result) {
      return 'error';
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
      const data = await this.llamaConnect.generateData(descriptionString);

      if (data) {
        this.cache.put(hashedId, 'success', data);
      } else {
        this.cache.put(hashedId, 'error', null);
      }
    } catch (e) {
      this.cache.put(hashedId, 'error', null);
    }
  }
}
