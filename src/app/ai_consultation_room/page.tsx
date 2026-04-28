"use client";

import { useEffect, useState } from "react";
import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import { IThreadDetail } from "@/interfaces/ai_consulting";
import { useTranslation } from "@/i18n/i18n_context";
import ThreadGrid from "@/components/ai_consultation_room/thread_grid";
import { AiChat } from "@/components/ai_consultation_room/ai_chat";
import { request } from "@/lib/utils/request";
import { IApiResponse } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";

export default function AccountingAiConsultingPage() {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [threads, setThreads] = useState<IThreadDetail[]>([]);

  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setIsLoading(true);
        const res = await request<IApiResponse<IThreadDetail[]>>(
          "/api/v1/ai_consulting/thread",
        );
        if (res.code === ApiCode.SUCCESS && res.payload) {
          setThreads(res.payload);
        }
      } catch (error) {
        console.error("Failed to fetch threads:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreads();
  }, []);

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

        <ThreadGrid threads={threads} isLoading={isLoading} />
        <AiChat />
      </main>

      <Footer />
    </div>
  );
}
