import { AccountInvoiceData } from '@/interfaces/account';
import LRUCache from '@/lib/utils/lru_cache';
import GoogleVisionClientSingleton from '@/lib/utils/google_vision_singleton';

export default class OCRService {
  private cache: LRUCache<AccountInvoiceData>;

  constructor() {
    this.cache = new LRUCache<AccountInvoiceData>(10, 20);
  }

  public async extractTextFromImage(imagePath: string): Promise<string> {
    const getneratedDescription = await GoogleVisionClientSingleton.generateDescription(imagePath);
    const key = getneratedDescription[0];
    if (this.cache.get(key)) {
      return 'Already extracted';
    }

    this.cache.put(key, 'inProgress', null);
    return key;
  }
}
