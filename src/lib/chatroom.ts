// Info: (20260712 - Luphia) Chatroom (Centrifugo) 連線封裝
// Info: (20260712 - Luphia) 提供即時訊息的頻道訂閱（client 端只訂閱；發佈由後端 @/lib/centrifugo 負責），連線位址由 NEXT_PUBLIC_CHATROOM_PORT 決定

import { Centrifuge } from "centrifuge";
import { DEFAULT_CHATROOM_PORT } from "@/constants/chatroom";

// Info: (20260712 - Luphia) 依 NEXT_PUBLIC_CHATROOM_PORT 組出 Centrifugo WebSocket 連線位址
// Info: (20260712 - Luphia) 開發環境 (Next 執行於 :3000) 直連 chatroom port；其餘情境經由同源 gateway
export function getChatroomWsUrl(): string {
  const port = process.env.NEXT_PUBLIC_CHATROOM_PORT || DEFAULT_CHATROOM_PORT;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname;
  const currentPort = window.location.port;

  return currentPort === "3000"
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
