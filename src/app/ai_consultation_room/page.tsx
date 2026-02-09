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
  MessageCircleMore,
  Bot,
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
      {/* Info: (20260206 - Julian) Q 區塊 (問題) */}
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

      {/* Info: (20260206 - Julian) A 區塊 (AI 回答摘要) */}
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

        {/* Info: (20260206 - Julian) Toolbar */}
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
    <div
      className={`fixed right-6 bottom-24 z-50 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) bg-white border-2 border-orange-400 shadow-[0_20px_50px_rgba(234,88,12,0.15)] flex flex-col overflow-hidden ${
        isChatOpen
          ? "w-80 h-[500px] p-6 rounded-3xl"
          : "w-16 h-16 p-0 rounded-full hover:scale-110 active:scale-95 items-center justify-center hover:bg-orange-50"
      }`}
    >
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="absolute inset-0 w-full h-full rounded-full z-10"
          aria-label="開啟 AI 諮詢室"
        />
      )}
      <div
        className={`flex items-center ${isChatOpen ? "justify-between" : "justify-center"} w-full transition-all duration-300`}
      >
        {isChatOpen && (
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bot size={20} className="text-orange-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 whitespace-nowrap">
              AI 諮詢室
            </h2>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            if (isChatOpen) {
              e.stopPropagation();
              setIsChatOpen(false);
            }
          }}
          className={`text-orange-500 transition-all duration-300 ${
            isChatOpen ? "p-2 hover:bg-gray-100 rounded-xl" : "p-0"
          }`}
          aria-label={isChatOpen ? "關閉 AI 諮詢室" : "開啟 AI 諮詢室"}
        >
          {isChatOpen ? (
            <MinusIcon size={24} />
          ) : (
            <div className="relative flex items-center justify-center">
              <MessageCircleMore
                size={32}
                className="text-orange-500 transition-transform duration-500"
              />
            </div>
          )}
        </button>
      </div>

      <div className="overflow-hidden">
        <div
        className={`transition-all duration-300 ease-in-out flex flex-col gap-4 flex-1 ${
          isChatOpen ? "opacity-100 mt-6" : "opacity-0 h-0"
        }`}
      >
        <div className="flex-1 space-y-4">
          <div className="relative">
            <textarea
              id="ai-question-input"
              aria-label="請輸入你的問題"
              placeholder="請輸入你的問題..."
              className="w-full h-40 p-4 outline-none bg-gray-50 border-2 border-transparent focus:border-orange-200 rounded-2xl text-sm transition-all resize-none shadow-inner"
            />
          </div>

          <button className="w-full py-3.5 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-orange-300 hover:text-orange-500 hover:bg-orange-50/50 transition-all">
            <PlusIcon size={20} />
            <span className="text-sm font-semibold">上傳發票 / 單據 (OCR)</span>
          </button>

          <button className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98] hover:-translate-y-0.5">
            立即向 AI 提問
          </button>
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed text-center px-4">
          * AI 回覆僅供參考，不代表正式法律建議。其分析內容基於提供的數據。
        </p>
      </div>
  </div>
    </div>
  );
};

export default function AccountingAiTalkPage() {
  // const { t } = useTranslation();
  return (
    <div className="bg-white">
      <Header />

      <main className="relative pt-12 min-h-screen">
        <div className="flex flex-col mb-2 items-center gap-4">
          <h1 className="text-4xl font-bold text-gray-800">AI 諮詢室</h1>
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
