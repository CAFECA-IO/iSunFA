'use client';

import { useState } from 'react';
import ChatInput from '@/components/chat/chat_input';
import MessageList, { IMessage } from '@/components/chat/message_list';
import { request } from '@/lib/api/request';

// Info: (20260104 - Luphia) interface Message removed in favor of import

export default function ChatInterface() {
  const [messages, setMessages] = useState<IMessage[]>([
    {
      role: 'model',
      content: '我是費思，人工智能財務會計模型。我可以幫您記帳、分析帳本、生成報稅文件、建立財務報表、以及回答任何財務會計問題。',
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (text: string, file: File | null, tags: string[]) => {
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

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-gray-50">
      <MessageList messages={messages} loading={loading} />
      <ChatInput onSend={handleSend} disabled={loading} />
    </div>
  );
}
