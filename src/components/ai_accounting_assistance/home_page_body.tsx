import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import AAALayout from '@/components/ai_accounting_assistance/layout';
import { Button } from '@/components/button/button';
import ChatInput from '@/components/ai_accounting_assistance/chat_input';
import ShareModal from '@/components/ai_accounting_assistance/share_link_modal';
import MessageBubble, { ChatRole } from '@/components/ai_accounting_assistance/message_bubble';
import { APIName } from '@/constants/api_connection';
import { ISUNFA_ROUTE } from '@/constants/url';
import APIHandler from '@/lib/utils/api_handler';
import { IFaithContent } from '@/interfaces/faith';

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

enum LoadingType {
  LOADING = 'Loading...',
  CALCULATING = 'Calculating the {{calculateEvent}}...',
  IMPORTING = 'Importing to {{companyName}}',
}
interface IDialog {
  from: ChatRole;
  content: string;
}

const AAAHomePageBody: React.FC = () => {
  const domain = process.env.NEXT_PUBLIC_DOMAIN;
  const chatAreaRef = useRef<HTMLDivElement>(null);

  // ToDo: (20251121 - Julian) 目前先用固定的 sessionId
  const sessionId = '123';
  const params = { sessionId };

  const { trigger: getDialogList, isLoading: isDialogListLoading = true } = APIHandler<
    IFaithContent[]
  >(APIName.LIST_CONTENT_BY_FAITH_SESSION_ID, { params });

  const {
    trigger: postNewDialog,
    // isLoading: isPostNewDialogLoading = true,
    success: postSuccess,
  } = APIHandler(APIName.CREATE_CONTENT_IN_FAITH_SESSION, { params });

  const [newDialogItem, setNewDialogItem] = useState<IDialog | null>(null);
  const [dialogs, setDialogs] = useState<IDialog[]>([]);
  // Deprecated: (20251121 - Luphia) remove eslint-disable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingType, setLoadingType] = useState<LoadingType>(LoadingType.LOADING);
  const [isShowShareModal, setIsShowShareModal] = useState<boolean>(false);

  const sendDisabled = isDialogListLoading;
  const shareLink = `${domain}${ISUNFA_ROUTE.AI_ACCOUNTING_ASSISTANCE}/share/${sessionId}`;

  useEffect(() => {
    // Info: (20251118 - Julian) 只要收到新的 dialog，就自動滾動到最底部
    const el = chatAreaRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [dialogs]);

  useEffect(() => {
    if (!newDialogItem) return;

    // ToDo: (20251121 - Julian) 須確認 body 格式
    const body = { data: newDialogItem };

    // Info: (20251121 - Julian) 發送新問題到後端
    postNewDialog({ body });
  }, [newDialogItem]);

  useEffect(() => {
    const getDialogs = async () => {
      const { data } = await getDialogList({ params });
      // Info: (20251118 - Julian) 將取得的 dialogs 轉成 IDialog 格式
      const fetchedDialogs: IDialog[] = data
        ? data.map((item) => ({
            from: item.role.name === 'user' ? ChatRole.USER : ChatRole.ASSISTANT,
            content: item.textContent,
          }))
        : [];
      setDialogs(fetchedDialogs);
    };

    getDialogs();
  }, [postSuccess]);

  // useEffect(() => {
  //   // ToDo: (20251118 - Julian) sent question to backend and get answer
  //   if (!newDialogItem) return;

  //   // Info: (20251118 - Julian) 將 question 加入 dialog list
  //   setDialogs((prev) => [...prev, newDialogItem]);

  //   // Info: (20251118 - Julian) 模擬從 backend 收到 answer
  //   const assistantDialogItem: IDialog = {
  //     from: ChatRole.ASSISTANT,
  //     content: TEST_ANSWER,
  //   };
  //   setLoadingType(LoadingType.LOADING);
  //   setIsAnsLoading(true);
  //   setTimeout(() => {
  //     setDialogs((prev) => [...prev, assistantDialogItem]);
  //     setIsAnsLoading(false);
  //   }, 1500);

  //   // Info: (20251118 - Julian) 清空 newDialogItem
  //   setNewDialogItem(null);
  // }, [newDialogItem]);

  const toggleShareModal = () => setIsShowShareModal((prev) => !prev);

  const askQuestion = (question: string) => {
    // Info: (20251118 - Julian) 將新問題包成 chat queue item
    const userDialogItem: IDialog = {
      from: ChatRole.USER,
      content: question,
    };
    setNewDialogItem(userDialogItem);
  };

  // Info: (20251118 - Julian) 判斷是否已開始聊天
  const isChatStarted = dialogs.length > 0;

  // Info: (20251118 - Julian) loading 狀態字串
  const loadingStr = isDialogListLoading && (
    <div className="flex min-h-200px items-center gap-8px text-text-brand-primary-lv1">
      <Image src="/animations/yellow_loading.gif" width={30} height={30} alt="loading" />
      <p>{loadingType}</p>
    </div>
  );

  const chatMessages = dialogs.map((chat) => (
    <MessageBubble
      key={chat.content}
      messageContent={chat.content}
      chatRole={chat.from}
      toggleShareModal={toggleShareModal}
      readonly={false}
    />
  ));

  const chatArea = isChatStarted ? (
    <div
      ref={chatAreaRef}
      className="relative mx-auto flex max-w-920px flex-1 flex-col gap-24px overflow-y-auto"
    >
      {chatMessages}
      {loadingStr}
    </div>
  ) : (
    <ChatMain askQuestion={askQuestion} />
  );

  return (
    <AAALayout className="gap-20px">
      {/* Info: (20251014 - Julian) Chat Area */}
      {chatArea}
      {/* Info: (20251014 - Julian) Chat Input */}
      <ChatInput askQuestion={askQuestion} sendDisabled={sendDisabled} />

      {/* Info: (20251124 - Julian) Share Modal */}
      {isShowShareModal && <ShareModal copyLink={shareLink} onClose={toggleShareModal} />}
    </AAALayout>
  );
};

export default AAAHomePageBody;
