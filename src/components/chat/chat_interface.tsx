'use client';

import { useState, useEffect } from 'react';
import ChatInput from '@/components/chat/chat_input';
import MessageList, { IMessage } from '@/components/chat/message_list';
import { request } from '@/lib/api/request';
import { useAuth } from '@/contexts/auth_context';
import { useTranslation } from '@/i18n/i18n_context';
import { MODULES } from '@/constants/modules';

// Info: (20260104 - Luphia) interface Message removed in favor of import

// Info: (20260117 - Luphia) Allow className override for embedding in widgets
interface IChatInterfaceProps {
  className?: string;
}

export default function ChatInterface({ className }: IChatInterfaceProps = {}) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const [guestUsage, setGuestUsage] = useState(0);

  // Info: (20260105 - Luphia) Load usage from localStorage on mount
  useEffect(() => {
    const usage = parseInt(localStorage.getItem('guest_usage') || '0', 10);
    setGuestUsage(usage);
  }, []);

  const handleSend = async (text: string, file: File | null, tags: string[]) => {
    // Info: (20260105 - Luphia) Check Guest Limit
    if (!user) {
      if (guestUsage >= 5) {
        return;
      }
      const newUsage = guestUsage + 1;
      setGuestUsage(newUsage);
      localStorage.setItem('guest_usage', newUsage.toString());
    }

    // Info: (20260104 - Luphia) 1. Create User Message
    const fileUrl = file ? URL.createObjectURL(file) : undefined;
    const userMsg: IMessage = {
      role: 'user',
      content: text,
      image: fileUrl,
      mimeType: file?.type,
      tags
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Info: (20260104 - Luphia) 2. Convert File to Base64 if exists
      let base64Data = null;
      if (file) {
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
        });
      }

      // Info: (20260104 - Luphia) 3. Call API
      const response = await request<{ payload: { reply: string } }>('/api/v1/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          tags,
          image: base64Data,
          mimeType: file?.type,

        }),
      });

      // Info: (20260104 - Luphia) 4. Add AI Response
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: response.payload.reply },
      ]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: '抱歉，發生錯誤，請稍後再試。' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isGuestLimitReached = !user && guestUsage >= 5;

  // Info: (20260117 Luphia) Determine allowed tags
  const allowedTags = user
    ? user.modules || []
    : MODULES.filter(m => m.basic).map(m => m.key);

  return (
    <div className={`flex flex-col bg-gray-50 relative ${className || 'h-[calc(100vh-64px)]'}`}>
      {!user && !authLoading && (
        <div className={`px-4 py-2 text-sm text-center border-b ${isGuestLimitReached ? 'bg-red-50 text-red-800 border-red-100' : 'bg-yellow-50 text-yellow-800 border-yellow-100'}`}>
          {isGuestLimitReached ? t('chat.guest_limit_reached') : t('chat.login_warning')}
        </div>
      )}
      <MessageList messages={messages} loading={loading} />
      <ChatInput
        onSend={handleSend}
        disabled={loading || isGuestLimitReached}
        allowedTags={allowedTags}
      />
    </div>
  );
}
