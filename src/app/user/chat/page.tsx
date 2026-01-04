'use client';

import Header from '@/components/landing_page/header';
import ChatInterface from '@/components/chat/chat_interface';

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        <ChatInterface />
      </main>
    </div>
  );
}
