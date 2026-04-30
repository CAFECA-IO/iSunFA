"use client";

import { Suspense } from "react";
import { useTranslation } from "@/i18n/i18n_context";
import ThreadSection from "@/components/ai_consultation_room/thread_section";
import { AiChat } from "@/components/ai_consultation_room/ai_chat";

export default function AccountingAiConsultingPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-white">

      <main className="relative pt-12 min-h-screen">
        <div className="flex flex-col text-center items-center gap-2">
          <h1 className="text-4xl font-bold text-gray-800">
            {t("ai_consultation_room.title")}
          </h1>
          <p className="text-gray-400">
            {t("ai_consultation_room.subtitle")}
          </p>
        </div>

        <Suspense fallback={<div className="flex h-[500px] items-center justify-center">載入中...</div>}>
          <ThreadSection />
        </Suspense>
        
        <AiChat />
      </main>

    </div>
  );
}
