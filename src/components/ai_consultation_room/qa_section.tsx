"use client";

import { useState, useEffect } from "react";
import { request } from "@/lib/utils/request";
import { useParams } from "next/navigation";
import Link from "next/link";
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
import { MarkdownContent } from "@/components/common/markdown_content";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { CommentSection } from "@/components/ai_consultation_room/comment_section";
import { AttachmentItem } from "@/components/ai_consultation_room/attachment_item";
import { ApiCode } from "@/lib/utils/status";
import { IApiResponse } from "@/lib/utils/response";

export default function QaSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const params = useParams();
  const talkId = params?.talk_id ?? "";

  const homePagePath = "/ai_consultation_room";

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [data, setData] = useState<IThreadDetail | null>(null);
  const [userReaction, setUserReaction] = useState<"LIKE" | "DISLIKE" | null>(
    null,
  );

  useEffect(() => {
    if (!talkId) return;
    let timer: NodeJS.Timeout;

    const fetchThreadDetail = async () => {
      try {
        const result = await request<IApiResponse<IThreadDetail>>(
          `/api/v1/ai_consulting/thread/${talkId}`,
        );

        if (result.code === ApiCode.SUCCESS) {
          setData(result.payload);
          setUserReaction(result?.payload?.userReaction ?? null);
          if (result.payload?.answer === "-") {
            setIsPolling(true);
            // Info: (20260427 - Julian) 初始化回答，先 3000ms 輪詢一次
            timer = setTimeout(fetchThreadDetail, 3000);
          } else if (result.payload?.isGenerating) {
            setIsPolling(true);
            // Info: (20260427 - Julian) AI 回答生成中，輪詢加快至 1000ms
            timer = setTimeout(fetchThreadDetail, 1000);
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

  // Info: (20260427 - Julian) 處理按讚/倒讚
  const handleReaction = async (reaction: "LIKE" | "DISLIKE") => {
    if (!(talkId && user)) return;

    try {
      const result = await request<
        IApiResponse<{
          countOfLike: number;
          countOfDislike: number;
          userReaction: UserReaction;
        }>
      >(`/api/v1/ai_consulting/thread/${talkId}/react`, {
        method: "POST",
        body: JSON.stringify({ reaction }),
      });

      if (result.code === ApiCode.SUCCESS && result.payload) {
        const { countOfLike, countOfDislike, userReaction } = result.payload;
        setData((prev) =>
          prev ? { ...prev, countOfLike, countOfDislike } : null,
        );
        setUserReaction(userReaction);
      }
    } catch (error) {
      console.error("Failed to post reaction:", error);
    }
  };

  // Info: (20260427 - Julian) 處理分享
  const handleShare = async () => {
    try {
      setIsSharing(true);
      const res = await request<IApiResponse<{ token: string }>>(
        `/api/v1/user/analysis/${talkId}/share`,
        { method: "POST" },
      );
      if (res.code === ApiCode.SUCCESS && res.payload?.token) {
        setShareUrl(
          `${window.location.origin}/share/report/${res.payload.token}`,
        );
      }
    } catch (e) {
      console.error("Failed to share:", e);
    } finally {
      setIsSharing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-300px)] items-center justify-center p-10">
        <Loader2 size={40} className="animate-spin text-orange-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-[calc(100vh-300px)] flex-1 flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-orange-50">
          <MessageSquare size={40} className="text-orange-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("ai_consultation_room.not_found")}
        </h1>
        <p className="text-gray-500">
          {t("ai_consultation_room.not_found_desc")}
        </p>
        <Link
          href={homePagePath}
          className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700"
        >
          <ChevronLeft size={20} /> {t("ai_consultation_room.back_to_prev")}
        </Link>
      </main>
    );
  }

  const { dateWithDash } = timestampToString(data.createdAt);

  // Info: (20260427 - Julian) 顯示「AI 思考中」或「AI 回答的內容」
  const answerContent =
    isPolling && data.answer === "-" ? (
      <article className="flex flex-col items-center justify-center space-y-4 py-10">
        <Loader2 size={40} className="animate-spin text-orange-500" />
        <p className="font-medium text-orange-600">
          {t("ai_consultation_room.ai_is_thinking", {
            defaultValue: "AI 正在思考中...",
          })}
        </p>
      </article>
    ) : (
      <article className="relative">
        <MarkdownContent content={data.answer} theme="light" />
        {data.isGenerating && (
          // Info: (20260427 - Julian) 回答生成中，顯示閃爍打字機效果
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-orange-500" />
        )}
      </article>
    );

  // Info: (20260427 - Julian) 只在取得完整回答以後才顯示工具列
  const toolbar = !isPolling && !data.isGenerating && data.answer !== "-" && (
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-6 border-t border-orange-200/50 pt-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleReaction("LIKE")}
          disabled={!user}
          title={!user ? t("ai_consultation_room.login_to_react") : ""}
          className={`flex items-center gap-2 rounded-2xl border px-5 py-2.5 font-bold text-orange-500 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            userReaction === "LIKE"
              ? "border-transparent bg-orange-600 text-white"
              : "border-orange-200 bg-white enabled:hover:bg-orange-50"
          }`}
        >
          <ThumbsUp size={18} />
          <span>
            {t("ai_consultation_room.agree_count").replace(
              "{count}",
              data.countOfLike.toString(),
            )}
          </span>
        </button>
        <button
          onClick={() => handleReaction("DISLIKE")}
          disabled={!user}
          title={!user ? t("ai_consultation_room.login_to_react") : ""}
          className={`flex items-center gap-2 rounded-2xl border px-5 py-2.5 font-bold text-orange-500 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
            userReaction === "DISLIKE"
              ? "border-transparent bg-orange-600 text-white"
              : "border-orange-200 bg-white enabled:hover:bg-orange-50"
          }`}
        >
          <ThumbsDown size={18} />
          <span>
            {t("ai_consultation_room.disagree_count").replace(
              "{count}",
              data.countOfDislike.toString(),
            )}
          </span>
        </button>
      </div>
      {/* Info: (20260418 - Luphia) 實作分享功能 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleShare}
          disabled={isSharing || isPolling || !data}
          className="flex items-center gap-2 rounded-2xl border border-orange-200 bg-white px-5 py-2.5 font-bold text-orange-600 transition-all hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSharing ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Share2 size={18} />
          )}
          <span>{t("ai_consultation_room.share_knowledge")}</span>
        </button>
      </div>
    </footer>
  );

  // Info: (20260427 - Julian) 分享 modal
  const shareModal = shareUrl && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-8">
        <button
          onClick={() => setShareUrl(null)}
          aria-label="common.close"
          className="absolute top-4 right-4 cursor-pointer text-gray-400 hover:text-gray-600"
        >
          <X size={24} />
        </button>
        <h3 className="mb-6 text-center text-xl font-bold text-gray-900">
          {t("ai_consultation_room.share_knowledge")}
        </h3>
        <div className="mb-6 flex justify-center rounded-2xl border border-gray-100 bg-white p-4">
          <QRCode value={shareUrl} size={200} />
        </div>
        <div className="flex items-center gap-2 overflow-hidden rounded-xl bg-gray-50 p-3">
          <input
            aria-label="common.share_url"
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 truncate border-none bg-transparent font-mono text-sm text-gray-600 outline-none"
          />
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            aria-label="common.copy"
            className="shrink-0 cursor-pointer rounded-lg bg-white p-2 text-orange-500 shadow-sm transition-transform hover:text-orange-600 active:scale-95"
          >
            <Copy size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      {/* Info: (20260206 - Julian) Navigation / Breadcrumbs */}
      <nav className="mb-10">
        <Link
          href={homePagePath}
          className="group flex items-center gap-2 text-gray-500 transition-colors hover:text-orange-500"
        >
          <div className="rounded-full bg-gray-50 p-2 transition-colors group-hover:bg-orange-50">
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
                className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600"
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

        <div className="relative rounded-3xl border border-gray-100 bg-gray-50 p-8 italic">
          <span className="absolute -top-4 left-6 rounded-full border border-gray-100 bg-white px-3 py-1 text-xs font-bold text-gray-400">
            {t("ai_consultation_room.original_question")}
          </span>
          <p className="text-lg leading-relaxed text-gray-700">
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

      {/* Info: (20260427 - Julian) ==== 分隔線 ==== */}
      <div className="relative py-12">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-100"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="flex items-center gap-2 bg-white px-4 text-sm text-gray-300">
            <Sparkles size={16} /> {t("ai_consultation_room.ai_result")}
          </span>
        </div>
      </div>

      {/* Info: (20260206 - Julian) 2. AI 回覆區塊 */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-orange-100 bg-linear-to-br from-orange-50 to-amber-50 p-10 shadow-sm">
        {/* Info: (20260206 - Julian) 裝飾用的 Sparkles */}
        <div className="pointer-events-none absolute top-0 right-0 p-8 opacity-5">
          <Sparkles size={180} className="text-orange-600" />
        </div>
        {/* Info: (20260427 - Julian) 回答標題 */}
        <header className="mb-8 flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-200">
            <Sparkles size={32} />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-orange-900">
              {t("ai_consultation_room.ai_name")}
            </h2>
            <p className="text-xs font-medium text-orange-600">
              {t("ai_consultation_room.ai_model_version")}
            </p>
          </div>
        </header>
        {/* Info: (20260427 - Julian) 回答內容 */}
        {answerContent}

        {/* Info: (20260206 - Julian) 互動工具列 */}
        {toolbar}
      </section>

      {/* Info: (20260206 - Julian) 3. 評論區塊 */}
      <CommentSection />

      {/* Info: (20260427 - Julian) 4. 分享 thread 視窗 */}
      {shareModal}
    </main>
  );
}
