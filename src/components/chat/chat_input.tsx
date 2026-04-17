'use client';

import { useState, useRef, ChangeEvent, KeyboardEvent } from 'react';

import Image from 'next/image';
import { Image as ImageIcon, Send, X, FileText } from 'lucide-react';
import { useTranslation } from '@/i18n/i18n_context';

interface IChatInputProps {
  onSend: (message: string, file: File | null, tags: string[]) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: IChatInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!message.trim() && !selectedFile) || disabled) return;
    // Info: (20260117 Luphia) Send raw tags directly
    onSend(message, selectedFile, []);
    setMessage('');
    setSelectedFile(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Info: (20260213 Julian) 如果正在輸入法組字（選字）中，就直接跳過不執行
    if (e.nativeEvent.isComposing) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="border-t bg-white p-4">
      {/* Info: (20260117 Luphia) File Preview */}
      {selectedFile && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative h-16 w-16 overflow-hidden rounded-lg border flex items-center justify-center bg-gray-50">
            {selectedFile.type.startsWith('image/') ? (
              <Image
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="object-cover"
                fill
                unoptimized
              />
            ) : (
              <FileText className="h-8 w-8 text-gray-500" />
            )}
            <button
              onClick={() => setSelectedFile(null)}
              className="absolute right-0 top-0 bg-black/50 p-0.5 text-white hover:bg-black/70 cursor-pointer"
              aria-label="Remove file"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm text-gray-500 truncate max-w-[200px]">{selectedFile.name}</span>
            <span className="text-xs text-gray-400">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
          aria-label="File upload"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50 text-orange-600 transition-colors hover:bg-orange-100 cursor-pointer"
          title="Upload File"
          aria-label="Upload File"
        >
          <ImageIcon className="h-5 w-5" />
        </button>

        <div className="relative flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.input_placeholder')}
            className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pr-12 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            rows={1}
            disabled={disabled}
            aria-label="Message input"
          />
          <button
            onClick={handleSend}
            disabled={(!message.trim() && !selectedFile) || disabled}
            className="absolute bottom-4 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-orange-600 text-white shadow-sm transition-all hover:bg-orange-500 disabled:opacity-50 cursor-pointer"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
