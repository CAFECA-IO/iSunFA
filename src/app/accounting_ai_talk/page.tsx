"use client";

import { useState } from "react";
import Link from "next/link";
// import { useTranslation } from '@/i18n/i18n_context';
import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import { PlusIcon, MinusIcon } from "lucide-react";

interface IThread {
  id: number;
  question: string;
  answer: string;
  createdAt: number;
  author: string;
  tags: string[];
}

const threads: IThread[] = [
  {
    id: 1,
    question: "What is the capital of France?",
    answer: "The capital of France is Paris.",
    author: "John Doe",
    tags: ["France", "Paris"],
    createdAt: Date.now(),
  },
  {
    id: 2,
    question: "What is the capital of Japan?",
    answer: "The capital of Japan is Tokyo.",
    author: "Jane Smith",
    tags: ["Japan", "Tokyo"],
    createdAt: Date.now(),
  },
  {
    id: 3,
    question: "What is the most popular sport in the world?",
    answer: "The most popular sport in the world is football.",
    author: "David Lee",
    tags: ["Sport", "Football"],
    createdAt: Date.now(),
  },
  {
    id: 4,
    question: "What is the smallest animal in the world?",
    answer: "The smallest animal in the world is the tardigrade.",
    author: "Anne Wang",
    tags: ["Animal", "Smallest"],
    createdAt: Date.now(),
  },
  {
    id: 5,
    question: "Is AI a threat to humanity?",
    answer: "AI is a tool that can be used for good or evil.",
    author: "Frank Chen",
    tags: ["AI", "Threat"],
    createdAt: Date.now(),
  },
  {
    id: 6,
    question: "小規模營業稅如何計算？",
    answer: "查定課徵營業稅額 ＝ 國稅局查定每月銷售額 × 稅率 (通常為 1%)...",
    author: "匿名創業家",
    tags: ["營業稅", "小規模"],
    createdAt: 173827382,
  },
  {
    id: 7,
    question: "公司買車報支加油費，發票沒打統編可以扣抵嗎？",
    answer: "不可以。依據營業稅法，未載明統一編號之進項憑證不得扣抵銷項稅額...",
    author: "Finance_Alice",
    tags: ["扣抵稅額", "憑證"],
    createdAt: 173827382,
  },
];

const ThreadCard = ({ question, answer, author, tags }: IThread) => (
  <div className="bg-white grid grid-rows-2 hover:scale-105 transition-all ease-in-out duration-300 hover:cursor-pointer hover:border-pink-400 size-[250px] rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md">
    {/* Q 區塊 (問題) */}
    <div className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded">
          Q
        </span>
        <span className="text-gray-400 text-xs">{author} • 剛剛</span>
      </div>
      <h3 className="font-bold text-gray-800 leading-snug line-clamp-2">
        {question}
      </h3>
    </div>

    {/* A 區塊 (AI 回答摘要) */}
    <div className="bg-pink-50 h-full p-5 border-t border-pink-100">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-1 bg-pink-200 text-pink-700 text-xs font-bold rounded">
          AI
        </span>
        <div className="flex gap-1">
          {tags.map((tag) => (
            <span key={tag} className="text-[10px] text-pink-400">
              #{tag}
            </span>
          ))}
        </div>
      </div>
      <p className="text-sm text-pink-900 line-clamp-3 leading-relaxed">
        {answer}
      </p>
    </div>
  </div>
);

const ThreadGrid = ({ threads }: { threads: IThread[] }) => {
  const displayedThreads =
    threads.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 justify-items-center gap-4 px-24 py-6">
        {threads.map((item) => (
          <ThreadCard key={item.id} {...item} />
        ))}
      </div>
    ) : (
      <div className="p-10 h-[500px] gap-2 flex flex-col items-center justify-center">
        <p className="text-gray-700 text-lg font-bold">目前沒有任何對話紀錄</p>
        <Link href="/" className="text-pink-500 hover:text-pink-600">
          回首頁
        </Link>
      </div>
    );

  return displayedThreads;
};

const AiChat = () => {
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);

  return (
    <aside className="w-80 fixed right-4 bottom-24 z-50 transition-all duration-300 ease-in-out p-6 bg-white rounded-2xl border border-gray-100 shadow-sm ml-4">
      <div className="flex items-center justify-between text-lg font-bold">
        <h2 className=" text-gray-800">會計諮詢室</h2>
        <button
          type="button"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="text-gray-400 p-2 hover:text-pink-400"
        >
          {isChatOpen ? <MinusIcon /> : <PlusIcon />}
        </button>
      </div>

      <div
        className={`${isChatOpen ? "h-[340px]" : "h-0"} overflow-y-clip pt-4 space-y-4 transition-all duration-300 ease-in-out`}
      >
        <div className="relative">
          <textarea
            placeholder="請輸入你的問題..."
            className="w-full h-32 p-4 outline-none bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-pink-200 resize-none"
          />
        </div>

        <button className="w-full py-3 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-pink-300 hover:text-pink-400 transition-colors">
          <PlusIcon />
          <span className="text-sm font-medium">上傳發票 / 單據 (OCR)</span>
        </button>

        <button className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-lg shadow-pink-100 transition-all active:scale-95">
          立即向 AI 提問
        </button>

        <p className="pt-4 text-[10px] text-gray-400 leading-relaxed text-center">
          * AI 回覆僅供參考，不代表正式法律建議。
        </p>
      </div>
    </aside>
  );
};

export default function AccountingConsultationRoomPage() {
  // const { t } = useTranslation();
  return (
    <div className="bg-white">
      <Header />

      <main className="relative min-h-screen">
        <ThreadGrid threads={threads} />
        <AiChat />
      </main>

      <Footer />
    </div>
  );
}
