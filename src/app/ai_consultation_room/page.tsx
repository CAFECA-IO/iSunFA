"use client";

import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import { mockThreads } from "@/interfaces/ai_talk";
import { useTranslation } from "@/i18n/i18n_context";
import { ThreadGrid } from "@/components/ai_consultation_room/thread_grid";
import { AiChat } from "@/components/ai_consultation_room/ai_chat";


export default function AccountingAiTalkPage() {
  const { t } = useTranslation();
  return (
    <div className="bg-white">
      <Header />

      <main className="relative pt-12 min-h-screen">
        <div className="flex flex-col mb-2 items-center gap-4">
          <h1 className="text-4xl font-bold text-gray-800">
            {t("ai_consultation_room.title")}
          </h1>
          <p className="text-gray-400">
            {t("ai_consultation_room.subtitle")}
          </p>
        </div>

        <ThreadGrid threads={mockThreads} />
        <AiChat />
      </main>

      <Footer />
    </div>
  );
}
