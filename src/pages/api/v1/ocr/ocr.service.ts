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
import { ocrPrompt } from '@/constants/prompts/ocr_prompt';

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
    this.prompts = ocrPrompt;
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

    // Deprecation Murky (20240423) debug
    // eslint-disable-next-line no-console
    // console.log('OCR from google: ', getneratedDescription.concat('\n'));

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
