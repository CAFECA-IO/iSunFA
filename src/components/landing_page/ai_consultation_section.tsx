'use client';

import { useTranslation } from '@/i18n/i18n_context';
import { Bot, MessageCircle, Send, User } from 'lucide-react';
import Link from 'next/link';

export default function AIConsultationSection() {
  const { t } = useTranslation();

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-orange-50 to-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">

          {/* Info: (20260214 - Luphia) Left Column: Text Content */}
          <div className="lg:pr-8 lg:pt-4">
            <div className="lg:max-w-lg">
              <div className="flex items-center gap-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600">
                  <Bot className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold leading-7 text-orange-600">
                  {t('ai_consultation_section.title')}
                </h2>
              </div>
              <p className="mt-4 text-2xl tracking-tight text-gray-900 sm:text-2xl">
                {t('ai_consultation_section.description')}
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link
                  href="/ai_consultation_room"
                  className="rounded-md bg-orange-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 transition-all hover:-translate-y-1"
                >
                  {t('ai_consultation_section.button')}
                </Link>
              </div>
            </div>
          </div>

          {/* Info: (20260214 - Luphia) Right Column: Visual Mockup */}
          <div className="relative">
            {/* Info: (20260214 - Luphia) Abstract Background Shapes */}
            <div className="absolute -top-4 -right-4 -z-10 h-72 w-72 rounded-full bg-orange-200 opacity-20 blur-3xl" />
            <div className="absolute -bottom-4 -left-4 -z-10 h-72 w-72 rounded-full bg-blue-200 opacity-20 blur-3xl" />

            {/* Info: (20260214 - Luphia) Chat Interface Mockup */}
            <div className="relative mx-auto w-full max-w-[360px] rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
              {/* Info: (20260214 - Luphia) Header */}
              <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Bot size={18} className="text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{t('ai_consultation_room.ai_name')}</div>
                    <div className="text-xs text-green-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Online
                    </div>
                  </div>
                </div>
              </div>

              {/* Info: (20260214 - Luphia) Chat Area */}
              <div className="p-4 space-y-4 h-[350px] bg-gray-50/50">
                {/* Info: (20260214 - Luphia) AI Message */}
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex flex-col gap-1 w-full max-w-[240px]">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-sm font-semibold text-gray-900">{t('ai_consultation_room.ai_name')}</span>
                      <span className="text-xs font-normal text-gray-500">10:00 AM</span>
                    </div>
                    <div className="flex flex-col leading-1.5 p-4 border-gray-200 bg-white rounded-e-xl rounded-es-xl shadow-sm">
                      <p className="text-sm font-normal text-gray-900">
                        Hello! I can help you with accounting, tax filings, and GHG emissions calculations. What would you like to know today?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info: (20260214 - Luphia) User Message */}
                <div className="flex items-start gap-2.5 flex-row-reverse">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <User size={16} className="text-gray-600" />
                  </div>
                  <div className="flex flex-col gap-1 w-full max-w-[240px]">
                    <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                      <span className="text-xs font-normal text-gray-500">10:01 AM</span>
                      <span className="text-sm font-semibold text-gray-900">You</span>
                    </div>
                    <div className="flex flex-col leading-1.5 p-4 border-gray-200 bg-orange-100 rounded-s-xl rounded-ee-xl shadow-sm">
                      <p className="text-sm font-normal text-gray-800">
                        How do I calculate Scope 1 emissions for my company fleet?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info: (20260214 - Luphia) AI Reply (Typing) */}
                <div className="flex items-start gap-2.5">
                  <div className="h-8 w-8 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-sm font-semibold text-gray-900">{t('ai_consultation_room.ai_name')}</span>
                    </div>
                    <div className="flex items-center gap-1 p-3 bg-white rounded-e-xl rounded-es-xl shadow-sm w-16">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info: (20260214 - Luphia) Input Area (Fake) */}
              <div className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <MessageCircle size={18} />
                </div>
                <div className="flex-1 h-9 bg-gray-50 rounded-full border border-gray-200 px-3 flex items-center text-xs text-gray-400">
                  Type your question...
                </div>
                <div className="h-9 w-9 rounded-full bg-orange-600 flex items-center justify-center text-white shadow-sm">
                  <Send size={16} className="-ml-0.5 mt-0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
