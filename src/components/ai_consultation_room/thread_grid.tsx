import Link from "next/link";
import { IThread } from "@/interfaces/ai_consulting";
import { ThreadCard } from "@/components/ai_consultation_room/thread_card";
import { useTranslation } from "@/i18n/i18n_context";
import { Loader2 } from "lucide-react";
import { useAiContext } from "@/contexts/ai_context";

interface IThreadGridProps {
  threads: IThread[];
  isLoading: boolean;
}

export default function ThreadGrid({ threads, isLoading }: IThreadGridProps) {
  const { t } = useTranslation();
  const { setIsChatOpen } = useAiContext();

  const openChat = () => setIsChatOpen(true);

  const displayedThreads = isLoading ? (
    // Info: (20260428 - Julian) Loading
    <div className="flex h-[500px] items-center justify-center">
      <Loader2 size={32} className="animate-spin text-orange-500" />
    </div>
  ) : threads.length > 0 ? (
    // Info: (20260428 - Julian) Threads
    <div className="flex flex-wrap gap-x-4 gap-y-8 px-24 py-6">
      {threads.map((item) => (
        <ThreadCard key={item.id} {...item} />
      ))}
    </div>
  ) : (
    // Info: (20260428 - Julian) No Threads
    <div className="flex h-[500px] flex-col items-center justify-center gap-2 overflow-y-auto p-10">
      <p className="text-2xl font-bold text-gray-700">
        {t("ai_consultation_room.no_threads")}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="text-orange-500 underline-offset-2 hover:underline"
        >
          {t("ai_consultation_room.back_home")}
        </Link>
        <p>{t("ai_consultation_room.or")}</p>
        <button
          type="button"
          onClick={openChat}
          className="text-orange-500 underline-offset-2 hover:cursor-pointer hover:underline"
        >
          {t("ai_consultation_room.ask_now")}
        </button>
      </div>
    </div>
  );

  return displayedThreads;
}
