import Pusher from 'pusher';

// Info: (20241009-tzuhan) 初始化 Pusher
const pusherConfig = {
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  host: process.env.NEXT_PUBLIC_PUSHER_HOST!,
  useTLS: process.env.PUSHER_USE_TLS === 'true',
};

let pusherInstance: Pusher | null = null;

export const getPusherInstance = (): Pusher => {
  if (!pusherInstance) {
    pusherInstance = new Pusher(pusherConfig);
  }
  return pusherInstance;
};
