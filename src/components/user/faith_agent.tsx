"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import { Transition } from "@headlessui/react";
import ChatInterface from "@/components/chat/chat_interface";
import { useTranslation } from "@/i18n/i18n_context";

/**
 * Info: (20260812 - Luphia) accountBookId 為必要參數（設計書 §5.3「使用前提」）：
 * 費思只掛在帳本 layout，計費團隊由該帳本推導；型別上就不允許在無帳本情境掛載。
 */
interface IFaithAgentProps {
  accountBookId: string;
}

export default function FaithAgent({ accountBookId }: IFaithAgentProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed right-6 bottom-6 z-[9999] flex flex-col items-end gap-4">
      {/* Info: (20260117 - Luphia) Chat Window */}
      <Transition
        show={isOpen}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-4 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0 scale-100"
        leaveTo="opacity-0 translate-y-4 scale-95"
      >
        <div className="fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/5 sm:static sm:z-auto sm:h-[600px] sm:w-[400px] sm:rounded-2xl">
          <div className="flex shrink-0 items-center justify-between bg-orange-600 p-4 text-white">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/20 p-1.5">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{t("faith.title")} v0.1.0</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex-1 overflow-hidden">
            {/* Info: (20260117 - Luphia) Use flexible height for widget mode */}
            <ChatInterface className="h-full" accountBookId={accountBookId} />
          </div>
        </div>
      </Transition>

      {/* Info: (20260117 - Luphia) Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen
            ? "rotate-90 bg-gray-800 text-white"
            : "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:shadow-orange-500/30"
        } `}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Bot className="h-8 w-8" />}
      </button>
    </div>
  );
}
