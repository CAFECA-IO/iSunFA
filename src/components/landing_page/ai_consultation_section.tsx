"use client";

import { useTranslation } from "@/i18n/i18n_context";
import { Bot, MessageCircle, Send, User } from "lucide-react";
import Link from "next/link";

export default function AIConsultationSection() {
  const { t } = useTranslation();

  return (
    // Info: (20260807 - Luphia) 深色下把暖色漸層整段拿掉：orange-50 的深色對應色是
    // Info: (20260807 - Luphia) 混了橘的暗棕，夾在前後兩段藍黑之間會是一條沒有理由的暖色帶。
    <div className="dark:bg-surface-base relative overflow-hidden bg-gradient-to-b from-orange-50 to-white py-24 sm:py-32 dark:bg-none">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
          {/* Info: (20260214 - Luphia) Left Column: Text Content */}
          <div className="lg:pt-4 lg:pr-8">
            <div className="lg:max-w-lg">
              <div className="flex items-center gap-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-600">
                  <Bot className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <h2 className="text-base leading-7 font-semibold text-orange-600">
                  {t("ai_consultation_section.title")}
                </h2>
              </div>
              <p className="mt-4 text-2xl tracking-tight text-gray-900 sm:text-2xl">
                {t("ai_consultation_section.description")}
              </p>
              <div className="mt-10 flex items-center gap-x-6">
                <Link
                  href="/ai_consultation_room"
                  className="rounded-md bg-orange-700 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-1 hover:bg-orange-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
                >
                  {t("ai_consultation_section.button")}
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
            <div className="relative mx-auto w-full max-w-[360px] rotate-[-2deg] transform overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl transition-transform duration-500 hover:rotate-0">
              {/* Info: (20260214 - Luphia) Header */}
              <div className="flex items-center justify-between border-b border-orange-100 bg-orange-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100">
                    <Bot size={18} className="text-orange-600" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">
                      {t("ai_consultation_room.ai_name")}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-green-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Online
                    </div>
                  </div>
                </div>
              </div>

              {/* Info: (20260214 - Luphia) Chat Area */}
              <div className="h-[350px] space-y-4 bg-gray-50/50 p-4">
                {/* Info: (20260214 - Luphia) AI Message */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex w-full max-w-[240px] flex-col gap-1">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-sm font-semibold text-gray-900">
                        {t("ai_consultation_room.ai_name")}
                      </span>
                      <span className="text-xs font-normal text-gray-500">
                        10:00 AM
                      </span>
                    </div>
                    <div className="flex flex-col rounded-e-xl rounded-es-xl border-gray-200 bg-white p-4 leading-1.5 shadow-sm">
                      <p className="text-sm font-normal text-gray-900">
                        Hello! I can help you with accounting, tax filings, and
                        GHG emissions calculations. What would you like to know
                        today?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info: (20260214 - Luphia) User Message */}
                <div className="flex flex-row-reverse items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User size={16} className="text-gray-600" />
                  </div>
                  <div className="flex w-full max-w-[240px] flex-col gap-1">
                    <div className="flex items-center justify-end space-x-2 rtl:space-x-reverse">
                      <span className="text-xs font-normal text-gray-500">
                        10:01 AM
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        You
                      </span>
                    </div>
                    <div className="flex flex-col rounded-s-xl rounded-ee-xl border-gray-200 bg-orange-100 p-4 leading-1.5 shadow-sm">
                      <p className="text-sm font-normal text-gray-800">
                        How do I calculate Scope 1 emissions for my company
                        fleet?
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info: (20260214 - Luphia) AI Reply (Typing) */}
                <div className="flex items-start gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <span className="text-sm font-semibold text-gray-900">
                        {t("ai_consultation_room.ai_name")}
                      </span>
                    </div>
                    <div className="flex w-16 items-center gap-1 rounded-e-xl rounded-es-xl bg-white p-3 shadow-sm">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.3s]"></span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.15s]"></span>
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info: (20260214 - Luphia) Input Area (Fake) */}
              <div className="flex items-center gap-2 border-t border-gray-100 bg-white p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <MessageCircle size={18} />
                </div>
                <div className="flex h-9 flex-1 items-center rounded-full border border-gray-200 bg-gray-50 px-3 text-xs text-gray-400">
                  Type your question...
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-600 text-white shadow-sm">
                  <Send size={16} className="mt-0.5 -ml-0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
