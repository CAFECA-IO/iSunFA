import React, { useState, useEffect } from 'react';
import { PiCopySimple } from 'react-icons/pi';
import { SlRefresh } from 'react-icons/sl';
import { FaCheck } from 'react-icons/fa6';
import { FiThumbsUp, FiThumbsDown } from 'react-icons/fi';
import { HiOutlineLightBulb } from 'react-icons/hi2';

const ChatBubble: React.FC = () => {
  const message = `###This is Title`;

  const [isCopySuccess, setIsCopySuccess] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean | null>(null);

  const isLikeActive = isLiked === true;
  const isDislikeActive = isLiked === false;

  useEffect(() => {
    if (isCopySuccess) {
      const timer = setTimeout(() => {
        setIsCopySuccess(false);
      }, 2000); // Info: (20251118 - Julian) 2 秒後重置

      return () => clearTimeout(timer);
    }
  }, [isCopySuccess]);

  const copyHandler = () => {
    navigator.clipboard.writeText(message);
    setIsCopySuccess(true);
  };

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

  const thinkingHandler = () => {};

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

  const likeBtn = (
    <button
      type="button"
      onClick={likeHandler}
      className={`${isLikeActive ? 'text-tabs-text-active' : 'text-button-text-secondary hover:text-button-text-secondary-hover'} flex items-center gap-10px p-10px`}
    >
      <FiThumbsUp size={24} />
      <p
        className={`${isLikeActive ? 'w-160px' : 'w-0'} overflow-hidden whitespace-nowrap text-left text-xs text-chat-bubbles-text-brand transition-all duration-200 ease-in-out`}
      >
        Thank you for your feed back!
      </p>
    </button>
  );

  const dislikeBtn = (
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

  return (
    <div className="flex flex-col gap-5px">
      <div className="flex flex-col gap-8px rounded-lg bg-cyan-400 p-20px"></div>

      {/* Info: (20251118 - Julian) Toolbar */}
      <div className="flex items-center py-4px">
        {copyBtn}
        <button
          type="button"
          onClick={refreshHandler}
          className="p-10px text-button-text-secondary hover:text-button-text-secondary-hover"
        >
          <SlRefresh size={24} />
        </button>
        {likeBtn}
        {dislikeBtn}
        <button
          type="button"
          onClick={thinkingHandler}
          className="p-10px text-button-text-secondary hover:text-button-text-secondary-hover"
        >
          <HiOutlineLightBulb size={24} />
        </button>
      </div>
    </div>
  );
};

export default ChatBubble;
