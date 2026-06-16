/**
 * Info: (20260615 - Julian) 安全的瀏覽器本地儲存 (localStorage) 封裝工具，防止 SSR 與無痕隱私模式崩潰。
 */
export const safeStorage = {
  /**
   * Info: (20260615 - Julian) 安全取得暫存資料
   */
  getItem: (key: string): string | null => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return null;
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`[safeStorage] 讀取鍵值 "${key}" 失敗:`, error);
      return null;
    }
  },

  /**
   * Info: (20260615 - Julian) 安全寫入暫存資料
   */
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn(`[safeStorage] 寫入鍵值 "${key}" 失敗:`, error);
    }
  },

  /**
   * Info: (20260615 - Julian) 安全刪除暫存資料
   */
  removeItem: (key: string): void => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[safeStorage] 刪除鍵值 "${key}" 失敗:`, error);
    }
  },

  /**
   * Info: (20260615 - Julian) 安全地清空所有暫存資料
   */
  clear: (): void => {
    try {
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }
      localStorage.clear();
    } catch (error) {
      console.warn("[safeStorage] 清空 localStorage 失敗:", error);
    }
  },
};
