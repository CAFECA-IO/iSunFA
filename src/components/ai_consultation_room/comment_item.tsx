import { useState } from "react";
import { request } from "@/lib/utils/request";
import { ThumbsUp, ThumbsDown, CheckCircle2 } from "lucide-react";
import { formatTime } from "@/lib/utils/common";
import { IComment, UserReaction } from "@/interfaces/ai_talk";
import { CommentPostInput } from "@/components/ai_consultation_room/comment_post_input";
import { useTranslation } from "@/i18n/i18n_context";
import { useAuth } from "@/contexts/auth_context";
import { ApiCode } from "@/lib/utils/status";
import { IApiResponse } from "@/lib/utils/response";

export const CommentItem = ({
  comment,
  isReply = false,
  onSuccess,
}: {
  comment: IComment;
  isReply?: boolean;
  onSuccess?: () => void;
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reaction, setReaction] = useState<UserReaction>(comment.userReaction);
  const [likesCount, setLikesCount] = useState<number>(comment.likes);
  const [dislikesCount, setDislikesCount] = useState<number>(comment.dislikes);
  const [showReplies, setShowReplies] = useState<boolean>(false);
  const [replyInput, setReplyInput] = useState<string>("");
  const [now] = useState(() => Date.now() / 1000);

  const initial = comment.authorName.slice(0, 1).toUpperCase();

  const isShowProTag = comment.isProfessional && (
    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
      <span className="text-xs text-gray-400">
        {t("ai_consultation_room.pro_feedback")}
      </span>
    </div>
  );

  const isShowVerifiedTag = comment.isVerified && (
    <span className="text-[10px] bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
      {t("ai_consultation_room.certified")}
    </span>
  );

  const isShowVerifiedIcon = comment.isVerified && (
    <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full border border-gray-50">
      <CheckCircle2 size={16} className="text-blue-500" fill="currentColor" />
    </div>
  );

  const handleReaction = async (reaction: UserReaction) => {
    if (!user) return;
    try {
      const data = await request<
        IApiResponse<{
          countOfLike: number;
          countOfDislike: number;
          userReaction: UserReaction;
        }>
      >(`/api/v1/ai_talk/comment/${comment.id}/react`, {
        method: "POST",
        body: JSON.stringify({ reaction }),
      });

      if (data.code === ApiCode.SUCCESS && data.payload) {
        const { countOfLike, countOfDislike, userReaction } = data.payload;
        setLikesCount(countOfLike);
        setDislikesCount(countOfDislike);
        setReaction(userReaction);
      }
    } catch (error) {
      console.error("Failed to react to comment:", error);
    }
  };

  const handleLike = () => handleReaction("LIKE");
  const handleDislike = () => handleReaction("DISLIKE");

  const toggleReplies = () => {
    if (showReplies) setReplyInput("");
    setShowReplies(!showReplies);
  };

  const hasReplies = comment.replies && comment.replies.length > 0;

  // Info: (20260212 - Julian) 拆分 @用戶 字串並加上樣式
  const renderContent = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(@[^\s]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={index}
            className="text-blue-600 bg-gray-100 p-1 rounded font-medium"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`space-y-4 ${isReply ? "ml-14" : ""}`}>
      <div className="group relative flex gap-5 p-6 rounded-3xl bg-white border border-gray-100 hover:border-orange-300 transition-all">
        {isShowProTag}

        <div className="w-14 h-14 bg-blue-100 rounded-2xl shrink-0 flex items-center justify-center text-blue-600 font-bold text-xl relative">
          {initial}
          {isShowVerifiedIcon}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-900">
              {comment.authorName}
            </span>
            {isShowVerifiedTag}
            <span className="text-xs text-gray-400">
              {formatTime(comment.createdAt, now)}
            </span>
          </div>
          <p className="text-gray-700 leading-relaxed pr-20">
            {comment.replyToUserName && (
              <span className="text-blue-500 font-semibold mr-1">
                @{comment.replyToUserName}
              </span>
            )}
            {renderContent(comment.content)}
          </p>
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={toggleReplies}
              className="text-xs font-bold text-gray-400 hover:text-orange-500 transition-colors"
            >
              {t("ai_consultation_room.reply")}
              {hasReplies ? `(${comment.replies.length})` : ""}
            </button>
          </div>
        </div>

        {/* Info: (20260206 - Julian) Like/Dislike Buttons in bottom right */}
        <div className="absolute bottom-6 right-6 flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={!user}
            title={!user ? t("ai_consultation_room.login_to_react") : ""}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              reaction === "LIKE"
                ? "text-orange-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <ThumbsUp
              size={16}
              fill={reaction === "LIKE" ? "currentColor" : "none"}
            />
            <span>{likesCount}</span>
          </button>
          <button
            onClick={handleDislike}
            disabled={!user}
            title={!user ? t("ai_consultation_room.login_to_react") : ""}
            className={`flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              reaction === "DISLIKE"
                ? "text-orange-500"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <ThumbsDown
              size={16}
              fill={reaction === "DISLIKE" ? "currentColor" : "none"}
            />
            <span>{dislikesCount}</span>
          </button>
        </div>
      </div>

      {/* Info: (20260209 - Julian) Reply Input & Nested Replies */}
      {showReplies && (
        <div className="space-y-4">
          {hasReplies && (
            <div className="space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  isReply
                  onSuccess={onSuccess}
                />
              ))}
            </div>
          )}
          <div className={isReply ? "" : "ml-14"}>
            <CommentPostInput
              isShowInput={showReplies}
              value={replyInput}
              onChange={setReplyInput}
              parentId={comment.id}
              onSuccess={() => onSuccess?.()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
