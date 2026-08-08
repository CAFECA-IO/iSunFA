// Info: (20260712 - Luphia) Chatroom (Centrifugo) 連線封裝
// Info: (20260712 - Luphia) 提供即時訊息的頻道訂閱（client 端只訂閱；發佈由後端 @/lib/centrifugo 依 CHATROOM_URL 負責）

import { Centrifuge, State } from "centrifuge";
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

/** Info: (20260805 - Tzuhan) 推播連線狀態,供 UI 呈現(壞掉必須看得見) */
export enum ChatroomConnectionStateEnum {
  CONNECTED = "CONNECTED",
  CONNECTING = "CONNECTING",
  DISCONNECTED = "DISCONNECTED",
}

/**
 * Info: (20260805 - Tzuhan) 單一連線實例(singleton)。
 *
 * 原本每次 `subscribeChatroom` 都 `new Centrifuge(...)`,清理時 `disconnect()`。
 * 而訂閱那個 effect 的依賴鏈會一路連到 `sessionAccess` —— 它在掛載後至少三處會非同步寫入
 * (sessions 清單載入、報告草稿還原、帳本綁定),每寫一次整條 callback 就換身分、effect 重跑,
 * 於是頁面剛載入那幾百毫秒內連續建立又關閉連線。WSS 握手要跑完 TLS + HTTP upgrade,
 * 幾乎必然被打斷 —— 實測 console 的
 * `WebSocket is closed before the connection is established` 正是**客戶端在 CONNECTING
 * 狀態呼叫 close()** 才會印的訊息(伺服端拒絕會是 403/502)。
 *
 * 改為:連線只建立一次並持續存在,換房只換訂閱的 channel。
 * 連線本身不再隨 React 的 render 生命週期起落 —— 它本來就不該。
 */
let client: Centrifuge | null = null;

type ConnectionListener = (state: ChatroomConnectionStateEnum) => void;
const connectionListeners = new Set<ConnectionListener>();
// Info: (20260807 - Emily) 每個 channel 目前有幾個訂閱者;歸零才真的拆掉訂閱
const channelRefCounts = new Map<string, number>();
/**
 * Info: (20260807 - Emily) 初值取 CONNECTING 而非 DISCONNECTED
 * (PR review 第 5 點)。
 *
 * subscribeChatroomConnection 在訂閱當下會先推一次目前狀態。
 * 初值若是 DISCONNECTED,只要連線狀態的 effect 比 getClient() 早跑到
 * (或根本還沒有 channel、連線尚未建立),使用者一進頁面就看到
 * 紅色的「連線中斷,請重新整理頁面」—— 而其實什麼事都還沒發生。
 *
 * 「還沒連上」與「連過但斷了」對使用者的意義完全不同:
 * 前者要等,後者要動作。用同一個初值表示兩者,就會叫人去修一個不存在的問題。
 */
let connectionState = ChatroomConnectionStateEnum.CONNECTING;

const setConnectionState = (next: ChatroomConnectionStateEnum): void => {
  if (connectionState === next) return;
  connectionState = next;
  connectionListeners.forEach((listener) => listener(next));
};

const getClient = (): Centrifuge => {
  if (client) return client;
  const created = new Centrifuge(getChatroomWsUrl());
  created.on("connected", () =>
    setConnectionState(ChatroomConnectionStateEnum.CONNECTED),
  );
  created.on("connecting", () =>
    setConnectionState(ChatroomConnectionStateEnum.CONNECTING),
  );
  created.on("disconnected", () =>
    setConnectionState(ChatroomConnectionStateEnum.DISCONNECTED),
  );
  /**
   * Info: (20260805 - Tzuhan) 連線層的 error 不再只轉給呼叫端 —— 它原本被轉成
   * `setIsError(true)`,而 `isError` **沒有任何元件消費**,等於整條推播壞掉時完全靜默。
   * 狀態改由 subscribeChatroomConnection 廣播,UI 據此顯示。
   */
  created.on("error", () => {
    if (created.state !== State.Connected) {
      setConnectionState(ChatroomConnectionStateEnum.DISCONNECTED);
    }
  });
  created.connect();
  client = created;
  return created;
};

/**
 * Info: (20260805 - Tzuhan) 訂閱連線狀態。回傳取消訂閱函式;訂閱當下先推一次目前狀態。
 */
export function subscribeChatroomConnection(
  listener: ConnectionListener,
): () => void {
  connectionListeners.add(listener);
  listener(connectionState);
  return () => {
    connectionListeners.delete(listener);
  };
}

export interface IChatroomSubscribeOptions<T> {
  channel: string;
  onMessage: (data: T) => void;
  onError?: (message: string) => void;
}

/**
 * Info: (20260712 - Luphia) 訂閱指定頻道；回傳清理函式，於元件卸載時取消訂閱
 *
 * Info: (20260805 - Tzuhan) 清理只移除**這一個頻道的訂閱**,不再 disconnect 整條連線。
 * 換房時連線持續存在,新頻道的訂閱不必重新握手。
 */
export function subscribeChatroom<T>({
  channel,
  onMessage,
  onError,
}: IChatroomSubscribeOptions<T>): () => void {
  const centrifuge = getClient();
  // Info: (20260805 - Tzuhan) newSubscription 對已存在的 channel 會拋錯,故先取既有的
  const subscription =
    centrifuge.getSubscription(channel) ?? centrifuge.newSubscription(channel);
  /**
   * Info: (20260807 - Emily) 訂閱重用要配計數 —— 否則拆除是不對稱的
   * (PR review 第 4 點)。
   *
   * 既有訂閱會被重用,但原本的 cleanup 無條件 unsubscribe + removeSubscription:
   * 同一個 channel 有兩個訂閱者時,第一個卸載會把另一個一起殺掉,
   * 而後者不會收到任何錯誤 —— 它只是從此再也收不到訊息。
   *
   * 目前只有一個消費端,所以踩不到。但既然特地寫了重用,
   * 不配計數就是留一顆地雷給下一個呼叫端 —— 而那時候的症狀
   * (訊息莫名其妙不見)與成因(另一個元件卸載了)隔得非常遠。
   */
  channelRefCounts.set(channel, (channelRefCounts.get(channel) ?? 0) + 1);

  const handlePublication = (ctx: { data: unknown }) => {
    onMessage(ctx.data as T);
  };
  const handleError = (ctx: { error?: { message?: string } }) => {
    onError?.(ctx.error?.message || "subscription error");
  };

  subscription.on("publication", handlePublication);
  subscription.on("error", handleError);
  subscription.subscribe();

  return () => {
    subscription.off("publication", handlePublication);
    subscription.off("error", handleError);
    const remaining = (channelRefCounts.get(channel) ?? 1) - 1;
    if (remaining > 0) {
      // Info: (20260807 - Emily) 還有別人在聽:只拆自己的 handler,訂閱留著
      channelRefCounts.set(channel, remaining);
      return;
    }
    channelRefCounts.delete(channel);
    subscription.unsubscribe();
    centrifuge.removeSubscription(subscription);
  };
}

/**
 * Info: (20260807 - Emily) 明確關閉連線並歸零模組狀態(PR review 第 4 點附帶)。
 *
 * `getClient()` 建立的連線原本永不關閉 —— 登出之後 socket 仍然活著,
 * 帶著上一個使用者的憑證繼續重連。對一個推播的是碳盤查草稿的頻道來說,
 * 那不只是資源沒回收。
 *
 * 呼叫端:登出流程。沒有呼叫端時行為與過去完全相同,所以這支的加入不影響現況。
 */
export const disconnectChatroom = (): void => {
  if (!client) return;
  client.disconnect();
  client = null;
  channelRefCounts.clear();
  /**
   * Info: (20260807 - Emily) 回到「還沒連上」而不是「斷線」——
   * 主動關閉不是故障,不該讓 UI 叫使用者去重新整理頁面。
   */
  setConnectionState(ChatroomConnectionStateEnum.CONNECTING);
};
