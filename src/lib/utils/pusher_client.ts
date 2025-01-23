import Pusher from 'pusher-js';

let pusherInstance: Pusher | undefined;
let userId: number | undefined;

const pusherConfig = {
  appKey: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
  wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  wsPort: parseFloat(process.env.NEXT_PUBLIC_PUSHER_PORT!),
  useTLS: process.env.PUSHER_USE_TLS === 'true',
};

export const getPusherInstance = (id?: number): Pusher => {
  if (!pusherInstance || (!!pusherInstance && userId !== id)) {
    userId = id;
    pusherInstance = new Pusher(pusherConfig.appKey, {
      cluster: pusherConfig.cluster,
      wsHost: pusherConfig.wsHost,
      wsPort: pusherConfig.wsPort,
      forceTLS: pusherConfig.useTLS,
      channelAuthorization: {
        transport: 'ajax', // Info: (20241120 - tzuhan) ajax：使用 XMLHttpRequest 發送 POST 請求（預設）。 jsonp：使用 <script> 標籤進行跨域請求，發送 GET 請求。
        endpoint: `/api/v2/pusher/auth`,
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      },
    });
  }
  return pusherInstance;
};
