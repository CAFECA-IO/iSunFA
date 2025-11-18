import React from 'react';
import AAALayout from '@/components/ai_accounting_assistance/layout';
import { Button } from '@/components/button/button';
import ChatInput from '@/components/ai_accounting_assistance/chat_input';
import ChatBubble from '@/components/ai_accounting_assistance/chat_bubble';

const ChatMain: React.FC = () => {
  return (
    <div className="mb-140px flex flex-col items-center gap-16px">
      <h2 className="text-36px font-semibold text-text-brand-primary-lv1">
        Welcome! Ready to upload your certificates?
      </h2>
      <div className="flex items-center gap-8px">
        <Button type="button" variant="secondaryOutline" className="px-8px py-4px text-xs">
          Show me certificates that need editing
        </Button>
        <Button type="button" variant="secondaryOutline" className="px-8px py-4px text-xs">
          Review today’s uploaded certificates
        </Button>
      </div>
    </div>
  );
};

const AAAHomePageBody: React.FC = () => {
  return (
    <AAALayout>
      {/* Info: (20251014 - Julian) Chat Main */}
      <ChatMain />
      <div className="flex flex-1 flex-col gap-24px">
        <ChatBubble />
        <ChatBubble />
      </div>
      {/* Info: (20251014 - Julian) Chat Input */}
      <ChatInput />
    </AAALayout>
  );
};

export default AAAHomePageBody;
