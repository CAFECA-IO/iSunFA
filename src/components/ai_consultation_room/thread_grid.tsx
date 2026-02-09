"use client";

import Link from "next/link";
import { IThread } from "@/interfaces/ai_talk";
import { ThreadCard } from "@/components/ai_consultation_room/thread_card";

export const ThreadGrid = ({ threads }: { threads: IThread[] }) => {
  const displayedThreads =
    threads.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 justify-items-center gap-x-4 gap-y-8 px-24 py-6">
        {threads.map((item) => (
          <ThreadCard key={item.id} {...item} />
        ))}
      </div>
    ) : (
      <div className="p-10 overflow-y-auto h-[500px] gap-2 flex flex-col items-center justify-center">
        <p className="text-gray-700 text-lg font-bold">目前沒有任何對話紀錄</p>
        <Link href="/" className="text-orange-500 hover:text-orange-600">
          回首頁
        </Link>
      </div>
    );

  return displayedThreads;
};
