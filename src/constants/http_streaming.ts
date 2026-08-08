// Info: (20260806 - Tzuhan) 長時間 HTTP 回應的保活參數(見 src/lib/utils/streaming_response.ts)。

/**
 * Info: (20260806 - Tzuhan) 心跳間隔。
 *
 * 閘道(gateway/nginx)的 `proxy_read_timeout` 預設 60 秒,而它是**閒置**逾時 ——
 * 「只計算兩次連續讀取之間的間隔」。等 LLM 期間一個位元組都沒送,整段都算閒置,
 * 於是任何超過 60 秒的推論都會讓使用者看到 504,即使伺服端其實跑完了。
 *
 * 取 20 秒:60 秒內會有兩次以上寫入,單次網路抖動漏掉一拍也還在安全區;
 * 又不至於頻繁到把回應塞滿無意義的位元組。
 *
 * **刻意不改閘道的逾時設定。** 拉長 `proxy_read_timeout` 等於允許連線長時間空掛,
 * 那是被否決的方向(安全隱患);心跳的作法相反 —— 連線一直是活的,
 * 而閘道對「閒置多久算死」的判斷維持原樣。
 */
export const STREAM_HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Info: (20260806 - Tzuhan) 心跳字元:換行。
 *
 * 為什麼可以直接寫進 JSON 回應的前面而不破壞客戶端 ——
 * `JSON.parse` 依規範忽略前導空白(換行是空白),
 * 而 `Response.json()` 走的就是 `JSON.parse`。因此客戶端**零改動**。
 *
 * 不用註解或 SSE 格式的理由:那兩者都要求客戶端改成對應的解析方式,
 * 而這裡要的只是「讓連線不閒置」,不是要傳遞中途進度。
 */
export const STREAM_HEARTBEAT_CHARACTER = "\n";
