import { useEffect, useState } from 'react';
import { getPusherInstance } from '@/lib/utils/pusher_client';

interface MessageData {
  id: string;
  message: string;
}

const usePrivateChannel = (userId: number) => {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const pusher = getPusherInstance(userId);

    // Info: (20241119 - tzuhan) 訂閱私人頻道
    const channel = pusher.subscribe(`private-user-${userId}`);

    // Info: (20241119 - tzuhan) 綁定事件
    channel.bind('new-message', (data: MessageData) => {
      setMessages((prev) => [...prev, data.message]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [userId]);

  return { messages };
};

export default usePrivateChannel;
