"use client";

import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import { AiChat } from "@/components/ai_consultation_room/ai_chat";
import QaSection from "@/components/ai_consultation_room/qa_section";

export default function AiConsultingDetailPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <QaSection />
      <AiChat />
      <Footer />
    </div>
  );
}
