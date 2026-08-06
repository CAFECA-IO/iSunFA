/**
 * Info: (20260806 - Tzuhan) 保活式 JSON 回應:給「單次呼叫本來就會超過閘道逾時」的端點用。
 *
 * ## 要解的問題
 *
 * 閘道的 `proxy_read_timeout` 預設 60 秒,而那是**閒置**逾時
 * (nginx 文件:「只計算兩次連續讀取之間的間隔」)。
 * 等 LLM 期間一個位元組都沒送,整段都算閒置 —— 於是:
 *
 * - 結構圖 `LLM_DIAGRAM_TIMEOUT_MS = 90s`(最長那張圖 45s 版本以 8 毫秒之差逾時,不能調小)
 * - 整份報告匯入 `LLM_REPORT_IMPORT_TIMEOUT_MS = 240s`(ch4 只有 3 節卻跑 2.5 分鐘,切不動)
 *
 * 兩者都會讓使用者看到 504,而伺服端其實跑完了。
 *
 * ## 為什麼是心跳,不是拉長逾時
 *
 * 拉長 `proxy_read_timeout` 等於允許連線長時間空掛,那是被否決的方向。
 * 心跳的作法相反:連線一直是活的,閘道對「閒置多久算死」的判斷維持原樣,
 * 而且**不動任何一行 nginx 設定** —— 修的是應用層的行為,不是把閘道的護欄放寬。
 *
 * ## 代價(說清楚,不假裝沒有)
 *
 * 一旦開始串流,HTTP 狀態碼就鎖成 200,失敗無法再用狀態碼表達。
 * 因此 `work` 回傳的是**完整的回應信封**(`ok()` 或 `fail()`),
 * 由信封裡的 `success` / `errorCode` 承擔原本狀態碼的職責。
 *
 * 這對呼叫端不是新規則:失敗資訊本來就在信封裡(`request()` 讀的正是 `data.errorCode`)。
 * 但客戶端**必須改成判 `success` 而非只判 HTTP 狀態** —— 這是採用本模組的前提,
 * 端點改用它時務必一併改前端,否則失敗會被當成成功。
 *
 * 也因此:授權、限流、Schema 驗證一律留在串流**之前**用 `jsonFail` 回。
 * 那些失敗要在正確的狀態碼上(401/429/400),而且它們都在 LLM 之前,天然做得到。
 */

import { IApiResponse } from "@/lib/utils/response";
import {
  STREAM_HEARTBEAT_CHARACTER,
  STREAM_HEARTBEAT_INTERVAL_MS,
} from "@/constants/http_streaming";

export interface IStreamingJsonOptions {
  /** Info: (20260806 - Tzuhan) 心跳間隔;預設 STREAM_HEARTBEAT_INTERVAL_MS(測試可縮短) */
  heartbeatIntervalMs?: number;
}

/**
 * Info: (20260806 - Tzuhan) 立即送出 200 表頭,等 `work` 期間定期寫心跳保持連線非閒置,
 * `work` 結束後寫出完整信封並關閉。
 *
 * `work` 一律**不得拋錯**:它自己把錯誤轉成 `fail(...)` 信封。
 * 真的拋出來時本模組回一個 `IS_UNKNOWN` 信封(由呼叫端提供),
 * 而不是讓連線無聲斷掉 —— 斷掉的表現與 504 一模一樣,等於白做。
 */
export function streamingJson(
  work: () => Promise<IApiResponse<unknown>>,
  onUnexpectedError: (error: unknown) => IApiResponse<null>,
  options: IStreamingJsonOptions = {},
): Response {
  const heartbeatIntervalMs =
    options.heartbeatIntervalMs ?? STREAM_HEARTBEAT_INTERVAL_MS;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let finished = false;
      /**
       * Info: (20260806 - Tzuhan) 心跳寫入包 try:客戶端提早離線時 enqueue 會拋,
       * 而那個拋出發生在 interval 回呼裡 —— 不接就是一個沒人處理的例外。
       * 客戶端走了就沒必要再敲,停掉即可。
       */
      const heartbeat = setInterval(() => {
        if (finished) return;
        try {
          controller.enqueue(encoder.encode(STREAM_HEARTBEAT_CHARACTER));
        } catch {
          clearInterval(heartbeat);
        }
      }, heartbeatIntervalMs);

      let envelope: IApiResponse<unknown>;
      try {
        envelope = await work();
      } catch (error) {
        envelope = onUnexpectedError(error);
      }
      /**
       * Info: (20260806 - Tzuhan) 先關心跳再寫信封。
       * 兩者之間沒有 await,而 JS 是單執行緒 —— interval 回呼不可能插進來,
       * 所以信封後面不會再多出心跳字元。
       */
      finished = true;
      clearInterval(heartbeat);
      try {
        controller.enqueue(encoder.encode(JSON.stringify(envelope)));
        controller.close();
      } catch {
        // Info: (20260806 - Tzuhan) 客戶端已離線:結果送不出去,但工作已完成,沒有別的補救動作
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      /**
       * Info: (20260806 - Tzuhan) 仍宣告 application/json:內容確實是 JSON
       * (前面那幾個換行是合法的前導空白)。客戶端因此完全不必改解析方式。
       */
      "Content-Type": "application/json; charset=utf-8",
      // Info: (20260806 - Tzuhan) 推論結果不得被任何中間層快取(同一段落可能重跑)
      "Cache-Control": "no-store",
      /**
       * Info: (20260806 - Tzuhan) 刻意**不加** `X-Accel-Buffering: no`。
       * 逾時只看「有沒有讀到」:nginx 即使開著 proxy_buffering,
       * 每次從上游讀到心跳都會重設 proxy_read_timeout。
       * 關掉緩衝是為了「即時看到中途輸出」,而這裡不需要中途輸出 ——
       * 少改一個行為就少一個要驗證的變數。
       */
    },
  });
}
