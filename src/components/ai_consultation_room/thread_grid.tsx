import Link from "next/link";
import { IThread } from "@/interfaces/ai_talk";
import { ThreadCard } from "@/components/ai_consultation_room/thread_card";
import { useTranslation } from "@/i18n/i18n_context";
import { Loader2 } from "lucide-react";

export const ThreadGrid = ({
  threads,
  isLoading,
}: {
  threads: IThread[];
  isLoading: boolean;
}) => {
  const { t } = useTranslation();
  const displayedThreads = isLoading ? (
    <div className="flex items-center justify-center">
      <Loader2 className="animate-spin" />
    </div>
  ) : threads.length > 0 ? (
    <div className="grid grid-cols-1 justify-items-center gap-x-4 gap-y-8 px-24 py-6 md:grid-cols-2 lg:grid-cols-4">
      {threads.map((item) => (
        <ThreadCard key={item.id} {...item} />
      ))}
    </div>
  ) : (
    <div className="flex h-[500px] flex-col items-center justify-center gap-2 overflow-y-auto p-10">
      <p className="text-lg font-bold text-gray-700">
        {t("ai_consultation_room.no_threads")}
      </p>
      <Link href="/" className="text-orange-500 hover:text-orange-600">
        {t("ai_consultation_room.back_home")}
      </Link>
    </div>
  );

  return displayedThreads;
};
