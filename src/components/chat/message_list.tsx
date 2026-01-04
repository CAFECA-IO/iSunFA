'use client';

import { FileText } from 'lucide-react';
import Image from 'next/image';
import { MarkdownContent } from '@/components/common/markdown_content';

export interface IMessage {
  role: 'user' | 'model';
  content: string;
  image?: string;
  mimeType?: string;
  tags?: string[];
}

interface IMessageListProps {
  messages: IMessage[];
  loading?: boolean;
}

export default function MessageList({ messages, loading }: IMessageListProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((msg, idx) => (
        <div
          key={idx}
          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-5 py-3 ${msg.role === 'user'
              ? 'bg-orange-600 text-white rounded-br-none'
              : 'bg-white border border-gray-100 shadow-sm text-gray-900 rounded-bl-none'
              }`}
          >
            {msg.image && (
              <div className="mb-3 overflow-hidden rounded-lg relative w-full">
                {msg.mimeType?.includes('pdf') ? (
                  <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-700">PDF Document</span>
                      <a href={msg.image} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        View
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-60 w-full">
                    <Image
                      src={msg.image}
                      alt="Uploaded content"
                      className="object-cover"
                      fill
                      unoptimized
                    />
                  </div>
                )}
              </div>
            )}

            {msg.tags && msg.tags.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {msg.tags.map(tag => (
                  <span key={tag} className="text-xs font-medium opacity-80 bg-black/10 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className={`prose prose-sm break-words max-w-none ${msg.role === 'user' ? 'text-white prose-invert' : 'text-gray-900'}`}>
              <MarkdownContent content={msg.content} theme={msg.role === 'user' ? 'dark' : 'light'} />
            </div>
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex justify-start">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-none px-5 py-3">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
