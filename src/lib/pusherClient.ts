import Pusher from 'pusher-js';

let pusherInstance: Pusher | null = null;

const pusherConfig = {
  appKey: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
  wsHost: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  wsPort: parseFloat(process.env.NEXT_PUBLIC_PUSHER_PORT!),
};

export const getPusherInstance = (): Pusher => {
  if (!pusherInstance) {
    pusherInstance = new Pusher(pusherConfig.appKey, {
      cluster: pusherConfig.cluster,
      wsHost: pusherConfig.wsHost,
      wsPort: pusherConfig.wsPort,
      channelAuthorization: {
        transport: 'jsonp',
        endpoint: `${pusherConfig.wsHost}/api/pusher/auth`,
        headers: {},
      },
    });
  }
  return pusherInstance;
};
