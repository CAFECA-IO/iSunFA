import Pusher from 'pusher-js';

let pusherInstance: Pusher | undefined;
let userId: number | undefined;

const pusherConfig = {
  appKey: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
  wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  wsPort: parseFloat(process.env.NEXT_PUBLIC_PUSHER_PORT!),
};

export const getPusherInstance = (id?: number): Pusher => {
  if (!pusherInstance || (!!pusherInstance && userId !== id)) {
    userId = id;
    pusherInstance = new Pusher(pusherConfig.appKey, {
      cluster: pusherConfig.cluster,
      wsHost: pusherConfig.wsHost,
      wsPort: pusherConfig.wsPort,
      channelAuthorization: {
        transport: 'jsonp',
        endpoint: `${pusherConfig.wsHost}/api/v2/pusher/auth`,
        headers: {
          Authorization: `Bearer ${userId}`,
        },
      },
    });
  }
  return pusherInstance;
};
