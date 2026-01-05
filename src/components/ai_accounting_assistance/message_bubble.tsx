import React, { useState, useEffect } from 'react';
import { useModalContext } from '@/contexts/modal_context';
import { PiCopySimple } from 'react-icons/pi';
import { SlRefresh } from 'react-icons/sl';
import { FaCheck } from 'react-icons/fa6';
import { FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import { LuShare2 } from 'react-icons/lu';
import { HiOutlineLightBulb } from 'react-icons/hi2';
import { marked } from 'marked';
import { ToastType } from '@/interfaces/toastify';

export enum ChatRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

interface IMessageBubbleProps {
  chatRole: ChatRole;
  messageContent: string;
  toggleShareModal?: () => void;
  readonly?: boolean;
}

const MessageBubble: React.FC<IMessageBubbleProps> = ({
  chatRole,
  messageContent,
  toggleShareModal,
  readonly = false,
}) => {
  const { toastHandler } = useModalContext();

  const [messageText, setMessageText] = useState<string>('');
  const [isCopySuccess, setIsCopySuccess] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean | null>(null);
  const [isShowThinkingChain, setIsShowThinkingChain] = useState<boolean>(false);

  const isLikeActive = isLiked === true;
  const isDislikeActive = isLiked === false;

  const isUserMessage = chatRole === ChatRole.USER;

  const bubbleColor = isUserMessage
    ? 'border-chat-bubbles-surface-primary bg-chat-bubbles-surface-primary'
    : 'border-chat-bubbles-stroke-bubble-outline bg-chat-bubbles-surface-secondary';

  // Info: (20251118 - Julian) 取得純文字，用於複製到剪貼簿
  const pureTextMessage = messageText.replace(/<[^>]+>/g, '');

  useEffect(() => {
    const fetchMessage = async () => {
      const htmlMessage = await marked.parse(messageContent);

      // Info: (20251118 - Julian) 加入樣式
      const styledMessage = htmlMessage
        // Info: (20251118 - Julian) h1 標題
        .replaceAll(/<h1/g, '<h1 class="text-xl font-bold" ')
        // Info: (20251118 - Julian) ul 列表
        .replaceAll(/<ul/g, '<ul class="list-disc list-inside ml-8px" ')
        // Info: (20251118 - Julian) a 連結
        .replaceAll(/<a /g, '<a class="text-link-text-primary font-semibold" ')
        // Info: (20251118 - Julian) img 圖片
        .replaceAll(/<img /g, '<img class="max-w-250px h-auto" ');

      setMessageText(styledMessage);
    };

    fetchMessage();
  }, []);

  useEffect(() => {
    if (isCopySuccess) {
      const timer = setTimeout(() => {
        setIsCopySuccess(false);
      }, 2000); // Info: (20251118 - Julian) 2 秒後重置

      return () => clearTimeout(timer);
    }
  }, [isCopySuccess]);

  const copyHandler = () => {
    navigator.clipboard.writeText(pureTextMessage);
    setIsCopySuccess(true);

    // Info: (20251119 - Julian) 顯示複製成功 Toast
    toastHandler({
      id: 'copy-success',
      type: ToastType.SUCCESS,
      content: 'Copied!',
      closeable: true,
      autoClose: 1000,
    });
  };

  // ToDo: (20251118 - Julian) refresh 功能待實作
  const refreshHandler = () => {};

  const likeHandler = () => {
    if (isLikeActive) {
      setIsLiked(null); // Info: (20251118 - Julian) 取消按讚
    } else {
      setIsLiked(true);
    }
  };

  const dislikeHandler = () => {
    if (isDislikeActive) {
      setIsLiked(null); // Info: (20251118 - Julian) 取消倒讚
    } else {
      setIsLiked(false);
    }
  };

  // ToDo: (20251118 - Julian) thinking chain 功能待實作
  const thinkingHandler = () => {
    setIsShowThinkingChain((prev) => !prev);
  };

  const copyBtn = isCopySuccess ? (
    <div className="p-10px text-text-state-success">
      <FaCheck size={24} />
    </div>
  ) : (
    <button
      type="button"
      onClick={copyHandler}
      className="p-10px text-button-text-secondary hover:text-button-text-secondary-hover"
    >
      <PiCopySimple size={24} />
    </button>
  );

  // Info: (20251124 - Julian) 唯獨模式下 refresh 按鈕不可用
  const refreshBtn = readonly ? null : (
    <button
      type="button"
      onClick={refreshHandler}
      className="p-10px text-button-text-secondary hover:text-button-text-secondary-hover"
    >
      <SlRefresh size={24} />
    </button>
  );

  // Info: (20251124 - Julian) 唯獨模式下 share 按鈕不可用
  const shareBtn = readonly ? null : (
    <button
      type="button"
      onClick={toggleShareModal}
      className="p-10px text-button-text-secondary hover:text-button-text-secondary-hover"
    >
      <LuShare2 size={24} />
    </button>
  );

  // Info: (20251124 - Julian) 唯獨模式下 like 按鈕不可用
  const likeBtn = readonly ? null : (
    <button
      type="button"
      onClick={likeHandler}
      className={`${isLikeActive ? 'text-tabs-text-active' : 'text-button-text-secondary hover:text-button-text-secondary-hover'} flex items-center gap-10px p-10px`}
    >
      <FiThumbsUp className="" size={24} />
      <p
        className={`${isLikeActive ? 'w-160px' : 'w-0'} overflow-hidden whitespace-nowrap text-left text-xs text-chat-bubbles-text-brand transition-all duration-200 ease-in-out`}
      >
        Thank you for your feed back!
      </p>
    </button>
  );

  // Info: (20251124 - Julian) 唯獨模式下 dislike 按鈕不可用
  const dislikeBtn = readonly ? null : (
    <button
      type="button"
      onClick={dislikeHandler}
      className={`${isDislikeActive ? 'text-tabs-text-active' : 'text-button-text-secondary hover:text-button-text-secondary-hover'} flex items-center gap-10px p-10px`}
    >
      <FiThumbsDown size={24} />
      <p
        className={`${isDislikeActive ? 'w-160px' : 'w-0'} overflow-hidden whitespace-nowrap text-left text-xs text-chat-bubbles-text-brand transition-all duration-200 ease-in-out`}
      >
        Thank you for your feed back!
      </p>
    </button>
  );

  const thinkingBtn = (
    <button
      type="button"
      onClick={thinkingHandler}
      className={`${isShowThinkingChain ? 'text-tabs-text-active' : 'text-button-text-secondary hover:text-button-text-secondary-hover'} p-10px`}
    >
      <HiOutlineLightBulb size={24} />
    </button>
  );

  const messageBubble = (
    <div
      className={`${bubbleColor} w-fit min-w-300px whitespace-pre-wrap rounded-lg border p-20px font-medium text-chat-bubbles-text-primary`}
    >
      <article
        className="flex flex-col gap-8px"
        dangerouslySetInnerHTML={{ __html: messageText }}
      />
    </div>
  );

  if (isUserMessage) {
    return <div className="ml-auto">{messageBubble}</div>;
  }

  return (
    <div className="mr-auto flex flex-col gap-5px">
      {/* Info: (20251118 - Julian) Message Bubble */}
      {messageBubble}

      {/* Info: (20251118 - Julian) Toolbar */}
      <div className="flex items-center py-4px">
        {copyBtn}
        {refreshBtn}
        {shareBtn}
        {likeBtn}
        {dislikeBtn}
        {thinkingBtn}
      </div>
    </div>
  );
};

export default MessageBubble;
