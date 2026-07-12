// Info: (20260712 - Luphia) server 端發佈訊息到 Centrifugo（內部直連，不經公開 TLS gateway，避免自簽憑證問題）

import {
  DEFAULT_CHATROOM_URL,
  DEFAULT_CENTRIFUGO_API_KEY,
} from "@/constants/chatroom";

// Info: (20260712 - Luphia) 後端內部直連位址：由 CHATROOM_URL 決定（不經公開 TLS gateway），未設定則用預設
function getCentrifugoApiUrl(): string {
  return process.env.CHATROOM_URL || DEFAULT_CHATROOM_URL;
}

// Info: (20260712 - Luphia) 將 data 發佈到指定頻道；失敗時 throw 由呼叫端處理
export async function publishToCentrifugo(
  channel: string,
  data: unknown,
): Promise<void> {
  const apiKey = process.env.CENTRIFUGO_API_KEY || DEFAULT_CENTRIFUGO_API_KEY;

  const response = await fetch(`${getCentrifugoApiUrl()}/api/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
    body: JSON.stringify({ channel, data }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Centrifugo publish failed: ${response.status} ${errorText}`,
    );
  }

  const result = await response.json();
  if (result?.error) {
    throw new Error(result.error.message || "Centrifugo publish error");
  }
}
