import React, { useState, useRef, useCallback } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { FiSend } from 'react-icons/fi';
import { useBase64 } from '@/lib/hooks/use_base_64';
import { Button } from '@/components/button/button';
import UploadingToast from '@/components/ai_accounting_assistance/uploading_toast';

const FOUR_LINE_HEIGHT_PX = 24 * 4;

interface IChatInputProps {
  askQuestion: (question: string) => void;
  sendDisabled: boolean;
}

const ChatInput: React.FC<IChatInputProps> = ({ askQuestion, sendDisabled }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { convertToBase64 } = useBase64();

  const [inputValue, setInputValue] = useState<string>('');
  const [isOverFourLines, setIsOverFourLines] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const isNullValue = inputValue.trim() === '';
  const sendBtnDisabled = isNullValue || sendDisabled;

  // Info: (20251119 - Julian) 打開檔案選擇對話框
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpload = async (file: File) => {
    // ToDo: (20251119 - Julian) Upload file logic, turn file into base64 to send to backend
    const base64String = await convertToBase64(file);

    const inlineData = {
      mimeType: file.type,
      data: base64String.split(',')[1], // Info: (20251119 - Julian) Remove the data URL prefix
    };
    // Deprecated: (20251119 - Luphia) remove eslint-disable
    // eslint-disable-next-line no-console
    console.log('Uploading file:', inlineData);
  };

  // Info: (20251119 - Julian) 上傳檔案
  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (isUploading || !files) return;

      setIsUploading(true);
      await Promise.all(Array.from(files).map(async (file) => handleUpload(file)));
      setIsUploading(false);
    },
    [isUploading, handleUpload]
  );

  // Info: (20251119 - Julian) 選擇檔案
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

  const sendMessage = () => {
    // Info: (20251118 - Julian) 防止送出空訊息
    if (isNullValue) return;

    askQuestion(inputValue);
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
        {/* Info: (20251119 - Julian) 上傳檔案按鈕 */}
        <Button type="button" size="defaultSquare" disabled={isUploading} onClick={openFileDialog}>
          <FaPlus />
        </Button>

        {/* Info: (20251119 - Julian) 上傳檔案按鈕 Input */}
        <input
          ref={fileInputRef}
          id="invoice-upload"
          name="invoice-upload"
          accept="application/pdf, image/jpeg, image/png"
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Info: (20251119 - Julian) 訊息輸入框 */}
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

        {/* Info: (20251119 - Julian) 送出按鈕 */}
        <Button
          type="button"
          size="defaultSquare"
          variant="tertiaryBorderless"
          onClick={sendMessage}
          disabled={sendBtnDisabled}
        >
          <FiSend size={24} />
        </Button>
      </div>

      {/* Info: (20251119 - Julian) 提示文字 */}
      <p className="text-sm font-medium text-input-text-secondary">
        AI may make mistakes. Please verify important information.
      </p>

      {/* ToDo: (20251120 - Julian) Uploading Toast */}
      {isUploading && <UploadingToast progress={38} countOfAllUploading={6} countOfDone={3} />}
    </div>
  );
};

export default ChatInput;
