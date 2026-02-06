"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
// import { useTranslation } from '@/i18n/i18n_context';
import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import {
  PlusIcon,
  MinusIcon,
  ThumbsUp,
  ThumbsDown,
  Share2,
} from "lucide-react";
import { timestampToString } from "@/lib/utils/common";
import { IThread, mockThreads } from "@/interfaces/ai_talk";

function formatTime(timestamp: number, now: number) {
  const diff = now - timestamp;

  if (diff < 60) {
    return "Just now";
  } else if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${hours} hours ago`;
  } else if (diff < 604800) {
    const days = Math.floor(diff / 86400);
    return `${days} days ago`;
  } else {
    return timestampToString(timestamp).dateWithDash;
  }
}

const ThreadCard = ({
  id,
  question,
  answer,
  authorId,
  tags,
  createdAt,
  countOfLike,
  countOfDislike,
  countOfShare,
}: IThread) => {
  const pathname = usePathname();
  const linkPath = `${pathname}/${id}`;
  const [now] = useState(() => Date.now() / 1000);

  const displayedTime = (
    <span className="text-gray-400"> • {formatTime(createdAt, now)}</span>
  );

  return (
    <Link
      href={linkPath}
      className="bg-white flex flex-col hover:scale-105 transition-all ease-in-out duration-300 hover:cursor-pointer hover:border-orange-400 size-[300px] rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md"
    >
      {/* Q 區塊 (問題) */}
      <div className="p-6 flex-1 overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded">
            Q
          </span>
          <p className="text-gray-700 text-xs">
            {authorId}
            {displayedTime}
          </p>
        </div>
        <h3 className="font-bold text-gray-800 leading-snug line-clamp-3">
          {question}
        </h3>
      </div>

      {/* A 區塊 (AI 回答摘要) */}
      <div className="bg-orange-50 flex-1 p-6 border-t border-orange-100 flex flex-col justify-between overflow-hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-1 bg-orange-200 text-orange-700 text-xs font-bold rounded">
              AI
            </span>
            <div className="flex gap-1">
              {tags.map((tag) => (
                <span key={tag} className="text-[10px] text-orange-400">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-orange-900 line-clamp-3 leading-relaxed">
            {answer}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 pt-2 mt-2 border-t border-orange-100/50">
          <div className="flex items-center gap-1 text-orange-400 ">
            <ThumbsUp size={14} />
            <span className="text-xs">{countOfLike}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400 ">
            <ThumbsDown size={14} />
            <span className="text-xs">{countOfDislike}</span>
          </div>
          <div className="flex items-center gap-1 text-orange-400 ">
            <Share2 size={14} />
            <span className="text-xs">{countOfShare}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const ThreadGrid = ({ threads }: { threads: IThread[] }) => {
  const displayedThreads =
    threads.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 justify-items-center gap-x-4 gap-y-8 px-24 py-6">
        {threads.map((item) => (
          <ThreadCard key={item.id} {...item} />
        ))}
      </div>
    ) : (
      <div className="p-10 h-[500px] gap-2 flex flex-col items-center justify-center">
        <p className="text-gray-700 text-lg font-bold">目前沒有任何對話紀錄</p>
        <Link href="/" className="text-orange-500 hover:text-orange-600">
          回首頁
        </Link>
      </div>
    );

  return displayedThreads;
};

const AiChat = () => {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);

  return (
    <aside className="w-80 fixed right-4 bottom-24 z-50 transition-all duration-300 ease-in-out p-6 bg-white rounded-2xl border border-orange-400 shadow-sm ml-4">
      <div className="flex items-center justify-between text-lg font-bold">
        <h2 className=" text-gray-800">會計諮詢室</h2>
        <button
          type="button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="text-gray-400 p-2 hover:text-orange-400"
        >
          {isChatOpen ? <MinusIcon /> : <PlusIcon />}
        </button>
      </div>

      <div
        className={`${isChatOpen ? "h-[340px]" : "h-0"} overflow-y-clip pt-4 space-y-4 transition-all duration-300 ease-in-out`}
      >
        <div className="relative">
          <textarea
            id="ai-question-input"
            aria-label="請輸入你的問題"
            placeholder="請輸入你的問題..."
            className="w-full h-32 p-4 outline-none bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-orange-200 resize-none"
          />
        </div>

        <button className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-orange-300 hover:text-orange-400 transition-colors">
          <PlusIcon />
          <span className="text-sm font-medium">上傳發票 / 單據 (OCR)</span>
        </button>

        <button className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all active:scale-95">
          立即向 AI 提問
        </button>

        <p className="pt-2 text-sm text-gray-400 leading-relaxed text-center">
          * AI 回覆僅供參考，不代表正式法律建議。
        </p>
      </div>
    </aside>
  );
};

export default function AccountingAiTalkPage() {
  // const { t } = useTranslation();
  return (
    <div className="bg-white">
      <Header />

      <main className="relative pt-12 min-h-screen">
        <div className="flex flex-col mb-2 items-center gap-4">
          <h1 className="text-4xl font-bold text-gray-800">會計諮詢室</h1>
          <p className="text-gray-400">
            與 AI 進行即時會計問答，並和社群成員分享討論
          </p>
        </div>

        <ThreadGrid threads={mockThreads} />
        <AiChat />
      </main>

      <Footer />
    </div>
  );
}
