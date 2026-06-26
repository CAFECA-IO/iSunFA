"use client";

import { Suspense } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import ThreadSection from "@/components/ai_consultation_room/thread_section";
import { AiChat } from "@/components/ai_consultation_room/ai_chat";

export default function AccountingAiConsultingPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-white">
      <main className="relative min-h-screen pt-12">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold text-gray-800 lg:text-4xl">
            {t("ai_consultation_room.title")}
          </h1>
          <p className="text-sm text-gray-400 lg:text-lg">
            {t("ai_consultation_room.subtitle")}
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex h-[500px] items-center justify-center">
              載入中...
            </div>
          }
        >
          <ThreadSection />
        </Suspense>

        <AiChat />
      </main>
    </div>
  );
}
