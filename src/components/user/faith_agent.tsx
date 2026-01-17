'use client';

import { useState } from 'react';
import { Bot, X } from 'lucide-react';
import { Transition } from '@headlessui/react';
import ChatInterface from '@/components/chat/chat_interface';
import { useTranslation } from '@/i18n/i18n_context';

export default function FaithAgent() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
      {/* Chat Window */}
      <Transition
        show={isOpen}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-4 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0 scale-100"
        leaveTo="opacity-0 translate-y-4 scale-95"
      >
        <div className="fixed inset-0 z-50 sm:static sm:z-auto w-full h-full sm:w-[400px] sm:h-[600px] bg-white sm:rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-orange-600 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{t('faith.title')} v0.1.0</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {/* Info: (20260117 - Luphia) Use flexible height for widget mode */}
            <ChatInterface className="h-full" />
          </div>
        </div>
      </Transition>

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center p-4 rounded-full shadow-lg transition-all duration-300
          hover:scale-105 active:scale-95
          ${isOpen
            ? 'bg-gray-800 text-white rotate-90'
            : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-orange-500/30'
          }
        `}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Bot className="h-8 w-8" />
        )}
      </button>
    </div>
  );
}
