"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import { mockThreads } from "@/interfaces/ai_talk";
import { timestampToString } from "@/lib/utils/common";
import {
  ChevronLeft,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Clock,
  User,
  Sparkles,
} from "lucide-react";
import { MarkdownContent } from '@/components/common/markdown_content';
import { CommentSection } from "@/components/ai_consultation_room/comment_section";
import { AttachmentItem } from "@/components/ai_consultation_room/attachment_item";

export default function AiTalkDetailPage() {
  const params = useParams();
  const talkId = params?.talkId ?? "";

  const data = mockThreads.find((thread) => thread.id === Number(talkId));

  const [liked, setLiked] = useState<boolean>(false);
  const [disliked, setDisliked] = useState<boolean>(false);

  const homePagePath = "/ai_consultation_room";

  if (!data) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="space-y-4">
            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="text-orange-500 w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">未找到對話紀錄</h1>
            <p className="text-gray-500">抱歉，我們無法找到您要查看的內容。</p>
            <Link
              href={homePagePath}
              className="text-orange-600 font-semibold hover:text-orange-700 inline-flex items-center gap-1"
            >
              <ChevronLeft size={20} /> 返回上一頁
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { dateWithDash } = timestampToString(data.createdAt);

  return (
    <div className="bg-white min-h-screen">
      <Header />

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Info: (20260206 - Julian) Navigation / Breadcrumbs */}
        <nav className="mb-10">
          <Link
            href={homePagePath}
            className="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group"
          >
            <div className="bg-gray-50 p-2 rounded-full group-hover:bg-orange-50 transition-colors">
              <ChevronLeft size={18} />
            </div>
            <span className="text-sm font-medium">返回對話列表</span>
          </Link>
        </nav>

        {/* Info: (20260206 - Julian) 1. 問題區塊 */}
        <article className="space-y-12">
          <header className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex gap-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <Clock size={16} />
              <span>發布於 {dateWithDash}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <User size={16} />
              <span>{data.authorId}</span>
            </div>
          </header>

          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 italic relative">
            <span className="absolute -top-4 left-6 bg-white border border-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-400">
              問題原文
            </span>
            <p className="text-gray-700 text-lg leading-relaxed">
              {data.question}
            </p>

            {/* Info: (20260206 - Julian) 附件預覽 */}
            {data.attachments.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {data.attachments.map((attachment) => (
                  <AttachmentItem key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}
          </div>
        </article>

        <div className="relative py-12">
          <div
            className="absolute inset-0 flex items-center"
            aria-hidden="true"
          >
            <div className="w-full border-t border-gray-100"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-4 text-sm text-gray-300 flex items-center gap-2">
              <Sparkles size={16} /> AI 解析結果
            </span>
          </div>
        </div>

        {/* Info: (20260206 - Julian) 2. AI 回覆區塊 */}
        <section className="bg-linear-to-br from-orange-50 to-amber-50 rounded-[2.5rem] p-10 border border-orange-100 relative overflow-hidden shadow-sm">
          {/* Info: (20260206 - Julian) 裝飾用的 AI 標章 */}
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
            <Sparkles className="w-32 h-32 text-orange-600" />
          </div>

          <header className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-orange-900">
                AccounTalk AI
              </h2>
              <p className="text-xs text-orange-600 font-medium">
                模型版本：v2.1-Standard • 經過專家驗證
              </p>
            </div>
          </header>

          <article>
            <MarkdownContent content={data.answer} theme='light'  />
          </article>

          {/* Info: (20260206 - Julian) 互動工具列 */}
          <footer className="mt-10 pt-8 border-t border-orange-200/50 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (liked) {
                    setLiked(false);
                  } else {
                    setLiked(true);
                    setDisliked(false);
                  }
                }}
                className={`flex items-center gap-2 border px-5 py-2.5 rounded-2xl text-orange-500 font-bold transition-all active:scale-95 ${
                  liked
                    ? "bg-orange-600 text-white  border-transparent"
                    : "bg-white border-orange-200 hover:bg-orange-50 "
                }`}
              >
                <ThumbsUp size={18} />
                <span>{data.countOfLike + (liked ? 1 : 0)} 人贊同</span>
              </button>
              <button
                onClick={() => {
                  if (disliked) {
                    setDisliked(false);
                  } else {
                    setDisliked(true);
                    setLiked(false);
                  }
                }}
                className={`flex items-center gap-2 border px-5 py-2.5 rounded-2xl text-orange-500 font-bold transition-all active:scale-95 ${
                  disliked
                    ? "bg-orange-600 text-white border-transparent"
                    : "bg-white border-orange-200 hover:bg-orange-50 "
                }`}
              >
                <ThumbsDown size={18} />
                <span>{data.countOfDislike + (disliked ? 1 : 0)} 人不贊同</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-orange-600 bg-white border border-orange-200 px-5 py-2.5 rounded-2xl font-bold hover:bg-orange-50 transition-all">
                <Share2 size={18} />
                <span>分享此知識點</span>
              </button>
            </div>
          </footer>
        </section>

        {/* Info: (20260206 - Julian) 3. 評論區塊 */}
        <CommentSection comments={data.comments} />
      </main>

      <Footer />
    </div>
  );
}
