"use client";

import { AiChat } from "@/components/ai_consultation_room/ai_chat";
import QaSection from "@/components/ai_consultation_room/qa_section";

export default function AiConsultingDetailPage() {
  return (
    <div className="min-h-screen bg-white">
      <QaSection />
      <AiChat />
    </div>
  );
}
