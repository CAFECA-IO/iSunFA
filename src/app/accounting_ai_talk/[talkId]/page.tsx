"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/landing_page/header";
import Footer from "@/components/landing_page/footer";
import { mockThreads, IComment, mockComments } from "@/interfaces/ai_talk";
import { timestampToString } from "@/lib/utils/common";
import {
  ChevronLeft,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Clock,
  User,
  CheckCircle2,
  Sparkles,
  Paperclip,
  Send,
} from "lucide-react";

const CommentItem = ({ comment }: { comment: IComment }) => {
  const [liked, setLiked] = useState<boolean>(false);
  const [disliked, setDisliked] = useState<boolean>(false);

  const isShowProTag = comment.isProfessional && (
    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="text-xs text-gray-400">#專業回饋</span>
    </div>
  );

  const isShowVerifiedTag = comment.isVerified && (
    <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
      專業認證
    </span>
  );

  const isShowVerifiedIcon = comment.isVerified && (
    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full border border-gray-50">
      <CheckCircle2 size={16} className="text-blue-500" fill="currentColor" />
    </div>
  );

  const handleLike = () => {
    if (liked) {
      setLiked(false);
    } else {
      setLiked(true);
      setDisliked(false);
    }
  };

  const handleDislike = () => {
    if (disliked) {
      setDisliked(false);
    } else {
      setDisliked(true);
      setLiked(false);
    }
  };

  return (
    <div className="group relative flex gap-5 p-6 rounded-3xl bg-white border border-gray-100 hover:border-orange-300 transition-all">
      {isShowProTag}

      <div className="w-14 h-14 bg-blue-100 rounded-2xl shrink-0 flex items-center justify-center text-blue-600 font-bold text-xl relative">
        U{isShowVerifiedIcon}
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-gray-900">
            {comment.authorId}
          </span>
          {isShowVerifiedTag}
          <span className="text-xs text-gray-400">2 小時前</span>
        </div>
        <p className="text-gray-700 leading-relaxed pr-20">{comment.content}</p>
        <div className="flex items-center gap-4 pt-2">
          <button className="text-xs font-bold text-gray-400 hover:text-orange-500">
            回覆
          </button>
        </div>
      </div>

      {/* Like/Dislike Buttons in bottom right */}
      <div className="absolute bottom-6 right-6 flex items-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
            liked ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <ThumbsUp size={16} fill={liked ? "currentColor" : "none"} />
          <span>{comment.likes + (liked ? 1 : 0)}</span>
        </button>
        <button
          onClick={handleDislike}
          className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 ${
            disliked ? "text-orange-500" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <ThumbsDown size={16} fill={disliked ? "currentColor" : "none"} />
          <span>{comment.dislikes + (disliked ? 1 : 0)}</span>
        </button>
      </div>
    </div>
  );
};

const CommentSection = () => {
  const [commentInput, setCommentInput] = useState<string>("");
  const [isShowInput, setIsShowInput] = useState<boolean>(true);

  const openInputHandler = () => {
    if (isShowInput) {
      setCommentInput("");
      setIsShowInput(false);
    } else {
      setIsShowInput(true);
    }
  };

  const displayedComments =
    mockComments.length > 0 ? (
      <div className="space-y-6">
        {/* 會計師評論範例 */}
        {mockComments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}

        {/* 更多留言載入 */}
        <button className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-300 font-bold hover:border-orange-200 hover:text-orange-400 transition-all">
          載入更多討論...
        </button>
      </div>
    ) : (
      <div className="flex items-center justify-center h-20 text-gray-400">
        尚無討論
      </div>
    );

  return (
    <section className="pt-20">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
          專家與用戶討論 <span className="text-gray-300 font-normal">5</span>
        </h3>
        <button
          onClick={openInputHandler}
          className="text-sm font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
        >
          <MessageSquare size={16} />
          {isShowInput ? "取消發表" : "發表我的見解"}
        </button>
      </div>

      {/* 發表評論 Input */}
      <div
        className={`mb-10 transition-all duration-300 overflow-hidden ${isShowInput ? "max-h-60 opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="flex gap-4 p-6 rounded-4xl bg-orange-50/50 border border-orange-100 shadow-inner">
          <div className="w-12 h-12 bg-white rounded-2xl shrink-0 flex items-center justify-center text-orange-200 border border-orange-50 shadow-sm">
            <User size={24} />
          </div>
          <div className="flex-1 space-y-3">
            <textarea
              id="ai-comment-input"
              aria-label="發表評論"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="分享您的見解或提出疑問..."
              className="w-full bg-white border border-orange-100 rounded-2xl p-4 text-sm focus:outline-none focus:border-orange-500 transition-all placeholder:text-gray-300 min-h-[100px] resize-none shadow-sm"
            />
            <div className="flex justify-end">
              <button
                disabled={!commentInput.trim()}
                className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-500 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-md shadow-orange-200"
              >
                <Send size={16} />
                <span>送出評論</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 評論區 */}
      {displayedComments}
    </section>
  );
};

const AttachmentItem = ({ name }: { name: string }) => {
  return (
    <div className="group relative w-32 h-32 bg-white rounded-2xl border border-gray-200 flex flex-col items-center justify-center p-2 cursor-zoom-in hover:shadow-lg transition-all">
      <div className="bg-gray-50 rounded-xl w-full h-full flex items-center justify-center mb-1 group-hover:bg-orange-50 transition-colors">
        <Paperclip
          className="text-gray-400 group-hover:text-orange-500 transition-colors"
          size={24}
        />
      </div>
      <span className="text-[10px] text-gray-500 truncate w-full text-center">
        {name}
      </span>
    </div>
  );
};

export default function AiTalkDetailPage() {
  const params = useParams();
  const talkId = params?.talkId ?? "";

  const data = mockThreads.find((thread) => thread.id === Number(talkId));

  const [liked, setLiked] = useState<boolean>(false);
  const [disliked, setDisliked] = useState<boolean>(false);

  const homePagePath = "/accounting_ai_talk";

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
        {/* Navigation / Breadcrumbs */}
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

        {/* 1. 問題區塊 */}
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

            {/* 附件預覽 */}
            {data.attachments && data.attachments.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {data.attachments.map((attachment) => (
                  <AttachmentItem key={attachment} name={attachment} />
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

        {/* 2. AI 回覆區塊 */}
        <section className="bg-linear-to-br from-orange-50 to-amber-50 rounded-[2.5rem] p-10 border border-orange-100 relative overflow-hidden shadow-sm">
          {/* 裝飾用的 AI 標章 */}
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

          <article className="prose prose-orange max-w-none prose-p:text-gray-800 prose-strong:text-orange-900 prose-li:text-gray-700">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/50">
              <p className="font-bold text-2xl text-orange-900 mb-2 leading-relaxed">
                {data.answer}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  <CheckCircle2 className="text-orange-500" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    法條依據
                  </h3>
                  <p>
                    依據《加值型及非加值型營業稅法》第 33
                    條規定，營業人以進項稅額扣抵銷項稅額者，應具備載明其名稱、地址及統一編號之憑證。
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="mt-1 shrink-0">
                  <CheckCircle2 className="text-orange-500" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    執行建議
                  </h3>
                  <p>
                    請確保發票上載明貴司統編，並確認屬於營業必要支出。若為餐飲業，需注意交際費限額問題。
                  </p>
                </div>
              </div>
            </div>
          </article>

          {/* 互動工具列 */}
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

        {/* 3. 評論區塊 */}
        <CommentSection />
      </main>

      <Footer />
    </div>
  );
}
