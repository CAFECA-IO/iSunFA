import React, { SetStateAction, useState } from 'react';
import AAALayout from '@/components/ai_accounting_assistance/layout';
import { Button } from '@/components/button/button';
import ChatInput from '@/components/ai_accounting_assistance/chat_input';
import AnswerBubble from '@/components/ai_accounting_assistance/answer_bubble';

const TEST_MESSAGE =
  '# This is Title\nHere is a list:\n - option 1\n - option 2\n - option 3\n\n [This is a link](https://www.example.com)\n\n This is a very very long message to test the UI. Do you know Pneumonoultramicroscopicsilicovolcanoconiosis? It is a lung disease caused by inhaling very fine silicate or quartz dust. If you are interested, you can read more about it [here](https://en.wikipedia.org/wiki/Pneumonoultramicroscopicsilicovolcanoconiosis).';

interface IChatMainProps {
  setIsChatStarted: React.Dispatch<SetStateAction<boolean>>;
}

const ChatMain: React.FC<IChatMainProps> = ({ setIsChatStarted }) => {
  const questions = [
    'What certificates need editing?',
    'Can you review today’s uploaded certificates?',
  ];

  const tags = questions.map((question) => {
    const handleClick = () => {
      // ToDo: (20251118 - Julian) sent question to backend
      setIsChatStarted(true);
    };

    return (
      <Button
        key={question}
        type="button"
        variant="secondaryOutline"
        onClick={handleClick}
        className="px-8px py-4px text-xs"
      >
        {question}
      </Button>
    );
  });

  return (
    <div className="mb-140px flex flex-col items-center gap-16px">
      <h2 className="text-36px font-semibold text-text-brand-primary-lv1">
        Welcome! Ready to upload your certificates?
      </h2>
      <div className="flex items-center gap-8px">{tags}</div>
    </div>
  );
};

const AAAHomePageBody: React.FC = () => {
  const [isChatStarted, setIsChatStarted] = useState<boolean>(false);

  const chatArea = isChatStarted ? (
    <div className="mb-20px flex flex-1 flex-col gap-24px overflow-y-auto">
      <AnswerBubble answerContent={TEST_MESSAGE} />
    </div>
  ) : (
    <ChatMain setIsChatStarted={setIsChatStarted} />
  );

  return (
    <AAALayout>
      {/* Info: (20251014 - Julian) Chat Area */}
      {chatArea}
      {/* Info: (20251014 - Julian) Chat Input */}
      <ChatInput />
    </AAALayout>
  );
};

export default AAAHomePageBody;
