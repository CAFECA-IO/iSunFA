"use client";

import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import { IThreadDetail, UserReaction } from "@/interfaces/ai_consulting";
import { timestampToString } from "@/lib/utils/common";
import {
  ChevronLeft,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Sparkles,
  Loader2,
  Share2,
  Copy,
  X,
} from "lucide-react";
import QRCode from "react-qr-code";
import { MarkdownContent } from '@/components/common/markdown_content';
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from '@/contexts/auth_context';
import { CommentSection } from "@/components/ai_consultation_room/comment_section";
import { AttachmentItem } from "@/components/ai_consultation_room/attachment_item";
import { AiChat } from "@/components/ai_consultation_room/ai_chat";
import { ApiCode } from "@/lib/utils/status";
import { IApiResponse } from "@/lib/utils/response";

export default function AiConsultingDetailPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useParams();
  const talkId = params?.talk_id ?? "";

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [data, setData] = useState<IThreadDetail | null>(null);
  const [userReaction, setUserReaction] = useState<"LIKE" | "DISLIKE" | null>(null);

  useEffect(() => {
    if (!talkId) return;
    let timer: NodeJS.Timeout;

    const fetchThreadDetail = async () => {
      try {
        const result = await request<IApiResponse<IThreadDetail>>(`/api/v1/ai_consulting/thread/${talkId}`);

        if (result.code === ApiCode.SUCCESS) {
          setData(result.payload);
          setUserReaction(result?.payload?.userReaction ?? null);
          if (result.payload?.answer === "-") {
            setIsPolling(true);
            timer = setTimeout(fetchThreadDetail, 3000);
          } else {
            setIsPolling(false);
          }
        } else {
          setData(null);
          setIsPolling(false);
        }
      } catch (error) {
        console.error("Failed to fetch thread detail:", error);
        setData(null);
        setIsPolling(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThreadDetail();
    return () => clearTimeout(timer);
  }, [talkId]);

  const handleReaction = async (reaction: "LIKE" | "DISLIKE") => {
    if (!(talkId && user)) return;

    try {
      const result = await request<IApiResponse<{ countOfLike: number; countOfDislike: number; userReaction: UserReaction }>>(`/api/v1/ai_consulting/thread/${talkId}/react`, {
        method: "POST",
        body: JSON.stringify({ reaction }),
      });

      if (result.code === ApiCode.SUCCESS && result.payload) {
        const { countOfLike, countOfDislike, userReaction } = result.payload;
        setData((prev) => (prev ? { ...prev, countOfLike, countOfDislike } : null));
        setUserReaction(userReaction);
      }
    } catch (error) {
      console.error("Failed to post reaction:", error);
    }
  };

  const handleShare = async () => {
    try {
      setIsSharing(true);
      const res = await request<IApiResponse<{ token: string }>>(`/api/v1/user/analysis/${talkId}/share`, { method: "POST" });
      if (res.code === ApiCode.SUCCESS && res.payload?.token) {
        setShareUrl(`${window.location.origin}/share/report/${res.payload.token}`);
      }
    } catch (e) {
      console.error("Failed to share:", e);
    } finally {
      setIsSharing(false);
    }
  };

  const homePagePath = "/ai_consultation_room";

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 space-y-4 min-h-[calc(100vh-300px)] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="text-orange-500 w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("ai_consultation_room.not_found")}
          </h1>
          <p className="text-gray-500">
            {t("ai_consultation_room.not_found_desc")}
          </p>
          <Link
            href={homePagePath}
            className="text-orange-600 font-semibold hover:text-orange-700 inline-flex items-center gap-1"
          >
            <ChevronLeft size={20} /> {t("ai_consultation_room.back_to_prev")}
          </Link>
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
            <span className="text-sm font-medium">
              {t("ai_consultation_room.back_to_list")}
            </span>
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
              <span>
                {t("ai_consultation_room.published_at")} {dateWithDash}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <User size={16} />
              <span>{data.authorName}</span>
            </div>
          </header>

          <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 italic relative">
            <span className="absolute -top-4 left-6 bg-white border border-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-400">
              {t("ai_consultation_room.original_question")}
            </span>
            <p className="text-gray-700 text-lg leading-relaxed">
              {data.question}
            </p>

            {/* Info: (20260206 - Julian) 附件預覽 */}
            {data.file && data.file.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {data.file.map((file) => (
                  <AttachmentItem key={file.id} file={file} />
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
              <Sparkles size={16} /> {t("ai_consultation_room.ai_result")}
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
                {t("ai_consultation_room.ai_name")}
              </h2>
              <p className="text-xs text-orange-600 font-medium">

                {t("ai_consultation_room.ai_model_version")}
              </p>
            </div>
          </header>

          <article>
            {isPolling ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-4">
                <Loader2 className="animate-spin text-orange-500 w-10 h-10" />
                <p className="text-orange-600 font-medium">{t("ai_consultation_room.ai_is_thinking", { defaultValue: "AI 正在思考中..." })}</p>
              </div>
            ) : (
              <MarkdownContent content={data.answer} theme="light" />
            )}
          </article>

          {/* Info: (20260206 - Julian) 互動工具列 */}
          <footer className="mt-10 pt-8 border-t border-orange-200/50 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleReaction("LIKE")}
                disabled={!user}
                title={!user ? t("ai_consultation_room.login_to_react") : ""}
                className={`flex items-center gap-2 border px-5 py-2.5 rounded-2xl text-orange-500 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${userReaction === 'LIKE'
                  ? "bg-orange-600 text-white  border-transparent"
                  : "bg-white border-orange-200 enabled:hover:bg-orange-50 "
                  }`}
              >
                <ThumbsUp size={18} />
                <span>
                  {t("ai_consultation_room.agree_count").replace(
                    "{count}",
                    data.countOfLike.toString()
                  )}
                </span>
              </button>
              <button
                onClick={() => handleReaction("DISLIKE")}
                disabled={!user}
                title={!user ? t("ai_consultation_room.login_to_react") : ""}
                className={`flex items-center gap-2 border px-5 py-2.5 rounded-2xl text-orange-500 font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${userReaction === 'DISLIKE'
                  ? "bg-orange-600 text-white border-transparent"
                  : "bg-white border-orange-200 enabled:hover:bg-orange-50 "
                  }`}
              >
                <ThumbsDown size={18} />
                <span>
                  {t("ai_consultation_room.disagree_count").replace(
                    "{count}",
                    data.countOfDislike.toString()
                  )}
                </span>
              </button>
            </div>

            {/* Info: (20260418 - Luphia) 實作分享功能 */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleShare}
                disabled={isSharing || isPolling || !data}
                className="flex items-center gap-2 text-orange-600 bg-white border border-orange-200 px-5 py-2.5 rounded-2xl font-bold hover:bg-orange-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSharing ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
                <span>{t("ai_consultation_room.share_knowledge")}</span>
              </button>
            </div>
          </footer>
        </section>

        {/* Info: (20260206 - Julian) 3. 評論區塊 */}
        <CommentSection />
      </main>

      {shareUrl && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative">
            <button onClick={() => setShareUrl(null)} aria-label="common.close" className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={24} />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">{t("ai_consultation_room.share_knowledge")}</h3>
            <div className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-center mb-6">
              <QRCode value={shareUrl} size={200} />
            </div>
            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl overflow-hidden">
              <input aria-label="common.share_url" type="text" readOnly value={shareUrl} className="bg-transparent border-none outline-none text-sm text-gray-600 flex-1 truncate font-mono" />
              <button
                onClick={() => navigator.clipboard.writeText(shareUrl)}
                aria-label="common.copy"
                className="text-orange-500 hover:text-orange-600 p-2 bg-white rounded-lg shadow-sm active:scale-95 transition-transform shrink-0 cursor-pointer"
              >
                <Copy size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info: (20260208 - Julian) 4. AI 聊天區塊 */}
      <AiChat />
      <Footer />
    </div>
  );
}
