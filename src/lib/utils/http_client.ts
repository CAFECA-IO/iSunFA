/**
 * Info: (20260407 - Tzuhan) fetch 封裝：支援 Timeout 與指數退避重試 (Exponential Backoff)
 * @param url 請求網址
 * @param options fetch 設定檔
 * @param maxRetries 最大重試次數 (預設 3 次)
 * @param baseDelayMs 基礎延遲毫秒 (預設 2000ms，每次重試會翻倍: 2s -> 4s -> 8s)
 * @param timeoutMs 請求超時毫秒 (預設 15000ms)
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 3,
    baseDelayMs: number = 2000,
    timeoutMs: number = 15000
): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        // Info: (20260407 - Tzuhan) 建立 AbortController 處理 Timeout 防護
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Info: (20260407 - Tzuhan) 遇到 429 (請求過於頻繁) 或 5xx (伺服器端錯誤) 時，拋出錯誤以觸發重試
            if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }

            // Info: (20260407 - Tzuhan) 成功，或遇到 404/400 等明確的客戶端邏輯錯誤，直接回傳交給上層 Service 處理
            return response;

        } catch (error) {
            clearTimeout(timeoutId);

            const isTimeout = error instanceof Error && error.name === 'AbortError';
            const errorMsg = isTimeout ? `請求超時 (${timeoutMs}ms)` : (error as Error).message;

            // Info: (20260407 - Tzuhan) 如果已經達到最大重試次數，則將 Error 往上拋出
            if (attempt === maxRetries) {
                console.error(`   🚨 [網路底層] 請求徹底失敗 (${url}): ${errorMsg}`);
                throw error;
            }

            // Info: (20260407 - Tzuhan) 指數退避演算法計算下一次的等待時間
            const delayMs = baseDelayMs * Math.pow(2, attempt);
            console.warn(`   ⚠️ [網路底層] 請求異常 (${errorMsg})，等待 ${delayMs / 1000} 秒後進行第 ${attempt + 1} 次重試...`);

            // Info: (20260407 - Tzuhan) 暫停執行指定的時間
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    throw new Error('Unreachable');
}