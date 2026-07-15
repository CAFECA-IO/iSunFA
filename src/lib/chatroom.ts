// Info: (20260712 - Luphia) Chatroom (Centrifugo) 連線封裝
// Info: (20260712 - Luphia) 提供即時訊息的頻道訂閱（client 端只訂閱；發佈由後端 @/lib/centrifugo 依 CHATROOM_URL 負責）

import { Centrifuge } from "centrifuge";
import { DEFAULT_CHATROOM_PORT } from "@/constants/chatroom";

// Info: (20260712 - Luphia) 組出 Centrifugo WebSocket 連線位址
// Info: (20260714 - Emily) 本機開發(localhost/127.0.0.1)不論 Next 跑哪個 port 一律直連 chatroom port;
// Info: (20260714 - Emily) 原判斷寫死 port 3000,若 3000 被占用改跑其他 port,訂閱會連到不存在的同源 gateway,
// Info: (20260714 - Emily) AI 回覆永遠送不到(僅入庫),前端每次等 30 秒逾時
// Info: (20260712 - Luphia) 前端不讀後端內部位址 CHATROOM_URL（那是 127.0.0.1 內部直連，瀏覽器不可達）
export function getChatroomWsUrl(): string {
  const port = DEFAULT_CHATROOM_PORT;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const isLocalDev = host === "localhost" || host === "127.0.0.1";

  return isLocalDev
    ? `${protocol}//${host}:${port}/connection/websocket`
    : `${protocol}//${window.location.host}/connection/websocket`;
}

export interface IChatroomSubscribeOptions<T> {
  channel: string;
  onMessage: (data: T) => void;
  onError?: (message: string) => void;
}

// Info: (20260712 - Luphia) 訂閱指定頻道；回傳清理函式，於元件卸載時取消訂閱並斷線
export function subscribeChatroom<T>({
  channel,
  onMessage,
  onError,
}: IChatroomSubscribeOptions<T>): () => void {
  const centrifuge = new Centrifuge(getChatroomWsUrl());
  const subscription = centrifuge.newSubscription(channel);

  subscription.on("publication", (ctx) => {
    onMessage(ctx.data as T);
  });

  if (onError) {
    subscription.on("error", (ctx) =>
      onError(ctx.error?.message || "subscription error"),
    );
    centrifuge.on("error", () => onError("connection error"));
  }

  subscription.subscribe();
  centrifuge.connect();

  return () => {
    subscription.unsubscribe();
    centrifuge.disconnect();
  };
}
