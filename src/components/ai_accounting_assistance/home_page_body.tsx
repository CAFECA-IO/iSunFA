import React, { useState, useEffect } from 'react';
import AAALayout from '@/components/ai_accounting_assistance/layout';
import { Button } from '@/components/button/button';
import ChatInput from '@/components/ai_accounting_assistance/chat_input';
import QuestionBubble from '@/components/ai_accounting_assistance/question_bubble';
import AnswerBubble from '@/components/ai_accounting_assistance/answer_bubble';

const TEST_ANSWER =
  '# This is Title\nHere is a list:\n - option 1\n - option 2\n - option 3\n\n [This is a link](https://www.example.com)\n\n This is a very very long message to test the UI. Do you know Pneumonoultramicroscopicsilicovolcanoconiosis? It is a lung disease caused by inhaling very fine silicate or quartz dust. If you are interested, you can read more about it [here](https://en.wikipedia.org/wiki/Pneumonoultramicroscopicsilicovolcanoconiosis).';

interface IChatMainProps {
  askQuestion: (question: string) => void;
}

const ChatMain: React.FC<IChatMainProps> = ({ askQuestion }) => {
  const questions = [
    'What certificates need editing?',
    'Can you review today’s uploaded certificates?',
  ];

  const tags = questions.map((question) => {
    const handleClick = () => askQuestion(question);

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

enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}
interface IChatQueue {
  from: ChatRole;
  content: string;
}

const AAAHomePageBody: React.FC = () => {
  const [newQueueItem, setNewQueueItem] = useState<IChatQueue | null>(null);
  const [chatQueues, setChatQueues] = useState<IChatQueue[]>([]);
  const [isAnsLoading, setIsAnsLoading] = useState<boolean>(false);

  useEffect(() => {
    // ToDo: (20251118 - Julian) sent question to backend and get answer
    if (!newQueueItem) return;

    // Info: (20251118 - Julian) 將 question 加入 chat queues
    setChatQueues((prev) => [...prev, newQueueItem]);

    // Info: (20251118 - Julian) 模擬從 backend 收到 answer
    const assistantQueueItem: IChatQueue = {
      from: ChatRole.ASSISTANT,
      content: TEST_ANSWER,
    };
    setIsAnsLoading(true);
    setTimeout(() => {
      setChatQueues((prev) => [...prev, assistantQueueItem]);
      setIsAnsLoading(false);
    }, 1500);

    // Info: (20251118 - Julian) 清空 newQueueItem
    setNewQueueItem(null);
  }, [newQueueItem]);

  const askQuestion = (question: string) => {
    // Info: (20251118 - Julian) 將新問題包成 chat queue item
    const userQueueItem: IChatQueue = {
      from: ChatRole.USER,
      content: question,
    };
    setNewQueueItem(userQueueItem);
  };

  // Info: (20251118 - Julian) 判斷是否已開始聊天
  const isChatStarted = chatQueues.length > 0;

  const chatMessages = chatQueues.map((chat) =>
    chat.from === ChatRole.USER ? (
      <QuestionBubble key={chat.content} questionContent={chat.content} />
    ) : (
      <AnswerBubble key={chat.content} answerContent={chat.content} />
    )
  );

  const chatArea = isChatStarted ? (
    <div className="mb-20px flex flex-1 flex-col gap-24px overflow-y-auto">
      {chatMessages}
      {isAnsLoading && <div className="animate-pulse">Loading...</div>}
    </div>
  ) : (
    <ChatMain askQuestion={askQuestion} />
  );

  return (
    <AAALayout>
      {/* Info: (20251014 - Julian) Chat Area */}
      {chatArea}
      {/* Info: (20251014 - Julian) Chat Input */}
      <ChatInput askQuestion={askQuestion} />
    </AAALayout>
  );
};

export default AAAHomePageBody;
