import React, { useState, useRef } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiSend } from 'react-icons/fi';
import { Button } from '@/components/button/button';

const FOUR_LINE_HEIGHT_PX = 24 * 4;

const ChatInput: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [isOverFourLines, setIsOverFourLines] = useState<boolean>(false);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;

    // Info: (20251114 - Julian) 自動調整 textarea 高度
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;

    // Info: (20251114 - Julian) 判斷是否超過四行
    setIsOverFourLines(el.scrollHeight >= FOUR_LINE_HEIGHT_PX);
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    autoResize();
  };

  // ToDo: (20251114 - Julian) Send message logic here
  const sendMessage = () => {
    setInputValue('');

    const el = textareaRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.style.height = 'auto'; // Info: (20251114 - Julian) 重置 textarea 高度
      });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Info: (20251114 - Julian) 送出快捷鍵： Shift + Enter
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4px">
      <div
        className={`${isOverFourLines ? 'items-end' : 'items-center'} flex h-auto w-full max-w-920px gap-16px rounded-md border border-input-stroke-input bg-input-surface-input-background p-12px`}
      >
        <Button type="button" size="defaultSquare">
          <FaPlus />
        </Button>
        <textarea
          id="chat-input"
          value={inputValue}
          ref={textareaRef}
          onInput={onInput}
          onKeyDown={onKeyDown}
          rows={1}
          className="h-auto flex-1 resize-none overflow-y-hidden bg-transparent outline-none"
          placeholder="Upload a certificate or say something to start"
        />
        <Button
          type="button"
          size="defaultSquare"
          variant="tertiaryBorderless"
          onClick={sendMessage}
        >
          <FiSend size={24} />
        </Button>
      </div>
      <p className="text-sm font-medium text-input-text-secondary">
        AI may make mistakes. Please verify important information.
      </p>
    </div>
  );
};

export default ChatInput;
